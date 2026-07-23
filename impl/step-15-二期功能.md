# Step 15 · 二期功能

**对应 Phase 5 · 非 MVP 阻塞，按需排期**

## 目标

MVP 发布后的增强项，与 `md/10-mvp-roadmap.md` §7 对齐。

## 前置依赖

- Step 14（MVP 已发布）

---

## 15.1 思维导图模块

**参考：** `md/07` §3.4、`md/11` D1

- [ ] 评估 `mind-elixir` vs `simple-mind-map`
- [ ] `SettingModule` type `mindmap`，payload 存 JSON
- [ ] 嵌入 SettingsView，导出 PNG 可选

**难点：** 包体积与 Vue3 集成 → 动态 import 懒加载

---

## 15.2 设定冲突检测 v0

**参考：** `md/04` §5.5

- [ ] `core/conflict/rules/realm-regression.ts`：境界倒退
- [ ] 扫描 `field_history` 或 commit 日志
- [ ] 角色详情页警告条，**不阻断** commit

**难点：** 自由文本境界难比较 → MVP 仅 exact string 比较 + 作者标记境界序表（可选）

---

## 15.3 撤销上次 Commit

- [ ] `RecognitionCommit` 存 oldValue 快照
- [ ] 「撤销」仅最后一笔 commit，回滚 current + 删对应 appearance

**难点：** 多角色部分回滚 → 整笔 commit 原子撤销

---

## 15.4 地图增量补丁生成

**参考：** `md/05` §10

- [ ] 增删节点后，LLM 只输出 diff patch 而非整页 HTML
- [ ] 合并进现有 SVG

**难点：** patch 可靠性低 → 保留「整页重生成」为主路径

---

## 15.5 导出设定 Bible

- [ ] Markdown/PDF：角色表 + 设定模块 + 地图树
- [ ] `pandoc` 或纯 MD zip

---

## 15.6 性能优化（200+ 角色）

- [ ] 关系网聚合节点完善
- [ ] 角色搜索 FTS5
- [ ] 章节正文懒加载

---

## 15.7 小程序可行性验证

- [ ] 抽离 `packages/core` 到可 npm 发布
- [ ] 评估 uni-app / Taro + 云端 DB 与「本地优先」冲突

**难点：** 小程序无法 better-sqlite3 → 需云同步或简化存储，与 md/ A1 后续规划一致

---

## 15.8 可选增强（来自 md/11 H 待补充）

- [ ] 批量导入全书 + 后台识别队列
- [ ] 云同步（加密）
- [ ] 本地 Ollama 支持

---

## 验收

二期无统一门禁，按子项独立验收。完成后标记 `impl/README.md` Step 15 子项。
