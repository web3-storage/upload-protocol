import { sha256 } from '@noble/hashes/sha256'

/**
 * @typedef {import('stream').Readable} NodeReadableStream
 */

/**
 * Check for web readable stream
 *
 * @template {unknown} TChunk
 * @template {any} Other
 * @param {Other|ReadableStream<TChunk>} value
 * @returns {value is ReadableStream<TChunk>}
 */
const isWebReadableStream = (value) => {
  return value && typeof (/** @type {any} */ (value).getReader) === 'function'
}

/**
 * Check if it's an AsyncIterable
 *
 * @template {unknown} TChunk
 * @template {any} Other
 * @param {Other|AsyncIterable<TChunk>} value
 * @returns {value is AsyncIterable<TChunk>}
 */
const isAsyncIterable = (value) => {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (/** @type {any} */ (value)[Symbol.asyncIterator]) === 'function'
  )
}

/**
 * Iterate streams
 *
 * @template T
 * @param {ReadableStream<T> | NodeReadableStream} stream
 * @returns {AsyncGenerator<T, void, undefined>}
 */
export async function* iterate(stream) {
  if (isWebReadableStream(stream)) {
    const reader = stream.getReader()
    while (true) {
      const next = await reader.read()
      if (next.done) {
        return
      } else {
        yield next.value
      }
    }
  }

  if (isAsyncIterable(stream)) {
    yield* stream
  } else {
    throw new TypeError("Stream can't be converted to AsyncIterable")
  }
}

/**
 * Collects all values from an (async) iterable into an array and returns it.
 *
 * @template T
 * @param {AsyncIterable<T>|Iterable<T>} source
 */
export const all = async (source) => {
  const arr = []

  for await (const entry of source) {
    arr.push(entry)
  }

  return arr
}

/**
 * Collects all values from an (async) iterable into an array and returns it.
 *
 * @param {AsyncIterable<Uint8Array>|Iterable<Uint8Array>} source
 */
export const consumeAndHash = async (source) => {
  const parts = []
  const sha = sha256.create()

  for await (const entry of source) {
    sha.update(entry)
    parts.push(entry)
  }
  const hash = sha.digest()

  return { parts, hash }
}
