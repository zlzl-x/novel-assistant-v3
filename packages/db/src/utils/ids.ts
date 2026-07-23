import { v4 as uuidv4 } from 'uuid'

export function createId(): string {
  return uuidv4()
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function countWords(text: string): number {
  return text.replace(/\s+/g, '').length
}
