export async function svgToTransparentPng(svgElement: SVGSVGElement): Promise<Blob> {
  if (`fonts` in document) {
    await document.fonts.ready
  }

  const serializer = new XMLSerializer()

  const svgString = serializer.serializeToString(svgElement)

  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`

  const img = new Image()

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject

    img.src = svgDataUrl
  })

  const rect = svgElement.getBoundingClientRect()

  const width = rect.width || img.width

  const height = rect.height || img.height

  const scale = window.devicePixelRatio || 1

  const canvas = document.createElement(`canvas`)

  canvas.width = width * scale
  canvas.height = height * scale

  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`

  const ctx = canvas.getContext(`2d`)!

  ctx.scale(scale, scale)

  ctx.drawImage(img, 0, 0, width, height)

  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error(`Failed to export PNG`))
        return
      }

      resolve(blob)
    }, `image/png`)
  })
}
