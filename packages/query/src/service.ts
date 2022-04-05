import type { DID, Link, Phantom } from './api'
import type { KeyPair } from 'ucan-storage/keypair'

interface StoreService {
  add(input: {
    with: DID
    link: Link
  }):
    | { status: 'ok'; with: DID; link: Link }
    | { status: 'error'; with: DID; link: Link }
    | { status: 'pending'; with: DID; link: Link; at: URL }

  remove(input: {
    with: DID
    link: Link
  }):
    | { can: '/remove'; status: 'ok'; with: DID; link: Link }
    | { can: '/remove'; status: 'error'; with: DID; link: Link }
}

interface Access {
  identify(input: { with: DID; as: string }): { with: DID; as: string }
}

interface MainService {
  store: StoreService
  access: Access
}

type Endpoint<Can, In, Out> = { can: Can; input: In; output: Out }

type Values<T> = T[keyof T]

export type API<Service extends object, NS extends string = ''> = {
  [K in keyof Service as `${NS}/${string & K}`]: Service[K] extends (
    input: infer In
  ) => infer Out
    ? Endpoint<`${NS}/${K & string}`, { can: `${NS}/${K & string}` } & In, Out>
    : never
}

export type APIGroup<Service> = Values<{
  [Key in keyof Service]: API<Service[Key] & object, Key & string>
}>

type API2<Service extends object, NS extends string = ''> = UnionToIntersection<
  Values<{
    [Key in keyof Service]: Service[Key] extends unknown[]
      ? never
      : Service[Key] extends (input: infer In) => infer Out
      ? Record<
          `${NS}/${Key & string}`,
          Endpoint<
            `${NS}/${Key & string}`,
            { can: `${NS}/${Key & string}` } & In,
            Out
          >
        >
      : Service[Key] extends Record<any, any>
      ? API2<
          Service[Key],
          string extends '' ? Key & string : `${NS}/${Key & string}`
        >
      : never
  }>
>

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never

type T = API2<{
  store: StoreService
  access: Access
  // bar: (a:number) => number,
  // baz: number[]
  // foo: 1
}>

export type Store = Connection<{ store: StoreService }>

export type Input<Service> = Values<APIGroup<Service>>['input']

export type Output<Service, Can> = Can extends keyof APIGroup<Service>
  ? APIGroup<Service>[Can]['output']
  : never

declare function invoke<Service, In extends Input<Service>>(
  service: Connection<Service>,
  input: In
): Output<Service, In['can']>

declare var store: Store
declare var main: API2<MainService>

const out = invoke(store, {
  can: 'store/add',
  with: 'did:key:user' as DID,
  link: 'bag...hash' as any as Link,
})

interface Invocation<In, Out> {
  input: In
  read(): Promise<Out>
}

export type QueryResult<
  Service,
  Query extends Record<string, Input<Service>>
> = {
  [Key in keyof Query]: Output<Service, Query[Key]['can']>
}

export type Query<Service> = Record<string, Input<Service>>

export interface Connection<T> extends Phantom<T> {
  url: URL
  issuer: KeyPair
  audience: DID
}

export declare function query<Service, Input extends Query<Service>>(
  config: Connection<Service>,
  query: Input
): QueryResult<Service, Input>

const result = query(store, {
  a: {
    can: 'store/add',
    with: 'did:key:user' as DID,
    link: 'bag...hash' as any as Link,
  },
  b: {
    can: 'store/remove',
    with: 'did:key:user' as DID,
    link: 'bag...hash2' as any as Link,
  },
})

result.b
