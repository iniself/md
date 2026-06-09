<script setup lang="ts">
import { Download, FileCode, FileText, Image, Upload, X } from 'lucide-vue-next'
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'

import { ctrlSign } from '@/config'

const emit = defineEmits<{
  searchResultOpened: [postId: string]
}>()

const store = useStore()
const openedCommandPalette = defineModel<boolean>('openedCommandPalette')

// 搜索关键字
const searchWord = ref('')

const commandGroup = [
  {
    label: '导出 .pdf',
    description: '导出内容成 pdf 文件',
    icon: FileText,
    kbd: [ctrlSign, 'P'],
    action: () => {
      store.exportPdfDialogVisible = true
    },
  },
  {
    label: '导出 .html',
    description: '导出内容成 html 文件',
    icon: FileCode,
    kbd: [],
    action: () => {
      store.exportHTMLDialogVisible = true
    },
  },
  {
    label: '导出 .png',
    description: '导出内容成图片',
    icon: Image,
    kbd: [],
    action: () => {
      store.downloadAsCardImage()
    },
  },
  {
    label: '导入 .md',
    description: '导入外部 markdown 文件',
    icon: Upload,
    kbd: [],
    action: () => {
      const importMarkdownContent = useImportMarkdownContent()
      importMarkdownContent()
    },
  },
  {
    label: '导出 .md',
    description: '导出内容成 markdown 文件',
    icon: Download,
    kbd: [],
    action: () => {
      store.exportEditorContent2MD()
    },
  },
]

const filteredPosts = computed(() => {
  const keyword = searchWord.value.toLowerCase()

  return store.posts.filter(post =>
    post.title.toLowerCase().includes(keyword)
    || post.path.toLowerCase().includes(keyword),
  )
})

const filteredCommands = computed(() => {
  const keyword = searchWord.value.toLowerCase()

  return commandGroup.filter(command =>
    command.label.toLowerCase().includes(keyword) || command.description.toLowerCase().includes(keyword),
  )
})

function openPost(post: RecentItem | Post) {
  searchWord.value = ''
  emit('searchResultOpened', post.id)
  openedCommandPalette.value = false
}

function openCommand(command: any) {
  searchWord.value = ''
  command.action()
  openedCommandPalette.value = false
}

const whichTab = ref('recent')
let lastTab = 'recent'

watch(searchWord, (newVal) => {
  if (newVal) {
    lastTab = whichTab.value === 'search' ? lastTab : whichTab.value
    whichTab.value = 'search'
  }
  else {
    whichTab.value = lastTab
  }
})

const commandRef = ref<any>(null)

function changeTab(tab: 'recent' | 'commands') {
  whichTab.value = tab

  nextTick(() => {
    const inputEl = commandRef.value?.$el?.querySelector('input')
    inputEl?.focus()
  })
}
</script>

<template>
  <Dialog v-model:open="openedCommandPalette">
    <DialogContent class="max-w-xl overflow-hidden p-0" :show-close="false">
      <Command ref="commandRef" class="shadow-md md:min-w-[450px]">
        <CommandInput
          v-model="searchWord"
          placeholder="搜文件和命令..."
          class="h-11 border-0 focus:outline-none focus:ring-0"
        />
        <div v-show="!searchWord" class="flex gap-2 px-3 pt-3 text-xs opacity-70">
          <button
            :class="whichTab === 'recent' ? 'border-b-2 border-grey-500' : ''"
            @click="changeTab('recent')"
          >
            最近打开
          </button>
          <button
            :class="whichTab === 'commands' ? 'border-b-2 border-grey-500' : ''"
            @click="changeTab('commands')"
          >
            命令中心
          </button>
          <DialogClose class="focus:ring-ring ml-auto rounded-sm opacity-70 transition-opacity disabled:pointer-events-none hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2">
            <X class="h-3 w-3" />
          </DialogClose>
        </div>
        <CommandList>
          <div
            v-if="searchWord && filteredPosts.length === 0 && filteredCommands.length === 0"
            class="text-muted-foreground py-6 text-center text-sm"
          >
            没有结果
          </div>
          <CommandGroup v-if="searchWord && filteredPosts.length > 0" heading="文件结果">
            <CommandItem
              v-for="post in filteredPosts"
              :key="post.id"
              :value="post.title"
              class="cursor-pointer px-3 py-3"
              @select="openPost(post)"
            >
              <FileText class="mr-2 size-4 shrink-0 opacity-70" />
              <div class="flex flex-col">
                <span class="text-sm"> {{ post.title }} </span>
                <span class="text-muted-foreground text-xs"> {{ post.path }} </span>
              </div>
            </CommandItem>
          </CommandGroup>
          <CommandGroup v-if="searchWord && filteredCommands.length > 0" heading="命令结果">
            <CommandItem
              v-for="command in filteredCommands"
              :key="command.label"
              :value="command.label"
              class="cursor-pointer px-3 py-3"
              @select="openCommand(command)"
            >
              <component :is="command.icon" class="mr-2 size-4 shrink-0 opacity-70" />
              <div class="flex flex-col">
                <span class="text-sm"> {{ command.label }} </span>
                <span class="text-muted-foreground text-xs"> {{ command.description }} </span>
              </div>
            </CommandItem>
          </CommandGroup>

          <CommandGroup v-if="whichTab === 'recent'">
            <CommandItem
              v-for="post in store.recentPosts"
              :key="post.id"
              :value="post.title"
              class="cursor-pointer px-3 py-3"
              @select="openPost(post)"
            >
              <FileText class="mr-2 size-4 shrink-0 opacity-70" />
              <div class="flex flex-col">
                <span class="text-sm"> {{ post.title }} </span>
                <span class="text-muted-foreground text-xs"> {{ post.path }} </span>
              </div>
            </CommandItem>
          </CommandGroup>

          <CommandGroup v-if="whichTab === 'commands'">
            <CommandItem
              v-for="command in commandGroup"
              :key="command.label"
              class="cursor-pointer px-3 py-3"
              :value="command.label"
              @select="openCommand(command)"
            >
              <component :is="command.icon" class="mr-2 size-4 shrink-0 opacity-70" />
              <div class="flex flex-col">
                <span class="text-sm"> {{ command.label }} </span>
                <span class="text-muted-foreground text-xs"> {{ command.description }} </span>
              </div>
              <CommandShortcut>{{ command.kbd.join(' ') }}</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </DialogContent>
  </Dialog>
</template>
