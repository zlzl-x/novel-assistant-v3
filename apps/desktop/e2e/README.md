# E2E 冒烟测试（Step 14.6）

当前仓库提供 **核心逻辑单元测试** 覆盖导入分章与导出清单结构；完整 Electron Playwright 流程建议在本地手动或 CI 中按需启用。

## 手动冒烟清单

1. 新建作品
2. 正文页点击「导入」，选择 `.txt` / `.docx` 文件
3. 预览分章后确认导入
4. 配置 LLM（应用设置）后执行识别 → 预览 → Commit
5. 角色库出现数据；顶栏「导出备份」可生成 `.zip` / `.nav3`

## 后续 CI（可选）

```bash
pnpm --filter @novel-assistant/desktop build:installer
```

可在 GitHub Actions 中缓存 `node_modules` 与 `electron` 二进制，运行 `pnpm test` + `typecheck`。
