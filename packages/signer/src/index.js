import { UcanChain } from 'ucan-storage/ucan-chain'
import { CID } from 'multiformats/cid'
import { base64pad } from 'multiformats/bases/base64'
import { SigV4 } from '@web-storage/sigv4'

const DIDs = new Set([
  'did:key:z6MknjRbVGkfWK1x5gyJZb6D4LjMj1EsitFzcSccS3sAaviQ',
])

/**
 *
 * @param {string} ucan
 * @param {import('./types').SignerOptions} opts
 */
export async function signer(ucan, opts) {
  // sigv4
  const sig = new SigV4({
    accessKeyId: opts.accessKeyId,
    secretAccessKey: opts.secretAccessKey,
    region: opts.region,
  })

  const token = await UcanChain.fromToken(ucan, {})

  if (!DIDs.has(token.audience())) {
    throw new Error('Invalid UCAN: Audience does not match this service.')
  }

  // Add support for new semantics and use token.caps()
  const caps = token.capabilities()

  const resource = caps[0]

  const cid = CID.parse(resource.with.replace('storage+car://', ''))
  const checksum = base64pad.baseEncode(cid.multihash.digest)
  const url = sig.sign({
    bucket: process.env.S3_BUCKET || '',
    key: cid.toString(),
    checksum: checksum,
    expires: 1000,
  })

  return {
    ucan,
    url,
    cid,
    checksum,
  }
}
