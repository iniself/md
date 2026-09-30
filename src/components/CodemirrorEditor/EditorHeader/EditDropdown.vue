<script setup lang="ts">
import { ClipboardPasteIcon, Contact2Icon, CopyIcon, Redo2Icon, SmileIcon, TableIcon, Undo2Icon, UploadCloudIcon } from 'lucide-vue-next'

const { toggleShowInsertFormDialog, toggleShowUploadImgDialog, toggleShowInsertMpCardDialog, toggleShowEmojiPicker } = useDisplayStore()

const { copyToClipboard, pasteFromClipboard, undo, redo } = useStore()
</script>

<template>
  <MenubarMenu>
    <MenubarTrigger>
      编辑
    </MenubarTrigger>
    <MenubarContent align="start">
      <MenubarItem @click="undo()">
        <Undo2Icon class="mr-2 h-4 w-4" />
        撤销
      </MenubarItem>
      <MenubarItem @click="redo()">
        <Redo2Icon class="mr-2 h-4 w-4" />
        重做
      </MenubarItem>
      <MenubarSeparator />
      <MenubarItem @click="toggleShowUploadImgDialog()">
        <UploadCloudIcon class="mr-2 h-4 w-4" />
        上传图片
      </MenubarItem>
      <MenubarItem @click="toggleShowInsertFormDialog()">
        <TableIcon class="mr-2 h-4 w-4" />
        插入表格
      </MenubarItem>
      <MenubarItem @click="toggleShowInsertMpCardDialog()">
        <Contact2Icon class="mr-2 h-4 w-4" />
        插入公众号名片
      </MenubarItem>
      <MenubarItem @click="toggleShowEmojiPicker()">
        <SmileIcon class="mr-2 h-4 w-4" />
        插入表情
      </MenubarItem>
      <MenubarSeparator />
      <MenubarItem @click="copyToClipboard()">
        <CopyIcon class="mr-2 h-4 w-4" />
        复制
      </MenubarItem>
      <MenubarItem @click="pasteFromClipboard()">
        <ClipboardPasteIcon class="mr-2 h-4 w-4" />
        粘贴
      </MenubarItem>
    </MenubarContent>
  </MenubarMenu>
</template>
