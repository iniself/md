import { Marked } from 'marked'
import type { ThemeStyles } from '@/types'

import markedAdmonitionExtension from './admonition/index.ts'
// @ts-expect-error: not ts
import markedExtendedtables from './extendedtables/index.js'
import markedAbbr from './MDAbbr'
import markedAlert from './MDAlert'
import markedFootnotes from './MDFootnotes'
import markedImageSize from './MDImageSize'
import markedInfographic from './MDinfographic.ts'
import { MDKatex } from './MDKatex'
import markedRuby from './MDRuby.ts'
import markedSlider from './MDSlider'
import markedSupSub from './MDSupSub'
import markedTextExtension from './MDTextExtension'
import markedUnderlineExtension from './MDUnderlineExtension'
import markedZhihuLinkCard from './MDZhihuLinkCard'

type StyledContent = (
  styleLabel: string,
  content: string,
  tagName?: string
) => string

type StylesGetter = (tag: string, addition?: string) => string

export function createMarked(options: {
  styledContent: StyledContent
  styles: StylesGetter
  styleMapping: ThemeStyles
}) {
  const extensions = [
    markedImageSize(),
    markedTextExtension(),
    markedUnderlineExtension(),
    markedSlider({ styles: options.styleMapping }),
    markedAdmonitionExtension(),
    markedRuby(),
    markedAlert({ styles: options.styleMapping }),
    MDKatex({ nonStandard: true }, options.styles(`inline_katex`, `;vertical-align: middle; line-height: 1;`), options.styles(`block_katex`, `;text-align: center;`)),
    markedFootnotes(options.styledContent, options.styles),
    markedAbbr(),
    markedZhihuLinkCard(options.styles(`wx_link`), options.styles(`link`)),
    markedExtendedtables(options.styles),
    markedSupSub(),
    markedInfographic(),
  ]

  const newMarked: Marked = new Marked()
  newMarked.use(...extensions)

  return { newMarked }
}
