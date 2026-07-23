import { describe, expect, it } from 'vitest'
import {
  isFanqieExport,
  parseFanqieContent,
  parseFanqieHtml,
  splitChapters
} from '../src/import'

describe('splitChapters', () => {
  it('splits by Chinese chapter headings', () => {
    const text = `前言内容

第1章 开端
第一段。

第2章 转折
第二段。`

    const chapters = splitChapters(text, { includePreamble: true })
    expect(chapters).toHaveLength(3)
    expect(chapters[0]?.title).toBe('前言')
    expect(chapters[1]?.title).toBe('第1章 开端')
    expect(chapters[1]?.rawText).toContain('第一段')
  })

  it('returns single chapter when no headings found', () => {
    const chapters = splitChapters('只有一段正文。')
    expect(chapters).toHaveLength(1)
    expect(chapters[0]?.title).toBe('导入全文')
  })
})

describe('fanqie parser', () => {
  it('detects fanqie html exports', () => {
    expect(isFanqieExport('<html><body>fanqie</body></html>', 'book.html')).toBe(true)
  })

  it('strips html and splits chapters', () => {
    const html = `<html><body>
      <p>第1章 测试</p><p>正文一</p>
      <p>第2章 继续</p><p>正文二</p>
    </body></html>`
    const text = parseFanqieHtml(html)
    expect(text).toContain('第1章 测试')
    const chapters = parseFanqieContent(html, 'export.html')
    expect(chapters.length).toBeGreaterThanOrEqual(2)
  })
})
