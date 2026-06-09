<script setup lang="ts">
import { ArrowUpNarrowWide, ChevronsDownUp, ChevronsUpDown, FileSearch, PlusSquare, Regex, Replace, ReplaceAll, Search, X } from 'lucide-vue-next'
import DiffViewer from '@/components/CodemirrorEditor/DiffViewer.vue'
import { useCustomConfirmDialog } from '@/composables/useCustomConfirmDialog'
import { useStore } from '@/stores'
import type { Post } from '@/stores'
import { useFolderSourceStore } from '@/stores/folderSource'
import { addPrefix } from '@/utils'
import { runtime_folder_info } from '@/utils/IndexedDB'

const props = defineProps({ triggerFocus: Boolean })

const { confirm, dialog } = useCustomConfirmDialog()

const store = useStore()
const folderSourceStore = useFolderSourceStore()

/* ============ 新增内容 ============ */
const parentId = ref<string | null>(null)
const isOpenAddDialog = ref(false)
const addPostInputVal = ref(``)
watch(isOpenAddDialog, (o) => {
  if (o) {
    addPostInputVal.value = ``
    parentId.value = null
  }
})

watch(() => props.triggerFocus, () => {
  if (props.triggerFocus) {
    doDiff()
  }
})

function openAddPostDialog(id: string) {
  isOpenAddDialog.value = true
  nextTick(() => {
    parentId.value = id
  })
}

function addPost() {
  if (!addPostInputVal.value.trim())
    return toast.error(`内容标题不可为空`)
  for (const post of store.posts) {
    // eslint-disable-next-line eqeqeq
    if (post.title === addPostInputVal.value.trim() && post.parentId == parentId.value) {
      return toast.error(`内容标题已在`)
    }
  }
  store.addPost(addPostInputVal.value.trim(), parentId.value)
  isOpenAddDialog.value = false
  folderSourceStore.currentFolderId = null
  folderSourceStore.currentFilePath = null
  toast.success(`内容新增成功`)
}

/* ============ 重命名 / 删除 / 历史 对象 ============ */
const editId = ref<string | null>(null)
const isOpenEditDialog = ref(false)
const renamePostInputVal = ref(``)

function startRenamePost(id: string) {
  editId.value = id
  renamePostInputVal.value = store.getPostById(id)!.title
  isOpenEditDialog.value = true
}
function renamePost() {
  if (!renamePostInputVal.value.trim()) {
    return toast.error(`内容标题不可为空`)
  }

  if (
    store.posts.some(
      post => post.title === renamePostInputVal.value.trim() && post.id !== editId.value,
    )
  ) {
    return toast.error(`内容标题已存在`)
  }

  if (renamePostInputVal.value === store.getPostById(editId.value!)?.title) {
    isOpenEditDialog.value = false
    return
  }

  store.renamePost(editId.value!, renamePostInputVal.value.trim())
  toast.success(`内容重命名成功`)
  isOpenEditDialog.value = false
}

const delId = ref<string | null>(null)
const isOpenDelPostConfirmDialog = ref(false)

const delConfirmText = computed(() => {
  const title = store.getPostById(delId.value || ``)?.title ?? ``
  const short = title.length > 20 ? `${title.slice(0, 20)}…` : title
  return `此操作将删除「${short}」，是否继续？`
})

function startDelPost(id: string) {
  delId.value = id
  isOpenDelPostConfirmDialog.value = true
}
function delPost() {
  store.delPost(delId.value!)
  isOpenDelPostConfirmDialog.value = false
  toast.success(`内容删除成功`)
}

/* ============ 历史记录 ============ */
const isOpenHistoryDialog = ref(false)
const currentPostId = ref<string | null>(null)
const currentHistoryIndex = ref(0)

function openHistoryDialog(id: string) {
  currentPostId.value = id
  currentHistoryIndex.value = 0
  isOpenHistoryDialog.value = true
}
function recoverHistory() {
  const post = store.getPostById(currentPostId.value!)
  if (!post) {
    isOpenHistoryDialog.value = false
    return
  }

  const content = post.history[currentHistoryIndex.value].content
  post.content = content
  toRaw(store.editor!).setValue(content)
  toast.success(`记录恢复成功`)
  isOpenHistoryDialog.value = false
}

