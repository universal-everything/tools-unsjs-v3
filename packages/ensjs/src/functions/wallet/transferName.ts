import {
  encodeFunctionData,
  labelhash,
  type Account,
  type Address,
  type Hash,
  type SendTransactionParameters,
  type Transport,
} from 'viem'
import { sendTransaction } from 'viem/actions'
import { parseAccount } from 'viem/utils'
import { baseRegistrarTransfeSnippet } from '../../contracts/baseRegistrar.js'
import type { ChainWithEns, ClientWithAccount } from '../../contracts/consts.js'
import { getChainContractAddress } from '../../contracts/getChainContractAddress.js'
import {
  registrySetOwnerSnippet,
  registrySetSubnodeOwnerSnippet,
} from '../../contracts/registry.js'
import {
  AdditionalParameterSpecifiedError,
  InvalidContractTypeError,
  UnsupportedNameTypeError,
} from '../../errors/general.js'
import type {
  Prettify,
  SimpleTransactionRequest,
  WriteTransactionParameters,
} from '../../types.js'
import { getNameType } from '../../utils/getNameType.js'
import { makeLabelNodeAndParent } from '../../utils/makeLabelNodeAndParent.js'
import { namehash } from '../../utils/normalise.js'

type BaseTransferNameDataParameters = {
  /** Name to transfer */
  name: string
  /** Transfer recipient */
  newOwnerAddress: Address
  /** Contract to use for transfer */
  contract: 'registry' | 'registrar'
  /** Reclaim ownership as registrant (registrar only) */
  reclaim?: boolean
  /** Transfer name as the parent owner */
  asParent?: boolean
}

type RegistryOrNameWrapperTransferNameDataParameters = {
  contract: 'registry'
  reclaim?: never
}

type BaseRegistrarTransferNameDataParameters = {
  contract: 'registrar'
  asParent?: never
}

export type TransferNameDataParameters = BaseTransferNameDataParameters &
  (
    | RegistryOrNameWrapperTransferNameDataParameters
    | BaseRegistrarTransferNameDataParameters
  )

export type TransferNameDataReturnType = SimpleTransactionRequest

export type TransferNameParameters<
  TChain extends ChainWithEns,
  TAccount extends Account | undefined,
  TChainOverride extends ChainWithEns | undefined,
> = Prettify<
  TransferNameDataParameters &
    WriteTransactionParameters<TChain, TAccount, TChainOverride>
>

export type TransferNameReturnType = Hash

export const makeFunctionData = <
  TChain extends ChainWithEns,
  TAccount extends Account,
>(
  wallet: ClientWithAccount<Transport, TChain, TAccount>,
  { name, newOwnerAddress, contract, asParent }: TransferNameDataParameters,
): TransferNameDataReturnType => {
  switch (contract) {
    case 'registry': {
      const registryAddress = getChainContractAddress({
        client: wallet,
        contract: 'ensRegistry',
      })
      if (asParent) {
        const { labelhash: labelhashId, parentNode } =
          makeLabelNodeAndParent(name)
        return {
          to: registryAddress,
          data: encodeFunctionData({
            abi: registrySetSubnodeOwnerSnippet,
            functionName: 'setSubNameOwner',
            args: [parentNode, labelhashId, newOwnerAddress],
          }),
        }
      }
      return {
        to: registryAddress,
        data: encodeFunctionData({
          abi: registrySetOwnerSnippet,
          functionName: 'setOwner',
          args: [namehash(name), newOwnerAddress],
        }),
      }
    }
    case 'registrar': {
      if (asParent)
        throw new AdditionalParameterSpecifiedError({
          parameter: 'asParent',
          allowedParameters: ['name', 'newOwnerAddress', 'contract', 'reclaim'],
          details: "Can't transfer a name as the parent owner on the registrar",
        })
      const nameType = getNameType(name)
      if (nameType !== 'eth-2ld')
        throw new UnsupportedNameTypeError({
          nameType,
          supportedNameTypes: ['eth-2ld'],
          details:
            'Only eth-2ld names can be transferred on the registrar contract',
        })
      const labels = name.split('.')
      const tokenId = labelhash(labels[0])
      return {
        to: getChainContractAddress({
          client: wallet,
          contract: 'ensBaseRegistrarImplementation',
        }),
        data: encodeFunctionData({
          abi: baseRegistrarTransfeSnippet,
          functionName: 'transfer',
          args: [wallet.account.address, newOwnerAddress, tokenId, true, '0x'],
        }),
      }
    }
    default:
      throw new InvalidContractTypeError({
        contractType: contract,
        supportedContractTypes: ['registry', 'registrar'],
      })
  }
}

/**
 * Transfers a name to a new owner.
 * @param wallet - {@link ClientWithAccount}
 * @param parameters - {@link TransferNameParameters}
 * @returns Transaction hash. {@link TransferNameReturnType}
 *
 * @example
 * import { createWalletClient, custom } from 'viem'
 * import { mainnet } from 'viem/chains'
 * import { addEnsContracts } from '@ensdomains/ensjs'
 * import { transferName } from '@ensdomains/ensjs/wallet'
 *
 * const wallet = createWalletClient({
 *   chain: addEnsContracts(mainnet),
 *   transport: custom(window.ethereum),
 * })
 * const hash = await transferName(wallet, {
 *   name: 'ens.eth',
 *   newOwnerAddress: '0xFe89cc7aBB2C4183683ab71653C4cdc9B02D44b7',
 *   contract: 'registry',
 * })
 * // 0x...
 */
async function transferName<
  TChain extends ChainWithEns,
  TAccount extends Account | undefined,
  TChainOverride extends ChainWithEns | undefined = ChainWithEns,
>(
  wallet: ClientWithAccount<Transport, TChain, TAccount>,
  {
    name,
    newOwnerAddress,
    contract,
    reclaim,
    asParent,
    ...txArgs
  }: TransferNameParameters<TChain, TAccount, TChainOverride>,
): Promise<TransferNameReturnType> {
  const data = makeFunctionData(
    {
      ...wallet,
      account: parseAccount((txArgs.account || wallet.account)!),
    } as ClientWithAccount<Transport, TChain, Account>,
    {
      name,
      newOwnerAddress,
      contract,
      reclaim,
      asParent,
    } as TransferNameDataParameters,
  )
  const writeArgs = {
    ...data,
    ...txArgs,
  } as SendTransactionParameters<TChain, TAccount, TChainOverride>
  return sendTransaction(wallet, writeArgs)
}

transferName.makeFunctionData = makeFunctionData

export default transferName
