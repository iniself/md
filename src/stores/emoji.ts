import { addPrefix, downloadFile, sanitizeTitle, toBase64 } from '@/utils'
import { clearCustomEmojiUrls, registerCustomEmojiUrl, unregisterCustomEmojiUrl } from '@/utils/emojiRegistry'
import { emojiBlobStore } from '@/utils/emojiStorage'

export interface CustomEmojiFile {
  id: string
  name: string
  mime: string
  size: number
  createdAt: number
}

export interface CustomEmojiPack {
  id: string
  name: string
  files: CustomEmojiFile[]
}

const MAX_ITEMS = 100
const MAX_BYTES = 5 * 1024 * 1024
const ACCEPT_MIMES = [`image/png`, `image/jpeg`, `image/gif`, `image/webp`]

function newId(): string {
  try {
    return crypto.randomUUID()
  }
  catch {
    return `emoji_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  }
}

function validateEmojiFile(file: File): string | null {
  if (!ACCEPT_MIMES.includes(file.type)) {
    return `仅支持 PNG / JPEG / GIF / WebP`
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return `单张表情不能超过 5MB`
  }
  return null
}

// User-maintained sticker pack. Fully local: meta in localStorage,
// binaries in IndexedDB (`md-emoji`), preview via object URLs.
export const useEmojiStore = defineStore(`emoji`, () => {
  const packs = useStorage<CustomEmojiPack[]>(addPrefix(`emoji_packs`), [
    { id: `mine`, name: `我的表情`, files: [] },
  ])
  const activePackId = useStorage(addPrefix(`emoji_active_pack`), `mine`)
  const objectUrls = new Map<string, string>()

  const activePack = computed(() => {
    return packs.value.find(pack => pack.id === activePackId.value) ?? packs.value[0]
  })

  function trackUrl(id: string, blob: Blob): void {
    const old = objectUrls.get(id)
    if (old) {
      URL.revokeObjectURL(old)
    }
    const url = URL.createObjectURL(blob)
    objectUrls.set(id, url)
    registerCustomEmojiUrl(id, url)
  }

  // Register display URLs for every custom file missing one.
  // Safe to call repeatedly: page reload wipes object URLs, this rebuilds them.
  async function ensureLoaded(): Promise<void> {
    const pack = activePack.value
    if (!pack) {
      return
    }
    clearCustomEmojiUrls()
    for (const [id, url] of objectUrls) {
      if (pack.files.some(file => file.id === id)) {
        registerCustomEmojiUrl(id, url)
      }
      else {
        URL.revokeObjectURL(url)
        objectUrls.delete(id)
      }
    }
    await Promise.all(pack.files.map(async (file) => {
      if (objectUrls.has(file.id)) {
        return
      }
      try {
        const blob = await emojiBlobStore.get(file.id)
        if (blob) {
          trackUrl(file.id, blob)
        }
      }
      catch {
        // A single broken blob must not break the picker.
      }
    }))
  }

  // Files whose meta exists but blob is gone (partial cleanup). Shown as broken in UI.
  const brokenFiles = computed(() => {
    const pack = activePack.value
    if (!pack) {
      return []
    }
    return pack.files.filter(file => !objectUrls.has(file.id))
  })

  async function pruneBroken(): Promise<number> {
    const pack = activePack.value
    if (!pack) {
      return 0
    }
    const broken = new Set(brokenFiles.value.map(file => file.id))
    if (!broken.size) {
      return 0
    }
    pack.files = pack.files.filter(file => !broken.has(file.id))
    return broken.size
  }

  async function addFiles(files: File[]): Promise<number> {
    const pack = activePack.value
    if (!pack) {
      return 0
    }
    await ensureLoaded()
    let added = 0
    for (const file of files) {
      if (pack.files.length >= MAX_ITEMS) {
        toast.error(`每个表情包最多保存 ${MAX_ITEMS} 张`)
        break
      }
      const error = validateEmojiFile(file)
      if (error) {
        toast.error(`${file.name}：${error}`)
        continue
      }
      const id = newId()
      try {
        await emojiBlobStore.set(id, file)
      }
      catch {
        toast.error(`${file.name}：本地保存失败`)
        continue
      }
      const baseName = file.name.replace(/\.[^.]+$/, ``).trim() || `表情`
      pack.files.push({
        id,
        name: baseName.slice(0, 20),
        mime: file.type,
        size: file.size,
        createdAt: Date.now(),
      })
      trackUrl(id, file)
      added += 1
    }
    return added
  }

  async function removeFile(id: string): Promise<void> {
    const pack = activePack.value
    if (!pack) {
      return
    }
    pack.files = pack.files.filter(file => file.id !== id)
    const url = objectUrls.get(id)
    if (url) {
      URL.revokeObjectURL(url)
      objectUrls.delete(id)
    }
    unregisterCustomEmojiUrl(id)
    try {
      await emojiBlobStore.delete(id)
    }
    catch {
      // Meta is already updated. Blob cleanup is best-effort.
    }
  }

  async function clearPack(): Promise<void> {
    const pack = activePack.value
    if (!pack) {
      return
    }
    const ids = pack.files.map(file => file.id)
    pack.files = []
    for (const id of ids) {
      const url = objectUrls.get(id)
      if (url) {
        URL.revokeObjectURL(url)
        objectUrls.delete(id)
      }
      unregisterCustomEmojiUrl(id)
      try {
        await emojiBlobStore.delete(id)
      }
      catch {
        // Best-effort cleanup.
      }
    }
  }

  interface ExportedEmojiItem {
    name: string
    mime: string
    dataUrl: string
  }

  interface ExportedEmojiPack {
    kind: `md-emoji-pack`
    version: 1
    pack: string
    exportedAt: number
    items: ExportedEmojiItem[]
  }

  function isExportedPack(value: unknown): value is ExportedEmojiPack {
    if (!value || typeof value !== `object`) {
      return false
    }
    const pack = value as Record<string, unknown>
    return pack.kind === `md-emoji-pack`
      && Array.isArray(pack.items)
      && pack.items.every(item =>
        !!item && typeof item === `object`
        && typeof (item as Record<string, unknown>).dataUrl === `string`
        && typeof (item as Record<string, unknown>).mime === `string`,
      )
  }

  // Download the whole pack as one self-contained JSON (meta + base64).
  async function exportPack(): Promise<number> {
    const pack = activePack.value
    if (!pack || !pack.files.length) {
      toast.error(`表情包是空的，无需导出`)
      return 0
    }
    const items: ExportedEmojiItem[] = []
    for (const file of pack.files) {
      try {
        const blob = await emojiBlobStore.get(file.id)
        if (!blob) {
          continue
        }
        const body = await toBase64(blob)
        items.push({
          name: file.name,
          mime: file.mime,
          dataUrl: `data:${file.mime};base64,${body}`,
        })
      }
      catch (error) {
        console.error(`Failed to export emoji ${file.id}:`, error)
      }
    }
    if (!items.length) {
      toast.error(`没有可导出的图片数据`)
      return 0
    }
    const payload: ExportedEmojiPack = {
      kind: `md-emoji-pack`,
      version: 1,
      pack: pack.name,
      exportedAt: Date.now(),
      items,
    }
    const date = new Date().toISOString().slice(0, 10)
    downloadFile(JSON.stringify(payload), `${sanitizeTitle(pack.name)}-${date}.json`, `application/json`)
    toast.success(`已导出 ${items.length} 张表情`)
    return items.length
  }

  function dataUrlToFile(dataUrl: string, mime: string, name: string): File | null {
    const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl.trim())
    if (!match) {
      return null
    }
    try {
      const binary = atob(match[2])
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      return new File([bytes], name, { type: mime || match[1] })
    }
    catch {
      return null
    }
  }

  // Import a pack file exported above. Respects the pack size limit.
  async function importPack(file: File): Promise<number> {
    const pack = activePack.value
    if (!pack) {
      return 0
    }
    let payload: unknown
    try {
      payload = JSON.parse(await file.text())
    }
    catch {
      toast.error(`文件不是有效的表情包备份`)
      return 0
    }
    if (!isExportedPack(payload)) {
      toast.error(`文件不是有效的表情包备份`)
      return 0
    }
    await ensureLoaded()
    const candidates: File[] = []
    for (const [index, item] of payload.items.entries()) {
      const converted = dataUrlToFile(item.dataUrl, item.mime, `${item.name || `表情`}.png`)
      if (converted) {
        candidates.push(converted)
      }
      else {
        console.warn(`Skipped invalid emoji item at index ${index}`)
      }
    }
    if (!candidates.length) {
      toast.error(`备份里没有可导入的图片`)
      return 0
    }
    const room = Math.max(0, MAX_ITEMS - pack.files.length)
    if (room <= 0) {
      toast.error(`表情包已满（${MAX_ITEMS} 张），先删除一些再导入`)
      return 0
    }
    const added = await addFiles(candidates.slice(0, room))
    if (payload.items.length > candidates.length) {
      toast.warning(`跳过 ${payload.items.length - candidates.length} 张损坏的数据`)
    }
    if (candidates.length > room) {
      toast.warning(`位置只够 ${room} 张，其余未导入`)
    }
    if (added > 0) {
      toast.success(`已导入 ${added} 张表情`)
    }
    return added
  }

  return {
    packs,
    activePack,
    activePackId,
    brokenFiles,
    maxItems: MAX_ITEMS,
    ensureLoaded,
    pruneBroken,
    addFiles,
    removeFile,
    clearPack,
    exportPack,
    importPack,
  }
})
