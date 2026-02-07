<script setup lang="ts">
import { Info } from 'lucide-vue-next'
import { onMounted } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([`close`, `startpdf`])

const store = useStore()

function onUpdate(val: boolean) {
  if (!val) {
    store.pdfTitle = undefined
    emit(`close`)
  }
}

onMounted(() => {

})
</script>

<template>
  <Dialog :open="props.visible" @update:open="onUpdate">
    <DialogContent class="bg-card text-card-foreground h-dvh max-h-dvh w-full flex flex-col rounded-none shadow-xl sm:max-h-[80vh] sm:max-w-2xl sm:rounded-xl">
      <DialogHeader class="space-y-1 flex flex-col items-start">
        <DialogTitle>Docs<sup style="color:red">+</sup></DialogTitle>
        <DialogDescription>设置 PDF 参数</DialogDescription>
      </DialogHeader>
      <div class="custom-scroll mb-4 max-h-[calc(100dvh-10rem)] overflow-y-auto rounded-md p-4 pr-1 text-xs sm:max-h-none sm:text-sm">
        <div class="text-center">
          <div class="mb-5">
            <Label class="mb-1 flex items-center text-sm font-medium">
              中间页眉
            </Label>
            <Input
              v-model="store.currentPdfTitle"
              placeholder="留空则不显示"
              class="focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
            />
          </div>
          <div class="mb-5">
            <Label class="mb-1 flex items-center text-sm font-medium">
              左边页眉
            </Label>
            <Input
              v-model="store.topLeft"
              placeholder="留空则不显示"
              class="focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
            />
          </div>
          <div class="mb-5">
            <Label class="mb-1 flex items-center text-sm font-medium">
              右边页眉
            </Label>
            <Input
              v-model="store.topRight"
              placeholder="留空则不显示"
              class="focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
            />
          </div>
          <div class="mb-5">
            <Label class="mb-1 flex items-center text-sm font-medium">
              左边页脚
            </Label>
            <Input
              v-model.string="store.bottomLeft"
              placeholder="留空则不显示"
              class="focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
            />
          </div>
          <div class="mb-5">
            <Label class="mb-1 flex items-center text-sm font-medium">
              右边页脚
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <Info class="text-gray-500" :size="16" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div>
                      "第 " counter(page) " 页，共 " counter(pages) " 页"
                      <div>可以按照上面格式自己定义</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              v-model.string="store.bottomRight"
              placeholder="留空则不显示"
              class="focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
            />
          </div>
          <div class="mb-2">
            <Label class="mb-1 flex items-center text-sm font-medium">
              打印页边距
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <Info class="text-gray-500" :size="16" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div>
                      20mm 20mm 表示上下边距 20mm，左右 20mm
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              v-model.string="store.printMargin"
              placeholder="留空则无边距"
              class="focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
            />
          </div>
        </div>
      </div>
      <DialogFooter class="sm:justify-evenly">
        <Button
          variant="destructive"
          @click="store.resetPdfConfig()"
        >
          重置
        </Button>
        <Button
          @click="emit(`startpdf`)"
        >
          导出
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
