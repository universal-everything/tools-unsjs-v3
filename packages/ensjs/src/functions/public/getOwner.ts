import { BaseError, decodeAbiParameters, type Address, type Hex } from 'viem'
import type { ClientWithEns } from '../../contracts/consts.js'
import type { SimpleTransactionRequest } from '../../types.js'
import { EMPTY_ADDRESS } from '../../utils/consts.js'
import { generateFunction } from '../../utils/generateFunction.js'
import { namehash as makeNamehash } from '../../utils/normalise.js'
import {
  ownerFromContract,
  type OwnerContract,
} from '../../utils/ownerFromContract.js'
import { checkIsDotEth } from '../../utils/validation.js'
import multicallWrapper from './multicallWrapper.js'

export type GetOwnerParameters<
  TContract extends OwnerContract | undefined = undefined,
> = {
  /** Name to get owner for */
  name: string
  /** Optional specific contract to get ownership value from */
  contract?: TContract
}

type BaseGetOwnerReturnType = {
  /** Owner of the name */
  owner?: Address | null
  /** Registrant of the name (registrar owner) */
  registrant?: Address | null
  /** The contract level that the ownership is on */
  ownershipLevel: 'registry' | 'registrar'
}

type RegistrarOnlyOwnership = {
  owner?: never
  registrant: Address
  ownershipLevel: 'registrar'
}

type WrappedOwnership = {
  owner: Address
  registrant?: never
  ownershipLevel: 'nameWrapper'
}

type UnwrappedEth2ldOwnership = {
  registrant: Address | null
  owner: Address
  ownershipLevel: 'registrar'
}

type UnwrappedOwnership = {
  owner: Address
  registrant?: never
  ownershipLevel: 'registry'
}

export type GetOwnerReturnType<
  TContract extends OwnerContract | undefined = undefined,
> =
  | (BaseGetOwnerReturnType &
      (TContract extends 'registrar'
        ? RegistrarOnlyOwnership
        : TContract extends 'nameWrapper'
        ? WrappedOwnership
        : TContract extends 'registry'
        ? UnwrappedOwnership
        : WrappedOwnership | UnwrappedEth2ldOwnership | UnwrappedOwnership))
  | null

const encode = <TContract extends OwnerContract | undefined = undefined>(
  client: ClientWithEns,
  { name, contract }: GetOwnerParameters<TContract>,
): SimpleTransactionRequest => {
  const namehash = makeNamehash(name)
  const labels = name.split('.')

  if (contract || labels.length === 1) {
    const contractData = ownerFromContract({
      client,
      contract: contract || 'registry',
      namehash,
      labels,
    })

    const data: { to: Address; data: Hex }[] = [contractData]

    return multicallWrapper.encode(client, { transactions: data })
  }

  const registryData = ownerFromContract({
    client,
    contract: 'registry',
    namehash,
  })

  const data: { to: Address; data: Hex }[] = [registryData]

  if (checkIsDotEth(labels)) {
    data.push(ownerFromContract({ client, contract: 'registrar', labels }))
  }

  return multicallWrapper.encode(client, { transactions: data })
}

const addressDecode = (data: Hex) =>
  decodeAbiParameters([{ type: 'address' }], data)[0] as Address

