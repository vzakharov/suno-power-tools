const dbName = 'vovas';
const storeName = 'sunoTools';

const dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(dbName, 1);

  request.onupgradeneeded = () => request.result.createObjectStore(storeName);
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

async function dbTransaction(mode: IDBTransactionMode) {
  return ( await dbPromise ).transaction(storeName, mode);
};

function transactionCompletionPromise(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function storePromise(mode: IDBTransactionMode) {
  return ( await dbTransaction(mode) ).objectStore(storeName);
};

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
    const transaction = await dbTransaction('readwrite');
    transaction.objectStore(storeName).put(data, this.key);
    return transactionCompletionPromise(transaction);
  };

  async clear() {
    const transaction = await dbTransaction('readwrite');
    transaction.objectStore(storeName).delete(this.key);
    return transactionCompletionPromise(transaction);
  }

};