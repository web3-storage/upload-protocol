/* eslint-disable no-console */
import dotenv from 'dotenv'
import path from 'path'
import { signer } from '@web-storage/signer'
import polka from 'polka'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({
  path: path.join(__dirname, '../../../../.env'),
})

polka()
  .put('/:cid', async (req, res) => {
    console.log(req.params.cid)
    console.log(req.headers)
    res.writeHead(200, {
      'Content-Type': 'application/json',
    })
    res.end()
  })
  .get('/signer', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '')

    // @ts-ignore
    const signed = await signer(token, {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      region: 'eu-central-1',
      bucket: process.env.S3_BUCKET || '',
      expires: 1000,
    })

    res.writeHead(200, {
      'Content-Type': 'application/json',
    })

    // testing host
    const testURL = new URL(signed.url)
    testURL.host = 'localhost:4000'
    testURL.protocol = 'http'

    res.end(
      JSON.stringify({
        url: testURL.toString(),
        checksum: signed.checksum,
      })
    )
  })

  .listen(4000, () => {
    console.log(`> Running on localhost:4000`)
  })
