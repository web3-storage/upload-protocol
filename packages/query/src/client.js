import * as UCAN from '@ipld/dag-ucan'
import * as CARWriter from '@ipld/car/buffer-writer'
import * as CBOR from '@ipld/dag-cbor'
import * as API from './api.js'
import { CID } from 'multiformats/cid'
import { sha256 } from 'multiformats/hashes/sha2'
import * as Service from './service.js'

export const service = new URL('http://localhost:9090')

/**
 * @param {object} options
 * @param {URL} options.url
 * @param {UCAN.Issuer} options.issuer
 * @param {UCAN.Audience} options.audience
 *
 */
export const open = ({ url, issuer, audience }) => ({
  url,
  issuer,
  audience,
})

/**
 * @template T
 * @param {Service.Connection<T>} config
 * @param {Service.Query<T>} input
 * @param {Iterable<UCAN.ByteView<UCAN.UCAN>>} proofs
 * @returns {Promise<UCAN.ByteView<Service.Query<T>>>}
 */
export const query = async (config, input, proofs = []) => {
  const blocks = []
  /** @type {Record<keyof Service.Query<T>, UCAN.Link>} */
  const query = {}
  let byteLength = 0
  for (const [key, value] of Object.entries(input)) {
    const request = await UCAN.issue({
      issuer: config.issuer,
      audience: config.audience,
      capabilities: [/** @type {UCAN.Capability} */ (value)],
    })
    const bytes = UCAN.encode(request)
    const hash = await sha256.digest(bytes)
    const cid = CID.createV1(UCAN.code, hash)
    query[key] = cid
    blocks.push({ cid, bytes })
    byteLength += CARWriter.blockLength({ cid, bytes })
  }

  const bytes = CBOR.encode(query)
  const hash = await sha256.digest(bytes)
  const cid = CID.createV1(CBOR.code, hash)
  byteLength += CARWriter.blockLength({ cid, bytes })
  byteLength += CARWriter.headerLength({ roots: [cid] })

  for (const bytes of proofs) {
    const hash = await sha256.digest(bytes)
    const cid = CID.createV1(UCAN.code, hash)
    blocks.push({ cid, bytes })
    byteLength += CARWriter.blockLength({ cid, bytes })
  }

  const writer = CARWriter.createWriter(new ArrayBuffer(byteLength), {
    roots: [cid],
  })
  writer.write({ cid, bytes })
  for (const block of blocks) {
    writer.write(block)
  }

  return writer.close()
}

// /**
//  * @template T
//  * @template {UCAN.Capability} E
//  * @template {Service.Input<T>} Input
//  * @param {Service.Connection<T>} config
//  * @param {Input} input
//  * @param {UCAN.Link<UCAN.UCAN<E>>[]} [proofs]
//  * @returns {Service.Output<T, Input['can']>}
//  */
// const invoke = (config, input, proofs = []) => {
//   return {
//     audience: config.audience.toString(),
//     issuer: config.issuer,
//     lifetimeInSeconds: 1000,
//     proofs,
//     capabilities: [/** @type {any} */ (input)],
//   }
// }
