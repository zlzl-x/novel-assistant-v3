# Step 03 · Electron 主进程与存储目录

**对应 Phase 1 · 预估 1–2 天**

## 目标与产出

- 用户自选存储目录（顶栏将来绑定）
- DB 文件位于 `{storagePath}/novel-assistant.db`
- IPC 暴露 DB 与设置 API
- API Key 存 `safeStorage`

## 前置依赖

- Step 02 完成

## 详细任务

### 3.1 存储路径服务（`main/services/storage-path.ts`）

- [ ] 默认路径：`app.getPath('documents')/NovelAssistantV3`
- [ ] 持久化用户选择：`user-preferences.json` 存 `{ storagePath }`
- [ ] `setStoragePath(path)`：校验目录可写 → 关闭旧 DB → 新路径打开 DB → 返回成功
- [ ] 切换路径时提示「将重新加载作品列表」

### 3.2 DatabaseService 单例

- [ ] 主进程独占 `better-sqlite3` 连接
- [ ] `open(dbPath)` / `close()` / `getInstance()`
- [ ] 所有 Repository 通过主进程 IPC 调用，**渲染进程不直接碰 sqlite**

### 3.3 Preload API（`preload/index.ts`）

```typescript
contextBridge.exposeInMainWorld('novelApi', {
  storage: { getPath, setPath, pickDirectory },
  projects: { list, create, update, delete },
  chapters: { list, get, save, delete, deleteAfter },
  // ... 逐步在后续 Step 补充
  settings: { getLlmProfiles, saveLlmProfile, saveApiKey },
})
```

- [ ] TypeScript：`renderer/env.d.ts` 声明 `window.novelApi`

### 3.4 目录选择对话框

- [ ] `dialog.showOpenDialog({ properties: ['openDirectory'] })`
- [ ] 顶栏占位按钮调用 `pickDirectory`（Step 04 接 UI）

### 3.5 API Key 安全存储

- [ ] `safeStorage.encryptString(key)` 写入 `llm-profiles.json` 的加密字段
- [ ] 渲染进程**永远拿不到明文 Key**，只有 `llm:chat` IPC 在主进程解密后请求

### 3.6 CSP 与安全

- [ ] `webPreferences: { contextIsolation: true, sandbox: true }`（renderer）
- [ ] `Content-Security-Policy` 限制外链（地图 iframe 另议 Step 12）

## 难点与解决方案

| 难点 | 解决方案 |
|------|----------|
| **切换存储目录时打开中的作品** | 切换前 `router.push('/')` 关闭作品工作台；Pinia reset |
| **safeStorage 在 Linux 不可用** | 检测 `safeStorage.isEncryptionAvailable()`；降级 OS keychain 或提示 |
| **IPC 类型安全** | 共享 `packages/core/src/ipc-types.ts` 定义 request/response |
| **中文路径 DB** | better-sqlite3 支持 UTF-8 路径；用实际中文目录测试 |

## 验收标准

- [ ] 选择新目录后 DB 在新路径创建
- [ ] 重启应用记住上次目录
- [ ] 渲染进程 `window.novelApi.storage.getPath()` 有值
- [ ] API Key 保存后 llm-profiles.json 无明文

## 参考

- `md/08-data-model.md` §3、§8
- `md/02-information-architecture.md` §4.3（顶栏存储目录）
- `md/11-open-questions.md` E3

**下一步 → [step-04-全局布局与路由.md](./step-04-全局布局与路由.md)**
