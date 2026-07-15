<div align="center">

<img src="public/icon.png" style="height: 256px; width: 256px" alt="icon">

# AnvilCraft Stack Calculator

</div>

《铁砧工艺》方块最密堆积计算器。它为以下结构计算满足五同类邻面衰变规则的布局，并尽量减少昂贵的隔离材料：

- 虚空物质块、负物质块与虚空能收集器。
- 钚块、铅块与集热器。

支持不堆积、平面堆积和立体堆积，提供真实方块模型的 Three.js 预览、X/Y/Z 分层视图、材料统计和坐标复制。

## 当前规则

- 基础单元为 `5 x 5 x 5`，中心坐标放置设备。
- 邻接只计算六个正交方向；主材料有五个或更多同类邻面时会衰变。
- 三种模式都只计算并展示一个 `5 x 5 x 5` 单元，不需要输入堆积数量。
- 不堆积模式按独立边界求解；平面模式生成可沿 X/Z 复制的周期单元；立体模式生成可沿 X/Y/Z 复制的周期单元。
- 已证明最优的每单元结果依次为：不堆积 `110/14/1`、平面 `93/31/1`、立体 `90/34/1`（主材料/隔离材料/设备）。
- 当前固定模式使用随规则发布的已证明黄金单元，并在 Worker 中独立复核；规则缺少黄金布局时回退到 HiGHS 0-1 MILP。只有证明最优时才显示“已证明最优”。

游戏规则版本元信息目前记录为 Minecraft 1.21.1 / AnvilCraft 1.6 开发分支。虚空物质块和钚块当前均使用五同类邻面衰变规则；发布到其他版本前仍需复核。

## 开发

需要 Node.js 和 pnpm。

```bash
pnpm install
pnpm dev
```

默认开发地址为 `http://localhost:5173/`。

## 部署

线上地址：[https://anvil-dev.github.io/anvilcraft-stack-calculator/](https://anvil-dev.github.io/anvilcraft-stack-calculator/)

推送到 `main` 分支会触发 GitHub Actions，在测试通过后构建并部署到 GitHub Pages。首次部署前，需要在仓库的 **Settings > Pages > Build and deployment** 中将 Source 设置为 **GitHub Actions**；也可以在 Actions 页面手动运行部署工作流。

## 验证

```bash
pnpm test:run
pnpm build
pnpm test:e2e
```

浏览器端到端检查使用 Playwright：

```bash
pnpm exec playwright install chromium
```

## 许可证

项目代码采用 LGPL-3.0-only。AnvilCraft 模型和纹理的许可信息见 [ASSETS_LICENSE](./ASSETS_LICENSE)。
