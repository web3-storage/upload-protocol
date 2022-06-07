/**
 * Component used by privileged code to store `DID : CID` assocations. It is
 * `n:m` relationship (Specific did will have many CAR CIDs associated with it
 * likewise same CAR CID may be associated with more than one DID)
 */
export interface StorageProvider {
  /**
   * Upload service will call this once it verified the UCAN in order to associate a
   * CAR link with a given DID. Upload service is unaware if given `DID` is associated
   * with some account so it is `StoreProvider`s responsibility to return
   * `UnknownDIDError` if that is at the case.
   *
   * @param group - DID of the group to which car will be added, should be
   * linked with some account.
   * @param link - CID of the CAR that user wants to add.
   * @param proof - CID of the invocation UCAN.
   */
  add(
    group: DID,
    link: Link,
    proof: Link
  ): Result<AddStatus, UnknownDIDError | QuotaViolationError>
  /**
   * @param group - DID of the group from wich link needs to be deassociated.
   * @param link - CID of the CAR that user wants to remove.
   * @param proof - CID of the invocation UCAN.
   */
  remove(
    group: DID,
    link: Link,
    proof: Link
  ): Result<null, UnknownDIDError | DoesNotHasError>
}
 
/**
 * Component used to register accounts and/or link/unlink new DIDs with them.
 */
export interface AccessProvider {
  /**
   * Associates two DID with one another. Order DIDs does not matter as semantically
   * account is a set of DIDs and this operation is join of sets that each DID belongs
   * to. If neither DID belogs to an account (set) this MUST produce an UnknownDIDError.
   * If both DIDs belong to two different accounts they get joined into a single joint
   * account (set).
   */
  link(member: DID, group: DID, proof: Link): Result<null, UnknownDIDError>
  /**
   * Deassociates `member` DID from the account (set) that `from` DID belongs to. If
   * member dos not belong to it the same account (set) operation is noop. If `from`
   * DID does not belong to any account (set) this MUST produce `UnknownDIDError` error.
   */
  unlink(member: DID, from: DID, proof: Link): Result<null, UnknownDIDError>

  /**
   * This is equivalent of `link` operation, only difference is unlike `link` this MUST
   * create a new account (set) if neither belong to a any account (set).
   */
  register(member: DID, group:DID, proof: Link): Result<null, UnknownDIDError>

  /**
   * Resolves account DID associated with a given DID. Returns either account
   * did (which will have form of `did:ipld:bafy...hash`) or `null` if no account
   * is associated with a given `did`.
   *
   * Please note that account did is not static and it will change when two
   * accounts are joined into one. New account DID will correspond to proof CID
   * provided in link/register request.
   */
  resolve(member: DID): Await<DID | null>
}
