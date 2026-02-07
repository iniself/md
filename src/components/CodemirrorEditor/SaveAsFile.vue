<script setup lang="ts">
import { setTimeout } from 'node:timers'
import {
  FolderOpen,
  RefreshCw,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useFolderFileSync } from '@/composables/useFolderFileSync'
import { useStore } from '@/stores'
import { useFolderSourceStore } from '@/stores/folderSource'
import type { FileSystemNode } from '@/stores/folderSource'
import { splitPath, withMinDuration } from '@/utils/index'
import FolderTree from './FolderTree.vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits([`update:open`])
const { confirm, dialog } = useConfirmDialog()
const store = useStore()

const expandedPaths = ref<Set<string>>(new Set())

const folderSourceStore = useFolderSourceStore()
const { setCurrentFilePath } = useFolderFileSync()

const {
  currentFolderHandle,
  fileTree,
  selectedFilePath,
  isLoading,
  savePostAsFileOk,
} = storeToRefs(folderSourceStore)

const dialogVisible = computed({
  get: () => props.open,
  set: v => emit(`update:open`, v),
})

watch(
  () => dialogVisible.value,
  (newVal, oldVal) => {
    if (!oldVal && newVal) {
      scrollToBottom(true)
    }

    if (oldVal && !newVal) {
      cleanup()
    }
  },
)

function handleToggleExpand(path: string) {
  if (expandedPaths.value.has(path)) {
    expandedPaths.value.delete(path)
  }
  else {
    expandedPaths.value.add(path)
  }
  // 触发响应式更新
  expandedPaths.value = new Set(expandedPaths.value)
}

onMounted(async () => {
  await scrollToBottom(true)
})

async function scrollToBottom(force = false) {
  await nextTick()
  const container = document.querySelector(`.chat-container`)
  if (container) {
    const isNearBottom = (container.scrollTop + container.clientHeight)
      >= (container.scrollHeight - 50)
    if (force || isNearBottom) {
      container.scrollTop = container.scrollHeight
      await new Promise(resolve => setTimeout(resolve, 50))
    }
  }
}

// 保存路径
const currentPost = store.posts[store.currentPostIndex]

const currentSavePath = ref<string>(``)
const showInput = ref(true)
const fileNameInput = ref(currentPost.title)

async function handleSelectFile(node: any) {
  fileNameInput.value = ``
  currentSavePath.value = node.path
  setCurrentFilePath(node.path)
  showInput.value = false
}

async function handleSelectFolder(node: any) {
  fileNameInput.value = currentPost.title
  currentSavePath.value = `${node.path}/`
  setCurrentFilePath(node.path)
  showInput.value = true
}

const normalizedFileName = computed(() => {
  if (!fileNameInput.value)
    return ``

  return fileNameInput.value.endsWith(`.md`)
    ? fileNameInput.value
    : `${fileNameInput.value}.md`
})

const fullSavePath = computed(() => {
  const basePath
    = currentSavePath.value
      || (folderSourceStore.currentFolderHandle
        ? `${folderSourceStore.currentFolderHandle.name}/`
        : ``)
  return basePath + normalizedFileName.value
})

function cleanup() {
  if (savePostAsFileOk.value) {
    currentSavePath.value = ``
    fileNameInput.value = ``
    expandedPaths.value.clear()
    savePostAsFileOk.value = false
  }
  else {
    currentSavePath.value = ``
    fileNameInput.value = ``
    folderSourceStore.closeFolder()
    expandedPaths.value.clear()
    setCurrentFilePath(null)
  }
}

function reSelectFolder() {
  cleanup()
  folderSourceStore.startSelectFolderWhenSaveAsFile = true
}

function hasPath(tree: FileSystemNode[], targetPath: string): boolean {
  for (const node of tree) {
    if (node.path === targetPath)
      return true
    if (node.type === `directory` && node.children) {
      if (hasPath(node.children, targetPath))
        return true
    }
  }
  return false
}

