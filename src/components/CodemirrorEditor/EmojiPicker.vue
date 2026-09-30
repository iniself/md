<script setup lang="ts">
import { AlignCenter, AlignLeft, AlignRight, Image, Minus, Plus, Search, Smile, Sticker, Trash2, Type, UserRound, X } from 'lucide-vue-next'
import { useDisplayStore, useStore } from '@/stores'
import { useEmojiStore } from '@/stores/emoji'
import { filterUnicodeEmojis } from '@/utils/emojiData'
import type { FluentEmojiItem } from '@/utils/emojiRegistry'
import { ensureFluentLoaded, fluentFileUrl, getFluentItems, resolveEmojiUrl } from '@/utils/emojiRegistry'
import type { EmojiAlign } from '@/utils/MDEmoji'
import { formatEmojiSnippet } from '@/utils/MDEmoji'

type TabId = `unicode` | `fluent` | `mine`
type InsertMode = `small` | `original`

const INSERT_ALIGNS: EmojiAlign[] = [`left`, `center`, `right`]
const ALIGN_ICONS = {
  left: AlignLeft,
  center: AlignCenter,
  right: AlignRight,
} as const
const ALIGN_LABELS: Record<EmojiAlign, string> = {
  left: `靠左`,
  center: `居中`,
  right: `靠右`,
}

const displayStore = useDisplayStore()
const store = useStore()
const emojiStore = useEmojiStore()

const tab = ref<TabId>(`unicode`)
const search = ref(``)
const fluent = ref<FluentEmojiItem[]>([])
const insertMode = ref<InsertMode>(`small`)
const insertAlign = ref<EmojiAlign>(`left`)
const widthPercent = ref(20)
const fileInput = ref<HTMLInputElement | null>(null)

onMounted(async () => {
  search.value = ``
  try {
    await emojiStore.ensureLoaded()
  }
  catch (error) {
    console.error(`Failed to load custom emoji:`, error)
  }
  try {
    fluent.value = await ensureFluentLoaded()
  }
  catch (error) {
    console.error(`Failed to load fluent emoji:`, error)
  }
})

function close() {
  displayStore.toggleShowEmojiPicker(false)
}

function selectTab(id: TabId) {
  tab.value = id
  search.value = ``
}

const unicodeResults = computed(() => filterUnicodeEmojis(search.value))

const fluentResults = computed(() => {
  const q = search.value.trim().toLowerCase()
  const items = fluent.value.length ? fluent.value : getFluentItems()
  if (!q) {
    return items
  }
  return items.filter(item =>
    item.id.toLowerCase().includes(q)
    || item.name.toLowerCase().includes(q)
    || (item.zh && item.zh.includes(search.value.trim())),
  )
})

const mineResults = computed(() => {
  const pack = emojiStore.activePack
  if (!pack) {
    return []
  }
  const q = search.value.trim()
  if (!q) {
    return pack.files
  }
  return pack.files.filter(file => file.name.includes(q) || file.id.includes(q))
})

const showSizeControls = computed(() => tab.value !== `unicode`)

const currentTitle = computed(() => {
  if (tab.value === `unicode`) {
    return `Emoji`
  }
  if (tab.value === `fluent`) {
    return `Fluent 3D`
  }
  return emojiStore.activePack?.name ?? `我的表情`
})

const currentCount = computed(() => {
  if (tab.value === `unicode`) {
    return unicodeResults.value.length
  }
  if (tab.value === `fluent`) {
    return fluentResults.value.length
  }
  return mineResults.value.length
})

// Stickers are always inline so they can sit in a line with text.
// Alignment only takes effect when the sticker ends up on its own line.
function insertSticker(id: string, alt: string) {
  const editor = store.editor
  if (!editor) {
    toast.error(`编辑器未就绪`)
    return
  }
  const cm = toRaw(editor)!
  cm.replaceSelection(formatEmojiSnippet({
    id,
    alt,
    widthPercent: insertMode.value === `original` ? widthPercent.value : undefined,
    align: insertAlign.value === `left` ? undefined : insertAlign.value,
  }))
  cm.focus()
  store.editorRefresh()
}

function cycleAlign() {
  const index = INSERT_ALIGNS.indexOf(insertAlign.value)
  insertAlign.value = INSERT_ALIGNS[(index + 1) % INSERT_ALIGNS.length]
}

function insertUnicode(char: string) {
  const editor = store.editor
  if (!editor) {
    toast.error(`编辑器未就绪`)
    return
  }
  const cm = toRaw(editor)!
  cm.replaceSelection(char)
  cm.focus()
  store.editorRefresh()
}