const decode = async <TContract extends OwnerContract | undefined = undefined>(
  client: ClientWithEns,
  data: Hex | BaseError,
  { name, contract }: GetOwnerParameters<TContract>,
): Promise<GetOwnerReturnType<TContract>> => {
  if (typeof data === 'object') throw data
  const labels = name.split('.')
  if (contract || labels.length === 1) {
    const result = await multicallWrapper.decode(client, data, [])
    const [singleOwner] = [result[0].returnData].map(
      (ret) =>
        ret &&
        (ret !== '0x' ? addressDecode(ret) : undefined) &&
        (ret.length === 74 ? undefined : addressDecode(ret)),
    ) as [Address | undefined]

    if (singleOwner === undefined || singleOwner === EMPTY_ADDRESS) return null
    if (contract === 'registrar') {
      return {
        ownershipLevel: 'registrar',
        registrant: singleOwner,
      } as GetOwnerReturnType<TContract>
    }
    return {
      ownershipLevel: contract || 'registry',
      owner: singleOwner,
    } as GetOwnerReturnType<TContract>
  }

  const result = await multicallWrapper.decode(client, data, [])

  const [registryOwner, registrarOwner] = [
    result[0].returnData,
    result[1]?.returnData,
  ].map(
    (ret) =>
      ret &&
      (ret !== '0x' ? addressDecode(ret) : undefined) &&
      (ret.length === 74 ? undefined : addressDecode(ret)),
  ) as [Address, Address | undefined]

  // check for only .eth names
  if (labels[labels.length - 1] === 'lyx') {
    // if there is a registrar owner, then it's not a subdomain but we have also passed the namewrapper clause
    // this means that it's an unwrapped second-level name
    // the registrant is the owner of the NFT
    // the owner is the controller of the records
    if (registrarOwner) {
      return {
        registrant: registrarOwner!,
        owner: registryOwner!,
        ownershipLevel: 'registrar',
      } as GetOwnerReturnType<TContract>
    }
    if (registryOwner !== EMPTY_ADDRESS) {
      // if there is no registrar owner, but the label length is two, then the domain is an expired 2LD .eth
      // so we still want to return the ownership values
      if (labels.length === 2) {
        return {
          registrant: null,
          owner: registryOwner,
          ownershipLevel: 'registrar',
        } as GetOwnerReturnType<TContract>
      }
      // unwrapped subnames do not have NFTs associated, so do not have a registrant
      return {
        owner: registryOwner,
        ownershipLevel: 'registry',
      } as GetOwnerReturnType<TContract>
    }
    // .eth names with no registrar owner are either unregistered or expired
    return null
  }

  // for unwrapped non .eth names, the owner is the registry owner
  if (registryOwner && registryOwner !== EMPTY_ADDRESS) {
    return {
      owner: registryOwner,
      ownershipLevel: 'registry',
    } as GetOwnerReturnType<TContract>
  }

  // for anything else, return
  return null
}

type EncoderFunction = typeof encode
type DecoderFunction = typeof decode

type BatchableFunctionObject = {
  encode: EncoderFunction
  decode: DecoderFunction
  batch: <
    TContract extends OwnerContract | undefined = undefined,
    TParams extends GetOwnerParameters<TContract> = GetOwnerParameters<TContract>,
  >(
    args: TParams,
  ) => {
    args: [TParams]
    encode: EncoderFunction
    decode: typeof decode<TContract>
  }
}

/**
 * Gets the owner(s) of a name.
 * @param client - {@link ClientWithEns}
 * @param parameters - {@link GetOwnerParameters}
 * @returns Owner data object, or `null` if no owners exist. {@link GetOwnerReturnType}
 *
 * @example
 * import { createPublicClient, http } from 'viem'
 * import { mainnet } from 'viem/chains'
 * import { addEnsContracts } from '@ensdomains/ensjs'
 * import { getOwner } from '@ensdomains/ensjs/public'
 *
 * const client = createPublicClient({
 *   chain: addEnsContracts(mainnet),
 *   transport: http(),
 * })
 * const result = await getOwner(client, { name: 'ens.eth' })
 * // { owner: '0xb6E040C9ECAaE172a89bD561c5F73e1C48d28cd9', registrant: '0xb6E040C9ECAaE172a89bD561c5F73e1C48d28cd9', ownershipLevel: 'registrar }
 */
const getOwner = generateFunction({ encode, decode }) as (<
  TContract extends OwnerContract | undefined = undefined,
>(
  client: ClientWithEns,
  { name, contract }: GetOwnerParameters<TContract>,
) => Promise<GetOwnerReturnType<TContract>>) &
  BatchableFunctionObject

export default getOwner
