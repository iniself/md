<script setup lang="ts">
import { v4 as uuid } from 'uuid'
import DEFAULT_CONTENT from '@/assets/example/markdown.md?raw'
import { useStore } from '@/stores'

const aboutDialogVisible = ref(false)
const fundDialogVisible = ref(false)

const store = useStore()
function generateHelpContent() {
  const title = `Markdown语法`
  const parentId = null
  if (store.posts.some(post => post.title === title))
    return toast.error(`语法文档已存在`)
  const newPost: any = {
    id: uuid(),
    title,
    content: `${DEFAULT_CONTENT}`,
    history: [
      { datetime: new Date().toLocaleString(`zh-cn`), content: `${DEFAULT_CONTENT}` },
    ],
    createDatetime: new Date(),
    updateDatetime: new Date(),
    parentId,
  }
  store.posts.push(newPost)
  store.currentPostId = newPost.id
  toast.success(`语法文档已经生成`)
}
</script>

<template>
  <!-- 帮助菜单 -->
  <MenubarMenu>
    <MenubarTrigger>帮助</MenubarTrigger>
    <MenubarContent align="start">
      <MenubarCheckboxItem @click="aboutDialogVisible = true">
        <span>关于 Docs<sup style="color:red">+</sup></span>
      </MenubarCheckboxItem>
      <!-- <MenubarCheckboxItem @click="fundDialogVisible = true"> -->
      <MenubarCheckboxItem @click="generateHelpContent()">
        Markdown语法
      </MenubarCheckboxItem>
    </MenubarContent>
  </MenubarMenu>

  <!-- 各弹窗挂载 -->
  <AboutDialog :visible="aboutDialogVisible" @close="aboutDialogVisible = false" />
  <FundDialog :visible="fundDialogVisible" @close="fundDialogVisible = false" />
</template>
