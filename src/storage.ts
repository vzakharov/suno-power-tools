const dbName = 'vovas';
const storeName = 'sunoTools';

const dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(dbName, 1);

  request.onupgradeneeded = () => request.result.createObjectStore(storeName);
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

async function storePromise(mode: IDBTransactionMode) {
  return (
    await dbPromise
  ).transaction(storeName, mode).objectStore(storeName);
}

export class Storage<T extends {}> {

  constructor(
    public key: string,
    public init: T
  ) { };

  async load() {
    const request = ( await storePromise('readonly') ).get(this.key);

    return new Promise<T>((resolve, reject) => {
      request.onsuccess = () => resolve(
        request.result ?? this.init
      );
      request.onerror = () => reject(request.error);
    });
  };

  async save(data: T) {
    ( await storePromise('readwrite') ).put(data, this.key);
  };

};