/* ============ 全局搜索与替换 ============ */
const isSearching = ref(false)
const searchInputRef = ref<HTMLInputElement | null>(null)
const showReplace = ref(true)
const { searchQuery, replaceQuery, isRegex, isCaseSensitive, openedFromGlobalSearch } = storeToRefs(store)

function toggleSearch() {
  isSearching.value = !isSearching.value
  if (isSearching.value) {
    nextTick(() => searchInputRef.value?.focus())
  }
  else {
    searchQuery.value = ``
    replaceQuery.value = ``
    showReplace.value = false
    isCaseSensitive.value = false
    isRegex.value = false
  }
}

function closeSearch() {
  isSearching.value = false
  searchQuery.value = ``
  replaceQuery.value = ``
  showReplace.value = false
  isCaseSensitive.value = false
  isRegex.value = false
}

interface HighlightPart {
  text: string
  highlight: boolean
}

function getSearchRegex(query: string): RegExp | null {
  if (!query.trim())
    return null
  try {
    if (isRegex.value) {
      return new RegExp(query, `gm${isCaseSensitive.value ? `` : `i`}`)
    }
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, `\\$&`)
    return new RegExp(escaped, `gm${isCaseSensitive.value ? `` : `i`}`)
  }
  catch {
    return null
  }
}

function highlightParts(text: string, query: string): HighlightPart[] {
  if (!query)
    return [{ text, highlight: false }]
  const regex = getSearchRegex(query)
  if (!regex)
    return [{ text, highlight: false }]
  const parts: HighlightPart[] = []
  let lastIndex = 0
  let match = regex.exec(text)
  while (match !== null) {
    if (match.index > lastIndex)
      parts.push({ text: text.slice(lastIndex, match.index), highlight: false })
    parts.push({ text: match[0], highlight: true })
    lastIndex = match.index + match[0].length
    if (match[0].length === 0)
      regex.lastIndex++
    match = regex.exec(text)
  }
  if (lastIndex < text.length)
    parts.push({ text: text.slice(lastIndex), highlight: false })
  return parts
}

function getContentSnippet(content: string, query: string): string {
  if (!query.trim())
    return ``
  const regex = getSearchRegex(query)
  if (!regex)
    return ``
  const match = regex.exec(content)
  if (!match)
    return ``
  const idx = match.index
  const matchLen = match[0].length
  const start = Math.max(0, idx - 20)
  const end = Math.min(content.length, idx + matchLen + 40)
  let snippet = content.slice(start, end).replace(/\n/g, ` `)
  if (start > 0)
    snippet = `…${snippet}`
  if (end < content.length)
    snippet = `${snippet}…`
  return snippet
}

const searchResults = computed(() => {
  const q = searchQuery.value.trim()
  if (!q)
    return []
  const regex = getSearchRegex(q)
  if (!regex)
    return []
  return store.posts
    .filter(post => regex.test(post.title) || regex.test(post.content))
    .map((post) => {
      const snippet = getContentSnippet(post.content, searchQuery.value.trim())
      return {
        ...post,
        titleParts: highlightParts(post.title, searchQuery.value.trim()),
        snippetParts: snippet ? highlightParts(snippet, searchQuery.value.trim()) : [],
      }
    })
})

function openCurrentPostFromGlobalSearch(postId: string) {
  store.currentPostId = postId
  openedFromGlobalSearch.value = true
}

const totalMatches = computed(() => {
  const q = searchQuery.value.trim()
  if (!q)
    return 0
  const regex = getSearchRegex(q)
  if (!regex)
    return 0
  let count = 0
  store.posts.forEach((post) => {
    const titleMatches = (post.title.match(regex) || []).length
    regex.lastIndex = 0
    const contentMatches = (post.content.match(regex) || []).length
    regex.lastIndex = 0
    count += titleMatches + contentMatches
  })
  return count
})

function replaceInText(text: string, search: string, replace: string): string {
  const regex = getSearchRegex(search)
  if (!regex)
    return text
  return text.replace(regex, replace)
}

