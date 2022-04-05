import * as Service from './service.js'
import * as API from './api.js'
import { KeyPair } from 'ucan-storage/keypair'
import { build, validate } from 'ucan-storage/ucan-storage'
export const service = new URL('http://localhost:9090')

/**
 * @param {object} options
 * @param {URL} options.url
 * @param {KeyPair} options.issuer
 * @param {API.DID} options.audience
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
 * @param {Service.Query<T>} query
 */
export const query = (config, query) => {
  const writer = []
  for (const [key, value] of Object.entries(query)) {
    // CBOR.encode()
  }
}

/**
 * @template T
 * @template {API.Capability[]} E
 * @template {Service.Input<T>} Input
 * @param {Service.Connection<T>} config
 * @param {Input} input
 * @param {API.Link<API.UCAN<E>>[]} [proofs]
 * @returns {API.UCAN<[Input], API.DID, API.DID, E>}
 */
const invoke = (config, input, proofs = []) => {
  return {
    audience: config.audience.toString(),
    issuer: config.issuer,
    lifetimeInSeconds: 1000,
    proofs,
    capabilities: [/** @type {any} */ (input)],
  }
}
