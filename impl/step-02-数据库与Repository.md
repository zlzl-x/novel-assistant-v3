# Step 02 · 数据库与 Repository

**对应 Phase 1 · 预估 2–3 天**

## 目标与产出

- SQLite schema 覆盖 MVP 实体
- Repository 层 CRUD + 事务
- `packages/core` 完整 TypeScript 模型
- 单元测试覆盖核心 Repository

## 前置依赖

- Step 01 完成

## 详细任务

### 2.1 Schema 设计（`packages/db/src/schema.sql`）

- [ ] `projects`：id, title, protagonist_id, network_mode, genre, schema_version, created_at, updated_at
- [ ] `chapters`：id, project_id, number, title, raw_text, word_count, last_committed_at, ...
- [ ] `characters`：id, project_id, name, disambiguation, role, tier, summary, notes, protagonist_relation_json, panel_json, ...
- [ ] `character_aliases`：character_id, alias（索引）
- [ ] `character_field_history`：character_id, field_key, value, chapter_id, source, excerpt, created_at
- [ ] `character_appearances`：character_id, chapter_id, chapter_number, mention_count, committed_at
- [ ] `character_relations`：id, source_id, target_id, type, strength, ...
- [ ] `recognition_commits` + `recognition_commit_fields`
- [ ] `map_worlds`、`map_nodes`
- [ ] `setting_modules`
- [ ] `schema_migrations`：version, applied_at

> **注意：** 不建 `recognition_preview` 表（预览仅内存，见 md/06 §3.3）

### 2.2 迁移机制

- [ ] `MigrationRunner`：启动时比较 version，顺序执行 `migrations/001_initial.sql`
- [ ] `schemaVersion` 与 `md/08` Project.schemaVersion 对齐，初值 `1`

### 2.3 Repository 接口（`packages/db/src/repositories/`）

| Repository | 核心方法 |
|------------|----------|
| `ProjectRepository` | findAll, findById, create, update, delete |
| `ChapterRepository` | findByProject, findById, create, update, delete, getMaxNumber, deleteAfter(number) |
| `CharacterRepository` | findByProject, search(query), findById, create, update, findByName |
| `AppearanceRepository` | append, findByCharacter, findByChapter |
| `CommitRepository` | create, findByChapter |
| `MapRepository` | worlds, nodes CRUD |
| `SettingRepository` | modules CRUD, reorder |

- [ ] 所有写操作包在 `db.transaction()` 内
- [ ] `CharacterRepository.search`：name + aliases 模糊，目标 <200ms（500 人）

### 2.4 packages/core 模型

- [ ] 从 md/04、md/08 复制并统一：`Character`、`CharacterPanel`、`FieldWithHistory`、`RecognitionPreview`（内存类型）、`Step1Result`、`Step2Result`
- [ ] 常量：`RECOGNITION_FIELD_KEYS`、`PROXIMITY_MIN/MAX = 1/5`

### 2.5 测试

- [ ] 内存 SQLite（`:memory:`）或 temp 文件
- [ ] 测试：创建作品→章→角色→appearance→commit 字段历史
- [ ] 测试：`deleteAfter(chapterNumber)` 删后续章
- [ ] 测试：同名 `findByName` 返回多条

## 难点与解决方案

| 难点 | 解决方案 |
|------|----------|
| **JSON 字段 vs 规范化表** | `panel_json`、`protagonist_relation_json` 用 JSON 列；`field_history` 单独表便于时间线查询 |
| **aliases 搜索性能** | 独立 `character_aliases` 表 + 索引；搜索 UNION name 与 alias |
| **immutable 更新** | Repository `updateCharacter` 返回新对象；历史 append 不 delete |
| **删除后续章与角色状态** | MVP：只删 chapters 行；**不自动回滚**角色库（靠「仅最新章 commit」约束）；文档提示作者手动处理或 Phase 5 做回滚 |

## 验收标准

```bash
pnpm --filter @novel-assistant/db test
# 覆盖率：Repository 核心方法 ≥ 80%
```

- [ ] 重启后数据仍在（针对 temp db 文件测试）
- [ ] `getMaxNumber(projectId)` 正确
- [ ] `character_appearances` 按 chapter_number 排序

## 参考

- `md/08-data-model.md`
- `md/04-character-system.md` §2
- `md/06-text-recognition-pipeline.md` §3.3

**下一步 → [step-03-Electron主进程与存储目录.md](./step-03-Electron主进程与存储目录.md)**
