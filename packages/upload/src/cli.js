#!/usr/bin/env node
/* eslint-disable no-console */

import sade from 'sade'
import fs from 'fs'
import path from 'path'
import Conf from 'conf'
import { KeyPair } from 'ucan-storage/keypair'
import { validate } from 'ucan-storage/ucan-storage'
import { upload } from './index.js'
import ora from 'ora'
import fetch from '@web-std/fetch'

const NAME = 'web3-upload'

const pkg = JSON.parse(
  // eslint-disable-next-line unicorn/prefer-json-parse-buffer
  fs.readFileSync(new URL('../package.json', import.meta.url), {
    encoding: 'utf8',
  })
)

const config = new Conf({
  projectName: NAME,
  projectSuffix: '',
})

/**
 * Register you DID with the service
 *
 * @param {string} did
 * @param {any} token
 * @param {string | URL | undefined} endpoint
 */
async function registerDID(did, token, endpoint) {
  const registerRes = await fetch(new URL('/user/did', endpoint).toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      did,
    }),
  })
  if (!registerRes.ok) {
    const rsp = await registerRes.json()
    throw new Error(rsp.error.message)
  }
}

/**
 * Request a Root UCAN from the service
 *
 * @param {any} token
 * @param {string | URL | undefined} endpoint
 */
async function requestRootUCAN(token, endpoint) {
  const ucanReq = await fetch(new URL('/ucan/token', endpoint).toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  if (!ucanReq.ok) {
    const rsp = await ucanReq.json()
    throw new Error(rsp.error.message)
  }

  const { value: rootUCAN } = await ucanReq.json()

  return rootUCAN
}

const prog = sade('web3-upload')

prog.version(pkg.version)

prog
  .command('auth')
  .describe('Create or save a keypair to the config.')
  .option('--force', 'Override config with new keypair.', false)
  .option('--private-key', 'Create new keypair with private key.')
  .option('--ucan', 'UCAN issued by the service to your DID.')
  .action(async (opts) => {
    const spinner = ora('Creating new keypair').start()
    try {
      const privateKey = /** @type {string | undefined} */ (
        config.get('private-key')
      )

      /**
       * @param {string} ucan
       * @param {KeyPair} kp
       */
      async function validateAndSaveUcan(ucan, kp) {
        if (ucan) {
          const r = await validate(ucan)
          if (kp.did() !== r.payload.aud) {
            throw new Error('UCAN does not match keypair DID.')
          }
          config.set('ucan', ucan)
        }
      }

      // Save or override keypair
      if (opts['private-key']) {
        const kp = await KeyPair.fromExportedKey(opts['private-key'])
        config.set('private-key', kp.export())
        await validateAndSaveUcan(opts.ucan, kp)
        spinner.succeed(`Keypair created and saved to ${config.path}`)
        return
      }

      // Create or override keypair
      if (opts.force || !privateKey) {
        const kp = await KeyPair.create()
        config.set('private-key', kp.export())
        spinner.succeed(`Keypair created and saved to ${config.path}`)
        return
      }

      if (privateKey) {
        await validateAndSaveUcan(
          opts.ucan,
          await KeyPair.fromExportedKey(privateKey)
        )
        spinner.succeed(
          `Your already have a private key in your config, use --force to override.`
        )
        return
      }
    } catch (error) {
      // @ts-ignore
      spinner.fail(error.message)
      console.error(error)
      process.exit(1)
    }
  })

prog
  .command('service')
  .describe("Register with the service using config's keypair.")
  .option('--name', 'Service name.', 'nft.storage')
  .option('--key', 'Service API key.', '')
  .action(async (opts) => {
    const spinner = ora('Registering with the service').start()
    try {
      if (!config.get('private-key')) {
        spinner.fail(
          `You dont have a private key saved yet, run "${NAME} keypair"`
        )
        process.exit(1)
      }

      // @ts-ignore
      const kp = await KeyPair.fromExportedKey(config.get('private-key'))
      let endpoint = ''
      switch (opts.name) {
        case 'nft.storage':
          endpoint = 'https://api.nft.storage'
          break
        default:
          endpoint = 'https://api.nft.storage'
          break
      }

      const isDidSyncedWithKeypair = kp.did() === config.get('did')

      if (!config.get('did') || !isDidSyncedWithKeypair) {
        await registerDID(kp.did(), opts.key, endpoint)
        config.set('did', kp.did())
      }

      if (!config.get('ucan') || !isDidSyncedWithKeypair) {
        const ucan = await requestRootUCAN(opts.key, endpoint)
        config.set('ucan', ucan)
      }

      spinner.succeed('Registration done.')
    } catch (error) {
      // @ts-ignore
      spinner.fail(error.message)
      console.error(error)
      process.exit(1)
    }
  })

prog
  .command('upload <file>')
  .describe('Upload file.')
  .action(async (file) => {
    const spinner = ora('Uploading...').start()
    try {
      const stream = fs.createReadStream(path.resolve(file))
      const up = await upload(stream, {
        privateKey: /** @type {string} */ (config.get('private-key')),
        ucan: /** @type {string} */ (config.get('ucan')),
        presignHost: 'http://localhost:4000',
      })
      spinner.succeed(`Uploaded content ${up?.contentCid} in CAR ${up?.cid}`)
    } catch (error) {
      // @ts-ignore
      spinner.fail(error.message)
      console.error(error)
      process.exit(1)
    }
  })

prog
  .command('config')
  .describe('Print config file content.')
  .action(async () => {
    try {
      for (const [key, value] of config) {
        console.log(`${key}: ${value}`)
      }
    } catch (error) {
      console.error(error)
      process.exit(1)
    }
  })

prog.parse(process.argv)