function replaceFirst() {
  const q = searchQuery.value.trim()
  if (!q)
    return
  const regex = getSearchRegex(q)
  if (!regex)
    return
  for (const post of store.posts) {
    regex.lastIndex = 0
    if (regex.test(post.title)) {
      regex.lastIndex = 0
      store.renamePost(post.id, replaceInText(post.title, q, replaceQuery.value))
      toast.success(`已替换 1 处`)
      return
    }
    regex.lastIndex = 0
    if (regex.test(post.content)) {
      regex.lastIndex = 0
      store.updatePostContent(post.id, replaceInText(post.content, q, replaceQuery.value))
      if (store.currentPostId === post.id && store.editor) {
        const ed = toRaw(store.editor)
        ed.setValue(post.content)
        // ed.dispatch({
        //   changes: { from: 0, to: ed.state.doc.length, insert: post.content },
        // })
      }
      toast.success(`已替换 1 处`)
      return
    }
  }
}

function replaceAll() {
  const q = searchQuery.value.trim()
  if (!q)
    return
  const regex = getSearchRegex(q)
  if (!regex)
    return
  let count = 0
  store.posts.forEach((post) => {
    regex.lastIndex = 0
    const titleMatches = (post.title.match(regex) || []).length
    regex.lastIndex = 0
    const contentMatches = (post.content.match(regex) || []).length
    if (titleMatches > 0) {
      regex.lastIndex = 0
      store.renamePost(post.id, replaceInText(post.title, q, replaceQuery.value))
      count += titleMatches
    }
    if (contentMatches > 0) {
      regex.lastIndex = 0
      const newContent = replaceInText(post.content, q, replaceQuery.value)
      store.updatePostContent(post.id, newContent)
      if (store.currentPostId === post.id && store.editor) {
        const ed = toRaw(store.editor)
        ed.setValue(newContent)
      }
      count += contentMatches
    }
  })
  if (count > 0)
    toast.success(`已替换 ${count} 处`)
}

/* ============ 排序 ============ */
const sortMode = useStorage(addPrefix(`sort_mode`), `create-old-new`)
const sortedPosts = computed(() => {
  return [...store.posts].sort((a, b) => {
    switch (sortMode.value) {
      case `A-Z`:
        return a.title.localeCompare(b.title)
      case `Z-A`:
        return b.title.localeCompare(a.title)
      case `update-new-old`:
        return +new Date(b.updateDatetime) - +new Date(a.updateDatetime)
      case `update-old-new`:
        return +new Date(a.updateDatetime) - +new Date(b.updateDatetime)
      case `create-new-old`:
        return +new Date(b.createDatetime) - +new Date(a.createDatetime)
      default:
        /* create-old-new */
        return +new Date(a.createDatetime) - +new Date(b.createDatetime)
    }
  })
})

/* ============ 拖拽功能 ============ */
const dragover = ref(false)
const dragSourceId = ref<string | null>(null)
const dropTargetId = ref<string | null>(null)

function handleDrop(targetId: string | null) {
  const sourceId = dragSourceId.value
  if (!sourceId) {
    return
  }

  // 递归检索 ID，是不是父文件拖拽到了子文件上面
  const isParent = (id: string | null | undefined) => {
    if (!id) {
      return false
    }

    const post = store.getPostById(id)
    if (!post) {
      return false
    }

    if (post.parentId === sourceId) {
      return true
    }

    return isParent(post.parentId)
  }

  if (isParent(targetId)) {
    toast.error(`不能将内容拖拽到其子内容下面`)
  }
  else if (sourceId !== targetId) {
    store.updatePostParentId(sourceId, targetId || null)
  }

  dragSourceId.value = null
}

function handleDragOver(e: DragEvent) {
  e.preventDefault()
}

function handleDragEnd() {
  dragSourceId.value = null
  dropTargetId.value = null
  dragover.value = false
}

/* ============ 查看更多详情 ============ */
const isOpenDetailDialog = ref(false)
const detailAboutPostID = ref(``)
const detailAboutPostType = ref(`文件`)
const detailAboutPostLocalNodePath = ref(``)
const detailAboutPostPath = ref(``)
function openDetailDialog(post: Post) {
  currentPostId.value = post.id
  isOpenDetailDialog.value = true

  detailAboutPostID.value = post.id
  detailAboutPostType.value = post.isFolder ? `文件夹` : `文件`
  detailAboutPostPath.value = post.path
  detailAboutPostLocalNodePath.value = post.nodePath ? post.nodePath : `无本地文件`
}

