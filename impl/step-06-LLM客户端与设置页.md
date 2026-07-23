# Step 06 · LLM 客户端与设置页

**对应 Phase 2 · 预估 1–2 天**

## 目标与产出

- 主进程 OpenAI 兼容 HTTP 客户端
- 多 Profile 配置（baseURL、model、temperature）
- 设置页 UI，API Key 加密存储
- 无 Key 时识别按钮友好提示

## 前置依赖

- Step 03（safeStorage）、Step 04（设置路由）

## 详细任务

### 6.1 LLM Client（`main/services/llm-client.ts`）

- [ ] `chatCompletion({ messages, responseFormat?: 'json' })` 
- [ ] 支持自定义 `baseURL`（国内兼容网关）
- [ ] 超时 120s，可取消（AbortController）
- [ ] 错误分类：401 / 429 / 网络 / 解析失败

### 6.2 IPC

- [ ] `llm:complete`：渲染进程传 profileId + messages，主进程解密 Key 请求
- [ ] `llm:testConnection`：设置页「测试连接」

### 6.3 Profile 存储（`llm-profiles.json`）

```json
{
  "profiles": [{
    "id": "default",
    "name": "默认",
    "baseUrl": "https://api.openai.com/v1",
    "model": "gpt-4o-mini",
    "temperature": 0.2,
    "apiKeyEncrypted": "..."
  }],
  "activeProfileId": "default"
}
```

### 6.4 设置页 UI（`AppSettingsView.vue`）

- [ ] Profile 列表、新建、删除
- [ ] 字段：名称、Base URL、模型名、温度、API Key（密码框）
- [ ] 测试连接按钮 + 结果 toast
- [ ] 说明：正文识别与地图生成共用此配置

### 6.5 渲染进程封装（`renderer/services/llm.ts`）

- [ ] `completeJson<T>(messages, schema)`：调 IPC → JSON.parse → Zod 校验
- [ ] 失败重试 1 次（md/06 §9）

## 难点与解决方案

| 难点 | 解决方案 |
|------|----------|
| **渲染进程不能直接 fetch 带 Key** | 全部走主进程 IPC，Key 不出主进程 |
| **JSON mode 不是所有模型支持** | Prompt 强调「仅输出 JSON」；解析前 strip markdown fence |
| **流式响应** | MVP 不用 stream；整段返回简化解析 |
| **代理/证书** | Electron `session.setProxy` 可选；MVP 文档说明系统代理 |

## 验收标准

- [ ] 配置 Key 后测试连接成功
- [ ] 错误 Key 显示明确提示
- [ ] `completeJson` 对非法 JSON 抛可读错误
- [ ] llm-profiles.json 无明文 key

## 参考

- `md/09-tech-stack.md` §5
- `md/08-data-model.md` §8
- `md/11-open-questions.md` E1

**下一步 → [step-07-识别Step1角色名匹配.md](./step-07-识别Step1角色名匹配.md)**
