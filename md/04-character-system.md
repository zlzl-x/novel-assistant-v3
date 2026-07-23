# 04 · 角色系统设计

## 1. 设计目标

1. **全书角色单一数据源**（Single Source of Truth）
2. **关系可感知**（球状网 + 列表；单主角/多中心可切换）
3. **变更可追溯**（每字段记录来源章节与时间）
4. **防吃书**（别名、境界历史、所在地、角色面板词条）
5. **角色面板**（原 v2 主角面板能力按角色独立，识别后不自动静默更改）

---

## 2. 角色数据模型

```typescript
interface Character {
  id: string;
  projectId: string;

  // 标识
  name: string;                    // 主显示名
  aliases: string[];             // 别名、称呼、道号
  disambiguation: string;        // 同名消歧，建卡必填："青云宗·张三"

  // 分类
  role: 'protagonist' | 'major' | 'minor' | 'mentioned';
  tier?: 'core' | 'supporting' | 'background';  // 关系网层级
  isNetworkCenter?: boolean;     // 群像模式下的多中心节点

  // 设定字段（通用题材，自由文本）
  identity: FieldWithHistory<string>;      // 身份/称号
  realm: FieldWithHistory<string>;         // 境界（自由文本）
  location: FieldWithHistory<string>;      // 所在地（文本，不自动关联地图）
  faction?: FieldWithHistory<string>;      // 势力
  summary: string;                         // 一句话摘要（卡片用）
  notes: string;                           // 作者备注

  // 与主角关系（识别量化）
  protagonistRelation?: {
    type: string;               // 师徒、仇敌、同门…
    proximity: number;          // 1–5，关系远近量化
    label?: string;
  };

  // 角色面板词条（按角色独立，非全局主角面板）
  panel: CharacterPanel;

  // 关系
  relations: Relation[];

  // 溯源与出场
  firstAppearance?: ChapterRef;
  lastAppearance?: ChapterRef;
  mentionCount: number;
  appearances: CharacterAppearance[];   // 出场章节列表（时间线基础）

  createdAt: string;
  updatedAt: string;
}

/** 角色在哪些章出现 — 时间线核心数据 */
interface CharacterAppearance {
  chapterId: string;
  chapterNumber: number;
  chapterTitle?: string;
  mentionCount: number;         // 该章出现次数
  committedAt: string;          // 写入角色库的时间（commit 时）
  excerpt?: string;             // 可选：首次出场摘录
}

/** 角色面板：作者可预定义词条模板，识别自动匹配词条名 */
interface CharacterPanel {
  templateId?: string;          // 引用的面板模板（可选）
  entries: PanelEntry[];        // 动态词条列表
}

interface PanelEntry {
  key: string;                  // 词条名，如「功法」「法宝」「年龄」
  value: string;
  history: Array<{
    value: string;
    chapterId?: string;
    source: 'manual' | 'recognition';
    excerpt?: string;
  }>;
}

interface FieldWithHistory<T> {
  current: T;
  history: Array<{
    value: T;
    chapterId?: string;
    chapterNumber?: number;
    source: 'manual' | 'recognition' | 'import';
    recognizedAt?: string;
    excerpt?: string;
  }>;
}

interface Relation {
  targetCharacterId: string;
  type: string;
  label?: string;
  strength?: number;            // 1-5
  sinceChapter?: number;
  notes?: string;
}
```

---

## 3. 角色名列表（全局左栏）

### 3.1 数据来源
- 主列表：已确认入库的角色
- 灰色区：仅在本章/全书正文中被提及但未建卡的角色

### 3.2 搜索逻辑
```
匹配优先级：
1. name 完全匹配
2. aliases 完全匹配
3. name / aliases 包含子串
4. 拼音全拼 / 首字母（可选）
5. disambiguation 匹配
```

### 3.3 排序模式
- **最近出场**（默认）
- **拼音**
- **重要度**（protagonist → major → minor）
- **与主角关系远近**（proximity 降序）

---

## 4. 球状关系网

### 4.1 布局模式

**单主角模式（默认）：**
1. 主角固定于 `(0, 0)`
2. `proximity` 高的角色靠近中心
3. `tier: core` 在 R1，`supporting` 在 R2，`background` 在 R3

**群像多中心模式（作者可选）：**
1. 多个 `isNetworkCenter: true` 的角色作为锚点
2. 其余角色按与各中心的 `proximity` 挂靠最近中心
3. 中心之间用虚线表示并列关系