/* ============ 文件需要同步 ============ */
const isNeedSyncDialog = ref(false)
const diffContent = ref(``)
function handleSyncFromFile() {
  folderSourceStore.startSyncFileToPost = true
  isNeedSyncDialog.value = false
}

function handleSaveToFile() {
  folderSourceStore.startSavePostToFile = true
  isNeedSyncDialog.value = false
}

const onboardingByStart = ref(true)
watch(onboardingByStart, async (newVal) => {
  if (!newVal) {
    const post = store.posts.find(post => post.id === store.currentPostId) || null
    if (post && post.localFile && !post.isFolder) {
      const folder = await runtime_folder_info.get(post.localFile)
      if (folder) {
        confirm({
          title: `本地文件`,
          description: `当前内容已与本地文件同步。如有差异将会提示。`,
          cancelText: `知道了！`,
          dialogType: `alert`,
        })
      }
      else {
        // 没有历史 Handle，需要重新打开文件夹获取
        toast.error(`丢失文件权限，内容不再与文件同步`)
        post.localFile = null
      }
    }
  }
}, {
  immediate: true,
})

function keyHandler(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'o') {
    e.preventDefault()
    store.openedCommandPalette = true
  }
}

onMounted(async () => {
  if (!store.skipOnboarding) {
    onboardingByStart.value = true
  }
  else {
    onboardingByStart.value = false
  }
  document.addEventListener('keydown', keyHandler)
})

// 监控 post 内容改变并触发同步操作
watch(
  () => ({
    id: store.posts[store.currentPostIndex]?.id,
    content: store.posts[store.currentPostIndex]?.content,
  }),
  (newVal, oldVal) => {
    if (newVal.id === oldVal?.id) {
      // 同一个 post，内容变了，才 sync
      if (store.isAutoSync) {
        if (newVal.content !== oldVal?.content) {
          folderSourceStore.startSyncFileToPostWhenEdit = true
        }
      }
    }
  },
  { deep: false },
)

const diffDone = ref(false)

async function doDiff() {
  if (diffDone.value) {
    return
  }
  folderSourceStore.clearSync = true
  const post = store.posts.find(post => post.id === store.currentPostId) || null

  if (post && post.localFile && post.nodePath && !post.isFolder) {
    folderSourceStore.currentFolderId = post.localFile
    folderSourceStore.currentFilePath = post.nodePath
    const currentRuntimeFolder = await folderSourceStore.setCurrentRuntimeFolder()
    if (currentRuntimeFolder === -1) {
      toast.error(`丢失文件权限，内容不再与文件同步`)
      post.localFile = null
    }
    else if (currentRuntimeFolder === 1) {
      const needSync = await folderSourceStore.diffPostAndPFile(post)
      if (needSync.code === 1) {
        isNeedSyncDialog.value = true
        if (needSync.diffContent) {
          diffContent.value = needSync.diffContent
        }
      }
      else if (needSync.code === -1) {
        post.localFile = null
      }
    }
  }
  else {
    folderSourceStore.currentFolderId = null
    folderSourceStore.currentFilePath = null
  }
  diffDone.value = true
}

async function handleSelectPost(postId: string) {
  // 点击 post 时要执行的逻辑
  // 1. 检查权限
  // 2. 是否需要同步
  openedFromGlobalSearch.value = false
  store.currentPostId = postId
  folderSourceStore.clearSync = true
  diffDone.value = false
  await doDiff()
  diffDone.value = true
}
</script>

