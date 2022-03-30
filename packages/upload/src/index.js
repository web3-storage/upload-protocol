import * as FileImporter from '@ipld/unixfs/src/file.js'
import { CarWriter } from '@ipld/car'
import { create as multihash } from 'multiformats/hashes/digest'
import { CID } from 'multiformats/cid'
import fetch from '@web-std/fetch'
import { Blob } from '@web-std/blob'
import { KeyPair } from 'ucan-storage/keypair'
import { build, validate } from 'ucan-storage/ucan-storage'
import { consumeAndHash, iterate } from './utils.js'

/**
 *
 * @param {import('./types').Readable} stream
 */
export async function pack(stream) {
  // unixfs
  const { writer, blocks } = FileImporter.createImporter()
  for await (const chunk of iterate(stream)) {
    await writer.write(chunk)
  }

  const root = await writer.close()

  // car
  // @ts-ignore - needs new CID types in multiformats
  const { writer: carWriter, out } = CarWriter.create([root.cid])
  const consumed = consumeAndHash(out)

  for await (const block of iterate(blocks)) {
    carWriter.put({
      bytes: block.bytes,
      // @ts-ignore - needs new CID types in multiformats
      cid: block.cid,
    })
  }

  await carWriter.close()
  const { hash, parts } = await consumed

  const cid = CID.create(1, 0x02_02, multihash(0x12, hash))

  return { cid, blob: new Blob(parts), contentCid: root.cid }
}

/**
 * @param {CID} cid
 * @param {string} privateKey
 * @param {string} ucanProof
 */
export async function sign(cid, privateKey, ucanProof) {
  const kp = await KeyPair.fromExportedKey(privateKey)
  const parsedUcanProof = await validate(ucanProof)

  // TODO: find root issuer needs to be web3 or nft or shoud we use a new DID for uploads v2 ?
  // probably also the root audience to use in the capabilities
  // TODO: ucanProof can have both web3 and nft chains how do we choose ? should ask the user ?
  // TODO: to use root user DID in the resource path we need to resolve it from the chain or ask the user

  const ucan = await build({
    audience: parsedUcanProof.payload.iss,
    issuer: kp,
    lifetimeInSeconds: 1000,
    proofs: [ucanProof],
    capabilities: [
      {
        with: `storage://${cid}`,
        // @ts-ignore - needs new semantics
        can: 'upload/IMPORT',
      },
    ],
  })

  return ucan
}

/**
 *
 * @param {import('./types').Readable} stream
 * @param {import('./types').UploadOptions} opts
 */
export async function upload(stream, opts) {
  const { cid, blob, contentCid } = await pack(stream)

  const ucan = await sign(cid, opts.privateKey, opts.ucan)

  const rsp = await fetch(new URL('signer', opts.presignHost).toString(), {
    headers: {
      Authorization: `Bearer ${ucan}`,
    },
  })
  if (rsp.ok) {
    const { url, checksum } = await rsp.json()

    const put = await fetch(url, {
      method: 'PUT',
      body: blob,
      headers: {
        'x-amz-checksum-sha256': checksum,
      },
    })

    if (put.ok) {
      return { cid, contentCid }
    } else {
      // console.log(await put.text())
      throw new Error('failed to upload')
    }
  } else {
    // console.log(await rsp.text())
    throw new Error('failed to get signed url')
  }
}
