import { Address, Hex } from 'viem'
import {
  publicClient,
  testClient,
  waitForTransaction,
  walletClient,
} from '../../tests/addTestContracts'
import { encodeAbi } from '../../utils/encoders/encodeAbi'
import getRecords from '../read/getRecords'
import getResolver from '../read/getResolver'
import setRecords from './setRecords'

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

const dummyABI = [
  {
    type: 'function',
    name: 'supportsInterface',
    constant: true,
    stateMutability: 'view',
    payable: false,
    inputs: [
      {
        type: 'bytes4',
      },
    ],
    outputs: [
      {
        type: 'bool',
      },
    ],
  },
]

it('should return a transaction to the resolver and set successfully', async () => {
  const tx = await setRecords(walletClient, {
    name: 'test123.eth',
    resolverAddress: (await getResolver(publicClient, {
      name: 'test123.eth',
    }))!,
    coins: [
      {
        coin: 'ETC_LEGACY',
        value: '0x42D63ae25990889E35F215bC95884039Ba354115',
      },
    ],
    texts: [{ key: 'foo', value: 'bar' }],
    abi: await encodeAbi({ encodeAs: 'json', data: dummyABI }),
    account: accounts[1],
  })
  expect(tx).toBeTruthy()
  const receipt = await waitForTransaction(tx)
  expect(receipt.status).toBe('success')

  const records = await getRecords(publicClient, {
    name: 'test123.eth',
    records: {
      coins: ['ETC_LEGACY'],
      texts: ['foo'],
      abi: true,
    },
  })
  expect(records.abi!.abi).toStrictEqual(dummyABI)
  expect(records.coins).toMatchInlineSnapshot(`
    [
      {
        "id": 61,
        "name": "ETC_LEGACY",
        "value": "0x42D63ae25990889E35F215bC95884039Ba354115",
      },
    ]
  `)
  expect(records.texts).toMatchInlineSnapshot(`
    [
      {
        "key": "foo",
        "value": "bar",
      },
    ]
  `)
})
it('should error if there are no records to set', async () => {
  await expect(
    setRecords(walletClient, {
      name: 'test123.eth',
      resolverAddress: (await getResolver(publicClient, {
        name: 'test123.eth',
      }))!,

      account: accounts[1],
    }),
  ).rejects.toThrowErrorMatchingInlineSnapshot(`
    "No records specified

    Version: @ensdomains/ensjs@3.0.0-alpha.62"
  `)
})
it('should not wrap with multicall if only setting a single record', async () => {
  const encodedData = setRecords.makeFunctionData(walletClient, {
    name: 'test123.eth',
    resolverAddress: (await getResolver(publicClient, {
      name: 'test123.eth',
    }))!,
    coins: [
      {
        coin: 'ETC_LEGACY',
        value: '0x42D63ae25990889E35F215bC95884039Ba354115',
      },
    ],
  })
  // 0x8b95dd71 is the function selector for setAddr(bytes32,uint256,bytes)
  expect(encodedData.data.startsWith('0x8b95dd71')).toBe(true)
})