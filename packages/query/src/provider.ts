
export interface Context<DID, Link, Token> {
  proofs: ProofsProvider<Token>
  store: DIDLinkAssociationProvider<DID, Link, Token>
}

export interface TokenProvider<T> {
  /**
   * Service MAY need to lookup a proof by CID that was previously stored. In
   * such case it will call this to do a lookup.
   */
  getToken(
    cid: Link<T>
  ): Result<T, ProofNotFoundError | RevokedError | InvalidProofError>

  /**
   * Checks status of the given proof by it's CID. Just like get execept when
   * actual value is irrelevant.
   */
  getStatus(
    cid: Link<T>
  ): Result<void, ProofNotFoundError | RevokedError | InvalidProofError>

  /**
   * Saves valid proof and associated token. Calling `get` after this should return `T`
   * unless it has been rovked. It may error with `RevokedError` if it had
   * been revoked concurrently by other actor.
   *
   */
  validate(cid: Link<T>, token: T): Result<undefined, RevokedError>

  /**
   * Saves invalid proof so that we can avoid validating it again.
   */
  invalidate(
    cid: Link<T>,
    token: T,
    reason: InvalidProofError
  ): Result<undefined, ProofNotFoundError>
}

export interface DIDLinkAssociationProvider<DID, Link, Proof> {
  /**
   * Service will call this once it verified the UCAN to associate link with a
   * given DID. Service is unaware if given `DID` is associated with some account
   * or not, if it is not `StoreProvider` MUST return `UnauthorizedDIDError`.
   */
  add(
    group: DID,
    link: Link,
    proof: Proof
  ): Result<AddStatus, UnauthorizedDIDError | QuotaViolationError>
  remove(
    group: DID,
    link: Link,
    ucan: Proof
  ): Result<undefined, UnauthorizedDIDError | DoesNotHasError>
}

export interface AddStatus {
  /**
   * Should be `ok` if we already have car and we don't need to perform upload.
   * Otherwise should be `pending`.
   */
  status: 'in-s3' | 'not-in-s3'
}

export interface ProofNotFoundError extends Error {
  cid: Link
}

export interface QuotaViolationError extends Error {
  group: DID
  link: Link
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

export type Result<T, X> = { ok: true; value: T } | { ok: false; error: X }
