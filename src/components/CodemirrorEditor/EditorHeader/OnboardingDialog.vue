<script setup lang='ts'>
import { marked } from 'marked'
import { removeLeft } from '@/utils'

import onboardContent from '../../../../docs/onboard-help.md?raw'

const onboardingByMenu = defineModel<boolean>('onboardingByMenu')
const onboardingByStart = defineModel<boolean>('onboardingByStart')
const skipOnboarding = defineModel<boolean>('skipOnboarding')

const onboardingOpen = computed({
  get() {
    return onboardingByMenu.value || onboardingByStart.value
  },
  set(v) {
    onboardingByMenu.value = v
    onboardingByStart.value = v
  },
})
</script>

<template>
  <Dialog v-model:open="onboardingOpen">
    <DialogContent class="max-h-[90%] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>新手指引</DialogTitle>
        <DialogDescription>最简上手指南</DialogDescription>
      </DialogHeader>
      <p />
      <div class="md-viewer--custom-upload-form" v-html="marked.parse(removeLeft(onboardContent))" />
      <DialogFooter class="items-center !flex !flex-row !gap-5">
        <div v-if="onboardingByStart" class="flex items-center gap-2">
          <Label for="latex-textstyle" class="text-muted-foreground text-sm">不再显示
            <Popover>
              <PopoverTrigger as-child>
                <button>
                  💡
                </button>
              </PopoverTrigger>
              <PopoverContent class="w-64 text-sm">
                <div class="space-y-2">
                  <div class="font-bold">
                    新手指引：
                  </div>
                  <p>勾选后，下次启动不再显示。可以通过帮助菜单中再次进入该指引</p>
                </div>
              </PopoverContent>
            </Popover>
          </Label>
          <Checkbox
            id="latex-textstyle"
            v-model="skipOnboarding"
            class="bg-background border-foreground/50 data-[state=checked]:bg-foreground data-[state=checked]:text-background h-5 w-5 border"
          />
        </div>
        <Button variant="secondary" @click="onboardingOpen = false">
          知道了
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
