import {
  encodeFunctionData,
  type Account,
  type Address,
  type Hash,
  type SendTransactionParameters,
  type Transport,
} from 'viem'
import { sendTransaction } from 'viem/actions'
import type { ChainWithEns, ClientWithAccount } from '../../contracts/consts.js'
import { getChainContractAddress } from '../../contracts/getChainContractAddress.js'
import { registrySetSubnodeRecordSnippet } from '../../contracts/registry.js'
import {
  InvalidContractTypeError,
  UnsupportedNameTypeError,
} from '../../errors/general.js'
import { getNameType } from '../../utils/getNameType.js'
import type {
  Prettify,
  SimpleTransactionRequest,
  WriteTransactionParameters,
} from '../../types.js'
import { makeLabelNodeAndParent } from '../../utils/makeLabelNodeAndParent.js'

type BaseCreateSubnameDataParameters = {
  /** Subname to create */
  name: string
  /** New owner of subname */
  owner: Address
  /** Contract to create subname on */
  contract: 'registry'
  /** Resolver address to set */
  resolverAddress?: Address
}

type RegistryCreateSubnameDataParameters = {
  contract: 'registry'
  expiry?: never
  fuses?: never
}

export type CreateSubnameDataParameters = BaseCreateSubnameDataParameters &
  RegistryCreateSubnameDataParameters

export type CreateSubnameDataReturnType = SimpleTransactionRequest

export type CreateSubnameParameters<
  TChain extends ChainWithEns,
  TAccount extends Account | undefined,
  TChainOverride extends ChainWithEns | undefined,
> = Prettify<
  CreateSubnameDataParameters &
    WriteTransactionParameters<TChain, TAccount, TChainOverride>
>

export type CreateSubnameReturnType = Hash

export const makeFunctionData = <
  TChain extends ChainWithEns,
  TAccount extends Account | undefined,
>(
  wallet: ClientWithAccount<Transport, TChain, TAccount>,
  {
    name,
    contract,
    owner,
    resolverAddress = getChainContractAddress({
      client: wallet,
      contract: 'ensPublicResolver',
    }),
  }: CreateSubnameDataParameters,
): CreateSubnameDataReturnType => {
  const nameType = getNameType(name)
  if (nameType === 'tld' || nameType === 'root')
    throw new UnsupportedNameTypeError({
      nameType,
      supportedNameTypes: [
        'eth-2ld',
        'eth-subname',
        'other-2ld',
        'other-subname',
      ],
    })

  const { labelhash, parentNode } = makeLabelNodeAndParent(name)

  switch (contract) {
    case 'registry': {
      return {
        to: getChainContractAddress({
          client: wallet,
          contract: 'ensRegistry',
        }),
        data: encodeFunctionData({
          abi: registrySetSubnodeRecordSnippet,
          functionName: 'setSubNameRecord',
          args: [parentNode, labelhash, owner, resolverAddress, BigInt(0)],
        }),
      }
    }
    default:
      throw new InvalidContractTypeError({
        contractType: contract,
        supportedContractTypes: ['registry'],
      })
  }
}

/**
 * Creates a subname
 * @param wallet - {@link ClientWithAccount}
 * @param parameters - {@link CreateSubnameParameters}
 * @returns Transaction hash. {@link CreateSubnameReturnType}
 *
 * @example
 * import { createWalletClient, custom } from 'viem'
 * import { mainnet } from 'viem/chains'
 * import { addEnsContracts } from '@ensdomains/ensjs'
 * import { createSubname } from '@ensdomains/ensjs/wallet'
 *
 * const wallet = createWalletClient({
 *   chain: addEnsContracts(mainnet),
 *   transport: custom(window.ethereum),
 * })
 * const hash = await createSubname(wallet, {
 *   name: 'sub.ens.eth',
 *   owner: '0xFe89cc7aBB2C4183683ab71653C4cdc9B02D44b7',
 *   contract: 'registry',
 * })
 * // 0x...
 */
async function createSubname<
  TChain extends ChainWithEns,
  TAccount extends Account | undefined,
  TChainOverride extends ChainWithEns | undefined = ChainWithEns,
>(
  wallet: ClientWithAccount<Transport, TChain, TAccount>,
  {
    name,
    contract,
    owner,
    resolverAddress,
    expiry,
    fuses,
    ...txArgs
  }: CreateSubnameParameters<TChain, TAccount, TChainOverride>,
): Promise<CreateSubnameReturnType> {

  const data = makeFunctionData(wallet, {
    name,
    contract,
    owner,
    resolverAddress,
    expiry,
    fuses,
  } as CreateSubnameDataParameters)
  const writeArgs = {
    ...data,
    ...txArgs,
  } as SendTransactionParameters<TChain, TAccount, TChainOverride>

  return sendTransaction(wallet, writeArgs)
}

createSubname.makeFunctionData = makeFunctionData

export default createSubname
