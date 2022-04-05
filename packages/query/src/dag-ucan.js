import { CID } from 'multiformats/cid'
import * as json from 'multiformats/codecs/json'
import { base64url } from 'multiformats/bases/base64'
import * as CBOR from '@ipld/dag-cbor'
import * as UTF8 from './utf8.js'


export const code = 0x78c0

/**
 * @typedef {import('ucan-storage/types').BuildPayload} Payload
 * @param {Payload} payload
 */
export const create = ({
  audience,
  issuer,
  capabilities,
  lifetimeInSeconds = 30,
  expiration,
  notBefore,
  facts,
  proofs = [],
  addNonce = false,
}) => {
  return {
    audience,
    issuer,
    capabilities,
    lifetimeInSeconds,
    expiration,
    notBefore,
    facts,
    proofs,
    addNonce,
  }
}

/**
 * @param {UCAN.Issuer<'EdDSA'>} issuer
 * @param {UCAN.DeriveOptions} options
 * @returns {Promise<UCAN.UCAN>}
 */
export const issue = async (
  issuer,
  {
    audience,
    capabilities,
    lifetimeInSeconds = 30,
    expiration,
    notBefore,
    facts,
    proofs = [],
    addNonce = false,
  }
) => {
  const header = encodeHeader({ algorithm: issuer.algorithm })

  // Validate
  if (!audience.toString().startsWith('did:')) {
    throw new Error('The audience must be a DID')
  }

  // Timestamps
  const currentTimeInSeconds = Math.floor(Date.now() / 1000)
  const exp = expiration || currentTimeInSeconds + lifetimeInSeconds

  const body = encodeBody({
    issuer: issuer.did(),
    audience: audience.toString(),
    // TODO: Properly encode links
    capabilities,
    facts,
    expiration: exp,
    notBefore,
    proofs,
  })

  const payload = UTF8.encode(
    `${base64url.baseEncode(header)}.${base64url.baseEncode(body)}`
  )
  // const signature = await issuer.sign(payload)
}

/**
 * @template {UCAN.DID} Issuer
 * @template {UCAN.Capability} C
 */
class UCANView {
  /**
   *
   * @param {UCAN.ByteView<UCAN.Header>} encodedHeader
   * @param {UCAN.ByteView<UCAN.Body<C>>} encodedBody
   * @param {UCAN.Signature<UCAN.PrivateKey<Issuer>, UCAN.UCAN<C>>} signature
   */
  constructor(encodedHeader, encodedBody, signature) {
    this.encodedHeader = encodedHeader
    this.encodedBody = encodedBody
    this.signature = signature
  }
  header() {
    return decodeHeader(this.encodedHeader)
  }

  body() {
    return decodeBody(this.encodedBody)
  }
}

/**
 * @template {UCAN.DID} Issuer
 * @template {UCAN.Capability} C
 * @param {UCAN.Node<Issuer, C>} ucan
 * @returns {UCAN.ByteView<UCAN.UCAN<Issuer, C>>}
 */
export const encode = (ucan) =>
  CBOR.encode({
    header: ucan.encodedHeader,
    body: ucan.encodedBody,
    signature: ucan.signature,
  })

/**
 * @template {UCAN.DID} Issuer
 * @template {UCAN.Capability} C
 * @param {UCAN.ByteView<UCANView<Issuer, C>>} bytes
 * @returns {UCANView<Issuer, C>}
 */
export const decode = (bytes) => {
  const data = CBOR.decode(bytes)
  return new UCANView(data.header, data.body, data.signature)
}


const VERSION = '0.8.1'
const TYPE = 'JWT'

/**
 * @param {object} options
 * @param {string} options.algorithm
 * @param {string} [options.version]
 * @returns {UCAN.ByteView<UCAN.Header>}
 */
const encodeHeader = ({ algorithm, version = VERSION }) =>
  json.encode({
    alg: algorithm,
    typ: TYPE,
    ucv: version,
  })

/**
 * @param {UCAN.ByteView<UCAN.Header>} bytes
 * @returns {UCAN.Header}
 */
const decodeHeader = (bytes) => {
  const { alg, ucv } = json.decode(bytes)
  return { algorithm: alg, version: ucv }
}

/**
 * @param {UCAN.Body} body
 * @returns {UCAN.ByteView<UCAN.Body>}
 */
const encodeBody = (body) => {
  json.encode({
    iss: body.issuer,
    aud: body.audience,
    att: body.capabilities,
    exp: body.expiration,
    fct: body.facts,
    nbf: body.notBefore,
    nnc: body.nonce,
    prf: body.proofs.map(String),
  })
}

/**
 * @param {UCAN.ByteView<UCAN.Body>} bytes
 * @returns {UCAN.Body}
 */
const decodeBody = (bytes) => {
  const { iss, aud, att, exp, fct, nbpf, nnc, prf } = json.decode(bytes)
  const proofs = prf.map(CID.parse)

  return {
    issuer: iss,
    audience: aud,
    capabilities: att,
    expiration: exp,
    facts: fct,
    notBefore: nbpf,
    nonce: nnc,
    proofs: prf.map(CID.parse),
  }
}

export const write = () => {}
