import type { Readable as NodeReadable } from 'stream'

export type Readable = NodeReadable | ReadableStream

export interface SignOptions {
  bucket: string
  key: string
  checksum?: string
  expires?: number
}

export interface UploadOptions {
  ucan: string
  privateKey: string
  presignHost?: string
}
