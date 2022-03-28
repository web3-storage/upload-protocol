import assert from 'assert'
import fs from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { upload } from '../src/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('Upload', function () {
  it('should upload with ucan', async function () {
    const file = fs.createReadStream(
      path.join(__dirname, 'fixtures/img1-3.png')
    )
    const up = await upload(file, {
      privateKey: process.env.PRIVATE_KEY || '',
      ucan: process.env.ROOT_UCAN || '',
      presignHost: 'http://localhost:4000',
    })

    assert.ok(
      up.cid.toString() ===
        'bagbaieraonl2d52lnizo5bzm5n2frwq62khuaazhqeygwpc627zcmruvk6pq'
    )
  })
})
