# 06 · 正文智能识别与预览流水线

## 1. 总览

识别是 v3 的**技术核心**，采用**两步流水线**，且必须服从「作者确认」与「仅最新章可更新」原则。

```mermaid
flowchart TD
    A[章节正文] --> B[预处理]
    B --> C["Step 1 · 正文纯提取（仅发正文）"]
    C --> C1[提取人名/昵称 + 本章可见字段]
    C1 --> C2[本地匹配角色库 ID]
    C2 --> C3{同名/昵称歧义?}
    C3 -->|是| C4[作者裁决]
    C3 -->|否| D
    C4 --> D["Step 2 · 按角色合并（逐人发快照）"]
    D --> D1[每角色：库内 current + 本章提取 → 建议更新]
    D1 --> E[本地组装预览：上文已有 + 下文 name|value]
    E --> F{作者确认}
    F -->|采纳且为最新章| G[写入角色库 + 出场记录 + 历史]
    F -->|非最新章| H[禁止 commit，提示删后续章重贴]
    F -->|忽略| I[丢弃内存预览]
    G --> J[刷新关系网]
```

---

## 2. 与 v2 的差异

| v2 | v3 |
|----|-----|
| 主角面板资产 | 各角色独立面板词条 |
| 变更分析 + 面板合成 | **Step1 角色名匹配 → Step2 信息提取** |
| 识别后直接写入 | **严格模式预览确认** |
| 单主角 | 全书角色 + 昵称上下文匹配 + 同名作者裁决 |

---

## 3. 预处理

### 3.1 文本清洗
- 统一换行、去除 BOM
- 可选：去除常见网站广告行
- 章节标题与正文分离（若粘贴含标题）

### 3.2 分块策略

**已确认：单章均在 8000 字以内，始终整章一次识别。**

### 3.3 章节存储与预览

| 数据 | 是否持久化 | 说明 |
|------|------------|------|
| 章节 `rawText` | ✓ 入库 | 每章**只保存正文** |
| 识别预览 `RecognitionPreview` | ✗ **不入库** | 仅内存暂存，切换章节或关闭即失效 |
| `RecognitionCommit` | ✓ 入库 | 确认更新后的变更日志 |

- 预览**不写入章节记录**，不写入 `localStorage` 长期备份
- 同章正文未改时，当次会话内可保留内存预览；正文 hash 变更则预览失效，需重新识别

---

## 4. Step 1 · 正文纯提取

### 4.1 目标

**仅向 LLM 发送章节正文**，从本章中仔细、全面地提取：

1. 所有人物指称（正式名、昵称、称呼）
2. 各角色在正文中**明确写出**的字段信息（身份、境界、所在地等）

**不向 LLM 发送角色库快照或全书角色表。** 名与库的对应关系在 Step 1 返回后由**客户端本地**完成。

### 4.2 为何不发角色库

| 问题 | 对策 |
|------|------|
| 全书 500 角色时，名表 + current 快照占满 input | Step 1 只发正文；Step 2 按**本章登场角色**逐人发送该角色资料 |
| 发送快照后 LLM 倾向「对照改」而非「从正文读」 | Step 1 无已有设定上下文，须更仔细扫正文；合并留给 Step 2 |
| 两步都带快照，token 重复计费 | 快照仅在 Step 2 按人发送一次 |

### 4.3 提取范围

- 正式姓名（「张三」）
- 昵称、称呼、道号（「三哥」「张师兄」「无忌」）
- 头衔代称（「青云宗掌门」——在正文中结合上下文推断指代谁）
- 各角色本章可见字段：身份/称号、境界、所在地、势力、关系、面板词条、与主角关系等（见 §10.1）
- 新出现、库中尚无的人名（`inferredName` 供本地匹配）

### 4.4 LLM 提取原则（Step 1）

- **仔细、全面**：宁可多提候选，预览里由作者删减（P2）
- 只提取正文**明确写出**的信息，禁止推测
- 每个字段附 `excerpt`
- 同一称呼若上下文可确定为同一人（如「三哥」后文出现「张三」），输出统一 `inferredName`
- **不输出**「相对角色库的变化」——Step 1 只描述本章正文说了什么

### 4.5 本地匹配（Step 1 之后，不调 API）

