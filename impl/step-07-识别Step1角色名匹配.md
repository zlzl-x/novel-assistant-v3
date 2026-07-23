# Step 07 · 识别 Step 1（正文纯提取）

**对应 Phase 2 · 预估 2–3 天**

## 目标与产出

- `packages/core/recognition/step1.ts` 纯函数 + prompt 模板
- Step 1 LLM 调用与结果 sanitize（**仅发章节正文**）
- 本地名匹配（字符串）+ `ambiguousNames` 检测
- `chapterExtractions` 本章字段提取结构

## 前置依赖

- Step 05、06、02

## 详细任务

### 7.1 预处理（`core/recognition/preprocess.ts`）

- [ ] `normalizeText`：BOM、换行、去广告行（可选规则）
- [ ] `hashText`：sha256 供预览缓存键
- [ ] 整章一次，不分块（≤8000 字）

### 7.2 Prompt 模板（`core/recognition/prompts/step1.ts`）

**System：**
- **仅依据正文**仔细、全面提取人名/昵称/称呼及本章可见字段
- 昵称结合后文归一到 `inferredName`（如「三哥」→「张三」）
- 输出严格 JSON（Step1Result schema）
- 无依据不输出字段；有输出必 excerpt
- **不要**引用或假设任何角色库已有信息

**User：**
- **仅章节正文**（不传角色表、不传快照）

### 7.3 Zod Schema（`core/recognition/schemas/step1.ts`）

- [ ] `mentions[]`、`chapterExtractions[]`、`ambiguousNames[]`（本地写入）、`unresolvedMentions[]`
- [ ] `excerpts` 非空数组；`ExtractedField` 含 confidence

### 7.4 Sanitize（`core/recognition/sanitize/step1.ts`）

- [ ] 去重同一 `surfaceForm` + 同一 `inferredName`
- [ ] 无 excerpt 的字段丢弃
- [ ] 合并 `mentions` 与 `chapterExtractions` 的 inferredName

### 7.5 本地匹配（`core/recognition/matchLocal.ts`）

- [ ] `localNameScan(text, characters)`：补充 LLM 可能漏掉的库中 name/aliases 命中
- [ ] `matchMentionsToRegistry(step1, characters)`：`inferredName` / `surfaceForm` → `characterId`
- [ ] 多个同名候选 → `ambiguousNames`
- [ ] 无法匹配 → `unresolvedMentions`
- [ ] **匹配逻辑纯本地，不调 API**

### 7.6 编排（`renderer/services/recognition/runStep1.ts`）

- [ ] 调 `llm.completeJson`（user = 正文 only）
- [ ] sanitize → `matchLocal` → 写入 `previewStore.step1`
- [ ] 若 `ambiguousNames.length > 0`：UI 状态 `blocked`，不自动 Step 2

### 7.7 进度 UI

- [ ] 识别按钮 → loading「Step 1/2 正在分析正文…」

## 难点与解决方案

| 难点 | 解决方案 |
|------|----------|
| **「三哥」匹配「张三」** | Step1 prompt 要求结合后文输出 `inferredName`；few-shot 2–3 条 |
| **不发角色表如何消歧** | 正文内上下文推断 + 本地 `inferredName` 对库精确/别名匹配 |
| **LLM 漏人** | `localNameScan` 与 LLM 取并集 |
| **头衔代称** | Step1 推断 `inferredName`；本地仍无法唯一对应 → `ambiguousNames` |
| **JSON 字段泛化** | sanitize 拒绝无 schema 字段；重试一次 |

## 验收标准

**单元测试（`packages/core/tests/step1.test.ts`）：**

- [ ] sanitize 丢弃无 excerpt 字段
- [ ] `matchLocal` 把双候选移入 ambiguous
- [ ] localNameScan 补充 LLM 未提及的库中角色

**集成（mock LLM）：**

- [ ] User payload **不含**角色表
- [ ] 正文含「三哥」「张三点了点头」→ 同一 `inferredName`，本地匹配同一 characterId
- [ ] 两个张三 → ambiguousNames 非空

## 参考

- `md/06-text-recognition-pipeline.md` §4
- `md/06` §10.4（同名裁决）

**下一步 → [step-08-识别Step2信息提取.md](./step-08-识别Step2信息提取.md)**
