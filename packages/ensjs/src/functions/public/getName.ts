import {
  decodeFunctionResult,
  encodeFunctionData,
  getAddress,
  namehash,
  type Address,
  type Hex,
} from 'viem'
import type { ClientWithEns } from '../../contracts/consts.js'
import { getChainContractAddress } from '../../contracts/getChainContractAddress.js'
import { universalResolverReverseNameWithRecordsSnippet } from '../../contracts/universalResolver.js'
import type { TransactionRequestWithPassthrough } from '../../types.js'
import {
  generateFunction,
  type GeneratedFunction,
} from '../../utils/generateFunction.js'
import { normalise } from '../../utils/normalise.js'

export type GetNameParameters = {
  /** Address to get name for */
  address: Address
  /** Whether or not to allow mismatched forward resolution */
  allowMismatch?: boolean
  /** Whether or not to throw decoding errors */
  strict?: boolean
  /** Batch gateway URLs to use for resolving CCIP-read requests. */
  gatewayUrls?: string[]
}

export type GetNameReturnType = {
  /** Primary name for address */
  name: string
  /** Indicates if forward resolution for name matches address */
  match: boolean
  /** Resolver address for reverse node */
  reverseResolverAddress: Address
  /** Resolver address for resolved name */
  resolverAddress: Address
}

const encode = (
  client: ClientWithEns,
  { address }: Omit<GetNameParameters, 'allowMismatch' | 'strict'>,
): TransactionRequestWithPassthrough => {
  const reverseNode = `${address.toLowerCase().substring(2)}.addr.reverse`
  const to = getChainContractAddress({
    client,
    contract: 'ensUniversalResolver',
  })
  const args = [namehash(reverseNode)] as const

  return {
    to,
    data: encodeFunctionData({
      abi: universalResolverReverseNameWithRecordsSnippet,
      functionName: 'nameWithRecordInfo',
      args,
    }),
  }
}

const decode = async (
  _client: ClientWithEns,
  data: Hex,
  { address, allowMismatch, strict }: GetNameParameters,
): Promise<GetNameReturnType | null> => {
  try {
    const [
      unnormalisedName,
      reverseResolverAddress,
      resolverAddress,
      forwardResolvedAddress,
    ] = decodeFunctionResult({
      abi: universalResolverReverseNameWithRecordsSnippet,
      functionName: 'nameWithRecordInfo',
      data,
    })
    if (!unnormalisedName) return null
    const match = getAddress(forwardResolvedAddress) === getAddress(address)
    if (!match && !allowMismatch) return null
    const normalisedName = normalise(unnormalisedName)
    return {
      name: normalisedName,
      match,
      reverseResolverAddress,
      resolverAddress,
    }
  } catch (error) {
    if (strict) throw error
    return null
  }
}

type BatchableFunctionObject = GeneratedFunction<typeof encode, typeof decode>

/**
 * Gets the primary name for an address
 * @param client - {@link ClientWithEns}
 * @param parameters - {@link GetNameParameters}
 * @returns Name data object, or `null` if no primary name is set. {@link GetNameReturnType}
 *
 * @example
 * import { createPublicClient, http } from 'viem'
 * import { mainnet } from 'viem/chains'
 * import { addEnsContracts } from '@ensdomains/ensjs'
 * import { getName } from '@ensdomains/ensjs/public'
 *
 * const client = createPublicClient({
 *   chain: addEnsContracts(mainnet),
 *   transport: http(),
 * })
 * const result = await getName(client, { address: '0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5' })
 * // { name: 'nick.eth', match: true, reverseResolverAddress: '0xa2c122be93b0074270ebee7f6b7292c7deb45047', resolverAddress: '0x4976fb03c32e5b8cfe2b6ccb31c09ba78ebaba41' }
 */
const getName = generateFunction({ encode, decode }) as ((
  client: ClientWithEns,
  { address, allowMismatch, strict }: GetNameParameters,
) => Promise<GetNameReturnType>) &
  BatchableFunctionObject

export default getName
