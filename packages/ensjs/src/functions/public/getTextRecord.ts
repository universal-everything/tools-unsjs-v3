import type { Hex } from 'viem'
import type { ClientWithEns } from '../../contracts/consts.js'
import type { Prettify, SimpleTransactionRequest } from '../../types.js'
import {
  generateFunction,
  type GeneratedFunction,
} from '../../utils/generateFunction.js'
import _getText, {
  type InternalGetTextParameters,
  type InternalGetTextReturnType,
} from './_getText.js'
import { getChainContractAddress } from '../../contracts/getChainContractAddress.js'

export type GetTextRecordParameters = Prettify<
  InternalGetTextParameters & {
    /** Batch gateway URLs to use for resolving CCIP-read requests. */
    gatewayUrls?: string[]
  }
>

export type GetTextRecordReturnType = Prettify<InternalGetTextReturnType>

const encode = (
  client: ClientWithEns,
  { name, key }: Omit<GetTextRecordParameters, 'strict'>,
): SimpleTransactionRequest => {
  const prData = _getText.encode(client, { name, key })
  prData.to = getChainContractAddress({
    client,
    contract: 'ensUniversalResolver',
  })
  return prData
}

const decode = async (
  client: ClientWithEns,
  data: Hex,
  { strict }: Pick<GetTextRecordParameters, 'strict' | 'gatewayUrls'>,
): Promise<GetTextRecordReturnType> => {
  if (!data) return null
  return _getText.decode(client, data, { strict })
}

type BatchableFunctionObject = GeneratedFunction<typeof encode, typeof decode>

/**
 * Gets a text record for a name.
 * @param client - {@link ClientWithEns}
 * @param parameters - {@link GetTextRecordParameters}
 * @returns Text record string, or null if none is found. {@link GetTextRecordReturnType}
 *
 * @example
 * import { createPublicClient, http } from 'viem'
 * import { mainnet } from 'viem/chains'
 * import { addEnsContracts } from '@ensdomains/ensjs'
 * import { getTextRecord } from '@ensdomains/ensjs/public'
 *
 * const client = createPublicClient({
 *   chain: addEnsContracts(mainnet),
 *   transport: http(),
 * })
 * const result = await getTextRecord(client, { name: 'ens.eth', key: 'com.twitter' })
 * // ensdomains
 */
const getTextRecord = generateFunction({ encode, decode }) as ((
  client: ClientWithEns,
  { name, key, strict, gatewayUrls }: GetTextRecordParameters,
) => Promise<GetTextRecordReturnType>) &
  BatchableFunctionObject

export default getTextRecord