function adjustWidth(delta: number) {
  widthPercent.value = Math.max(1, Math.min(100, widthPercent.value + delta))
}

function toggleMode() {
  insertMode.value = insertMode.value === `small` ? `original` : `small`
}

function openFileDialog() {
  fileInput.value?.click()
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ``
  if (!files.length) {
    return
  }
  try {
    const added = await emojiStore.addFiles(files)
    if (added > 0) {
      toast.success(`已添加 ${added} 张表情`)
    }
    else {
      toast.error(`没有添加成功，请检查格式（PNG / JPEG / GIF / WebP）与大小（≤5MB）`)
    }
  }
  catch (error) {
    console.error(`Failed to add emoji:`, error)
    toast.error(`添加失败，浏览器存储不可用`)
  }
}

async function removeMine(id: string, name: string) {
  try {
    await emojiStore.removeFile(id)
    toast.success(`已删除「${name}」`)
  }
  catch (error) {
    console.error(`Failed to remove emoji:`, error)
    toast.error(`删除失败`)
  }
}

async function clearMine() {
  const pack = emojiStore.activePack
  if (!pack || pack.files.length === 0) {
    return
  }
  try {
    await emojiStore.clearPack()
    toast.success(`已清空表情包`)
  }
  catch (error) {
    console.error(`Failed to clear emoji pack:`, error)
    toast.error(`清空失败`)
  }
}

async function repairBroken() {
  const count = await emojiStore.pruneBroken()
  if (count > 0) {
    toast.success(`已清理 ${count} 条失效记录，重新上传即可恢复`)
  }
}

function resolveMineUrl(id: string): string {
  return resolveEmojiUrl(id) ?? ``
}
</script>