1. **精确匹配：** 角色库 `name`、`aliases` 与 Step 1 的 `inferredName` / `surfaceForm` 命中 → `characterId`
2. **新名发现：** 无法匹配任何已有角色 → `unresolvedMentions`
3. **歧义：** 多个候选或同名 → `ambiguousNames`，**阻断 Step 2**，须作者先裁决
4. **本地预扫描补充：** `localNameScan(text, characters)` 与 LLM 结果取并集，降低漏人

> 昵称消歧（「三哥」→「张三」）优先靠 Step 1 在正文内的上下文推断；本地再用 `inferredName` 对库做字符串匹配。

### 4.6 Step 1 输出 Schema

```typescript
interface Step1Result {
  chapterId: string;
  mentions: CharacterMention[];
  chapterExtractions: ChapterExtraction[];  // 按 inferredName 聚合的本章字段
  unresolvedMentions: string[];
  ambiguousNames: AmbiguousName[];
}

interface CharacterMention {
  surfaceForm: string;           // 正文中的写法，如「三哥」
  inferredName?: string;         // 从正文上下文推断的正式名
  mentionCount: number;
  excerpts: string[];            // 出现依据
  isNickname: boolean;
}

/** Step 1 完成后由本地匹配写入 characterId */
interface MatchedMention extends CharacterMention {
  matchedCharacterId: string | null;
  confidence: 'high' | 'medium' | 'low';
}

interface ChapterExtraction {
  inferredName: string;
  mentionCount: number;
  fields: Record<string, ExtractedField>;
  relations?: Array<{ targetName: string; type: string; excerpt: string }>;
  protagonistRelation?: { type: string; proximity: number; excerpt: string };
  panelEntries?: Array<{ key: string; value: string; excerpt: string }>;
}

interface AmbiguousName {
  surfaceForm: string;
  candidateCharacterIds: string[];
  excerpt: string;
}
```

### 4.7 Step 1 Prompt 要点

**User 输入：仅章节正文。**

- 列出本章所有人名与称呼，附 excerpt
- 结合后文将昵称归一到 `inferredName`（如「三哥」→「张三」）
- 对每个 `inferredName` 提取本章可见的全部字段（§10.1）
- 无依据字段不输出；有输出必 excerpt
- **不要**假设任何角色库已有信息

---

## 5. Step 2 · 按角色合并

### 5.1 前置条件

- Step 1 完成且本地匹配后**无未裁决的** `ambiguousNames`
- 每个登场角色已绑定 `characterId`（或标记为「新建待创建」）

### 5.2 调用方式

对 Step 1 中每个已匹配角色**单独发起一次 LLM 调用**（或 2–3 人小批，但**禁止**一次发送全书角色）：

| 输入（单角色） | 来源 |
|----------------|------|
| 该角色 `name`、`disambiguation` | 本地角色库 |
| 该角色 `current` 字段 + `panel.entries` | 本地角色库 |
| Step 1 对该角色的 `chapterExtraction` | Step 1 结果 |
| 相关 `excerpt`（可选精简） | Step 1 结果 |

**不向 LLM 发送：** 其他角色资料、全书名表、未登场角色快照。

### 5.3 合并原则

- 以 Step 1 本章提取为**依据**，对照该角色库内已有字段，输出**建议的最新值**
- 正文未提及的字段 → **不输出**（保留库内原值）
- 正文与库内冲突 → 输出本章建议值，预览高亮变更行
- 每个输出字段附 `excerpt`（来自 Step 1 或合并推理）
- **只预览，不建议**

### 5.4 Step 2 输出 Schema

```typescript
interface Step2Result {
  chapterId: string;
  characters: CharacterExtraction[];  // 按角色合并后的建议更新
}

interface CharacterExtraction {
  characterId: string;
  mentionCount: number;
  proposedNewAliases?: string[];
  fields: Record<string, ExtractedField>;
  relations?: Array<{
    targetName: string;
    type: string;
    excerpt: string;
  }>;
  protagonistRelation?: {
    type: string;
    proximity: number;         // 1–5，见 §10.3
    excerpt: string;
  };
  panelEntries?: Array<{
    key: string;               // 功法/技能、法宝/装备、年龄/寿命 或自定义
    value: string;
    excerpt: string;
  }>;
}

interface ExtractedField {
  value: string;
  excerpt: string;
  confidence: 'high' | 'medium' | 'low';
}
```

