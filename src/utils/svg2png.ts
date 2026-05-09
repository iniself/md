export async function svgToTransparentPng(svgElement: SVGSVGElement): Promise<Blob> {
  if (`fonts` in document) {
    await document.fonts.ready
  }

  const serializer = new XMLSerializer()

  const svgString = serializer.serializeToString(svgElement)

  const svgBlob = new Blob([svgString], {
    type: `image/svg+xml;charset=utf-8`,
  })

  const url = URL.createObjectURL(svgBlob)

  const img = new Image()

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = reject
    img.src = url
  })

  const width
    = svgElement.width.baseVal.value
      || svgElement.viewBox.baseVal.width
      || img.width

  const height
    = svgElement.height.baseVal.value
      || svgElement.viewBox.baseVal.height
      || img.height

  const scale = window.devicePixelRatio || 1

  const canvas = document.createElement(`canvas`)

  canvas.width = width * scale
  canvas.height = height * scale

  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`

  const ctx = canvas.getContext(`2d`)!

  ctx.scale(scale, scale)

  ctx.drawImage(img, 0, 0, width, height)

  URL.revokeObjectURL(url)

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
