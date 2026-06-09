<script setup lang="ts">
import { Download, FileCode, FileCog, FileText, FolderOpen, Image, Save, Upload } from 'lucide-vue-next'
import { ref } from 'vue'
import { ctrlSign, shiftSign } from '@/config/'
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
  exportHTMLDialogVisible,
} = storeToRefs(store)

const {
  export2HTML,
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
          <kbd class="mx-1">{{ shiftSign }}</kbd>
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
      <MenubarSub>
        <MenubarSubTrigger>
          <Upload class="mr-2 size-4" />
          导入
        </MenubarSubTrigger>
        <MenubarSubContent class="w-56">
          <MenubarItem @click="importMarkdownContent()">
            <FileText class="mr-2 size-4" />
            导入 Markdown
          </MenubarItem>
        </MenubarSubContent>
      </MenubarSub>
      <MenubarSub>
        <MenubarSubTrigger>
          <Download class="mr-2 size-4" />
          导出
        </MenubarSubTrigger>
        <MenubarSubContent class="w-56">
          <MenubarItem @click="exportEditorContent2MD()">
            <FileText class="mr-2 size-4" />
            Markdown 文件
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem @click="exportHTMLDialogVisible = true">
            <FileCode class="mr-2 size-4" />
            HTML 文件
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem @click="exportPdfDialogVisible = true">
            <FileText class="mr-2 size-4" />
            PDF 文档
          </MenubarItem>
          <MenubarItem @click="downloadAsCardImage()">
            <Image class="mr-2 size-4" />
            PNG 图片
          </MenubarItem>
        </MenubarSubContent>
      </MenubarSub>
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
  <ExportHTMLDialog :visible="exportHTMLDialogVisible" @starthtml="export2HTML(emit)" @close="exportHTMLDialogVisible = false" />
</template>
