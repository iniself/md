import { IndexedDBUtils } from './IndexedDB'

// Dedicated database so emoji blobs never touch the folder-handle store.
// Meta (pack names, file list) lives in localStorage via the emoji store.
export const emojiBlobStore = new IndexedDBUtils<Blob>(`md-emoji`, `blobs`, 1)
