# Vue TypeScript Template

这是一个基于 Vue 3 + TypeScript + Vite 的现代化前端项目模板，集成了最新的开发工具和最佳实践。

## ✨ 特性

- 🚀 基于 [Vue 3](https://vuejs.org/) 和 [TypeScript](https://www.typescriptlang.org/)
- ⚡️ 使用 [Vite](https://vitejs.dev/) 作为构建工具，提供极速的开发体验
- 🎨 集成 [UnoCSS](https://unocss.dev/) 原子化 CSS 框架
- 📦 使用 [pnpm](https://pnpm.io/) 作为包管理器
- 🔍 内置 [ESLint](https://eslint.org/) 代码检查
- 🛠 自动导入组件和 API（基于 unplugin-auto-import）
- 📱 响应式设计支持
- 🔥 热更新支持

## 🚀 快速开始

### 环境要求

- Node.js >= 16
- pnpm >= 9.5.0

### 安装

```bash
# 克隆项目
git clone [your-repo-url]

# 进入项目目录
cd [your-project-name]

# 安装依赖
pnpm install
```

### 开发

```bash
# 启动开发服务器
pnpm dev
```

### 构建

```bash
# 构建生产版本
pnpm build

# 预览生产构建
pnpm preview
```

### 代码检查

```bash
# 运行 ESLint 检查
pnpm lint

# 自动修复 ESLint 错误
pnpm lint:fix
```

## 📁 项目结构

```
├── public/          # 静态资源
├── src/            # 源代码
├── .vscode/        # VSCode 配置
├── index.html      # HTML 模板
├── vite.config.ts  # Vite 配置
├── uno.config.ts   # UnoCSS 配置
├── tsconfig.json   # TypeScript 配置
└── package.json    # 项目依赖
```

## 🛠 技术栈

- Vue 3
- TypeScript
- Vite
- UnoCSS
- ESLint
- VueUse

## 📝 许可证

[MIT](./LICENSE)
