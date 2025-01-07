const dbName = 'vovas';
const storeName = 'sunoTools';

const dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(dbName, 1);

  request.onupgradeneeded = () => request.result.createObjectStore(storeName);
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const storePromise = dbPromise.then(db =>
  db.transaction(storeName, 'readwrite').objectStore(storeName)
);

export class Storage<T extends {}> {

  constructor(
    public key: string,
    public init: T
  ) { };

  async load() {
    const request = ( await storePromise ).get(this.key);

    return new Promise<T>((resolve, reject) => {
      request.onsuccess = () => resolve(
        request.result ?? this.init
      );
      request.onerror = () => reject(request.error);
    });
  };

  async save(data: T) {
    ( await storePromise ).put(data, this.key);
  };

};