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
      address: '0x1c295D9F10d6Ca6FFBF5c71Edc03ef4dFB06a3B9',
    },
    ensBulkRenewal: {
      address: '0x0c2B553C23f23A8612ae40FA097c8803bC2bd9eA',
    },
    ensEthRegistrarController: {
      address: '0xbF15DE6e136fC13A79f8D59206f2BF12e12c4632',
    },
    ensPublicResolver: {
      address: '0x40Ff65b86376A9912Ef5Ec7fecfAEbec5C2F2AB7',
    },
    ensRegistry: {
      address: '0x648497a80c0499BEb5e18965Ba45c9A8B809EB4e',
    },
    ensReverseRegistrar: {
      address: '0xE4a54a910d755f45557b8177e547497161823D25',
    },
    ensUniversalResolver: {
      address: '0x81FDA4082c54871a525Cca24947fbeEbB036EaCE',
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