字段 key 与角色库、面板词条**统一命名**，便于预览列表直接对应。

---

## 6. 预览 UI

### 6.1 数据组装（纯本地，不调 API）

对每个 Step 2 涉及的角色：

1. **从角色库拉取** `current` 字段 + `panel.entries` → 作为**上文（已有）**
2. **取 Step 2 合并结果** → 作为**下文（建议更新）**
3. `buildPreviewRows(existing, step2Output)` 生成 **name | value** 行
4. 上文永远来自本地库，**从未整库发送给 LLM**

### 6.2 布局示意

```
┌─────────────────────────────────────────┐
│ 预览 · 第 12 章   Step1✓ Step2✓         │
│ ⚠ 仅最新章可确认更新（当前：是/否）      │
├─────────────────────────────────────────┤
│ ▼ 张三 · 青云宗弟子    出现 14 次        │
│                                         │
│ 【角色库已有】                           │
│ ┌──────────┬────────────────────┐      │
│ │ name     │ value              │      │
│ ├──────────┼────────────────────┤      │
│ │ 境界     │ 筑基               │      │
│ │ 所在地   │ 青云宗             │      │
│ │ 功法     │ 基础剑诀           │      │
│ └──────────┴────────────────────┘      │
│                                         │
│ 【本章识别】可编辑                       │
│ ┌──────────┬────────────────────┬───┐ │
│ │ name     │ value              │ ☑ │ │
│ ├──────────┼────────────────────┼───┤ │
│ │ 境界     │ 金丹               │ ☑ │ │  ← 变更行高亮
│ │ 所在地   │ 万妖岭             │ ☑ │ │
│ │ 功法     │ 御剑术             │ ☑ │ │  ← 新增行
│ └──────────┴────────────────────┴───┘ │
│                                         │
│ ▶ 李四 · 出现 3 次                      │
├─────────────────────────────────────────┤
│ 未入库: 王五 [创建]  歧义: 张三? [选择]   │
├─────────────────────────────────────────┤
│            [ 确认更新角色库 ]            │
└─────────────────────────────────────────┘
```

### 6.3 交互规则

- 每个角色区块：**上文只读**（本地角色库），**下文可编辑** name/value 单元格
- 每行独立 checkbox，默认勾选有变更的行
- 变更行（value 与上文不同）高亮边框
- 支持在「本章识别」表中**手动增删行**（补字段）
- 严格模式：须勾选 + 点击确认才写入

---

## 7. 仅最新章可更新角色库

### 7.1 规则

- **只有当前作品的「最新章」（`max(chapter.number)`）** 允许执行「确认更新」
- 查看或编辑**历史章节**时：
  - 可粘贴正文、可运行识别、可查看预览
  - **「确认更新」按钮禁用**，并提示：「仅最新章可更新角色卡。若需修改过往设定，请删除该章之后的章节，重新粘贴或上传。」

### 7.2 大幅修改工作流

作者修改早期章节导致设定变化时：

1. 定位需修改的章节
2. **删除其后的所有章节**（或回退到该章为最新章）
3. 重新粘贴/上传后续正文
4. 从该章起重新识别 → 确认更新

> 设计意图：角色库 `current` 始终代表「写到最新章为止」的设定，避免中间章回写造成时间线混乱。字段 `history` 与出场记录保留溯源。

### 7.3 出场章节记录（与 commit 解耦）

- 即使历史章不能 commit 字段变更，**识别仍可记录「本章出现了谁」**（只读，写入出场表，不改正文卡 current）
- 或：出场记录仅在**最新章 commit 时**一并写入 — **采用后者**，与「仅最新章更新」一致，出场列表在 commit 时更新

---

## 8. Diff 与 Commit

### 8.1 Diff 规则

```typescript
function buildPreviewRows(
  existing: Character,
  extracted: CharacterExtraction
): PreviewRow[] {
  // 合并上文已有 + 下文识别为 PreviewRow[]
  // { name, existingValue, proposedValue, changed, checked }
}
```

### 8.2 Commit 写入

```typescript
interface RecognitionCommit {
  id: string;
  chapterId: string;
  chapterNumber: number;
  committedAt: string;
  acceptedFields: Array<{
    characterId: string;
    fieldKey: string;       // name 列
    oldValue: string;
    newValue: string;
  }>;
  appearances: Array<{      // 本章出场
    characterId: string;
    mentionCount: number;
  }>;
  modelProfile: string;
}
```

