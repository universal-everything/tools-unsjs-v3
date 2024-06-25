export const lsp8TokenOwnerOfSnippet = [
  {
    inputs: [
      {
        name: 'id',
        type: 'uint256',
      },
    ],
    name: 'tokenOwnerOf',
    outputs: [
      {
        name: 'owner',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const

export const lsp8TransferSnippet = [
  {
    inputs: [
      {
        name: 'from',
        type: 'address',
      },
      {
        name: 'to',
        type: 'address',
      },
      {
        name: 'tokenId',
        type: 'bytes32',
      },
      {
        name: 'force',
        type: 'bool',
      },
      {
        name: 'data',
        type: 'bytes',
      },
    ],
    name: 'transfer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const
