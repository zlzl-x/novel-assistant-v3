# Step 09 · 预览 UI 与 Commit

**对应 Phase 2 收尾 · 预估 2–3 天**

## 目标与产出

- 完整预览面板：上文已有 + 下文 name|value 可编辑表
- 同名裁决弹窗
- 仅最新章 commit
- Commit 写库：current、history、appearances、relations

## 前置依赖

- Step 07、08、05、02

## 详细任务

### 9.1 预览面板（`PreviewPanel.vue`）

- [ ] 按角色折叠卡片，默认展开有变更的
- [ ] 每卡：
  - **【角色库已有】** 只读 `n-table`：name | value
  - **【本章识别】** 可编辑 table：name | value | checkbox
- [ ] 支持增删行、编辑 name/value
- [ ] 底栏：「确认更新角色库」「全部忽略」
- [ ] 非最新章：`确认更新` disabled + tooltip 说明删后续章流程

### 9.2 同名裁决（`AmbiguityResolverModal.vue`）

- [ ] 列出 `ambiguousNames`：excerpt + 候选卡片（disambiguation、境界、最近出场章）
- [ ] 操作：选择候选 / 新建（必填 disambiguation）/ 跳过
- [ ] 确认后更新 `previewStore.step1`，清除该项 ambiguous
- [ ] 全部清完 → 自动触发 Step 2

### 9.3 未入库角色

- [ ] `unresolvedMentions` 列表 +「快速创建」
- [ ] 创建最小角色（name + disambiguation 若冲突）→ 重新 Step1 或手动关联

### 9.4 Commit 逻辑（`packages/core/commit/applyRecognition.ts`）

**纯函数，可单测：**

```typescript
function applyRecognitionCommit(input: {
  chapter: Chapter;
  characters: Character[];
  acceptedRows: AcceptedRow[];  // 按角色分组
  appearances: { characterId; mentionCount }[];
}): { updatedCharacters; commit: RecognitionCommit }
```

- [ ] 不可变：返回新 Character 对象
- [ ] 每字段 append `history`
- [ ] 更新 `protagonistRelation`
- [ ] `panel.entries` 合并
- [ ] `appearances` append 本章（去重同章）
- [ ] 新 aliases 合并

### 9.5 IPC 事务

- [ ] `recognition:commit`：主进程单事务写 characters + appearances + commit 日志
- [ ] 更新 `chapter.lastCommittedAt`
- [ ] 成功后 `previewStore.clear(chapterId)`

### 9.6 严格模式

- [ ] 无勾选行 → 禁止 commit 或提示
- [ ] commit 前再校验 ambiguous 为空

## 难点与解决方案

| 难点 | 解决方案 |
|------|----------|
| **可编辑 table 状态乱** | 每角色 `ref<PreviewRow[]>`；commit 时从 UI 收集，不以 Step2 原始为准 |
| **部分采纳后 panel 不一致** | 按 row.name 逐条 merge；未勾选跳过 |
| **非最新章误点** | 按钮 disabled + `isLatestChapter` 双重校验（UI + commit IPC） |
| **commit 后预览消失** | 产品要求；成功 toast「已更新角色库」 |
| **删后续章角色库不回滚** | commit 时写清 chapterNumber；文档/提示；Phase 5 可选 undo |

## 验收标准（对齐 md/10 Phase 2）

- [ ] Step1「三哥」→ 张三
- [ ] 完整字段集 + proximity
- [ ] 两张三 → 裁决 → 才能 Step2
- [ ] 非最新章 commit 禁用
- [ ] commit 后 appearances、history 正确
- [ ] 切换章预览消失，正文在
- [ ] 无 API Key 友好提示

```bash
pnpm test -- recognition commit preview
```

**M2 里程碑达成**

## 参考

- `md/06-text-recognition-pipeline.md` §6–8、§10、§12
- `md/03-ui-layout-spec.md` §1.3
- `md/10-mvp-roadmap.md` §4

**下一步 → [step-10-角色库与左栏搜索.md](./step-10-角色库与左栏搜索.md)**
