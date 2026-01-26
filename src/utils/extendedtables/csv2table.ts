type StylesFn = (tag: string, addition?: string) => string

function parseDelimitedRows(text: string): string[][] {
  const lines = text
    .trim()
    .split(`\n`)
    .filter(Boolean)

  if (lines.length === 0)
    return []

  const delimiter = /[,\t，]/

  return lines.map(line =>
    line
      .split(delimiter)
      .map(c => c.trim())
      .filter(c => c.length > 0),
  )
}

export default function renderCsvTable(text: string, stylesFN: StylesFn): string {
  const store = useStore()
  const { isCenterHeader, primaryColor } = storeToRefs(store)

  const all = parseDelimitedRows(text)

  if (all.length === 0)
    return ``

  const [header, ...rows] = all

  let output = `<section style="padding:0 8px; max-width: 100%; overflow: auto"><table class="preview-table" style="border-collaps: collapse; table-layout: fixed; width: 100%">`
  const isTable = header[0] !== `cols`
  if (isTable) {
    output += `<thead ${stylesFN(`thead`)}>`
    const row = header
    output += `<tr ${stylesFN(`tr`)}>`
    for (let j = 0; j < row.length; j++) {
      const text = row[j]
      // out is th or td
      output += getTableCell(
        text,
        `th`,
        stylesFN,
        isTable,
        isCenterHeader.value,
        primaryColor.value,
      )
    }
    output += `</tr>`
    output += `</thead>`
  }
  if (rows.length) {
    output += `<tbody>`
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (row[0]) {
        output += `<tr ${stylesFN(`tr`)}>`
        for (let j = 0; j < row.length; j++) {
          const text = row[j]
          output += getTableCell(
            text,
            `td`,
            stylesFN,
            isTable,
            isCenterHeader.value,
            primaryColor.value,
          )
        }
        output += `</tr>`
      }
    }
    output += `</tbody>`
  }
  output += `</table></section>`
  return output
}

function getTableCell(text: string, type: string, stylesFN: StylesFn, isTable: boolean, isCenterHeader: boolean, primaryColor: string) {
  const thCenterStyle = stylesFN(`th`, `;text-align: center; background-color: ${hexToRgba(primaryColor, 0.05)}`)
  const thLeftStyle = stylesFN(`th`, `; background-color: ${hexToRgba(primaryColor, 0.05)}`)
  const tdWithBoderStyle = stylesFN(`td`)
  const tdNotBoderStyle = stylesFN(`td`, `;border: none`)
  const tagStyle = isTable ? (type === `th` ? (isCenterHeader ? thCenterStyle : thLeftStyle) : tdWithBoderStyle) : tdNotBoderStyle
  const tag = `<${type} ${tagStyle}>`
  return `${tag + text}</${type}>\n`
}

function hexToRgb(hex: string) {
  hex = hex.replace(/^#/, ``)
  if (hex.length === 3) {
    hex = hex.split(``).map(c => c + c).join(``)
  }
  const num = Number.parseInt(hex, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

function hexToRgba(hex: any, alpha = 1) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
