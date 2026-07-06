# Prune

开发者磁盘清理工具。一键扫描 macOS 系统中构建产物、缓存、包管理器下载等开发者垃圾文件，安全移至废纸篓。

支持 Node.js、Python、Java/Android、Xcode、Rust、Go、Flutter、Docker、Homebrew 等 12 大类、80+ 种缓存路径。

## 功能

- **一键全盘扫描** — 从 `~/` 根目录出发，通过标记文件（`package.json`、`Cargo.toml` 等）和已知缓存目录名快速定位，避免递归遍历 `node_modules`、`.git` 等
- **风险分级** — 每项标记为 安全 / 需手动重建 / 谨慎删除，支持一键选中全部安全项
- **移至废纸篓** — 使用 macOS 原生 `shell.trashItem()`，可恢复
- **扫描历史** — SQLite 持久化扫描记录，崩溃恢复自动标记失败扫描
- **Menu Bar 托盘** — 驻留菜单栏，右键菜单支持快捷扫描、打开窗口、退出
- **开机自启** — 可配置，启动后隐藏至托盘
- **项目自动发现** — 自动识别项目根目录，同类缓存按项目聚合展示
- **恢复指引** — 每项标明如何重建（如"运行 `npm install`"）

## 支持的清理类别

| 类别 | 清理内容 |
|------|---------|
| **Node.js** | npm cache、npx cache、Yarn/Pnpm store、Next.js `.next`、Nuxt `.nuxt`、node-gyp cache、Puppeteer/Playwright/Cypress 浏览器下载、Vite/Angular 缓存、`node_modules/` |
| **Python** | uv cache、Conda pkgs、HuggingFace Hub models、PyTorch cache、pyenv versions、`__pycache__`、pip download cache、`.venv/`、`.pytest_cache`、`.mypy_cache`、`.ruff_cache`、`.tox` |
| **Java / Android** | Gradle cache + Wrapper dists、Maven `~/.m2`、Android Studio caches、Android SDK system images、`build/` |
| **Xcode** | DerivedData、DeviceSupport、CoreSimulator devices、Archives、SPM cache、CocoaPods repos、IB support cache |
| **Homebrew** | Bottle cache、API cache、Bootsnap cache、build logs |
| **Rust** | rustup toolchains、Cargo registry cache、`target/` |
| **Go** | Go build cache、module cache |
| **Flutter** | SDK cache、pub cache、FVM versions、`build/`、`.dart_tool/`、Pods |
| **Misc** | Ruby gems、Dart/Deno/Bun cache、Elixir Mix/Hex、Ollama models、Terraform plugins、`dist/`、`coverage/`、`.turbo` |
| **Docker** | Buildx cache、Scout SBOM cache、Colima VM disk、Docker Desktop logs |
| **IDE** | Cursor cache、JetBrains caches/logs、VS Code workspace storage + cache |
| **System** | Homebrew 旧版 formula、shell 历史文件、zcompdump、`~/Library/Caches` |

## 安装

从 [Releases](../../releases) 下载最新的 `Prune-x.x.x-arm64.dmg`，双击挂载后拖入 Applications。

> 仅支持 macOS (Apple Silicon)，macOS 12+

## 开发

```bash
# 安装依赖
npm install

# 开发模式（带热更新）
npm run dev

# 运行测试
npm test

# 构建 + 打包 DMG
npm run pack:mac
```

输出:
- `dist/mac-arm64/Prune.app` — 签名后的 .app
- `dist/Prune-0.1.0-arm64.dmg` — DMG 安装包

## 技术栈

| 层 | 技术 |
|---|------|
| 框架 | Electron 31 |
| UI | React 18 + TypeScript |
| 构建 | electron-vite 2 |
| 样式 | Tailwind CSS 3 |
| 数据库 | better-sqlite3（WAL 模式） |
| 测试 | Vitest |
| 打包 | electron-builder（macOS only） |
| IPC | contextBridge + ipcRenderer.invoke |

## 架构

```
src/
├── main/              # Electron 主进程
│   ├── index.ts       # 入口、窗口管理
│   ├── tray.ts        # Menu Bar 托盘
│   ├── ipc-handlers.ts # IPC 通道注册
│   ├── backup-manager.ts # 扫描执行 & 清理
│   ├── database.ts    # SQLite 操作
│   └── settings.ts    # 设置读写
├── preload/           # contextBridge API
├── renderer/          # React UI
│   ├── pages/         # ScannerPage、SettingsPage
│   ├── components/    # Sidebar、ScanProgress 等
│   ├── hooks/         # useScanner、useCleaner、useSettings
│   └── layouts/       # MainLayout
├── scanner/           # 扫描器（22 个）
│   ├── base.ts        # BaseScanner 基类
│   ├── scan-context.ts # 扫描上下文（项目发现 + 路径发现）
│   ├── node/          # Node.js
│   ├── python/        # Python
│   ├── java/          # Java/Android
│   ├── xcode/         # Xcode
│   ├── brew/          # Homebrew
│   ├── misc/          # Rust、Go、Flutter、通用
│   ├── docker/        # Docker
│   ├── ide/           # IDE
│   └── system/        # 系统
└── shared/            # 共享类型、常量、格式化
```

每个扫描器继承 `BaseScanner`，实现 `scan(): Promise<CacheItem[]>`。扫描前 `initScanContext()` 并行执行项目发现（遍历标记文件）和缓存目录发现，结果缓存在 session 全局变量中。

## License

MIT
