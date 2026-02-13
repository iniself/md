import { useStore } from '@/stores'
import type { Post } from '@/stores'
import { useFolderSourceStore } from '@/stores/folderSource'
import { splitPath } from '@/utils/index'

/**
 * 文件夹文件同步 Composable
 * 监听编辑器内容变化，实时同步到本地文件夹
 */
export function useFolderFileSync() {
  const store = useStore()
  const folderStore = useFolderSourceStore()

  const {
    currentFolderHandle,
  } = storeToRefs(folderStore)

  const createRootFolder = (rootFolderName: string) => {
    const rootFolder = store.posts.find(
      post => post.isFolder && post.localFile === currentFolderHandle.value?.id,
    )
    if (rootFolder) {
      return rootFolder.id
    }
    else {
      store.addLocalPost(rootFolderName, `本地文件夹：${rootFolderName}`, null, true, currentFolderHandle.value?.id, rootFolderName)
      return store.currentPostId
    }
  }

  const createParentFolder = (parentFolder: string[]) => {
    let parentID: string
    let pathInfo: string

    pathInfo = parentFolder[0]
    parentID = createRootFolder(parentFolder.shift()!)

    for (const folderName of parentFolder) {
      const folder = store.posts.find(
        post => post.isFolder && post.title === folderName,
      )
      if (folder) {
        parentID = folder.id
      }
      else {
        pathInfo = `${pathInfo}/${folderName}`
        store.addLocalPost(folderName, `本地文件夹：${pathInfo}`, parentID, true, currentFolderHandle.value?.id, pathInfo)
        parentID = store.currentPostId
      }
    }
    return parentID
  }

  // 防抖定时器
  let syncTimeoutId: ReturnType<typeof setTimeout> | null = null

  // 同步延迟（毫秒）
  const SYNC_DELAY = 1000

  /**
   * 设置当前文件路径
   */
  function setCurrentFilePath(filePath: string | null) {
    folderStore.currentFilePath = filePath
  }

  /**
   * 执行同步
   */
  async function syncPostToFile(filePath: string, content: string) {
    if (!filePath) {
      return
    }

    try {
      await folderStore.writeFile(filePath, content)
      toast.success(`保存文件成功`)
    }
    catch (error: any) {
      toast.error(`保存文件失败`)
      console.error(`保存文件失败:`, error)
    }
  }

  async function savePostAsFile(post: Post) {
    try {
      const content = post.content || ``
      if (folderStore.currentFilePath) {
        await folderStore.writeFile(folderStore.currentFilePath, content)

        // 创建对应的 post
        const { parentFolder, filename } = splitPath(folderStore.currentFilePath, `/`)
        const folderID: string = createParentFolder(parentFolder)

        post.title = filename!
        post.isFolder = false
        post.localFile = folderStore.currentFolderId
        post.parentId = folderID
        post.nodePath = folderStore.currentFilePath

        folderStore.showDialogWhenSaveAsFile = false

        store.currentPostId = post.id
        folderStore.savePostAsFileOk = true
      }
    }
    catch (error: any) {
      toast.error(`保存为文件失败`)
      console.error(`保存文件失败:`, error)
    }
  }

  async function syncPostToFileWhenEdit(filePath: string, content: string) {
    if (!filePath) {
      return
    }

    try {
      await folderStore.writeFile(filePath, content)
    }
    catch (error: any) {
      console.error(`保存文件失败:`, error)
    }
  }

  async function syncFileToPost(filePath: string, postId: string) {
    if (!filePath) {
      return
    }

    try {
      const fileContent = await folderStore.readFile(filePath)
      store.syncFileToPost(postId, fileContent)
      toast.success(`同步内容成功`)
    }
    catch (error: any) {
      toast.error(`内容同步失败`)
      console.error(`内容同步失败:`, error)
    }
  }

  /**
   * 防抖同步
   */
  // const currentPost = store.posts[store.currentPostIndex]
  const currentPost = computed(() => {
    return store.posts[store.currentPostIndex]
  })

  function debouncedSync() {
    if (!folderStore.currentFilePath || !store.posts[store.currentPostIndex]) {
      return
    }
    // 清除之前的定时器
    if (syncTimeoutId) {
      clearTimeout(syncTimeoutId)
    }

    // 设置新的定时器
    syncTimeoutId = setTimeout(() => {
      const content = currentPost?.value.content || ``
      syncPostToFileWhenEdit(folderStore.currentFilePath!, content)
    }, SYNC_DELAY)
  }

  /**
   * 监听当前文章内容变化
   */
  watch(
    () => folderStore.startSyncFileToPostWhenEdit,
    () => {
      if (folderStore.startSyncFileToPostWhenEdit) {
        debouncedSync()
      }
      folderStore.startSyncFileToPostWhenEdit = false
    },
    { deep: false },
  )

  // 切换 Post 时发现 post 与 file 不同，所以需要同步到文件
  watch(
    () => folderStore.startSavePostToFile,
    () => {
      if (folderStore.startSavePostToFile && folderStore.currentFilePath) {
        const content = currentPost?.value.content || ``
        syncPostToFile(folderStore.currentFilePath, content)
      }
      else if (folderStore.startSavePostToFile && folderStore.currentFilePath === null && !currentPost.value.isFolder) {
        // 另存为文件
        store.isOpenFolderPanel = false
        if (folderStore.currentFolderHandle) {
          folderStore.currentFolderId = folderStore.currentFolderHandle.id
          folderStore.loadFileTree(folderStore.currentFolderHandle.handle)
          folderStore.showDialogWhenSaveAsFile = true
        }
        else {
          folderStore.startSelectFolderWhenSaveAsFile = true
        }
      }
      folderStore.startSavePostToFile = false
    },
    { deep: false },
  )

  watch(
    () => folderStore.startSavePostAsFile,
    async (newVal) => {
      if (newVal) {
        folderStore.startSavePostAsFile = false
        await savePostAsFile(currentPost.value)
      }
    },
    { deep: false },
  )

  watch(
    () => folderStore.startSyncFileToPost,
    () => {
      if (folderStore.startSyncFileToPost && folderStore.currentFilePath) {
        syncFileToPost(folderStore.currentFilePath, currentPost.value.id)
      }
      folderStore.startSyncFileToPost = false
    },
    { deep: false },
  )

  /**
   * 当切换文件时，清理定时器
   */
  watch(
    () => folderStore.clearSync,
    (newPath, oldPath) => {
      if (oldPath && newPath !== oldPath && syncTimeoutId && folderStore.clearSync) {
        clearTimeout(syncTimeoutId)
        syncTimeoutId = null
      }
      folderStore.clearSync = false
    },
  )

  /**
   * 清理
   */
  onBeforeUnmount(() => {
    if (syncTimeoutId) {
      clearTimeout(syncTimeoutId)
    }
  })

  return {
    setCurrentFilePath,
  }
}
