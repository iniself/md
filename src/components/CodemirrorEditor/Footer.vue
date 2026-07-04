<script setup lang="ts">
import { Clock, Columns2, Eye, Monitor, PenLine, Pilcrow, Smartphone, Type } from 'lucide-vue-next'
import { ctrlSign, shiftSign } from '@/config'
import { useStore } from '@/stores'

const store = useStore()
const { readingTime, viewMode, isMobile, previewDevice } = storeToRefs(store)

const stats = computed(() => [
  { icon: Pilcrow, value: readingTime.value.words, tooltip: `词数` },
  { icon: Type, value: readingTime.value.chars, tooltip: `字符数` },
  { icon: Clock, value: `${readingTime.value.minutes} 分钟`, tooltip: `预计阅读时间` },
])

// 视图模式选项
const allViewModes = [
  { key: `edit` as const, icon: PenLine, label: `编辑` },
  { key: `split` as const, icon: Columns2, label: `双屏` },
  { key: `preview` as const, icon: Eye, label: `预览` },
]
const viewModes = computed(() =>
  isMobile.value ? allViewModes.filter(m => m.key !== `split`) : allViewModes,
)

function nextViewMode(viewMode: ViewMode) {
  const idx = viewModes.value.findIndex(i => i.key === viewMode)

  const safeIdx = idx === -1 ? 0 : idx
  const next = (safeIdx + 1) % viewModes.value.length
  store.setViewMode(viewModes.value[next].key)
}

function handleKeydown(e: KeyboardEvent) {
  if (
    (e.key.toLowerCase() === 'v' && e.ctrlKey && e.shiftKey)
    || (e.key.toLowerCase() === 'v' && e.metaKey && e.shiftKey)
  ) {
    e.preventDefault()
    nextViewMode(viewMode.value)
  }
}

onMounted(() => {
  document.addEventListener(`keydown`, handleKeydown)
})

// 是否显示设备切换（双屏/预览模式 + 非真实移动端）
const showDeviceToggle = computed(() => viewMode.value !== `edit` && !isMobile.value)
</script>

<template>
  <footer
    class="text-muted-foreground flex select-none items-center overflow-hidden px-3 py-1 text-xs"
  >
    <TooltipProvider :delay-duration="300">
      <!-- 右侧：统计信息 -->
      <div class="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <!-- 视图模式切换 -->
        <div class="border-border/60 flex items-center border rounded-md p-0.5">
          <Tooltip v-for="mode in viewModes" :key="mode.key">
            <TooltipTrigger as-child>
              <button
                :aria-label="mode.label"
                class="flex cursor-pointer items-center rounded-sm px-1.5 py-0.5 transition-all duration-200"
                :class="viewMode === mode.key
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'"
                @click="store.setViewMode(mode.key)"
              >
                <component :is="mode.icon" class="size-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" :side-offset="6" class="text-muted-foreground text-xs">
              <div class="mx-auto mb-3 w-full text-center">
                {{ mode.label }}模式
              </div>
              <div class="flex items-center gap-1 text-xs text-gray-500">
                <kbd
                  v-for="key in [ctrlSign, shiftSign, 'V']"
                  :key="key"
                  class="border rounded bg-gray-50 px-1.5 py-0.5 text-[10px] font-mono shadow-sm"
                >
                  {{ key }}
                </kbd>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>

        <!-- 设备切换（双屏/预览下可用，真实移动端隐藏） -->
        <Tooltip v-if="!isMobile">
          <TooltipTrigger as-child>
            <button
              :aria-label="previewDevice === 'mobile' ? '移动端预览' : '桌面端预览'"
              class="flex cursor-pointer items-center rounded-sm px-1.5 py-0.5 transition-all duration-200"
              :class="showDeviceToggle
                ? 'text-muted-foreground hover:bg-accent hover:text-foreground opacity-100'
                : 'pointer-events-none opacity-0'"
              @click="store.togglePreviewDevice()"
            >
              <Monitor v-if="previewDevice === 'desktop'" class="size-3" />
              <Smartphone v-else class="size-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" :side-offset="6" class="text-muted-foreground text-xs">
            <p>{{ previewDevice === 'mobile' ? '移动端预览' : '桌面端预览' }}</p>
          </TooltipContent>
        </Tooltip>

        <span class="text-border hidden sm:block">·</span>

        <!-- 统计项（小屏隐藏） -->
        <Tooltip v-for="stat in stats" :key="stat.tooltip">
          <TooltipTrigger as-child>
            <span class="tabular-nums hidden cursor-default items-center gap-1 sm:flex">
              <component :is="stat.icon" class="size-3 opacity-60" />
              {{ stat.value }}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" :side-offset="6" class="text-muted-foreground text-xs">
            <p>{{ stat.tooltip }}</p>
          </TooltipContent>
        </Tooltip>
        <span class="text-border hidden sm:block">·</span>
      </div>
    </TooltipProvider>
  </footer>
</template>
