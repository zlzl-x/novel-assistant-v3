# Step 11 · 关系网可视化

**对应 Phase 3 · 预估 2–3 天**

## 目标与产出

- vis-network 球状/径向布局
- 单主角居中；群像多中心模式
- proximity 驱动节点距中心半径
- 与左栏、详情联动

## 前置依赖

- Step 10

## 详细任务

### 11.1 图数据转换（`core/graph/toVisNetwork.ts`）

- [ ] nodes：`id, label, size, color, x?, y?`
- [ ] edges：`from, to, label, width`（strength）
- [ ] 主角固定中心 (0,0)
- [ ] 非主角半径 `R = baseR * (6 - proximity)`（proximity 5 最近）
- [ ] `networkMode === 'ensemble'`：多 `isNetworkCenter` 锚点

### 11.2 组件（`RelationGraph.vue`）

- [ ] vis-network 封装，容器自适应
- [ ] 滚轮缩放、拖拽
- [ ] 点击节点 → emit `selectCharacter`
- [ ] 点击边 → 关系备注 tooltip

### 11.3 群像模式切换

- [ ] 作品设置或角色页 toggle `networkMode`
- [ ] 多中心：标记多个 `isNetworkCenter`，布局多锚点圆周

### 11.4 性能策略

- [ ] ≤80 全量
- [ ] 81–200：默认 major+，按钮「显示全部」
- [ ] >200：聚合节点「其他 N 人」

### 11.5 联动

- [ ] 左栏点击 → `network.focus(id, { animation: true })`
- [ ] commit 后 `graphStore.refresh()`

## 难点与解决方案

| 难点 | 解决方案 |
|------|----------|
| **vis-network 与 Vue 生命周期** | `onMounted` 初始化；`watch` 数据 deep 时 `setData` 而非重建 |
| **固定主角仍被物理引擎拉走** | `physics: false` 或 `fixed: true` 主角坐标 |
| **多中心边交叉** | 分层半径；同势力聚类角度（可选） |
| **无 proximity 的新角色** | 默认 3；放最外圈 |
| **Electron 中 canvas 模糊** | `devicePixelRatio` 处理；容器设明确宽高 |

## 验收标准

- [ ] 80 节点拖拽流畅
- [ ] 改 proximity commit 后布局变化
- [ ] 指定主角后居中
- [ ] 群像模式两中心可见
- [ ] **M3 里程碑**

## 参考

- `md/04-character-system.md` §4
- `md/03-ui-layout-spec.md` §2.1
- `md/06` §10.3

**下一步 → [step-12-地图LLM代码生成.md](./step-12-地图LLM代码生成.md)**
