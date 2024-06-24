// we need to allow the use of any interface in the SerializableType type
// it's not entirely safe since we're not checking their contents, but oh well
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface IAnyInterface {}

export type SerializableType =
  | undefined
  | null
  | Error
  | boolean
  | number
  | string
  | SerializableType[]
  | { [key: string]: SerializableType }
  | IAnyInterface;
