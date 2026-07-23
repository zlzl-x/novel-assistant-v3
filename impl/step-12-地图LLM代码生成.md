# Step 12 · 地图 LLM 代码生成与沙箱

**对应 Phase 4 · 预估 3–4 天**

## 目标与产出

- 多世界 + 树状导航 + 搜索
- LLM 生成 HTML/SVG 地图代码
- sanitize + sandbox iframe 渲染
- 悬停突出、树图 postMessage 联动
- 代码本地缓存与编辑

## 前置依赖

- Step 04（MapView）、06（LLM）、02（MapRepository）

## 详细任务

### 12.1 地图数据 UI

- [ ] `MapView.vue`：左树 + 右渲染区
- [ ] 世界切换 dropdown
- [ ] 节点 CRUD：名称、summary、geo.relativePosition、neighbors
- [ ] 搜索过滤树节点

### 12.2 代码生成（`core/map/codegen.ts`）

**Prompt 要点（md/05 §4）：**
- 输出完整 HTML 单文件
- SVG 表达地理相对位置
- 每地点 `data-place-id` = MapNode.id
- 悬停 CSS 突出
- 禁止外链脚本/图片
- 可选 `postMessage` 点击区域

- [ ] `generateMapCode(world, nodes, stylePreset)` → string
- [ ] LLM 调用走 Step 06 同一 client

### 12.3 Sanitize（`core/map/sanitize-html.ts`）

- [ ] 用 `sanitize-html` 或自研规则：
  -  strip `<script src=...>`
  - 允许 inline script 仅白名单 API（postMessage）
  - 移除 `fetch`、`XMLHttpRequest` 等危险标识（正则扫描）
- [ ] 失败则拒绝渲染，显示错误

### 12.4 沙箱渲染（`MapSandbox.vue`）

- [ ] `<iframe sandbox="allow-scripts" srcdoc="...">` 
- [ ] **注意：** `allow-same-origin` 与 sandbox 组合需谨慎；优先 srcdoc + 无 same-origin
- [ ] 协议：
  - iframe → parent：`{ type: 'place-click', placeId }`
  - parent → iframe：`{ type: 'highlight', placeId }`

### 12.5 缓存

- [ ] 保存 `{worldId}.html` 到作品目录或 DB `map_worlds.generated_code`
- [ ] `codeVersion` 递增；保留上一版备份

### 12.6 代码查看/编辑

- [ ] 「查看生成的代码」Monaco 或 textarea
- [ ] 手动保存后重新渲染（跳过 LLM）

## 难点与解决方案

| 难点 | 解决方案 |
|------|----------|
| **LLM 生成代码不可运行** | 强约束 prompt + 示例模板；失败显示上一版；作者可手改 |
| **iframe 安全** | sandbox 限制；sanitize；CSP srcdoc |
| **postMessage 无 same-origin** | 用 `*` target 仅传 placeId；父组件校验 id 在库中存在 |
| **地理关系不准** | prompt 注入 nodes 的 geo 字段；作者可编辑提示词重生成 |
| **Electron webview vs iframe** | MVP 用 iframe srcdoc 足够 |

## 验收标准

- [ ] 200 字提示词 → 可渲染 SVG 地图
- [ ] 点击区域左树高亮
- [ ] 树选节点 iframe 高亮
- [ ] 识别章节**不**触发地图 API（无耦合代码）
- [ ] 无 LLM 时树仍可用

## 参考

- `md/05-map-system.md` 全文
- `md/11-open-questions.md` A3、C1、C2

**下一步 → [step-13-设定模块.md](./step-13-设定模块.md)**
