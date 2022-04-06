import { ethers, utils } from 'ethers'
import { ENS } from '..'
import setup from './setup'

let ENSInstance: ENS
let revert: Awaited<ReturnType<typeof setup>>['revert']
let createSnapshot: Awaited<ReturnType<typeof setup>>['createSnapshot']
let provider: ethers.providers.JsonRpcProvider
let accounts: string[]

beforeAll(async () => {
  ;({ ENSInstance, revert, createSnapshot, provider } = await setup())
  accounts = await provider.listAccounts()
})

afterAll(async () => {
  await revert()
})

describe('deleteSubname', () => {
  beforeEach(async () => {
    await revert()
  })
  it('should allow deleting a subname on the registry', async () => {
    const createSubnameTx = await ENSInstance.createSubname({
      contract: 'registry',
      name: 'test.parthtejpal.eth',
      owner: accounts[0],
      options: { addressOrIndex: 0 },
    })
    await createSubnameTx.wait()

    const tx = await ENSInstance.deleteSubname(
      'test.parthtejpal.eth',
      'registry',
      { addressOrIndex: 0 },
    )
    expect(tx).toBeTruthy()
    await tx.wait()

    const registry = await ENSInstance.contracts!.getRegistry()!
    const result = await registry.owner(utils.namehash('test.parthtejpal.eth'))
    expect(result).toBe('0x0000000000000000000000000000000000000000')
  })
  it('should allow deleting a subname on the nameWrapper', async () => {
    const wrapNameTx = await ENSInstance.wrapName(
      'parthtejpal.eth',
      accounts[0],
    )
    await wrapNameTx.wait()
    const createSubnameTx = await ENSInstance.createSubname({
      contract: 'nameWrapper',
      name: 'test.parthtejpal.eth',
      owner: accounts[0],
      shouldWrap: true,
      options: { addressOrIndex: 0 },
    })
    await createSubnameTx.wait()

    const tx = await ENSInstance.deleteSubname(
      'test.parthtejpal.eth',
      'nameWrapper',
      { addressOrIndex: 0 },
    )
    expect(tx).toBeTruthy()
    await tx.wait()

    const registry = await ENSInstance.contracts!.getRegistry()!
    const result = await registry.owner(utils.namehash('test.parthtejpal.eth'))
    expect(result).toBe('0x0000000000000000000000000000000000000000')
  })
})