import { useStore } from '@/stores'
import { useFolderSourceStore } from '@/stores/folderSource'

const store = useStore()
const folderSourceStore = useFolderSourceStore()

const {
  currentFolderHandle,
} = storeToRefs(folderSourceStore)

function createRootFolder(rootFolderName: string) {
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

export function createParentFolder(parentFolder: string[]) {
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
