<script setup lang="ts">
import { Download, FileCode, FileCog, FileText, FolderOpen, Save, Upload } from 'lucide-vue-next'
import { ref } from 'vue'
import { ctrlSign } from '@/config/'
import { useStore } from '@/stores'
import { useFolderSourceStore } from '@/stores/folderSource'

const emit = defineEmits([`startCopy`, `endCopy`])

const store = useStore()
const folderSourceStore = useFolderSourceStore()

const {
  isDark,
  isEditOnLeft,
  isOpenFolderPanel,
  exportPdfDialogVisible,
} = storeToRefs(store)

const {
  export2HTML,
  exportEditorContent2PureHTML,
  exportEditorContent2MD,
  downloadAsCardImage,
  export2PDF,
} = store

const editorStateDialogVisible = ref(false)

const importMarkdownContent = useImportMarkdownContent()
</script>

<template>
  <MenubarMenu>
    <MenubarTrigger>
      文件
    </MenubarTrigger>
    <MenubarContent align="start">
      <!-- 本地文件夹 -->
      <MenubarItem @click="isOpenFolderPanel = !isOpenFolderPanel">
        <FolderOpen class="mr-2 size-4" />
        本地文件夹
        <MenubarShortcut>
          <kbd class="mx-1">{{ ctrlSign }}</kbd>
          <kbd class="mx-1">O</kbd>
        </MenubarShortcut>
      </MenubarItem>
      <MenubarItem @click="folderSourceStore.startSavePostToFile = true">
        <Save class="mr-2 size-4" />
        保存到文件
        <MenubarShortcut>
          <kbd class="mx-1">{{ ctrlSign }}</kbd>
          <kbd class="mx-1">S</kbd>
        </MenubarShortcut>
      </MenubarItem>
      <MenubarSeparator />
      <MenubarItem @click="importMarkdownContent()">
        <Upload class="mr-2 size-4" />
        导入 .md
      </MenubarItem>
      <MenubarItem @click="exportEditorContent2MD()">
        <Download class="mr-2 size-4" />
        导出 .md
      </MenubarItem>
      <MenubarItem @click="export2HTML(emit)">
        <FileCode class="mr-2 size-4" />
        导出 .html
      </MenubarItem>
      <MenubarItem @click="exportEditorContent2PureHTML()">
        <FileCode class="mr-2 size-4" />
        导出 .html（无样式）
      </MenubarItem>
      <MenubarItem @click="exportPdfDialogVisible = true">
        <FileText class="mr-2 size-4" />
        导出 .pdf
      </MenubarItem>
      <MenubarItem @click="downloadAsCardImage()">
        <Download class="mr-2 size-4" />
        导出 .png
      </MenubarItem>
      <MenubarSeparator />
      <MenubarItem @click="editorStateDialogVisible = true">
        <FileCog class="mr-2 size-4" />
        导入/导出项目配置
      </MenubarItem>
      <MenubarSeparator />
      <MenubarCheckboxItem v-model:checked="isDark">
        深色模式
      </MenubarCheckboxItem>
      <MenubarSeparator />
      <MenubarCheckboxItem v-model:checked="isEditOnLeft">
        左侧编辑
      </MenubarCheckboxItem>
    </MenubarContent>
  </MenubarMenu>

  <!-- 各弹窗挂载 -->
  <EditorStateDialog :visible="editorStateDialogVisible" @close="editorStateDialogVisible = false" />

  <ExportPdfDialog :visible="exportPdfDialogVisible" @startpdf="export2PDF(emit)" @close="exportPdfDialogVisible = false" />
</template>
