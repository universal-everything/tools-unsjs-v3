import type { Hex } from 'viem'
import type { ClientWithEns } from '../../contracts/consts.js'
import type { Prettify, SimpleTransactionRequest } from '../../types.js'
import {
  generateFunction,
  type GeneratedFunction,
} from '../../utils/generateFunction.js'
import _getAbi, {
  type InternalGetAbiParameters,
  type InternalGetAbiReturnType,
} from './_getAbi.js'
import { getChainContractAddress } from '../../contracts/getChainContractAddress.js'

export type GetAbiRecordParameters = Prettify<
  InternalGetAbiParameters & {
    /** Batch gateway URLs to use for resolving CCIP-read requests. */
    gatewayUrls?: string[]
  }
>

export type GetAbiRecordReturnType = Prettify<InternalGetAbiReturnType>

const encode = (
  client: ClientWithEns,
  { name, supportedContentTypes }: Omit<GetAbiRecordParameters, 'strict'>,
): SimpleTransactionRequest => {
  const prData = _getAbi.encode(client, { name, supportedContentTypes })
  prData.to = getChainContractAddress({
    client,
    contract: 'ensUniversalResolver',
  })
  return prData
}

const decode = async (
  client: ClientWithEns,
  data: Hex,
  { strict }: Pick<GetAbiRecordParameters, 'strict' | 'gatewayUrls'>,
): Promise<GetAbiRecordReturnType> => {
  if (!data) return null
  return _getAbi.decode(client, data, { strict })
}

type BatchableFunctionObject = GeneratedFunction<typeof encode, typeof decode>

/**
 * Gets the ABI record for a name
 * @param client - {@link ClientWithEns}
 * @param parameters - {@link GetAbiRecordParameters}
 * @returns ABI record for the name, or `null` if not found. {@link GetAbiRecordReturnType}
 *
 * @example
 * import { createPublicClient, http } from 'viem'
 * import { mainnet } from 'viem/chains'
 * import { addEnsContracts } from '@ensdomains/ensjs'
 * import { getAbiRecord } from '@ensdomains/ensjs/public'
 *
 * const client = createPublicClient({
 *   chain: addEnsContracts(mainnet),
 *   transport: http(),
 * })
 * const result = await getAbiRecord(client, { name: 'ens.eth' })
 * // TODO: real example
 */
const getAbiRecord = generateFunction({ encode, decode }) as ((
  client: ClientWithEns,
  { name, strict, gatewayUrls, supportedContentTypes }: GetAbiRecordParameters,
) => Promise<GetAbiRecordReturnType>) &
  BatchableFunctionObject

export default getAbiRecord
