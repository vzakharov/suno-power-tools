type TestType = Record<`hello`, string> & Record<symbol, boolean>

// I need a utility type that would convert intersections of records like the one above into (for that specific example)
// { key: number, value: string } | { key: string, value: boolean }

type KeyValueMapper<T> = {
  [K in keyof T]: { key: K; value: T[K] }
}[keyof T];

type TestTypeUnion = KeyValueMapper<TestType>