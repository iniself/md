// Inline local sticker images as base64 so pasted HTML keeps working
// outside the app (WeChat editor, Zhihu, exported files).
export async function inlineEmojiImages(root: Document | HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll<HTMLImageElement>(`img[data-emoji-id]`))
  if (!imgs.length) {
    return
  }
  await Promise.all(imgs.map(async (img) => {
    const src = img.getAttribute(`src`) || ``
    if (!src || src.startsWith(`data:`)) {
      return
    }
    try {
      const res = await fetch(src)
      if (!res.ok) {
        return
      }
      const blob = await res.blob()
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(blob)
      })
      img.setAttribute(`src`, dataUrl)
    }
    catch {
      // Keep the original src when offline or blocked. Never break copy.
    }
  }))
}