### 8.3 Commit 后副作用

- 更新角色 `current` 字段与 `panel.entries`
- append 各字段 `history`（含 `chapterId`、`excerpt`）
- 更新 `Character.appearances`（追加本章记录）
- 更新 `firstAppearance` / `lastAppearance`
- 刷新关系网

---

## 9. 可靠性措施

| 措施 | 说明 |
|------|------|
| 两步串行 | Step 1 本地匹配歧义未清完不进入 Step 2 |
| 按人发快照 | Step 2 仅发送本章登场角色的单卡资料，禁止全书快照 |
| JSON Schema 校验 | 每步解析失败重试 1 次 |
| excerpt 必填 | 无依据字段丢弃 |
| 严格模式 | 全部须勾选确认 |
| 最新章门禁 | 非最新章禁止 commit |
| 预览不入库 | 仅内存，减轻存储与一致性问题 |
| 会话内缓存 | 同章同 hash 可复用 Step1+2 结果（内存） |

---

## 10. 识别能力规范（正式）

以下为 MVP **必须实现**的识别能力，开发与验收均以此为准。

### 10.1 识别产出总览

| 阶段 | 产出 | 说明 |
|------|------|------|
| Step 1（正文纯提取） | **角色名** | 正式姓名 |
| Step 1 | **昵称/称呼/别名** | 道号、绰号、「三哥」「张师兄」等 |
| Step 1 | **身份/称号** | 门派职位、江湖绰号、朝堂官职 |
| Step 1 | **境界** | 修为等级（自由文本） |
| Step 1 | **所在地** | 当前场景地理位置 |
| Step 1 | **势力** | 门派、家族、国家阵营 |
| Step 1 | **关系** | 与其他角色的关系（类型 + 对象） |
| Step 1 | **功法/技能** | 角色面板词条 |
| Step 1 | **法宝/装备** | 角色面板词条 |
| Step 1 | **年龄/寿命** | 角色面板词条 |
| Step 1 | **与主角关系远近** | 类型 + 量化值 1–5（见 10.3） |
| Step 1 | **状态** | 伤、死、闭关等（正文明确时） |
| Step 2（按人合并） | **建议更新字段** | 对照单角色库内已有 + Step 1 本章提取 |

- 凡正文**未明确写出**的字段 → Step 1 **不输出**（禁止推测）
- 凡输出的字段 → **必须附 `excerpt`**
- Step 2 仅输出相对库内有变化或 Step 1 新提取的字段；未变字段预览靠上文展示

### 10.2 关系字段（角色间）

除「与主角关系」外，角色之间关系单独识别：

```typescript
// Step 2 fields['关系'] 或 relations 数组
{
  targetName: string;      // 对方角色名（须能在 Step 1 或库中对应）
  type: string;            // 师徒、仇敌、同门、亲属、道侣…
  excerpt: string;
}
```

- 有向关系（师徒）与无向关系（同门）按类型区分
- 对方无法匹配到具体角色时，保留 `targetName` 文本，预览中提示作者关联

### 10.3 与主角关系远近（量化规范）

**适用范围：** 所有 `role !== 'protagonist'` 的角色；主角本人不输出此项。

**输出结构（预览 name 列拆为两行或合并展示）：**

| name | value 示例 |
|------|------------|
| 与主角关系 | 师徒 |
| 与主角关系远近 | 4 |

```typescript
protagonistRelation: {
  type: string;              // 师徒、仇敌、同门、亲属、道侣、盟友、陌生…
  proximity: number;         // 整数 1–5，必填（当 type 有依据时）
  excerpt: string;
}
```

**proximity 量化标尺（LLM 须按此打分）：**

| 分值 | 含义 | 典型情形 |
|------|------|----------|
| **5** | 极近 / 核心 | 亲属、道侣、生死之交、主线同行、灵魂羁绊 |
| **4** | 很近 | 师徒、挚友、同队核心、频繁并肩作战 |
| **3** | 一般 | 同门、同事、多次有意义互动、普通盟友 |
| **2** | 较远 | 偶有交集、远房亲戚、点头之交、单方面认识 |
| **1** | 极远 | 仅被提及、几乎无直接互动、路人式出场 |

**识别规则：**

