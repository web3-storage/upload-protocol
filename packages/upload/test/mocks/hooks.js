/* eslint-disable no-console */
import { execa } from 'execa'
import { fileURLToPath } from 'url'
import { once } from 'events'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let proc

export const mochaHooks = {
  async beforeAll() {
    proc = execa('node', [path.join(__dirname, 'server.js')])
    if (!proc.stdout || !proc.stderr) {
      throw new Error('missing process stdio stream(s)')
    }

    const stdout = await Promise.race([
      once(proc.stdout, 'data'),
      // Make sure that we fail if process crashes. However if it exits without
      // producing stdout just resolve to ''.
      proc.then(() => ''),
    ])

    proc.stdout.on('data', (line) => console.log(line.toString()))
    proc.stderr.on('data', (line) => console.error(line.toString()))

    const startMsg = `Running on localhost:4000`
    if (!stdout.toString().includes(startMsg)) {
      throw new Error(`Failed to start mock server`)
    }
  },

  async afterAll() {
    proc.kill()
  },
}