<template>
  <!-- 侧栏外框 -->
  <div
    class="h-full w-full overflow-hidden border-2 border-dashed bg-gray/20 transition-colors duration-300 dark:bg-[#191c20]"
    :class="{
      'border-gray-700 bg-gray-400/50 dark:border-gray-200 dark:bg-gray-500/50': dragover,
    }"
    @dragover.prevent="dragover = true"
    @dragleave.prevent="dragover = false"
    @dragend="handleDragEnd"
  >
    <nav
      class="h-full flex flex-col overflow-hidden border-r-2 border-gray/20 transition-transform"
      :class="{
        'translate-x-100': store.isOpenPostSlider,
        '-translate-x-full': !store.isOpenPostSlider,
      }"
      @dragover="handleDragOver"
      @drop.prevent="handleDrop(null)"
    >
      <!-- 顶部：新增 + 排序按钮 -->
      <div class="space-x-4 mb-2 flex flex-shrink-0 justify-center py-2">
        <!-- 新增 -->
        <Dialog v-model:open="isOpenAddDialog">
          <DialogTrigger>
            <TooltipProvider :delay-duration="200">
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button variant="ghost" size="xs" class="h-max p-1">
                    <PlusSquare class="size-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  新增内容
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新增内容</DialogTitle>
              <DialogDescription>请输入内容名称</DialogDescription>
            </DialogHeader>
            <Input v-model="addPostInputVal" @keyup.enter="addPost" />
            <DialogFooter>
              <Button @click="addPost">
                确 定
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <button
          class="hover:bg-accent hover:text-foreground size-7 inline-flex items-center justify-center rounded-md transition-colors duration-150"
          :class="{ 'text-primary bg-primary/10': isSearching }"
          @click="toggleSearch"
        >
          <TooltipProvider :delay-duration="200">
            <Tooltip>
              <TooltipTrigger as-child>
                <FileSearch class="size-5" />
              </TooltipTrigger>
              <TooltipContent side="bottom">
                全局搜索
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </button>
        <!-- 排序 -->
        <DropdownMenu>
          <DropdownMenuTrigger>
            <TooltipProvider :delay-duration="200">
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button variant="ghost" size="xs" class="h-max p-1">
                    <ArrowUpNarrowWide class="size-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  排序模式
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup v-model="sortMode">
              <DropdownMenuRadioItem value="A-Z">
                文件名（A-Z）
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="Z-A">
                文件名（Z-A）
              </DropdownMenuRadioItem>
              <DropdownMenuSeparator />
              <DropdownMenuRadioItem value="update-new-old">
                编辑时间（新→旧）
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="update-old-new">
                编辑时间（旧→新）
              </DropdownMenuRadioItem>
              <DropdownMenuSeparator />
              <DropdownMenuRadioItem value="create-new-old">
                创建时间（新→旧）
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="create-old-new">
                创建时间（旧→新）
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <TooltipProvider :delay-duration="200">
          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="ghost" size="xs" class="h-max p-1" @click="store.collapseAllPosts">
                <ChevronsDownUp class="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              全部收起
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider :delay-duration="200">
          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="ghost" size="xs" class="h-max p-1" @click="store.expandAllPosts">
                <ChevronsUpDown class="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              全部展开
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <!-- 搜索栏 -->
      <div v-if="isSearching" class="space-y-1 shrink-0 px-2 pb-1.5">
        <div class="relative">
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            class="bg-background border-border focus:ring-ring placeholder:text-muted-foreground/50 h-8 w-full border rounded-md px-2.5 pr-20 text-xs transition-colors focus:outline-none focus:ring-1"
            placeholder="搜索"
            @keydown.escape="closeSearch"
          >
          <div class="absolute right-1.5 top-1/2 flex items-center gap-0.5 -translate-y-1/2">
            <button
              class="hover:text-foreground text-muted-foreground/50 size-5 inline-flex items-center justify-center rounded transition-colors"
              :class="{ 'text-primary bg-primary/10': isRegex }"
              title="正则表达式"
              @click="isRegex = !isRegex"
            >
              <Regex class="size-3" />
            </button>
            <button
              class="text-muted-foreground/50 hover:text-foreground size-5 inline-flex items-center justify-center rounded transition-colors"
              :class="{ 'text-primary bg-primary/10': isCaseSensitive }"
              title="区分大小写"
              @click="isCaseSensitive = !isCaseSensitive"
            >
              <span class="text-[10px] font-bold">Aa</span>
            </button>
            <button
              v-if="searchQuery"
              class="text-muted-foreground/50 hover:text-foreground size-5 inline-flex items-center justify-center rounded transition-colors"
              @click="searchQuery = ''"
            >
              <X class="size-3" />
            </button>
          </div>
        </div>

        <!-- 替换栏 -->
        <div class="relative">
          <input
            v-model="replaceQuery"
            class="border-border bg-background placeholder:text-muted-foreground/50 focus:ring-ring h-8 w-full border rounded-md px-2.5 pr-16 text-xs transition-colors focus:outline-none focus:ring-1"
            placeholder="替换为…"
          >
          <div class="absolute right-1.5 top-1/2 flex items-center gap-0.5 -translate-y-1/2">
            <button
              class="hover:text-foreground text-muted-foreground size-5 inline-flex items-center justify-center rounded transition-colors disabled:opacity-35"
              title="替换一处"
              :disabled="!searchQuery || totalMatches === 0"
              @click="replaceFirst"
            >
              <Replace class="size-3" />
            </button>
            <button
              class="text-muted-foreground hover:text-foreground size-5 inline-flex items-center justify-center rounded transition-colors disabled:opacity-35"
              title="全部替换"
              :disabled="!searchQuery || totalMatches === 0"
              @click="replaceAll"
            >
              <ReplaceAll class="size-3" />
            </button>
          </div>
        </div>
      </div>

      <!-- 搜索结果 -->
      <div v-if="isSearching && searchQuery.trim()" class="thin-scrollbar flex-1 overflow-y-auto px-1.5 py-0.5">
        <!-- 匹配统计 -->
        <div v-if="totalMatches > 0" class="text-muted-foreground/60 px-2 py-1 text-xs">
          共 {{ totalMatches }} 处匹配，{{ searchResults.length }} 篇内容
        </div>
        <template v-if="searchResults.length">
          <a
            v-for="result in searchResults"
            :key="result.id"
            class="group relative w-full flex flex-col cursor-pointer gap-0.5 rounded-lg px-2 py-[7px] text-[13px] leading-snug transition-all duration-150 ease-out"
            :class="{
              'bg-accent text-accent-foreground font-medium': store.currentPostId === result.id,
              'text-foreground/70 hover:text-foreground hover:bg-accent/50': store.currentPostId !== result.id,
            }"
            @click="openCurrentPostFromGlobalSearch(result.id)"
          >
            <span
              v-if="store.currentPostId === result.id"
              class="bg-primary absolute left-0 top-1/2 h-4 w-[3px] rounded-r-full -translate-y-1/2"
            />
            <span class="select-none truncate">
              <template v-for="(part, i) in result.titleParts" :key="i">
                <mark v-if="part.highlight" class="bg-primary/20 rounded-sm px-px text-inherit">{{ part.text }}</mark>
                <span v-else>{{ part.text }}</span>
              </template>
            </span>
            <span
              v-if="result.snippetParts.length"
              class="text-muted-foreground/60 truncate text-[11px]"
            >
              <template v-for="(part, i) in result.snippetParts" :key="i">
                <mark v-if="part.highlight" class="bg-primary/20 rounded-sm px-px text-inherit">{{ part.text }}</mark>
                <span v-else>{{ part.text }}</span>
              </template>
            </span>
          </a>
        </template>
        <div v-else class="flex flex-col items-center justify-center gap-2 px-6 py-12">
          <Search class="text-muted-foreground/30 size-5" />
          <p class="text-muted-foreground/50 text-xs">
            没有匹配的内容
          </p>
        </div>
      </div>

      <!-- 列表 -->
      <div class="space-y-1 flex-1 overflow-y-auto px-1">
        <!-- 包裹根文章和子文章，保持间距 -->
        <PostItem
          :parent-id="null"
          :sorted-posts="sortedPosts"
          :start-rename-post="startRenamePost"
          :open-history-dialog="openHistoryDialog"
          :open-detail-dialog="openDetailDialog"
          :start-del-post="startDelPost"
          :drop-target-id="dropTargetId"
          :set-drop-target-id="(id: string | null) => (dropTargetId = id)"
          :drag-source-id="dragSourceId"
          :set-drag-source-id="(id: string | null) => (dragSourceId = id)"
          :handle-drop="handleDrop"
          :handle-drag-end="handleDragEnd"
          :open-add-post-dialog="openAddPostDialog"
          @select-post="handleSelectPost"
        />
      </div>

      <!-- 重命名弹窗 -->
      <Dialog v-model:open="isOpenEditDialog">
        <DialogContent class="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>编辑内容名称</DialogTitle>
            <DialogDescription>请输入新的内容名称</DialogDescription>
          </DialogHeader>
          <Input v-model="renamePostInputVal" @keyup.enter="renamePost" />
          <DialogFooter>
            <Button variant="outline" @click="isOpenEditDialog = false">
              取消
            </Button>
            <Button @click="renamePost">
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <!-- 删除确认 -->
      <AlertDialog v-model:open="isOpenDelPostConfirmDialog">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>提示</AlertDialogTitle>
            <AlertDialogDescription>{{ delConfirmText }}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction @click="delPost">
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <!-- 历史记录 -->
      <Dialog v-model:open="isOpenHistoryDialog">
        <DialogContent class="max-w-max">
          <DialogHeader>
            <DialogTitle>历史记录</DialogTitle>
            <DialogDescription>每隔 30 秒自动保存，最多保留 10 条</DialogDescription>
          </DialogHeader>

          <div class="h-[50vh] flex">
            <!-- 左侧时间轴 -->
            <ul class="space-y-2 w-[150px]">
              <li
                v-for="(item, idx) in store.getPostById(currentPostId!)?.history"
                :key="item.datetime"
                class="hover:bg-primary/90 hover:text-primary-foreground h-8 w-full inline-flex cursor-pointer items-center gap-2 rounded px-2 text-sm transition-colors"
                :class="{
                  'bg-primary text-primary-foreground shadow-lg dark:border dark:border-primary':
                    currentHistoryIndex === idx,
                  'dark:bg-gray/30 dark:text-primary-foreground-dark dark:border-primary-dark':
                    currentHistoryIndex === idx,
                }"
                @click="currentHistoryIndex = idx"
              >
                {{ item.datetime }}
              </li>
            </ul>

            <Separator orientation="vertical" class="mx-2" />

            <!-- 右侧内容 -->
            <div class="space-y-2 max-h-full w-[500px] overflow-y-auto">
              <p
                v-for="(line, idx) in (store.getPostById(currentPostId!)?.history[currentHistoryIndex].content ?? '').split('\n')"
                :key="idx"
              >
                {{ line }}
              </p>
            </div>
          </div>

          <DialogFooter>
            <AlertDialog>
              <AlertDialogTrigger><Button>恢 复</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>提示</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作将用该记录替换当前文章内容，是否继续？
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction @click="recoverHistory">
                    恢 复
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <!-- 查看详情 -->
      <Dialog v-model:open="isOpenDetailDialog">
        <DialogContent class="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>更多信息</DialogTitle>
            <DialogDescription>查看该内容的更多信息</DialogDescription>
          </DialogHeader>
          <div class="">
            <div class="my-4">
              <Label class="my-1 block text-sm font-medium">ID：</Label>
              <div class="text-muted-foreground text-xs">
                {{ detailAboutPostID }}
              </div>
            </div>
            <div class="my-4">
              <Label class="my-1 block text-sm font-medium">类型：</Label>
              <div class="text-muted-foreground text-xs">
                {{ detailAboutPostType }}
              </div>
            </div>
            <div class="my-4">
              <Label class="my-1 block text-sm font-medium">文件名：</Label>
              <div class="text-muted-foreground text-xs">
                {{ detailAboutPostPath }}
              </div>
            </div>
            <div class="my-4">
              <Label class="my-1 block text-sm font-medium">本地文件：</Label>
              <div class="text-muted-foreground text-xs">
                {{ detailAboutPostLocalNodePath }}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" @click="isOpenDetailDialog = false">
              知道了！
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </nav>
  </div>
  <Dialog v-model:open="isNeedSyncDialog">
    <DialogContent class="max-h-[80vh] max-w-[80vw] w-full overflow-auto">
      <DialogHeader>
        <DialogTitle>注意！</DialogTitle>
        <DialogDescription>文件和内容需要同步</DialogDescription>
      </DialogHeader>
      <div class="overflow-auto">
        <DiffViewer
          :diff-content="diffContent"
        />
      </div>
      <DialogFooter>
        <Button variant="default" @click="handleSyncFromFile">
          从文件同步
        </Button>
        <Button variant="destructive" @click="handleSaveToFile">
          保存到文件
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
  <OnboardingDialog v-model:onboarding-by-start="onboardingByStart" v-model:skip-onboarding="store.skipOnboarding" />
  <component :is="dialog" />
  <RencentFile v-model:opened-command-palette="store.openedCommandPalette" @search-result-opened="handleSelectPost" />
</template>
