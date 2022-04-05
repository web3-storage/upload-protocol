import type { MultihashDigest } from 'multiformats/hashes/interface'
import type { MultibaseEncoder } from 'multiformats/bases/interface'
import type { sha256 } from 'multiformats/hashes/sha2'

export interface Signer<A extends string = string> {
  readonly algorithm: A
  sign<T>(data: ByteView<T>): Promise<Signature<this, T>>
}

export type { MultihashDigest, MultibaseEncoder }

export type QueryService = StoreSrevice & AccessService

export interface StoreSrevice {
  query(input: Invoke<Add>): unknown
  query(input: Invoke<Remove>): unknown
}

export interface AccessService {
  query(input: Invoke<Identify>): unknown
  query<C extends Capability[]>(input: Invoke<Authorize<C>>): unknown
  query(input: CAR<Revoke>): unknown
}

export interface Add {
  can: 'store/add'
  with: ToString<DID, `did:key:${string}`>
  link: CARLink
}

export interface Remove {
  can: 'store/remove'
  with: ToString<DID, `did:key:${string}`>
  link: CARLink
}

type CARLink = CID<1, 0x0202, typeof sha256.code>

export type Invoke<
  T extends Capability,
  To extends DID = DID,
  From extends DID = DID,
  Evidence extends Capability[] = [T]
> = CAR<UCAN<[T], To, From, Evidence>>

export interface Identify {
  can: 'access/identify'
  with: ToString<DID, `did:key:${string}`>
  as: Email
}

export interface Authorize<C extends Capability[]> {
  can: 'access/authorize'
  with: ToString<DID, `did:key:${string}`>

  capabilities?: C
}

interface CAR<T> extends ByteView<Link<T, 1, 0x0202, typeof sha256.code>> {}

// UCAN represents
export interface UCAN<
  Capabilities extends Capability[] = Capability[],
  To extends DID = DID,
  From extends DID = DID,
  Evidence extends Capability[] = Capabilities
> {
  issuer: From
  audience: To
  lifetimeInSeconds: Time
  notBefore?: Time
  capabilities: Capabilities
  proofs?: Link<UCAN<Evidence>>[]
}

export interface Revoke<ID extends Link<UCAN> = Link<UCAN>> {
  issuer: DID
  revoke: ID
  challenge: Signature<PrivateKey<DID>, `REVOKE:${ToString<ID>}`>
}

type Time = number
type Email<
  T extends `${string}@${string}.${string}` = `${string}@${string}.${string}`
> = T

export type Encoded<In, Out> = Out & Phantom<In>
export type ToString<In, Out extends string = string> = Encoded<In, Out>

export interface Signature<CryptoKey, Message>
  extends Phantom<{ privateKey: CryptoKey; message: Message }>,
    Uint8Array {}

export type PrivateKey<T extends DID> = T extends Phantom<{
  privateKey: infer K
}>
  ? K
  : never

export interface Capability<
  Can extends `${string}/${string}` = `${string}/${string}`,
  With extends `${string}:${string}` = `${string}:${string}`
> {
  with: With
  can: Can
}

export interface DID
  extends Phantom<{
    privateKey: CryptoKey
    publicKey: CryptoKey
  }> {
  toString(): string
}

export interface Link<
  T extends unknown = unknown,
  V extends 0 | 1 = 0 | 1,
  C extends number = number,
  A extends number = number
> extends CID<V, C, A>,
    Phantom<T> {}

/**
 * Logical representation of *C*ontent *Id*entifier, where `C` is a logical
 * representation of the content it identifies.
 *
 * Note: This is not an actual definition from multiformats because that one
 * refers to a specific class and there for is problematic.
 *
 * @see https://github.com/multiformats/js-multiformats/pull/161
 */
export interface CID<
  V extends 0 | 1 = 0 | 1,
  C extends number = number,
  A extends number = number
> {
  readonly version: V
  readonly code: C
  readonly multihash: MultihashDigest<A>
  readonly bytes: Uint8Array

  toString<Prefix extends string>(encoder?: MultibaseEncoder<Prefix>): string
}

/**
 * Represents byte encoded representation of the `Data`. It uses type parameter
 * to capture the structure of the data it encodes.
 */
export interface ByteView<Data> extends Uint8Array, Phantom<Data> {}

/**
 * This is an utility type to retain unused type parameter `T`. It can be used
 * as nominal type e.g. to capture semantics not represented in actual type strucutre.
 */
export interface Phantom<T> {
  // This field can not be represented because field name is non-existings
  // unique symbol. But given that field is optional any object will valid
  // type contstraint.
  [PhantomKey]?: T
}

declare const PhantomKey: unique symbol
