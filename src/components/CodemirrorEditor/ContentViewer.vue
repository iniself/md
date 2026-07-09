<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'

import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'

interface Props {
  open: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const scale = ref(1)

const minScale = 0.5
const maxScale = 5
const zoomStep = 0.2

const translateX = ref(0)
const translateY = ref(0)

const dragging = ref(false)

let startPointerX = 0
let startPointerY = 0

let startTranslateX = 0
let startTranslateY = 0

const contentStyle = computed(() => ({
  transform: `
    translate(
      ${translateX.value}px,
      ${translateY.value}px
    )
    scale(${scale.value})
  `,
}))

function zoomIn() {
  scale.value = Math.min(
    maxScale,
    scale.value + zoomStep,
  )
}

function zoomOut() {
  scale.value = Math.max(
    minScale,
    scale.value - zoomStep,
  )

  if (scale.value <= 1) {
    translateX.value = 0
    translateY.value = 0
  }
}

function reset() {
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
}

function onPointerDown(event: PointerEvent) {
  if (scale.value <= 1) {
    return
  }

  dragging.value = true

  startPointerX = event.clientX
  startPointerY = event.clientY

  startTranslateX = translateX.value
  startTranslateY = translateY.value

  const target = event.currentTarget as HTMLElement
  target.setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!dragging.value) {
    return
  }

  translateX.value = startTranslateX + (event.clientX - startPointerX)

  translateY.value = startTranslateY + (event.clientY - startPointerY)
}

function onPointerUp(event: PointerEvent) {
  dragging.value = false
  const target = event.currentTarget as HTMLElement

  target.releasePointerCapture(event.pointerId)
}

function onOpenChange(value: boolean) {
  emit(
    'update:open',
    value,
  )
}

watch(
  () => props.open,
  (value) => {
    if (value) {
      reset()
    }
  },
)

function onWheel(e: WheelEvent) {
  e.preventDefault()

  if (e.deltaY < 0) {
    zoomIn()
  }
  else {
    zoomOut()
  }
}
</script>

<template>
  <Dialog
    :open="props.open"
    @update:open="onOpenChange"
  >
    <DialogContent
      class="z-[999] h-screen max-w-none w-screen flex items-center justify-center border-none bg-black/60 bg-transparent p-0 shadow-none"
      :show-close="false"
    >
      <X class="data-[state=open]:bg-accent ring-offset-background data-[state=open]:text-muted-foreground focus:ring-ring absolute right-4 top-4 z-[1000] cursor-pointer rounded-sm text-white/70 opacity-70 transition-opacity disabled:pointer-events-none hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2" @click="emit('update:open', false)" />
      <div class="relative h-full w-full flex items-center justify-center overflow-hidden" @wheel.prevent="onWheel">
        <div
          class="touch-none flex select-none items-center justify-center"
          :style="contentStyle"
          :class="[dragging ? 'cursor-grabbing' : scale > 1 ? 'cursor-grab' : 'cursor-default', dragging ? '' : 'transition-transform duration-200']"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        >
          <div class="viewer-content pointer-events-none text-white">
            <slot />
          </div>
        </div>
        <div class="absolute bottom-8 left-1/2 flex items-center gap-4 rounded-lg bg-black/50 px-4 py-2 text-white -translate-x-1/2">
          <button class="text-xl" @click="zoomOut">
            −
          </button>
          <span class="min-w-16 text-center">{{ Math.round(scale * 100) }}%</span>
          <button class="text-xl" @click="zoomIn">
            +
          </button>
          <button @click="reset">
            重置
          </button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.viewer-content :deep(img),
.viewer-content :deep(svg) {
  max-width: 90vw;
  max-height: 90vh;
}
</style>