1. 正文有明确关系描写 → **必须**输出 `type` + `proximity`，并附 excerpt
2. 仅有弱提及、无法判断关系类型 → 可不输出，或 `proximity: 1` + 低置信度，默认**不勾选**
3. 关系有依据但远近模糊 → 默认 `proximity: 3`，作者在预览中修改
4. **禁止**在无正文依据时填 4–5 分
5. commit 后写入 `Character.protagonistRelation`，并影响关系网节点距中心半径

**群像模式：** 量化参照**作品指定主角**（`Project.protagonistId`）；多中心模式下，非中心角色仍相对主角量化，中心角色之间用 `isNetworkCenter` 单独标记。

### 10.4 同名角色与作者裁决（规范）

**原则：系统绝不替作者决定「是哪个张三」。**

**触发「须作者裁决」的情形：**

| # | 情形 | 处理 |
|---|------|------|
| 1 | 角色库存在多个 `name` 相同且 `disambiguation` 不同的角色 | 匹配时列出全部候选 |
| 2 | 正文称呼经上下文仍无法唯一对应 `characterId` | 进入 `ambiguousNames` |
| 3 | Step 1 置信度非 `high` 且候选 ≥ 2 | 进入 `ambiguousNames` |
| 4 | 新角色与已有角色同名，身份不明 | 作者选择「关联已有」或「新建（必填 disambiguation）」 |

**流程约束：**

```
ambiguousNames 非空
  → 阻断 Step 2（不发起信息提取）
  → 弹出裁决 UI
  → 作者选择后更新 Step 1 匹配结果
  → 方可继续 Step 2
```

**裁决 UI 须展示（供作者判断）：**

- 正文 excerpt（该称呼出现语境）
- 每个候选：`name` + `disambiguation` + 境界 + 最近出场章
- 操作：**选 A / 选 B / … / 新建角色（填 disambiguation）/ 跳过本章该提及**

**建卡规则：**

- 角色库中已存在同名角色时，新建**必须**填写 `disambiguation`（如「青云宗·张三」）
- 识别不得自动合并两个同名角色

**Commit 门禁：**

- 存在未裁决的 `ambiguousNames` → **禁止 commit**
- commit 前再次校验 Step 1 全部提及已绑定 `characterId` 或标记为「新建待创建」

### 10.5 面板词条与自定义 key

- 固定词条名：**功法/技能**、**法宝/装备**、**年龄/寿命**
- 若作者预定义面板模板，Step 2 额外匹配模板中的 `key` 并提取
- 预览下文以 name | value 行展示，与 10.1 字段表一致

### 10.6 验收检查表（识别能力）

- [ ] Step 1 输出角色名 + 昵称，「三哥」可匹配「张三」
- [ ] Step 2 输出：身份、境界、所在地、势力、关系、功法/技能、法宝/装备、年龄/寿命
- [ ] 与主角关系输出 type + proximity(1–5) + excerpt
- [ ] 两个「张三」同时出现时弹出裁决，阻断 Step 2
- [ ] 裁决完成前无法 commit
- [ ] 新建同名角色必须填 disambiguation
- [ ] 无依据字段不输出；有输出必有 excerpt

---

## 11. API 与成本

- 用户自备 OpenAI 兼容 API
- 每章调用：**1 次 Step 1**（仅正文）+ **N 次 Step 2**（N = 本章登场且已匹配角色数，可小批合并）
- **禁止**向 API 发送全书角色库或全书名表快照
- Step 1 input ≈ 章节字数 + system prompt
- Step 2 input ≈ 单角色 current 字段 + 该角色本章提取（通常远小于全书快照）
- 估算：5000 字章节、8 个登场角色，合计约 15k–25k input tokens（视单角色资料厚度而定），但**不随全书角色总数线性增长**

---

## 12. MVP 验收用例

1. Step 1 识别「三哥」并上下文匹配到「张三」
2. Step 2 输出完整字段集（身份、境界、所在地、势力、关系、功法/技能、法宝/装备、年龄/寿命）
3. 非主角角色输出「与主角关系」+ proximity 1–5
4. 两个「张三」→ 裁决弹窗 → Step 2 阻断直至选择
5. 预览上文=角色库已有，下文=name|value 可编辑
6. 非最新章「确认更新」禁用
7. 最新章 commit 后出场时间线、protagonistRelation 更新
8. 切换章节后预览消失，正文仍在
