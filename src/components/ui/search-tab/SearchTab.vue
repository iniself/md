<script setup lang="ts">
import type CodeMirror from 'codemirror'
import { CaseSensitive, ChevronDown, ChevronRight, ChevronUp, Regex, Replace, ReplaceAll, X } from 'lucide-vue-next'
import { useStore } from '@/stores'

const props = defineProps<{
  editor: CodeMirror.Editor
}>()

const store = useStore()

const showSearchTab = ref(false)

const searchInputEl = ref<any>(null)
async function focusSearchInput() {
  searchInputEl.value?.$el?.focus()
}

const searchWord = ref(``)

const isRegex = ref(false)
const isCaseSensitive = ref(false)

const indexOfMatch = ref(0)
const showReplace = ref(false)
const replaceWord = ref(``)

const matchPositions = ref<CodeMirror.Position[][]>([])
const numberOfMatches = computed(() => {
  return matchPositions.value.length
})

const currentMatchPosition = computed(() => {
  if (!checkMatchNumber())
    return null
  return matchPositions.value[indexOfMatch.value]
})

watch(searchWord, () => {
  const debouncedSearch = useDebounceFn(() => {
    matchPositions.value = []

    if (searchWord.value === ``) {
      clearAllMarks()
    }
    else {
      indexOfMatch.value = 0
      findAllMatches()
    }
  }, 300)

  debouncedSearch()
})

watch([indexOfMatch, matchPositions], () => {
  markMatch()
})

const { searchQuery, replaceQuery, isCaseSensitive: isGlobalCaseSensitive, isRegex: isGlobalRegex, openedFromGlobalSearch } = storeToRefs(store)
watch(openedFromGlobalSearch, (newVal) => {
  if (newVal) {
    searchWord.value = searchQuery.value
    replaceWord.value = replaceQuery.value
    if (replaceWord.value) {
      showReplace.value = true
    }
    isRegex.value = isGlobalRegex.value
    isCaseSensitive.value = isGlobalCaseSensitive.value
    showSearchTab.value = true
  }
  else {
    showSearchTab.value = false
  }
})

watch(showSearchTab, async () => {
  if (!showSearchTab.value) {
    searchWord.value = ''
    replaceWord.value = ''
    showReplace.value = false
    isRegex.value = false
    isCaseSensitive.value = false
    openedFromGlobalSearch.value = false

    clearAllMarks()
  }
  else {
    markMatch()
    requestAnimationFrame(() => {
      focusSearchInput()
    })
  }
})

function clearAllMarks() {
  const editor = props.editor
  editor.getAllMarks().forEach(mark => mark.clear())
}

function markMatch() {
  const editor = props.editor
  clearAllMarks()
  matchPositions.value.forEach((pos, i) => {
    editor.markText(pos[0], pos[1], { className: i === indexOfMatch.value
      ? `current-match`
      : `search-match` })
  })
  if (matchPositions.value[indexOfMatch.value]?.[0])
    editor.scrollIntoView(matchPositions.value[indexOfMatch.value][0])
}

function findAllMatches() {
  const editor = props.editor
  if (!searchWord.value.trim() || !showSearchTab.value)
    return

  // 获取所有匹配项
  let cursor

  if (isRegex.value) {
    try {
      const query = new RegExp(searchWord.value, isCaseSensitive.value ? 'gm' : 'gmi')
      cursor = editor.getSearchCursor(query)
    }
    catch {
      return
    }
  }
  else {
    cursor = editor.getSearchCursor(searchWord.value, undefined, !isCaseSensitive.value,
    )
  }

  let matchCount = 0
  const _matchPositions: CodeMirror.Position[][] = []
  while (cursor.findNext()) {
    _matchPositions.push([cursor.from(), cursor.to()])
    matchCount++
  }
  matchPositions.value = _matchPositions
  if (matchCount === indexOfMatch.value) {
    indexOfMatch.value -= 1
  }
}

function nextMatch() {
  if (!checkMatchNumber())
    return
  indexOfMatch.value = (indexOfMatch.value + 1) % numberOfMatches.value
}
function prevMatch() {
  if (!checkMatchNumber())
    return
  indexOfMatch.value = (indexOfMatch.value - 1 + numberOfMatches.value) % numberOfMatches.value
}

function toggleShowReplace() {
  showReplace.value = !showReplace.value
}

function closeSearchTab() {
  showSearchTab.value = false
}

function handleSearchInputKeyDown(e: KeyboardEvent) {
  switch (e.key) {
    case `Enter`:
      nextMatch()
      e.preventDefault()
  }
}

function handleReplaceInputKeyDown(e: KeyboardEvent) {
  switch (e.key) {
    case `Enter`:
      handleReplace()
      e.preventDefault()
  }
}

function handleReplace() {
  if (!checkMatchNumber())
    return
  const editor = props.editor
  if (!currentMatchPosition.value)
    return
  editor.setSelection(currentMatchPosition.value[0], currentMatchPosition.value[1])
  props.editor.replaceSelection(replaceWord.value)
  findAllMatches()
}

