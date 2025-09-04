<script setup lang="ts">
import { ListOrdered, TableOfContents } from 'lucide-vue-next'

const store = useStore()
</script>

<template>
  <MenubarMenu>
    <MenubarTrigger
      @click="
        () => {
          if (store.isOpenTocSlider) {
            store.isOpenTocSlider = false
            store.isOpenPostSlider = true
          }
          else {
            store.isOpenTocSlider = true
            store.isOpenPostSlider = false
          }
        }
      "
    >
      <template v-if="store.isOpenTocSlider">
        <TableOfContents class="mr-1 size-5" />
        文章大纲
      </template>
      <template v-if="store.isOpenPostSlider">
        <ListOrdered class="mr-1 size-5" />
        文件列表
      </template>
    </MenubarTrigger>
  </MenubarMenu>
</template>
