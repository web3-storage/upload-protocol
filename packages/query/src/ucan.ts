import type {
  DID,
  Link,
  ToString,
  Signature,
  Signer,
  PrivateKey,
  ByteView,
} from './api.js'
import type { code } from './dag-ucan.js'
import type { API } from './service.js'

export type {
  ToString,
  Signer,
  DID,
  Signature,
  PrivateKey,
  ByteView,
} from './api.js'

type JWT = ToString<UCAN>

export interface DeriveOptions {
  audience: DID
  capabilities: Capability[]
  lifetimeInSeconds?: number
  expiration?: number
  notBefore?: number

  addNonce?: boolean

  facts?: Fact[]
  proofs: Array<Link<UCAN, 1, typeof code>>
}

export interface Issuer<A extends string = string> extends Signer<A> {
  did(): DID
}

export interface Audience {
  did(): DID
}

export interface Header {
  algorithm: string
  version: string
}

export interface Body<C extends Capability = Capability> {
  audience: DID
  issuer: DID
  capabilities: C[]
  expiration: number
  notBefore?: number
  nonce?: string

  facts?: Fact[]
  proofs: Link<UCAN, 1, typeof code>[]
}

export interface Node<Issuer = DID, C extends Capability = Capability> {
  header: ByteView<Header>
  body: ByteView<Body<C>>
  signature: Signature<PrivateKey<Issuer>, UCAN<C>>
}

export interface UCAN<Issuer = DID, C extends Capability = Capability> {
  header: Header
  body: Body<C>
  signature: Signature<PrivateKey<Issuer>, UCAN<C>>
}

export type KeyType = 'rsa' | 'ed25519' | 'bls12-381'
export type Fact = Record<string, unknown>

/**
 * A Capability represents something that a token holder is authorized to do.
 * See [Capability Scope](https://github.com/ucan-wg/spec#24-capability-scope) in the UCAN spec.
 */
export interface Capability {
  /** A UCAN "resource pointer" that specifies what resource the user is authorized to manipulate. */
  with: string

  /** A action that the user is authorized to perform against the specified resource. */
  can: string

  /** Optional constraints (e.g. multihash of upload).
   * See [the UCAN.Storage spec](https://github.com/nftstorage/ucan.storage/blob/main/spec.md) for details. */
  [constrain: string]: unknown
}