function handleReplaceAll() {
  if (!checkMatchNumber())
    return
  const editor = props.editor
  if (!currentMatchPosition.value)
    return

  const sortedPositions = [...matchPositions.value].sort((a, b) => {
    if (a[0].line !== b[0].line) {
      return b[0].line - a[0].line
    }
    return b[0].ch - a[0].ch
  })

  sortedPositions.forEach((pos) => {
    editor.setSelection(pos[0], pos[1])
    editor.replaceSelection(replaceWord.value)
  })
  findAllMatches()
}

function handleEditorChange() {
  const debouncedSearch = useDebounceFn(findAllMatches, 300)
  debouncedSearch()
}

function setSearchWord(word: string) {
  searchWord.value = word
  if (!showSearchTab.value) {
    showSearchTab.value = true
  }
}

function toggleCaseSensitive() {
  isCaseSensitive.value = !isCaseSensitive.value
  findAllMatches()
}

function toggleRegex() {
  isRegex.value = !isRegex.value
  findAllMatches()
}

onMounted(() => {
  const editor = props.editor
  editor.on(`changes`, handleEditorChange)
})
onUnmounted(() => {
  props.editor.off(`changes`, handleEditorChange)
})

/**
 * 检查是否有匹配项
 * 返回 false 表示没有匹配项
 * 返回 true 表示有匹配项
 */
function checkMatchNumber(): boolean {
  return numberOfMatches.value > 0
}

defineExpose({
  showSearchTab,
  searchWord,
  setSearchWord,
  handleEditorChange,
})
</script>

<template>
  <Transition name="slide-down">
    <div
      v-if="showSearchTab"
      class="bg-background absolute right-0 top-0 z-50 max-w-[calc(100%-1rem)] flex gap-1 border rounded-lg px-2 py-1 shadow-md transition-all"
      :class="showReplace ? 'items-start' : 'items-center'"
    >
      <!-- 折叠/展开按钮 -->
      <Button
        variant="ghost"
        title="切换替换"
        aria-label="切换替换"
        class="h-7 w-5 flex items-center justify-center p-0"
        @click="toggleShowReplace"
      >
        <component :is="showReplace ? ChevronDown : ChevronRight" class="h-3.5 w-3.5" />
      </Button>

      <!-- 查找 / 替换主体 -->
      <div class="grid grid-cols-[1fr_auto] min-w-0 flex-1 items-center gap-0.5">
        <!-- 查找行 -->
        <div class="relative min-w-0">
          <Input
            ref="searchInputEl"
            v-model="searchWord"
            placeholder="查找"
            class="h-7 min-w-0 w-full pr-12 text-sm"
            @keydown="handleSearchInputKeyDown"
          />
          <div class="absolute right-1 top-1/2 flex items-center gap-0.5 -translate-y-1/2">
            <Button
              variant="ghost"
              size="xs"
              title="正则表达式"
              aria-label="正则表达式"
              class="h-5 w-5 p-0"
              :class="{ 'bg-foreground text-background hover:bg-foreground hover:text-background': isRegex }"
              @click="toggleRegex"
            >
              <Regex class="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="xs"
              title="区分大小写"
              aria-label="区分大小写"
              class="h-5 w-5 p-0"
              :class="{ 'bg-foreground text-background hover:bg-foreground hover:text-background': isCaseSensitive }"
              @click="toggleCaseSensitive"
            >
              <CaseSensitive class="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <span class="w-10 select-none text-center text-xs">
            {{ numberOfMatches ? indexOfMatch + 1 : 0 }}/{{ numberOfMatches }}
          </span>
          <Button
            variant="ghost"
            size="xs"
            title="上一处"
            aria-label="上一处"
            class="h-6 w-6 p-0"
            @click="prevMatch"
          >
            <ChevronUp class="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="xs"
            title="下一处"
            aria-label="下一处"
            class="h-6 w-6 p-0"
            @click="nextMatch"
          >
            <ChevronDown class="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="xs"
            title="关闭"
            aria-label="关闭"
            class="h-6 w-6 p-0"
            @click="closeSearchTab"
          >
            <X class="h-3 w-3" />
          </Button>
        </div>

        <!-- 替换行（可折叠） -->
        <template v-if="showReplace">
          <Input
            v-model="replaceWord"
            placeholder="替换"
            class="mt-0.5 h-7 min-w-0 text-sm"
            @keydown="handleReplaceInputKeyDown"
          />
          <div class="mt-0.5 flex items-center gap-1">
            <Button
              variant="ghost"
              size="xs"
              title="替换"
              aria-label="替换"
              class="h-6 w-6 p-0"
              @click="handleReplace"
            >
              <Replace class="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="xs"
              title="全部替换"
              aria-label="全部替换"
              class="h-6 w-6 p-0"
              @click="handleReplaceAll"
            >
              <ReplaceAll class="h-3 w-3" />
            </Button>
          </div>
        </template>
      </div>
    </div>
  </Transition>
</template>

<style scoped lang="less">
.slide-down-enter-active,
.slide-down-leave-active {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
