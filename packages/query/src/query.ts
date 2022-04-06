import type * as UCAN from '@ipld/dag-ucan'
import type { Link, ByteView, DID } from '@ipld/dag-ucan'
import type { sha256 } from 'multiformats/hashes/sha2'

// As per https://hackmd.io/YNH1W7XkT9ey90cLX3dF9A#Shards
export interface Shard {
  blocks: ByteView<unknown>[]
  roots?: Set<Link<unknown>>
}

export type CARLink = Link<Shard, 1, 0x0202, typeof sha256.code>

export declare function serve(context: Context): StoreService

export interface StoreService {
  /**
   * Handles `AddInput` request. If DID in `with` field is not associated with
   * any account responds with `AddError`. If service already has CAR with the
   * given `link` responds with `AddOk`, otherwise responds with `AddPending`
   * providing `.to` URL where client can upload desired CAR file.
   *
   * @param input
   */
  add(input: AddInput): AddResult

  /**
   * Removes give link from the given `DID` group. If DID does not has such
   * link `RemoveError` is returned. If account responsible for `DID` has no
   * other `DID`s in which given link is member of user quota is adjusted, by
   * freeing corresponding space.
   */
  remove(input: RemoveInput): RemoveResult
}

export interface Context {
  proofs: ProofsProvider
  store: StoreProvider
}

export interface ProofsProvider {
  /**
   * Service MAY need to lookup a proof by CID that was previously stored. In
   * such case it will call this to do a lookup.
   */
  get(
    cid: Link<UCAN.UCAN>
  ): Result<UCAN.IR, ProofNotFoundError | RevokedError | InvalidProofError>

  /**
   * Checks status of the given proof by it's CID.
   */
  status(
    cid: Link<UCAN.UCAN>
  ): Result<void, ProofNotFoundError | RevokedError | InvalidProofError>

  /**
   * Saves valid proof and associated token. Calling `get` after this should return `UCAN.IR`
   * unless it has been
   */
  validate(
    cid: Link<UCAN.UCAN>,
    token: UCAN.IR
  ): Result<undefined, RevokedError>

  /**
   * Saves invalid proof so that we can avoid validating it again.
   */
  invalidate(
    cid: Link<UCAN.UCAN>,
    token: UCAN.IR,
    reason: Error
  ): Result<undefined, ProofNotFoundError>
}

export interface StoreProvider {
  /**
   * Service will call this once it verified the UCAN to associate link with a
   * given DID. Service is unaware if given `DID` is associated with some account
   * or not, if it is not `StoreProvider` MUST return `UnauthorizedDIDError`.
   */
  add(
    set: DID,
    link: CARLink,
    ucan: UCAN.IR
  ): Result<AddStatus, UnauthorizedDIDError | QuotaViolationError>
  remove(
    set: DID,
    link: CARLink,
    ucan: UCAN.IR
  ): Result<undefined, UnauthorizedDIDError | DoesNotHasError>
}

export interface AddStatus {
  /**
   * Should be `ok` if we already have car and we don't need to perform upload.
   * Otherwise should be `pending`.
   */
  status: 'ok' | 'pending'
}

export interface ProofNotFoundError extends Error {
  cid: Link
}

export interface QuotaViolationError extends Error {
  group: DID
  link: CARLink
}

/**
 * Token has been rovked
 */
export interface RevokedError extends Error {
  cid: Link
}

export interface InvalidProofError extends Error {
  cid: Link
}

export interface UnauthorizedDIDError extends Error {}

export interface DoesNotHasError extends Error {}

export interface AddInput {
  can: 'store/add'
  with: UCAN.DID
  link: CARLink
}

export type AddResult = AddOk | AddError | AddPending

export interface RemoveInput {
  can: 'store/remove'
  with: UCAN.DID
  link: CARLink
}
export type RemoveResult = RemoveOk | RemoveError

export interface AddOk {
  can: 'status/ok'
  with: UCAN.DID
  link: CARLink
}

export interface AddError {
  can: 'status/error'
  with: UCAN.DID
  link: CARLink

  message: string
}

export interface AddPending {
  can: 'status/pending'
  with: UCAN.DID
  link: CARLink

  /**
   * S3 signed URL to upload corresponding CAR file to.
   */
  to: string
}

export interface RemoveOk {
  can: 'status/ok'
  with: UCAN.DID
  link: CARLink
}

export interface RemoveError {
  can: 'status/error'
  with: UCAN.DID
  link: CARLink
  message: string
}

export type Result<T, X> = { ok: true; value: T } | { ok: false; error: X }
