import { readFileSync, statSync } from 'node:fs'
import { basename, extname } from 'node:path'
import mammoth from 'mammoth'
import {
  isFanqieExport,
  parseFanqieContent,
  splitChapters,
  type ImportParseResult,
  type ImportSourceFormat
} from '@novel-assistant/core'

export const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024

export async function parseImportFile(filePath: string): Promise<ImportParseResult> {
  const fileName = basename(filePath)
  const stats = statSync(filePath)
  if (stats.size > MAX_IMPORT_FILE_BYTES) {
    throw new Error('导入文件超过 10MB 限制')
  }

  const extension = extname(filePath).toLowerCase()
  const warnings: string[] = []

  if (extension === '.docx') {
    const buffer = readFileSync(filePath)
    const result = await mammoth.extractRawText({ buffer })
    if (result.messages.length > 0) {
      warnings.push(...result.messages.map((message) => message.message))
    }
    const chapters = splitChapters(result.value)
    return {
      format: 'docx',
      fileName,
      chapters,
      warnings
    }
  }

  const content = readFileSync(filePath, 'utf-8')
  const format = detectTextFormat(content, fileName)
  const chapters =
    format === 'fanqie' ? parseFanqieContent(content, fileName) : splitChapters(content)

  return {
    format,
    fileName,
    chapters,
    warnings
  }
}

function detectTextFormat(content: string, fileName: string): ImportSourceFormat {
  if (isFanqieExport(content, fileName)) {
    return 'fanqie'
  }
  return 'txt'
}
