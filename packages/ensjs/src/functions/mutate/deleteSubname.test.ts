import { Address, Hex } from 'viem'
import { ownerOfSnippet } from '../../contracts/erc721'
import { getChainContractAddress } from '../../contracts/getChainContractAddress'
import { ownerSnippet, resolverSnippet } from '../../contracts/registry'
import {
  publicClient,
  testClient,
  walletClient,
} from '../../tests/addTestContracts'
import { EMPTY_ADDRESS } from '../../utils/consts'
import { namehash } from '../../utils/normalise'
import deleteSubname from './deleteSubname'

let snapshot: Hex
let accounts: Address[]

beforeAll(async () => {
  accounts = await walletClient.getAddresses()
})

beforeEach(async () => {
  snapshot = await testClient.snapshot()
})

afterEach(async () => {
  await testClient.revert({ id: snapshot })
})

const getOwner = async (name: string) => {
  return publicClient.readContract({
    abi: ownerSnippet,
    functionName: 'owner',
    address: getChainContractAddress({
      client: publicClient,
      contract: 'ensRegistry',
    }),
    args: [namehash(name)],
  })
}

const getNameWrapperOwner = async (name: string) => {
  return publicClient.readContract({
    abi: ownerOfSnippet,
    functionName: 'ownerOf',
    address: getChainContractAddress({
      client: publicClient,
      contract: 'ensNameWrapper',
    }),
    args: [BigInt(namehash(name))],
  })
}

const getResolver = async (name: string) => {
  return publicClient.readContract({
    abi: resolverSnippet,
    functionName: 'resolver',
    address: getChainContractAddress({
      client: publicClient,
      contract: 'ensRegistry',
    }),
    args: [namehash(name)],
  })
}

it('should allow deleting a subname on the registry by parent owner', async () => {
  const tx = await deleteSubname(walletClient, {
    name: 'test.with-subnames.eth',
    contract: 'registry',
    account: accounts[1],
  })
  expect(tx).toBeTruthy()
  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx })
  expect(receipt.status).toBe('success')

  const owner = await getOwner('test.with-subnames.eth')
  expect(owner).toBe(EMPTY_ADDRESS)

  const resolver = await getResolver('test.with-subnames.eth')
  expect(resolver).toBe(EMPTY_ADDRESS)
})

it('should allow deleting a subname on the namewrapper by parent owner', async () => {
  const tx = await deleteSubname(walletClient, {
    name: 'test.wrapped-with-subnames.eth',
    contract: 'nameWrapper',
    account: accounts[1],
  })
  expect(tx).toBeTruthy()
  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx })
  expect(receipt.status).toBe('success')

  const owner = await getOwner('test.wrapped-with-subnames.eth')
  expect(owner).toBe(EMPTY_ADDRESS)

  const resolver = await getResolver('test.wrapped-with-subnames.eth')
  expect(resolver).toBe(EMPTY_ADDRESS)

  const nameWrapperOwner = await getNameWrapperOwner(
    'test.wrapped-with-subnames.eth',
  )
  expect(nameWrapperOwner).toBe(EMPTY_ADDRESS)
})

it('should allow deleting a subname on the namewrapper by name owner', async () => {
  const tx = await deleteSubname(walletClient, {
    name: 'addr.wrapped-with-subnames.eth',
    contract: 'nameWrapper',
    asOwner: true,
    account: accounts[2],
  })
  expect(tx).toBeTruthy()
  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx })
  expect(receipt.status).toBe('success')

  const owner = await getOwner('addr.wrapped-with-subnames.eth')
  expect(owner).toBe(EMPTY_ADDRESS)

  const resolver = await getResolver('addr.wrapped-with-subnames.eth')
  expect(resolver).toBe(EMPTY_ADDRESS)

  const nameWrapperOwner = await getNameWrapperOwner(
    'addr.wrapped-with-subnames.eth',
  )
  expect(nameWrapperOwner).toBe(EMPTY_ADDRESS)
})

it('should not allow deleting top level domain', async () => {
  await expect(
    deleteSubname(walletClient, {
      name: 'eth',
      contract: 'nameWrapper',
      asOwner: true,
      account: accounts[1],
    }),
  ).rejects.toThrow()
})

it('should not allow deleting second level domain', async () => {
  await expect(
    deleteSubname(walletClient, {
      name: 'test123.eth',
      contract: 'registry',
      account: accounts[1],
    }),
  ).rejects.toThrow()
})