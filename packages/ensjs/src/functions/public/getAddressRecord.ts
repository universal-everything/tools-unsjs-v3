import { BaseError, type Hex } from 'viem'
import type { ClientWithEns } from '../../contracts/consts.js'
import type { Prettify, SimpleTransactionRequest } from '../../types.js'
import { getChainContractAddress } from '../../contracts/getChainContractAddress.js'
import {
  generateFunction,
  type GeneratedFunction,
} from '../../utils/generateFunction.js'
import _getAddr, {
  type InternalGetAddrParameters,
  type InternalGetAddrReturnType,
} from './_getAddr.js'

export type GetAddressRecordParameters = Prettify<
  InternalGetAddrParameters & {
    /** Batch gateway URLs to use for resolving CCIP-read requests. */
    gatewayUrls?: string[]
  }
>

export type GetAddressRecordReturnType = Prettify<InternalGetAddrReturnType>

const encode = (
  client: ClientWithEns,
  { name, coin }: Omit<GetAddressRecordParameters, 'strict' | 'bypassFormat'>,
): SimpleTransactionRequest => {
  const prData = _getAddr.encode(client, { name, coin })
  prData.to = getChainContractAddress({
    client,
    contract: 'ensUniversalResolver',
  })
  return prData
}

const decode = async (
  client: ClientWithEns,
  data: Hex | BaseError,
  {
    coin,
    strict,
  }: Pick<GetAddressRecordParameters, 'coin' | 'strict' | 'gatewayUrls'>,
): Promise<GetAddressRecordReturnType> => {
  if (data instanceof BaseError) return null
  return _getAddr.decode(client, data, {
    coin,
    strict,
  }) as Promise<GetAddressRecordReturnType>
}

type BatchableFunctionObject = GeneratedFunction<typeof encode, typeof decode>

/**
 * Gets an address record for a name and specified coin
 * @param client - {@link ClientWithEns}
 * @param parameters - {@link GetAddressRecordParameters}
 * @returns Coin value object, or `null` if not found. {@link GetAddressRecordReturnType}
 *
 * @example
 * import { createPublicClient, http } from 'viem'
 * import { mainnet } from 'viem/chains'
 * import { addEnsContracts } from '@ensdomains/ensjs'
 * import { getAddressRecord } from '@ensdomains/ensjs/public'
 *
 * const client = createPublicClient({
 *   chain: addEnsContracts(mainnet),
 *   transport: http(),
 * })
 * const result = await getAddressRecord(client, { name: 'ens.eth', coin: 'ETH' })
 * // { id: 60, name: 'ETH , value: '0xFe89cc7aBB2C4183683ab71653C4cdc9B02D44b7' }
 */
const getAddressRecord = generateFunction({ encode, decode }) as ((
  client: ClientWithEns,
  { name, coin, bypassFormat, strict, gatewayUrls }: GetAddressRecordParameters,
) => Promise<GetAddressRecordReturnType>) &
  BatchableFunctionObject

export default getAddressRecord
