<script setup lang="ts">
import path from 'node:path'
import {
  ArrowLeftFromLine,
  FolderClosed,
  FolderOpen,
  FolderPlus,
  FolderTree as FolderTreeIcon,
  Loader2,
  RefreshCw,
  Trash2,
} from 'lucide-vue-next'
import { useFolderFileSync } from '@/composables/useFolderFileSync'
import { useStore } from '@/stores'
import { useFolderSourceStore } from '@/stores/folderSource'
import FolderTree from './FolderTree.vue'
// import { usePostStore } from '@/stores/post'

const store = useStore()

const folderSourceStore = useFolderSourceStore()
// const postStore = usePostStore()
const { setCurrentFilePath } = useFolderFileSync()

const {
  currentFolderHandle,
  fileTree,
  selectedFilePath,
  isLoading,
  loadError,
  isFileSystemAPISupported,
} = storeToRefs(folderSourceStore)

const {
  isOpenFolderPanel,
} = storeToRefs(store)

const expandedPaths = ref<Set<string>>(new Set())

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

async function handleSelectFolder() {
  await folderSourceStore.selectFolder()
  // 等待下一个 tick，确保 fileTree 已经更新
  await nextTick()
  // 展开根节点
  if (fileTree.value.length > 0) {
    expandedPaths.value.add(fileTree.value[0].path)
  }
}

async function handleRefreshFolder() {
  if (currentFolderHandle.value) {
    await folderSourceStore.loadFileTree(currentFolderHandle.value.handle)
  }
}

async function handleCloseFolder() {
  // const store = useStore()
  // store.isOpenFolderPanel = !store.isOpenFolderPanel
  folderSourceStore.closeFolder()
  expandedPaths.value.clear()
  setCurrentFilePath(null)
}

async function handleOpenFile(node: any) {
  const store = useStore()
  try {
    const content = await folderSourceStore.readFile(node.path)
    const foldName = path.basename(path.dirname(node.path)).trim()
    // 从文件名中提取标题（移除 .md 扩展名）
    const title = node.name.replace(/\.md$/i, ``)

    const existedPost = store.posts.find(
      post => post.title === foldName,
    )

    let foldId: string | null

    if (existedPost) {
      foldId = existedPost.id
    }
    else {
      store.addLocalPost(foldName, `本地文件夹：${node.path}`, null)
      foldId = store.currentPostId
    }

    // 创建新文章并设置内容
    for (const post of store.posts) {
      // eslint-disable-next-line eqeqeq
      if (post.title === title.trim() && post.parentId == foldId) {
        return toast.error(`内容标题已在`)
      }
    }

    store.addLocalPost(title, content, foldId)
    // postStore.updatePostContent(postStore.currentPostId, content)

    // 记录当前文件路径以便自动同步
    setCurrentFilePath(node.path)

    toast.success(`已加载文件: ${node.name}`)
  }
  catch (error) {
    console.error(`打开文件失败:`, error)
  }
}
</script>

<template>
  <div class="folder-source-panel h-full flex flex-col">
    <!-- 头部工具栏 -->
    <div class="panel-header bg-background sticky top-0 z-10 border-b p-2">
      <div class="mb-2 flex items-center justify-between">
        <h3 class="flex items-center gap-2 text-sm font-semibold">
          <FolderTreeIcon class="h-4 w-4" />
          本地文件夹
        </h3>
        <Button
          v-if="currentFolderHandle"
          variant="ghost"
          size="sm"
          class="h-7 w-7 p-0"
          @click="handleCloseFolder"
        >
          <Trash2 class="h-3 w-3" />
        </Button>
        <Button
          v-if="isOpenFolderPanel"
          variant="ghost"
          size="sm"
          class="h-7 w-7 p-0"
          @click="isOpenFolderPanel = !isOpenFolderPanel"
        >
          <ArrowLeftFromLine class="h-3 w-3" />
        </Button>
      </div>

      <!-- 操作按钮 -->
      <div class="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          class="flex-1 text-xs"
          :disabled="isLoading || !isFileSystemAPISupported"
          @click="handleSelectFolder"
        >
          <FolderPlus v-if="!isLoading" class="mr-1 h-3 w-3" />
          <Loader2 v-else class="animate-spin mr-1 h-3 w-3" />
          打开文件夹
        </Button>

        <Button
          v-if="currentFolderHandle"
          variant="outline"
          size="sm"
          class="text-xs"
          :disabled="isLoading"
          @click="handleRefreshFolder"
        >
          <RefreshCw class="h-3 w-3" :class="{ 'animate-spin': isLoading }" />
        </Button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="panel-content flex-1 overflow-y-auto p-2">
      <!-- 不支持 API 的提示 -->
      <div
        v-if="!isFileSystemAPISupported"
        class="text-muted-foreground h-full flex flex-col items-center justify-center p-4 text-center"
      >
        <FolderClosed class="mb-2 h-12 w-12 opacity-50" />
        <p class="text-sm">
          您的浏览器不支持本地文件夹访问
        </p>
        <p class="mt-1 text-xs">
          请使用 Chrome、Edge 或 Opera 浏览器
        </p>
      </div>

      <!-- 加载中 -->
      <div
        v-else-if="isLoading"
        class="h-full flex flex-col items-center justify-center"
      >
        <Loader2 class="animate-spin text-primary h-8 w-8" />
        <p class="text-muted-foreground mt-2 text-sm">
          加载中...
        </p>
      </div>

      <!-- 错误提示 -->
      <div
        v-else-if="loadError"
        class="text-destructive h-full flex flex-col items-center justify-center p-4 text-center"
      >
        <p class="text-sm">
          {{ loadError }}
        </p>
      </div>

      <!-- 空状态 -->
      <div
        v-else-if="!currentFolderHandle"
        class="text-muted-foreground h-full flex flex-col items-center justify-center p-4 text-center"
      >
        <FolderOpen class="mb-2 h-12 w-12 opacity-50" />
        <p class="text-sm">
          未打开文件夹
        </p>
        <p class="mt-1 text-xs">
          点击上方按钮打开本地文件夹
        </p>
      </div>

      <!-- 文件树 -->
      <div v-else class="file-tree-container">
        <div class="text-muted-foreground mb-2 px-2 text-xs">
          {{ currentFolderHandle.name }}
        </div>
        <FolderTree
          :nodes="fileTree"
          :selected-path="selectedFilePath"
          :expanded-paths="expandedPaths"
          @select="handleOpenFile"
          @toggle-expand="handleToggleExpand"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.folder-source-panel {
  background-color: hsl(var(--background));
}

.panel-header {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.panel-content {
  min-height: 0;
}

.file-tree-container {
  min-height: 100%;
}
</style>