### 4.2 节点视觉编码

| 属性 | 编码 |
|------|------|
| 角色类型 | 大小、边框样式 |
| 与主角 proximity | 距中心半径 |
| 最近出场 | 外圈脉冲动画 |
| 有未确认预览 | 警告角标 |
| 同名待消歧 | 问号角标 |

### 4.3 性能边界

| 角色数 | 策略 |
|--------|------|
| ≤ 80 | 全量渲染 |
| 81–200 | 默认只显示 major+，可「显示全部」 |
| > 200 | 聚合节点「其他 N 人」，点击进入列表 |

---

## 5. 防吃书机制

### 5.1 字段历史与时间线

- 境界、所在地、身份、面板词条变更**不删除旧值**，进入 `history`（含 `chapterId`）
- 卡片默认显示 `current`，可展开**字段时间线**（按章节排列变更）
- **出场时间线：** `appearances[]` 记录角色出现的每一章及次数，角色详情页独立展示

```
出场时间线示例：
  第 01 章 初入宗门  ·  出现 3 次
  第 05 章 外门试炼  ·  出现 12 次
  第 12 章 万妖岭    ·  出现 14 次  ← 最近

字段时间线示例（境界）：
  第 01 章  炼气期
  第 08 章  筑基
  第 12 章  金丹      ← current
```

### 5.2 别名与改名
- 识别到「张三又名张无忌」→ 建议合并为同一人或建立别名
- 改名流程：保留旧名为 alias

### 5.3 同名角色（已确认 B4，见 `06` §10.4）

- 库中多个同名或上下文无法唯一匹配 → **阻断 Step 2**，弹出作者裁决
- 建卡时同名**必须** `disambiguation`；**禁止** AI 自动消歧合并
- 未裁决完成**禁止** commit

### 5.4 与主角关系远近（已确认 B1，见 `06` §10.3）

- 非主角角色：正文有关系描写时输出 `type` + `proximity` 1–5
- commit 后写入 `protagonistRelation`，影响关系网布局
- 预览 name\|value 表中可修改分值

### 5.5 冲突检测（第二期）
- 境界倒退、死地复活、称呼不一致等 → 见路线图 Phase 5+

---

## 6. 与正文识别的衔接

### 6.1 两步流水线

1. **Step 1：** 识别角色名 + 昵称/称呼，上下文匹配角色库；歧义 → 作者裁决
2. **Step 2：** 对已匹配角色提取字段；拉取角色库 current → 预览**上文**展示

### 6.2 预览与更新规则

- 预览格式：**name | value 两列表格**（上文已有只读 + 下文识别可编辑）
- 章节**只存正文**，预览**不入库**
- **仅最新章**可「确认更新」角色卡；改历史章须删后续章重贴
- commit 时写入：`current`、字段 `history`、`appearances` 追加本章

### 6.3 识别字段（正式清单）

Step 2 必须支持识别并在预览 name\|value 表展示：

`身份/称号` · `境界` · `所在地` · `势力` · `关系` · `功法/技能` · `法宝/装备` · `年龄/寿命` · `与主角关系` · `与主角关系远近` · `状态`

详见 `06-text-recognition-pipeline.md` §10。

### 6.4 严格模式

- 所有变更行须勾选确认
- 同名无法确认 → 阻断直至作者裁决
- 面板词条匹配作者预定义 key；**只预览，不建议**

---

## 7. 手动管理

- 新建角色（最小：姓名 + disambiguation 若同名已存在）
- 合并角色（将 B 并入 A，aliases 合并，关系重定向）
- 标记死亡/退场（`status: dead | retired | unknown`）
- 指定主角（单主角模式唯一；群像模式可标记多个 `isNetworkCenter`）
- 编辑角色面板词条（不经过识别）

---

## 8. MVP 范围

| 功能 | MVP |
|------|-----|
| 角色列表 + 卡片 + 面板词条 | ✓ |
| 搜索 | ✓ |
| 字段历史 | ✓ |
| 关系网（单主角 + 群像多中心） | ✓ |
| 与主角关系远近量化 | ✓ |
| 同名作者裁决 | ✓ |
| 出场章节 / 时间线 | ✓ |
| 冲突检测 | 二期 |
| 合并角色 | 手动简单版 |
