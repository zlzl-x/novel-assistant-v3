# Step 10 · 角色库与左栏搜索

**对应 Phase 3 · 预估 2 天**

## 目标与产出

- 角色 CRUD、面板词条手动编辑
- 全局左栏角色名列表 + 搜索 <200ms
- 角色详情抽屉/页：卡片 + 出场时间线 + 字段时间线
- 建卡同名必填 disambiguation

## 前置依赖

- Step 09（commit 已有角色数据）

## 详细任务

### 10.1 角色详情（`CharacterDetailDrawer.vue`）

- [ ] 基础字段表单（身份、境界、所在地、势力、备注）
- [ ] 面板词条区：name|value 可增删行
- [ ] **出场时间线**表格：章号、标题、出现次数、commit 时间
- [ ] **字段时间线**：按字段折叠，history 按 chapterNumber 排序
- [ ] 与主角关系 type + proximity 编辑

### 10.2 左栏角色列表（`CharacterSidebar.vue` 完善）

- [ ] 加载 `characterStore.byProject`
- [ ] 排序：最近出场 / 拼音 / 重要度
- [ ] 搜索框 debounce 150ms → `CharacterRepository.search`
- [ ] 主角置顶标记
- [ ] 点击：角色页居中；正文页打开抽屉

### 10.3 新建/编辑校验

- [ ] `createCharacter`：name 必填
- [ ] `findByName` 冲突 → disambiguation 必填
- [ ] 指定主角：唯一 `protagonist` role（群像模式另议 Step 11）

### 10.4 角色页列表视图（`CharactersView.vue`）

- [ ] 表格或卡片列表，点击进入详情
- [ ] 关系网入口占位（Step 11）

### 10.5 与正文联动（可选 MVP）

- [ ] 正文 textarea 内角色名高亮（简单 regex 匹配 name+aliases）

## 难点与解决方案

| 难点 | 解决方案 |
|------|----------|
| **500 人搜索慢** | SQL LIKE + 索引；结果 limit 50；虚拟滚动 |
| **history 展示爆炸** | 默认折叠；每字段最多展示 20 条 +「更多」 |
| **面板 JSON 与表字段统一** | UI 层统一转 PreviewRow[]；存库分 field_history 与 panel_json |
| **拼音排序** | 依赖 `pinyin-pro` 或 MVP 仅拼音首字母缓存 |

## 验收标准

- [ ] 搜索 500  stub 角色 <200ms（benchmark test）
- [ ] 出场时间线与 commit 一致
- [ ] 同名新建无 disambiguation 阻止保存
- [ ] 左栏与详情数据同步（commit 后刷新 store）

## 参考

- `md/04-character-system.md` §3、§5
- `md/03-ui-layout-spec.md` §2.2、§5

**下一步 → [step-11-关系网可视化.md](./step-11-关系网可视化.md)**