async function handleSaveFile() {
  const reg = /^[^/\\]+(?:\/[^/\\]+)*$/
  if (!reg.test(fullSavePath.value)) {
    toast.error(`无效路径!`)
    return
  }
  const { parentFolder, filename } = splitPath(fullSavePath.value, `/`)
  if (!parentFolder) {
    return
  }

  if (!filename) {
    toast.error(`缺少文件名`)
  }
  else {
    if (!showInput.value || hasPath(fileTree.value, fullSavePath.value)) {
      const ok = await confirm({
        title: ` 警告！`,
        description: `要保存的 ${filename} 文件已经存在，确定覆盖？`,
        confirmText: `覆盖`,
        cancelText: `取消`,
      })
      if (ok) {
        toast.info(`正在保存`)
        folderSourceStore.currentFilePath = fullSavePath.value
        folderSourceStore.startSavePostAsFile = true
      }
      else {
        showInput.value = true
        currentSavePath.value = ``
      }
    }
    else {
      folderSourceStore.currentFilePath = fullSavePath.value
      folderSourceStore.startSavePostAsFile = true
    }
  }
}

async function handleRefreshFolder() {
  if (currentFolderHandle.value) {
    cleanup()
    isLoading.value = true
    try {
      await withMinDuration(
        folderSourceStore.loadFileTree(currentFolderHandle.value.handle),
        400,
      )
    }
    finally {
      isLoading.value = false
    }
  }
}
</script>

<template>
  <Dialog v-model:open="dialogVisible">
    <DialogContent
      class="bg-card text-card-foreground h-dvh max-h-dvh w-full flex flex-col rounded-none shadow-xl sm:max-h-[80vh] sm:max-w-2xl sm:rounded-xl"
    >
      <DialogHeader class="space-y-1 flex flex-col items-start">
        <div class="space-x-1 flex items-center">
          <DialogTitle>另存文件</DialogTitle>
          <Button
            title="打开文件夹"
            aria-label="打开文件夹"
            variant="ghost"
            size="icon"
            @click="reSelectFolder"
          >
            <FolderOpen class="h-4 w-4" />
          </Button>

          <Button
            title="刷新"
            aria-label="刷新"
            variant="ghost"
            size="icon"
            @click="handleRefreshFolder"
          >
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
          </Button>
        </div>
        <DialogDescription>选择和输入文件存储路径</DialogDescription>
      </DialogHeader>

      <div
        class="custom-scroll space-y-3 chat-container mb-4 flex-1 overflow-y-auto pr-2"
      >
        <FolderTree
          :nodes="fileTree"
          :selected-path="selectedFilePath"
          :expanded-paths="expandedPaths"
          @select="handleSelectFile"
          @select-folder="handleSelectFolder"
          @toggle-expand="handleToggleExpand"
        />
      </div>
      <div><span class="text-muted-foreground text-sm" /><input></div>
      <div>
        <Label class="mb-1 block text-sm font-medium">当前路径：{{ fullSavePath }}</Label>
        <Input
          v-if="showInput"
          v-model="fileNameInput"
          placeholder="文件名：new-folder/filename.md"
          class="focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
        />
      </div>

      <div class="mt-2 flex flex-col gap-2 sm:flex-row">
        <Button variant="default" size="lg" class="w-full" @click="handleSaveFile">
          保存
        </Button>
      </div>
    </DialogContent>
  </Dialog>
  <component :is="dialog" />
</template>

<style scoped>
:root {
  --safe-bottom: env(safe-area-inset-bottom);
}

/* 聊天容器底部内边距，适配安全区 */
.chat-container {
  padding-bottom: calc(1rem + var(--safe-bottom));
}

/* 让代码块可横向滚动 */
.chat-container pre {
  overflow-x: auto;
}

/* highlight.js 暗黑主题适配 */
.dark .hljs {
  background: #0d1117 !important;
  color: #c9d1d9 !important;
}

.chat-markdown > * + * {
  margin-top: 0.5rem; /* 8 px */
}

/* 让代码块更紧凑一点，同时保留主题自带颜色 */
.chat-markdown pre {
  padding: 0.75rem; /* 内边距 */
  border-radius: 0.375rem; /* 圆角 */
  overflow-x: auto; /* 横向滚动 */
}

/* 自定义滚动条 */
@media (pointer: coarse) {
  .custom-scroll::-webkit-scrollbar {
    width: 3px;
  }
}
.custom-scroll::-webkit-scrollbar {
  width: 6px;
}
.custom-scroll::-webkit-scrollbar-thumb {
  @apply rounded-full bg-gray-400/40 hover:bg-gray-400/60;
  @apply dark:bg-gray-500/40 dark:hover:bg-gray-500/70;
}
.custom-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgb(156 163 175 / 0.4) transparent;
}
.dark .custom-scroll {
  scrollbar-color: rgb(107 114 128 / 0.4) transparent;
}
</style>
