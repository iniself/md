import { useStore } from '@/stores'

function getImgHostOptions() {
  const store = useStore()
  const imageHostOptions = [
    ...((store.isElectron || store.isTauri) ? [{ value: `local`, label: `本地图床` }] : []),
    {
      value: `default`,
      label: `默认Github`,
    },
    {
      value: `github`,
      label: `GitHub`,
    },
    {
      value: `gitee`,
      label: `Gitee`,
    },
    {
      value: `aliOSS`,
      label: `阿里云`,
    },
    {
      value: `txCOS`,
      label: `腾讯云`,
    },
    {
      value: `qiniu`,
      label: `七牛云`,
    },
    {
      value: `minio`,
      label: `MinIO`,
    },
    {
      value: `mp`,
      label: `公众号图床`,
    },
    {
      value: `r2`,
      label: `Cloudflare R2`,
    },
    {
      value: `upyun`,
      label: `又拍云`,
    },
    { value: `telegram`, label: `Telegram` },
    {
      value: `cloudinary`,
      label: `Cloudinary`,
    },

    {
      value: `formCustom`,
      label: `自定义代码`,
    },
  ]
  return imageHostOptions
}

export default getImgHostOptions
