import OUT_HTML_CSS from '@/constants/OutHtmlCss'

interface PDFOptions {
  topLeft: string
  topRight: string
  bottomLeft: string
  bottomRight: string
  isPageBreak: boolean
}

export function createPDFBody(options: PDFOptions, safeTitle: string, htmlStr: string, chatVarCss: string, printMargin: string) {
  let topCenter = ``
  if (safeTitle) {
    topCenter = `
      @top-center {
        content: "${safeTitle}";
        font-size: 10px;
        color: #666;
        font-style: italic;
      }
    `
  }

  let topLeft = ``
  if (options.topLeft) {
    topLeft = `
      @top-left {
        content: "${options.topLeft}";
        font-size: 10px;
        color: #666;
        font-style: italic;
      }
    `
  }

  let pdfchapter = ``

  let topRight = ``
  if (options.topRight) {
    if (options.topRight === `h1` || options.topRight === `h2`) {
      pdfchapter = `
        ${options.topRight} {
          string-set: chapter content();
        }
      `
      topRight = `
        @top-right {
          content: string(chapter);
          font-size: 10px;
          color: #666;
          font-style: italic;
        }
      `
    }
    else {
      topRight = `
        @top-right {
          content: "${options.topRight}";
          font-size: 10px;
          color: #666;
          font-style: italic;
        }
      `
    }
  }

  let bottomLeft = ``
  if (options.bottomLeft) {
    bottomLeft = `
      @bottom-left {
        content: "${options.bottomLeft}";
        font-size: 10px;
        color: #999;
      }
    `
  }

  let pageAutoBreak = ``
  if (options.isPageBreak) {
    pageAutoBreak = `
        h1 {
          break-after: avoid;
          break-inside: avoid;
          break-before: page;
          page-break-after: avoid;
          page-break-inside: avoid;
          page-break-before: always;
        }
        h1:first-child {
          break-before: auto;
          page-break-before: auto;
        }
    `
  }

  let bottomRight = ``
  if (options.bottomRight) {
    bottomRight = `
      @bottom-right {
        content: ${options.bottomRight};
        font-size: 10px;
        color: #999;
      }
    `
  }

  const bodyDoc = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${safeTitle}</title>
      <style>
        ${pdfchapter}
        ${chatVarCss}
        @page {
          size: A4;
          margin: ${printMargin};
          ${topLeft}
          ${topRight}
          ${topCenter}
          ${bottomLeft}
          ${bottomRight}
        }
        @page :blank {
          @top-left { content: none; }
          @top-center { content: none; }
          @top-right { content: none; }
          @bottom-left { content: none; }
          @bottom-center { content: none; }
          @bottom-right { content: none; }
        }          
        @media print {
          ${OUT_HTML_CSS}
          html, body {
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
          }
          body { 
            margin: 0; 
          }
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print, nav, footer, .buttons, .ads {
            display: none !important;
          }
          a[href]:not([href^="#"]):after {
            content: " (" attr(href) ")";
            font-size: 10pt;
          }
          img {
            max-width: 100%;
            page-break-inside: avoid;
          }
          table {
            page-break-inside: avoid;
          }
          tr, td, th {
            page-break-inside: avoid;
          }
          tfoot {
            display: table-footer-group;
          }
          thead {
            display: table-header-group;
          }
          ${pageAutoBreak}
          .page-break {
            break-before: page;
            page-break-before: always;
          }
          p {
            text-align-last: left;
          }
          pre {
              break-inside: auto;
              page-break-inside: auto;
          }
          pre,
          code {
              white-space: pre-wrap !important;
              overflow-wrap: anywhere !important;
          }
        }
      </style>
    </head>
    <body>
      <div style="width: 100%; max-width: 750px; margin: auto;">
        ${htmlStr}
      </div>
  `
  return bodyDoc
}

export const tailDoc = `</body></html>`
