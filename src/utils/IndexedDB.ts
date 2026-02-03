export class IndexedDBUtils<T = any> {
  private dbName: string
  private objName: string
  private version: number

  constructor(dbName: string, objName: string, version = 1) {
    this.dbName = dbName
    this.objName = objName
    this.version = version
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, this.version)

      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(this.objName)) {
          db.createObjectStore(this.objName)
        }
      }

      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }

  async set(key: IDBValidKey, value: T): Promise<void> {
    const db = await this.openDB()
    const tx = db.transaction(this.objName, `readwrite`)
    tx.objectStore(this.objName).put(value, key)

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async get(key: IDBValidKey): Promise<T | null> {
    const db = await this.openDB()
    const tx = db.transaction(this.objName, `readonly`)
    const req = tx.objectStore(this.objName).get(key)

    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => reject(req.error)
    })
  }

  async delete(key: IDBValidKey): Promise<void> {
    const db = await this.openDB()
    const tx = db.transaction(this.objName, `readwrite`)
    tx.objectStore(this.objName).delete(key)

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async clear(): Promise<void> {
    const db = await this.openDB()
    const tx = db.transaction(this.objName, `readwrite`)
    tx.objectStore(this.objName).clear()

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async getAll(): Promise<{ key: IDBValidKey, value: T }[]> {
    const db = await this.openDB()
    const tx = db.transaction(this.objName, `readonly`)
    const store = tx.objectStore(this.objName)

    const keysReq = store.getAllKeys()
    const valuesReq = store.getAll()

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        const keys: IDBValidKey[] = keysReq.result
        const values: T[] = valuesReq.result

        const records = keys.map((key, index) => ({
          key,
          value: values[index],
        }))

        resolve(records)
      }

      tx.onerror = () => reject(tx.error)
    })
  }

  async getAllAsMap(): Promise<Map<IDBValidKey, T>> {
    const db = await this.openDB()
    const tx = db.transaction(this.objName, `readonly`)
    const store = tx.objectStore(this.objName)

    const keysReq = store.getAllKeys()
    const valuesReq = store.getAll()

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        const keys: IDBValidKey[] = keysReq.result
        const values: T[] = valuesReq.result

        const map = new Map<IDBValidKey, T>()
        for (let i = 0; i < keys.length; i++) {
          map.set(keys[i], values[i])
        }
        resolve(map)
      }
      tx.onerror = () => reject(tx.error)
    })
  }
}

interface RuntimeFolderInfo {
  id: string
  name: string
  handle: FileSystemDirectoryHandle
}

export const runtime_folder_info = new IndexedDBUtils<RuntimeFolderInfo>(
  `docsplus`,
  `runtime_folder_info`,
  1,
)
