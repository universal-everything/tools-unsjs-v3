import {
  encodePacked,
  keccak256,
  labelhash,
  pad,
  toBytes,
  toHex,
  type Address,
  type Hex,
} from 'viem'
import { CampaignReferenceTooLargeError } from '../errors/utils.js'
import { EMPTY_ADDRESS } from './consts.js'
import { namehash } from './normalise.js'

export type RegistrationParameters = {
  /** Name to register */
  name: string
  /** Address to set owner to */
  owner: Address
  /** Duration of registration */
  duration: number
  /** Random 32 bytes to use for registration */
  secret: Hex
  /** Custom resolver address, defaults to current public resolver deployment */
  resolverAddress?: Address
  /** Records to set upon registration */
  resolvedAddress?: Address
  /** Whether to set Reverse Record or not */
  reverseRecord?: boolean
}

export type CommitmentTuple = [
  labelHash: Hex,
  owner: Address,
  duration: bigint,
  secret: Hex,
  resolver: Address,
  resolvedAddress: Address,
  reverseRecord: boolean,
]

export type RegistrationTuple = [
  label: string,
  owner: Address,
  duration: bigint,
  secret: Hex,
  resolver: Address,
  resolvedAddress: Address,
  reverseRecord: boolean,
]

const cryptoRef =
  (typeof crypto !== 'undefined' && crypto) ||
  (typeof window !== 'undefined' &&
    typeof window.crypto !== 'undefined' &&
    window.crypto) ||
  undefined

export const randomSecret = ({
  platformDomain,
  campaign,
}: {
  platformDomain?: string
  campaign?: number
} = {}) => {
  const bytes = cryptoRef!.getRandomValues(new Uint8Array(32))
  if (platformDomain) {
    const hash = toBytes(namehash(platformDomain))
    for (let i = 0; i < 4; i += 1) {
      bytes[i] = hash[i]
    }
  }
  if (campaign) {
    if (campaign > 0xffffffff)
      throw new CampaignReferenceTooLargeError({ campaign })
    const campaignBytes = pad(toBytes(campaign), { size: 4 })
    for (let i = 0; i < 4; i += 1) {
      bytes[i + 4] = campaignBytes[i]
    }
  }
  return toHex(bytes)
}

export const makeCommitmentTuple = ({
  name,
  owner,
  duration,
  resolverAddress = EMPTY_ADDRESS,
  resolvedAddress = EMPTY_ADDRESS,
  reverseRecord = false,
  secret,
}: RegistrationParameters): CommitmentTuple => {
  const labelHash = labelhash(name.split('.')[0])

  return [
    labelHash,
    owner,
    BigInt(duration),
    secret,
    resolverAddress,
    resolvedAddress,
    reverseRecord,
  ]
}

export const makeRegistrationTuple = (
  params: RegistrationParameters,
): RegistrationTuple => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_labelhash, ...commitmentData] = makeCommitmentTuple(params)
  const label = params.name.split('.')[0]
  return [label, ...commitmentData]
}

export const makeCommitmentFromTuple = (params: CommitmentTuple): Hex => {
  return keccak256(
    encodePacked(
      [
        'bytes32',
        'address',
        'uint256',
        'address',
        'address',
        'bytes32',
        'bool',
      ],
      [
        params[0],
        params[1],
        params[2],
        params[4],
        params[5],
        params[3],
        params[6],
      ],
    ),
  )
}

export const makeCommitment = (params: RegistrationParameters): Hex =>
  makeCommitmentFromTuple(makeCommitmentTuple(params))
