# Step 08 · 识别 Step 2（按角色合并）

**对应 Phase 2 · 预估 2–3 天**

## 目标与产出

- 对已匹配角色**逐人**调用 LLM：单角色 current + 本章提取 → 建议更新字段
- `protagonistRelation` type + proximity 1–5
- 面板词条：功法/技能、法宝/装备、年龄/寿命
- 角色间 `relations`
- `buildPreviewRows` 本地组装预览（上文来自库，下文来自 Step 2）

## 前置依赖

- Step 07（Step1 本地匹配完成、无 ambiguous）

## 详细任务

### 8.1 门禁

- [ ] `canRunStep2(preview)`：`ambiguousNames` 为空且至少有一个 `matchedCharacterId`
- [ ] 否则 UI 只显示裁决面板

### 8.2 Prompt（`prompts/step2.ts`）

**每角色一次调用，输入：**

- 该角色 `characterId`、`name`、`disambiguation`
- 该角色 **current 字段** + `panel.entries`（仅此一人，禁止全书快照）
- Step 1 `chapterExtraction`（该角色本章提取 + excerpts）
- 面板模板 key 列表（若有）

**禁止输入：** 其他角色资料、全书名表、完整章节正文（excerpt 已含在 chapterExtraction）

**输出：** `CharacterExtraction` per md/06 §5.4 + §10

**规则强调：**
- 以本章提取为依据，对照该角色库内已有，输出**建议最新值**
- 本章未提及的字段不输出
- proximity 标尺见 §10.3
- 非主角才输出 protagonistRelation

### 8.3 编排（`runStep2.ts`）

- [ ] 遍历 `matchedCharacterId` 列表，串行或限流并发（如最多 3 并行）
- [ ] 每角色从本地库读取 current → 组 prompt → `llm.completeJson`
- [ ] 合并为 `Step2Result` → `previewStore.step2`
- [ ] 进度 UI：「Step 2/2 合并角色资料 (3/8)…」

### 8.4 Zod + Sanitize（`schemas/step2.ts`、`sanitize/step2.ts`）

- [ ] `proximity` clamp 1–5，非整数四舍五入
- [ ] 无 excerpt 的字段丢弃
- [ ] `field key` 白名单 + 面板动态 key
- [ ] 主角角色 strip `protagonistRelation`

### 8.5 构建预览行（`core/preview/buildPreviewRows.ts`）

```typescript
interface PreviewRow {
  name: string;
  existingValue: string | null;  // 上文，来自本地角色库
  proposedValue: string;
  changed: boolean;
  checked: boolean;            // 默认 changed=true 的行
  excerpt?: string;
}

function buildPreviewRows(
  character: Character,
  extraction: CharacterExtraction
): PreviewRow[]
```

- [ ] **纯本地**：`existing` 从库读，`proposed` 来自 Step 2，不调 API
- [ ] 合并 `fields` + `panelEntries` + `protagonistRelation` 为 name|value 行
- [ ] 「与主角关系」「与主角关系远近」拆两行或合并展示（与 md/03 一致）

### 8.6 自动串联

- [ ] Step1 成功且无 ambiguous → 自动调 Step2
- [ ] 或 Step1 完成后按钮「继续合并角色资料」

## 难点与解决方案

| 难点 | 解决方案 |
|------|----------|
| **多角色多次调用延迟** | 限流并发 2–3；显示 per-character 进度 |
| **单角色 current 过长** | 截断超长 value；面板只传 key + 前 N 字 |
| **proximity 乱填** | prompt 附标尺表；无 type 则 drop proximity |
| **关系 targetName 对不上** | 保留文本；预览标黄「未关联角色」 |
| **Step2 重复输出未变字段** | prompt 说「仅输出有变化或本章新提取的」；buildPreviewRows 过滤 existing===proposed |

## 验收标准

**单元测试：**

- [ ] `buildPreviewRows` ≥10 cases（新增、变更、不变、面板词条）
- [ ] proximity 越界 clamp
- [ ] 主角无 protagonistRelation

**Mock 集成：**

- [ ] 每角色 API payload **仅含该角色** current，不含其他角色
- [ ] 输出身份、境界、所在地、势力、关系、功法、法宝、年龄
- [ ] proximity + excerpt 存在

## 参考

- `md/06-text-recognition-pipeline.md` §5、§10
- `md/11-open-questions.md` E2

**下一步 → [step-09-预览UI与Commit.md](./step-09-预览UI与Commit.md)**
