/** 将 Vue 响应式对象转为可 IPC 传输的纯数据 */
export function cloneForIpc<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
