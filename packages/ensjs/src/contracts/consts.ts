import type { Account, Address, Chain, Client, Transport } from 'viem'
import type { Assign, Prettify } from '../types.js'

type ChainContract = {
  address: Address
  blockCreated?: number
}

export const supportedChains = [4201] as const
export const supportedContracts = [
  'ensBaseRegistrarImplementation',
  'ensBulkRenewal',
  'ensEthRegistrarController',
  'ensPublicResolver',
  'ensRegistry',
  'ensReverseRegistrar',
  'ensUniversalResolver',
] as const

export type SupportedChain = (typeof supportedChains)[number]
export type SupportedContract = (typeof supportedContracts)[number]

export const addresses = {
  4201: {
    ensBaseRegistrarImplementation: {
      address: '0x7072caeC10E3b169Dbb37dCE7CBC2922D2ad88Ce',
    },
    ensBulkRenewal: {
      address: '0x06fe2c342257bF41B244f00778383772033a0d4D',
    },
    ensEthRegistrarController: {
      address: '0xB80eA06b1352E5E41ab24670E14CBe4C3c555D1B',
    },
    ensPublicResolver: {
      address: '0xd168b166C2DF5834b5761f1c401295Ce0a6D0E73',
    },
    ensRegistry: {
      address: '0xe81a9403E08a181D9a58a2cf17Af7B6F98a1548F',
    },
    ensReverseRegistrar: {
      address: '0xF9A24D0719582816771b24D05CcA192590C8cd1d',
    },
    ensUniversalResolver: {
      address: '0xC1BBF964ABEeb232A5acF3158A7c9fDe2e937C87',
    },
  },
} as const satisfies Record<
  SupportedChain,
  Record<SupportedContract, { address: Address }>
>

type Subgraphs = {
  ens: {
    url: string
  }
}

export const subgraphs = {
  4201: {
    ens: {
      url: 'http://127.0.0.1:8000/subgraphs/name/graphprotocol/ens',
    },
  },
} as const satisfies Record<SupportedChain, Subgraphs>

type EnsChainContracts = {
  ensBaseRegistrarImplementation: ChainContract
  ensEthRegistrarController: ChainContract
  ensPublicResolver: ChainContract
  ensReverseRegistrar: ChainContract
  ensBulkRenewal: ChainContract
}

type BaseChainContracts = {
  multicall3: ChainContract
  ensUniversalResolver: ChainContract
  ensRegistry: ChainContract
}

export type ChainWithEns<TChain extends Chain = Chain> = Omit<
  TChain,
  'contracts'
> & {
  contracts: BaseChainContracts & EnsChainContracts
  subgraphs: Subgraphs
}

export type ChainWithBaseContracts = Assign<
  Omit<Chain, 'contracts'>,
  {
    contracts: BaseChainContracts
  }
>

export type CheckedChainWithEns<TChain extends Chain> =
  TChain['id'] extends SupportedChain
    ? TChain['contracts'] extends BaseChainContracts
      ? TChain & {
          contracts: Prettify<(typeof addresses)[TChain['id']]>
          subgraphs: (typeof subgraphs)[TChain['id']]
        }
      : never
    : never

export type ClientWithEns<
  TTransport extends Transport = Transport,
  TChain extends ChainWithEns = ChainWithEns,
> = Client<TTransport, TChain>

export type ClientWithAccount<
  TTransport extends Transport = Transport,
  TChain extends ChainWithEns = ChainWithEns,
  TAccount extends Account | undefined = Account | undefined,
> = Client<TTransport, TChain, TAccount>
