import type { IpcResult } from '@novel-assistant/core'

export function ipcSuccess<T>(data: T): IpcResult<T> {
  return { success: true, data, error: null }
}

export function ipcError<T>(error: unknown): IpcResult<T> {
  const message = error instanceof Error ? error.message : String(error)
  return { success: false, data: null, error: message }
}

export async function ipcWrap<T>(fn: () => T | Promise<T>): Promise<IpcResult<T>> {
  try {
    return ipcSuccess(await fn())
  } catch (error) {
    return ipcError<T>(error)
  }
}
