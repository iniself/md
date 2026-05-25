<script setup lang="ts">
import { UploadCloud } from 'lucide-vue-next'
import { onMounted } from 'vue'
import { useHTMLExportStore } from '@/stores/html'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([`close`, `starthtml`])

const store = useStore()
const htmlExportStore = useHTMLExportStore()

function onUpdate(val: boolean) {
  if (!val) {
    store.pdfTitle = undefined
    emit(`close`)
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      const img = new Image()

      img.onload = () => resolve(img)
      img.onerror = reject

      img.src = reader.result as string
    }

    reader.onerror = reject

    reader.readAsDataURL(file)
  })
}

async function createFaviconBase64(file: File) {
  const img = await loadImage(file)

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  const size = 32

  canvas.width = size
  canvas.height = size

  const min = Math.min(img.width, img.height)

  const sx = (img.width - min) / 2
  const sy = (img.height - min) / 2

  ctx!.drawImage(
    img,
    sx,
    sy,
    min,
    min,
    0,
    0,
    size,
    size,
  )

  return canvas.toDataURL('image/png')
}

const dragover = ref(false)

const { open, reset, onChange } = useFileDialog({
  accept: `image/*`,
})

function checkImg(file: File) {
  if (file.size > 5 * 1024 * 1024) {
    toast.error('图片格式有问题')
    return false
  }
}

onChange(async (files) => {
  if (files == null) {
    return
  }

  if (!checkImg) {
    return
  }

  const file = files[0]

  store.htmlIcon = await createFaviconBase64(file)

  reset()
})

async function onDrop(e: DragEvent) {
  dragover.value = false
  e.stopPropagation()
  const file = Array.from(e.dataTransfer!.files)[0]

  store.htmlIcon = await createFaviconBase64(file)
}

const progressValue = ref(0)

onMounted(() => {

})
</script>

<template>
  <Dialog :open="props.visible" @update:open="onUpdate">
    <DialogContent class="bg-card text-card-foreground max-h-dvh w-full flex flex-col rounded-none shadow-xl sm:max-h-[80vh] sm:max-w-2xl sm:rounded-xl">
      <DialogHeader class="space-y-1 flex flex-col items-start">
        <DialogTitle>Docs<sup style="color:red">+</sup></DialogTitle>
        <DialogDescription>设置 HTML 参数</DialogDescription>
      </DialogHeader>
      <div class="custom-scroll mb-4 max-h-[calc(100dvh-10rem)] overflow-y-auto rounded-md p-4 pr-1 text-xs sm:max-h-none sm:text-sm">
        <div class="text-center">
          <div class="mb-5">
            <Label class="mb-1 flex items-center text-sm font-medium">
              标题
            </Label>
            <Input
              v-model="store.currentPdfTitle"
              placeholder="默认显示 Docs+"
              class="focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
            />
          </div>
          <div class="mb-5">
            <Label class="mb-1 flex items-center gap-2 text-sm font-medium">
              图标
              <img class="size-[1.5em]" :src="store.htmlIcon">
              <span class="text-muted-foreground text-xs">(默认使用 Docs+ 图标)</span>

            </Label>

            <div
              class="bg-clip-padding relative mt-4 h-50 flex flex-col cursor-pointer items-center justify-evenly border-2 rounded border-dashed transition-colors hover:border-gray-700 hover:bg-gray-400/50 dark:hover:border-gray-200 dark:hover:bg-gray-500/50"
              :class="{
                'border-gray-700 bg-gray-400/50 dark:border-gray-200 dark:bg-gray-500/50': dragover,
              }"
              @click="open()"
              @drop.prevent="onDrop"
              @dragover.prevent="dragover = true"
              @dragleave.prevent="dragover = false"
            >
              <Progress v-model="progressValue" class="absolute left-0 right-0 rounded-none" style="top: -24px; height: 2px;" />
              <UploadCloud class="size-10" />
              <p>
                将图片拖到此处，或
                <strong>点击上传</strong>
              </p>
            </div>
          </div>
          <div class="mb-5">
            <Label class="mb-1 flex items-center text-sm font-medium">
              描述
            </Label>
            <Input
              v-model="store.htmlDescription"
              placeholder="留空则不显示"
              class="focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
            />
          </div>
          <div class="mb-5">
            <Label class="mb-1 flex items-center gap-2 text-sm font-medium">
              <span>宽度</span>
              <span class="text-muted-foreground text-xs">max-width</span>
            </Label>
            <Input
              v-model="store.htmlMaxWidth"
              placeholder="留空则默认值 80 ch"
              class="focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
            />
          </div>
          <div class="mb-5">
            <Label class="mb-1 flex items-center gap-2 text-sm font-medium">
              <span>外边距</span>
              <span class="text-muted-foreground text-xs">margin</span>
            </Label>
            <Input
              v-model="store.htmlMargin"
              placeholder="留空则默认值： '0 auto'"
              class="focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
            />
          </div>
        </div>
      </div>
      <DialogFooter class="sm:justify-evenly">
        <Button
          variant="destructive"
          :disabled="htmlExportStore.exporting"
          @click="store.resetHTMLConfig()"
        >
          重置
        </Button>
        <Button
          :disabled="htmlExportStore.exporting"
          @click="emit(`starthtml`)"
        >
          <span v-if="htmlExportStore.exporting">
            ⏳ 导出中...
          </span>
          <span v-if="!htmlExportStore.exporting">
            导出
          </span>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
