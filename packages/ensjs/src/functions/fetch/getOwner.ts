import { Address, Hex, decodeAbiParameters } from 'viem'
import { ClientWithEns } from '../../contracts/addContracts'
import { getChainContractAddress } from '../../contracts/getChainContractAddress'
import { SimpleTransactionRequest } from '../../types'
import { EMPTY_ADDRESS } from '../../utils/consts'
import { generateFunction } from '../../utils/generateFunction'
import { namehash as makeNamehash } from '../../utils/normalise'
import { OwnerContract, ownerFromContract } from '../../utils/ownerFromContract'
import { checkIsDotEth } from '../../utils/validation'
import multicallWrapper from './multicallWrapper'

export type GetOwnerParameters = {
  name: string
  contract?: OwnerContract
}

type RegistrarOnlyOwnership = {
  registrant: Address
  ownershipLevel: 'registrar'
}

type WrappedOwnership = {
  owner: Address
  ownershipLevel: 'nameWrapper'
}

type UnwrappedEth2ldOwnership = {
  registrant: Address | null
  owner: Address
  ownershipLevel: 'registrar'
}

type UnwrappedOwnership = {
  owner: Address
  ownershipLevel: 'registry'
}

export type GetOwnerReturnType =
  | RegistrarOnlyOwnership
  | WrappedOwnership
  | UnwrappedEth2ldOwnership
  | UnwrappedOwnership
  | null

const encode = (
  client: ClientWithEns,
  { name, contract }: GetOwnerParameters,
): SimpleTransactionRequest => {
  const namehash = makeNamehash(name)
  const labels = name.split('.')

  if (contract || labels.length === 1) {
    return ownerFromContract({
      client,
      contract: contract || 'registry',
      namehash,
      labels,
    })
  }

  const registryData = ownerFromContract({
    client,
    contract: 'registry',
    namehash,
  })
  const nameWrapperData = ownerFromContract({
    client,
    contract: 'nameWrapper',
    namehash,
  })

  const data: { to: Address; data: Hex }[] = [registryData, nameWrapperData]

  if (checkIsDotEth(labels)) {
    data.push(ownerFromContract({ client, contract: 'registrar', labels }))
  }

  return multicallWrapper.encode(client, { transactions: data })
}

const addressDecode = (data: Hex) =>
  decodeAbiParameters([{ type: 'address' }], data)[0]

const decode = async (
  client: ClientWithEns,
  data: Hex,
  { name, contract }: GetOwnerParameters,
): Promise<GetOwnerReturnType> => {
  const labels = name.split('.')
  if (contract || labels.length === 1) {
    const singleOwner = addressDecode(data)
    if (contract === 'registrar') {
      return {
        ownershipLevel: 'registrar',
        registrant: singleOwner,
      }
    }
    return {
      ownershipLevel: contract || 'registry',
      owner: singleOwner,
    }
  }

  const result = await multicallWrapper.decode(client, data, [])

  const [registryOwner, nameWrapperOwner, registrarOwner] = [
    result[0].returnData,
    result[1].returnData,
    result[2]?.returnData,
  ].map((ret) => (ret && ret !== '0x' ? addressDecode(ret) : undefined)) as [
    Address,
    Address,
    Address | undefined,
  ]

  const nameWrapperAddress = getChainContractAddress({
    client,
    contract: 'ensNameWrapper',
  })

  // check for only .eth names
  if (labels[labels.length - 1] === 'eth') {
    // if the owner on the registrar is the namewrapper, then the namewrapper owner is the owner
    // there is no "registrant" for wrapped names
    if (registrarOwner === nameWrapperAddress) {
      return {
        owner: nameWrapperOwner,
        ownershipLevel: 'nameWrapper',
      }
    }
    // if there is a registrar owner, then it's not a subdomain but we have also passed the namewrapper clause
    // this means that it's an unwrapped second-level name
    // the registrant is the owner of the NFT
    // the owner is the controller of the records
    if (registrarOwner) {
      return {
        registrant: registrarOwner,
        owner: registryOwner,
        ownershipLevel: 'registrar',
      }
    }
    if (registryOwner !== EMPTY_ADDRESS) {
      // if there is no registrar owner, but the label length is two, then the domain is an expired 2LD .eth
      // so we still want to return the ownership values
      if (labels.length === 2) {
        return {
          registrant: null,
          owner: registryOwner,
          ownershipLevel: 'registrar',
        }
      }
      // this means that the subname is wrapped
      if (
        registryOwner === nameWrapperAddress &&
        nameWrapperOwner &&
        nameWrapperOwner !== EMPTY_ADDRESS
      ) {
        return {
          owner: nameWrapperOwner,
          ownershipLevel: 'nameWrapper',
        }
      }
      // unwrapped subnames do not have NFTs associated, so do not have a registrant
      return {
        owner: registryOwner,
        ownershipLevel: 'registry',
      }
    }
    // .eth names with no registrar owner are either unregistered or expired
    return null
  }

  // non .eth names inherit the owner from the registry
  // there will only ever be an owner for non .eth names, not a registrant
  // this is because for unwrapped names, there is no associated NFT
  // and for wrapped names, owner and registrant are the same thing
  if (
    registryOwner === nameWrapperAddress &&
    nameWrapperOwner &&
    nameWrapperOwner !== EMPTY_ADDRESS
  ) {
    return {
      owner: nameWrapperOwner,
      ownershipLevel: 'nameWrapper',
    }
  }

  // for unwrapped non .eth names, the owner is the registry owner
  if (registryOwner && registryOwner !== EMPTY_ADDRESS) {
    return {
      owner: registryOwner,
      ownershipLevel: 'registry',
    }
  }

  // for anything else, return
  return null
}

const getOwner = generateFunction({ encode, decode })

export default getOwner