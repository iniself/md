export interface FluentEmojiItem {
  id: string
  name: string
  zh: string
  file: string
}

const customUrls = new Map<string, string>()
let fluentUrls: Map<string, string> | null = null
let fluentItems: FluentEmojiItem[] = []
let fluentLoading: Promise<void> | null = null

function baseUrl(): string {
  return import.meta.env.BASE_URL || `/`
}

function toFluentUrl(file: string): string {
  const base = baseUrl()
  const prefix = base.endsWith(`/`) ? base : `${base}/`
  return `${prefix}${file}`
}

async function loadFluentManifest(): Promise<void> {
  if (fluentUrls) {
    return
  }
  if (!fluentLoading) {
    fluentLoading = (async () => {
      try {
        const res = await fetch(`${toFluentUrl(`emoji/fluent/manifest.json`)}`)
        if (!res.ok) {
          return
        }
        const manifest = await res.json()
        const items = Array.isArray(manifest?.items) ? manifest.items as FluentEmojiItem[] : []
        fluentItems = items
        const map = new Map<string, string>()
        for (const item of items) {
          if (item?.id && item?.file) {
            map.set(item.id, toFluentUrl(item.file))
          }
        }
        fluentUrls = map
      }
      catch {
        // Fluent pack is optional. Keep resolving other sources.
        fluentUrls = new Map()
      }
    })()
  }
  await fluentLoading
}

// Start loading in background so preview resolves without waiting for the picker.
void loadFluentManifest()

export function registerCustomEmojiUrl(id: string, url: string): void {
  customUrls.set(id, url)
}

export function unregisterCustomEmojiUrl(id: string): void {
  customUrls.delete(id)
}

export function clearCustomEmojiUrls(): void {
  customUrls.clear()
}

export async function ensureFluentLoaded(): Promise<FluentEmojiItem[]> {
  await loadFluentManifest()
  return fluentItems
}

export function getFluentItems(): FluentEmojiItem[] {
  return fluentItems
}

export function fluentFileUrl(file: string): string {
  return toFluentUrl(file)
}

// Resolve a sticker id to a display URL. Returns null when unknown.
export function resolveEmojiUrl(id: string): string | null {
  return customUrls.get(id) ?? fluentUrls?.get(id) ?? null
}
