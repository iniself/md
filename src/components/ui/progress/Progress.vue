<script setup lang="ts">
import type { ProgressRootProps } from 'radix-vue'
import { ProgressIndicator, ProgressRoot, useForwardPropsEmits } from 'radix-vue'

const props = defineProps<ProgressRootProps>()
const emits = defineEmits<{
  (e: `update:modelValue`, payload: string | number): void
}>()

const modelValue = useVModel(props, `modelValue`, emits, {
  passive: true,
  defaultValue: 0,
})
const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <ProgressRoot
    v-bind="forwarded"
    v-model="modelValue"
    class="bg-blackA9 relative h-4 w-full overflow-hidden rounded-full sm:h-5"
    style="transform: translateZ(0)"
  >
    <ProgressIndicator
      class="0, 0.35, 1)] bg-primary ease-[cubic-bezier(0.65, h-full w-full rounded-full transition-transform duration-[660ms]"
      :style="`transform: translateX(-${100 - (modelValue || 0)}%)`"
    />
  </ProgressRoot>
</template>
