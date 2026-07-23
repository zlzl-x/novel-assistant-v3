# Step 05 · 正文与章节 CRUD

**对应 Phase 2 · 预估 2 天**

## 目标与产出

- 正文三栏布局（章节列 | 编辑 | 预览占位）
- 章节增删改排序，**仅存 rawText**
- 切换章节自动保存
- 删除后续章 API 可用

## 前置依赖

- Step 04 完成

## 详细任务

### 5.1 章节列表左栏（`ChapterSidebar.vue`）

- [ ] 默认 48px 宽，hover 展开 180px（md/03 §1.1）
- [ ] 显示章号、当前章色条
- [ ] 右键菜单：重命名、删除、后插
- [ ] 拖拽排序 → 更新 `chapter.number` 批量写库
- [ ] `+` 新建章：number = max+1

### 5.2 正文编辑中栏（`ManuscriptEditor.vue`）

- [ ] 大 `textarea` 或 CodeMirror 6（plain text）
- [ ] 顶栏：标题输入、字数、`Ctrl+S` 保存
- [ ] debounce 500ms 自动保存 `rawText` + `wordCount`
- [ ] 切换章节：若有未保存提示（一般 auto-save 可省略）

### 5.3 预览右栏占位

- [ ] `PreviewPanel.vue` 空状态：「粘贴正文后点击智能识别」
- [ ] 宽度 360px，可拖拽 280–480px
- [ ] 「智能识别」按钮 disabled 占位（Step 09 启用）

### 5.4 仅最新章标识

- [ ] `chapterStore.isLatestChapter(chapterId)`：`number === maxNumber`
- [ ] 非最新章编辑区顶部 Banner：「此为历史章节，确认更新已禁用」

### 5.5 删除后续章

- [ ] 章节右键「删除本章及之后所有章」二次确认
- [ ] 调用 `chapters.deleteAfter(projectId, number)`
- [ ] 提示：「角色库不会自动回滚，请从该章重新识别提交」

### 5.6 预览内存规则

- [ ] 切换 `currentChapterId` 时：`previewStore.clearExcept` 或整章切换清空当前 preview 显示
- [ ] **不写库、不写 localStorage**

## 难点与解决方案

| 难点 | 解决方案 |
|------|----------|
| **拖拽排序 number 冲突** | 事务内：先全部设临时负数，再按新序赋 1..n |
| **大文本 textarea 卡顿** | 8000 字内可接受；超 5000 字可考虑 CodeMirror；MVP textarea 够用 |
| **章节切换丢预览** | 产品要求：切换即清空；同章切回需重新识别（符合 md/06） |
| **路由与 chapterId 同步** | watch route params → load chapter；改章更新 URL |

## 验收标准

- [ ] 新建 3 章，粘贴不同正文，重启后仍在
- [ ] 拖拽排序后章号连续
- [ ] 删除第 2 章及之后，剩第 1 章
- [ ] 数据库 chapters 表无 preview 相关列
- [ ] 非最新章显示禁用 Banner

## 参考

- `md/03-ui-layout-spec.md` §1
- `md/06-text-recognition-pipeline.md` §3.3、§7
- `md/01-product-overview.md` US-07

**下一步 → [step-06-LLM客户端与设置页.md](./step-06-LLM客户端与设置页.md)**
