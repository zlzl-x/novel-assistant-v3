# Step 13 · 设定模块

**对应 Phase 4 · 预估 2 天**

## 目标与产出

- 富文本、清单、表格三种块
- 四内置模板（可空白插入）
- 拖拽排序
- 全书设定搜索（可选）

## 前置依赖

- Step 04（SettingsView）、02（SettingRepository）

## 详细任务

### 13.1 块编辑器框架（`SettingsView.vue`）

- [ ] 顶部「+ 添加模块」：类型选择
- [ ] 模块卡片：标题 editable、折叠、删除确认、拖拽把手
- [ ] `order` 字段拖拽更新

### 13.2 模块类型实现

| 类型 | 组件 | 存储 payload |
|------|------|--------------|
| richtext | TipTap 或 Milkdown 轻量 | `{ html 或 markdown }` |
| checklist | `ChecklistBlock.vue` | `{ items: [{ text, checked }] }` |
| table | `TableBlock.vue` | `{ columns, rows }` md/07 |

### 13.3 四内置模板（`core/settings/templates.ts`）

- [ ] `outline`：富文本 + 起承转合标题
- [ ] `powerSystem`：表格块空列
- [ ] `characterSheet`：表格块
- [ ] `foreshadowing`：清单块
- [ ] 插入时**内容为空**

### 13.4 模板选择 UI

- [ ] 「从模板添加」子菜单
- [ ] 一次可插入多块（大纲模板可能 1 个 richtext）

### 13.5 持久化

- [ ] `SettingRepository` CRUD
- [ ] 切换作品 reload modules

## 难点与解决方案

| 难点 | 解决方案 |
|------|----------|
| **TipTap 包体积** | 只启用 Document/Paragraph/Bold/List；或 MVP 用 textarea+Markdown |
| **表格列动态** | 表头行可增删列；数据 JSON 存 |
| **拖拽与编辑器冲突** | 拖拽把手仅在标题栏；编辑区 `@mousedown.stop` |
| **富文本 XSS** | 渲染时 DOMPurify；作者本地应用风险可控 |

## 验收标准

- [ ] 四模板可插入空白模块
- [ ] 拖拽排序重启后顺序保持
- [ ] 富文本/清单/表格内容不丢失
- [ ] 删除模块二次确认

## 参考

- `md/07-settings-custom-modules.md`
- `md/11-open-questions.md` D2

**下一步 → [step-14-导入导出与打包发布.md](./step-14-导入导出与打包发布.md)**