<template>
  <div class="bg-background h-full flex flex-col">
    <div class="flex shrink-0 items-center gap-2 border-b px-3 py-2">
      <h2 class="min-w-0 flex-1 truncate text-sm font-semibold">
        插入表情
      </h2>
      <Button variant="ghost" size="icon" class="h-7 w-7" title="关闭" @click="close">
        <X class="h-3.5 w-3.5" />
      </Button>
    </div>

    <div class="space-y-2 shrink-0 px-3 py-2.5">
      <div class="relative">
        <Search class="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
        <Input v-model="search" placeholder="搜索名称 / 中文 / 直接粘贴 emoji" class="h-8 pl-8" />
      </div>
      <div class="flex items-center gap-1.5">
        <div class="min-w-0 flex-1 basis-16">
          <div class="truncate text-[13px] font-medium">
            {{ currentTitle }}
          </div>
          <div class="text-muted-foreground tabular-nums whitespace-nowrap text-[11px]">
            {{ currentCount }} 个<span v-if="tab === 'mine'"> / {{ emojiStore.maxItems }}</span>
          </div>
        </div>
        <div v-if="showSizeControls" class="flex shrink-0 items-center gap-1">
          <div v-if="insertMode === 'original'" class="bg-muted/70 h-7 flex items-center whitespace-nowrap rounded-md">
            <button type="button" class="h-7 w-6 flex items-center justify-center" :disabled="widthPercent <= 1" @click="adjustWidth(-5)">
              <Minus class="h-3 w-3" />
            </button>
            <span class="tabular-nums w-8 text-center text-[11px]">{{ widthPercent }}%</span>
            <button type="button" class="h-7 w-6 flex items-center justify-center" :disabled="widthPercent >= 100" @click="adjustWidth(5)">
              <Plus class="h-3 w-3" />
            </button>
          </div>
          <button
            type="button"
            class="bg-muted/70 text-muted-foreground hover:text-foreground h-7 flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 text-[11px] leading-none"
            :title="insertMode === 'small' ? '小尺寸：点击切换到原始尺寸' : '原始尺寸：点击切换到小尺寸'"
            @click="toggleMode"
          >
            <Type v-if="insertMode === 'small'" class="h-3 w-3 shrink-0" />
            <Image v-else class="h-3 w-3 shrink-0" />
            <span>{{ insertMode === 'small' ? '小尺寸' : '原始尺寸' }}</span>
          </button>
          <button
            type="button"
            class="bg-muted/70 text-muted-foreground hover:text-foreground h-7 flex items-center gap-1 whitespace-nowrap rounded-md px-2 text-[11px]"
            :title="`对齐：${ALIGN_LABELS[insertAlign]}（仅独占一行时生效）`"
            @click="cycleAlign"
          >
            <component :is="ALIGN_ICONS[insertAlign]" class="h-3 w-3" />
            <span>{{ ALIGN_LABELS[insertAlign] }}</span>
          </button>
          <Button
            v-if="tab === 'mine' && (emojiStore.activePack?.files.length ?? 0) > 0"
            variant="ghost"
            size="icon"
            class="text-muted-foreground hover:text-destructive h-7 w-7"
            title="清空表情包"
            @click="clearMine"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>

    <div class="bg-muted/25 min-h-0 flex-1 overflow-y-auto px-2.5 py-2">
      <div v-if="tab === 'unicode'">
        <div class="grid grid-cols-6 gap-0.5 p-1">
          <button
            v-for="item in unicodeResults"
            :key="item.name"
            type="button"
            class="hover:bg-accent aspect-square flex items-center justify-center rounded-lg text-2xl transition hover:scale-110"
            :title="`${item.zh} :${item.name}:`"
            @click="insertUnicode(item.char)"
          >
            {{ item.char }}
          </button>
        </div>
        <p v-if="unicodeResults.length === 0" class="text-muted-foreground py-8 text-center text-sm">
          没有匹配的表情
        </p>
      </div>

      <div v-if="tab === 'fluent'">
        <div class="grid grid-cols-4 gap-1.5 p-1">
          <button
            v-for="item in fluentResults"
            :key="item.id"
            type="button"
            class="bg-muted/60 hover:bg-muted aspect-square rounded-xl p-1.5 transition hover:scale-105"
            :title="item.zh || item.name"
            @click="insertSticker(item.id, item.zh || item.name)"
          >
            <img :src="fluentFileUrl(item.file)" :alt="item.zh || item.name" class="object-contain h-full w-full" loading="lazy">
          </button>
        </div>
        <p v-if="fluentResults.length === 0" class="text-muted-foreground py-8 text-center text-sm">
          没有匹配的贴纸
        </p>
      </div>

      <div v-if="tab === 'mine'">
        <div v-if="emojiStore.brokenFiles.length > 0" class="bg-destructive/10 text-destructive mb-2 rounded-lg px-2.5 py-2 text-xs">
          {{ emojiStore.brokenFiles.length }} 张图片数据丢失（可能清理过浏览器数据），预览中无法显示。
          <button type="button" class="underline" @click="repairBroken">
            清理失效记录
          </button>
        </div>
        <div class="grid grid-cols-4 gap-1.5 p-1">
          <div v-for="file in mineResults" :key="file.id" class="group relative aspect-square">
            <button
              type="button"
              class="bg-muted/60 hover:bg-muted h-full w-full rounded-xl p-1.5 transition hover:scale-105"
              :title="file.name"
              @click="insertSticker(file.id, file.name)"
            >
              <img v-if="resolveMineUrl(file.id)" :src="resolveMineUrl(file.id)" :alt="file.name" class="object-contain h-full w-full" loading="lazy">
              <span v-else class="text-destructive h-full w-full flex items-center justify-center text-[10px]">已失效</span>
            </button>
            <button
              type="button"
              class="text-muted-foreground hover:text-destructive bg-background/90 absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full shadow-sm group-hover:flex"
              :title="`删除 ${file.name}`"
              @click.stop="removeMine(file.id, file.name)"
            >
              <X class="h-3 w-3" />
            </button>
          </div>
          <button
            type="button"
            class="bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground aspect-square flex items-center justify-center rounded-xl"
            title="添加表情"
            @click="openFileDialog()"
          >
            <Plus class="h-5 w-5" />
          </button>
        </div>
        <p v-if="mineResults.length === 0" class="text-muted-foreground py-4 text-center text-sm">
          还没有自定义表情，点 + 从本地添加（PNG / JPEG / GIF / WebP，≤5MB）
        </p>
        <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/gif,image/webp" multiple class="hidden" @change="onFileChange">
      </div>
    </div>

    <div class="bg-background shrink-0 border-t px-2.5 py-1.5">
      <div class="flex items-center gap-1.5">
        <button
          type="button"
          class="h-9 w-9 flex items-center justify-center rounded-lg"
          :class="tab === 'unicode' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent'"
          title="Emoji"
          @click="selectTab('unicode')"
        >
          <Smile class="h-5 w-5" />
        </button>
        <button
          type="button"
          class="h-9 w-9 flex items-center justify-center rounded-lg"
          :class="tab === 'fluent' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent'"
          title="Fluent 3D"
          @click="selectTab('fluent')"
        >
          <Sticker class="h-5 w-5" />
        </button>
        <button
          type="button"
          class="h-9 w-9 flex items-center justify-center rounded-lg"
          :class="tab === 'mine' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent'"
          :title="emojiStore.activePack?.name ?? `我的表情`"
          @click="selectTab('mine')"
        >
          <UserRound class="h-5 w-5" />
        </button>
      </div>
    </div>
  </div>
</template>
