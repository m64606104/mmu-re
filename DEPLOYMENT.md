# 部署说明

## 准备工作

确保你已经：
- ✅ 修改了AI角色信息（备注名：aa，网名：aa不是研究生）
- ✅ 项目可以正常运行 `npm run dev`
- ✅ 项目可以正常构建 `npm run build`

## 部署到 GitHub

### 1. 初始化 Git 仓库（如果还没有）

```bash
cd /Users/kodidhsn/CascadeProjects/mobile-ai-chat
git init
git add .
git commit -m "Initial commit - momoyu小手机 v1.0"
```

### 2. 连接到 GitHub 远程仓库

如果你已有 GitHub 仓库：

```bash
# 替换 YOUR_USERNAME 和 YOUR_REPO 为你的实际信息
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

如果没有仓库，先在 GitHub 创建一个新仓库，然后执行上面的命令。

### 3. 更新现有仓库

如果你之前已经部署过，需要更新：

```bash
git add .
git commit -m "Update: 修正AI角色信息和添加完整功能说明"
git push
```

## 部署到 Vercel

### 方式一：通过 Vercel 网页界面（推荐）

1. 访问 [vercel.com](https://vercel.com)
2. 登录你的账号
3. 如果是更新现有项目：
   - 找到你的项目
   - Vercel 会自动检测到 GitHub 的新提交
   - 等待自动部署完成

4. 如果是新项目：
   - 点击 "New Project"
   - 从 GitHub 导入你的仓库
   - Vercel 会自动检测 Vite 项目
   - 配置如下：
     - **Framework Preset**: Vite
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
   - 点击 "Deploy"

### 方式二：使用 Vercel CLI

```bash
# 安装 Vercel CLI（如果还没安装）
npm i -g vercel

# 登录
vercel login

# 部署
vercel

# 或者直接部署到生产环境
vercel --prod
```

## 重要配置

### Vercel 环境变量（可选）

如果你需要设置环境变量：

1. 在 Vercel 项目设置中找到 "Environment Variables"
2. 添加需要的变量
3. 重新部署

### 自定义域名（可选）

1. 在 Vercel 项目设置中找到 "Domains"
2. 添加你的自定义域名
3. 按照指引配置 DNS

## 验证部署

部署完成后，访问 Vercel 提供的 URL，检查：

- ✅ 主屏幕显示正常
- ✅ AI角色信息显示为：备注名 "aa"，网名 "aa不是研究生"
- ✅ 聊天功能正常
- ✅ 朋友圈功能正常
- ✅ 桌面编辑功能正常
- ✅ 主题切换正常

## 常见问题

### Q: 部署后页面空白？
A: 检查 Vercel 的构建日志，确保 `npm run build` 成功。

### Q: 404 错误？
A: 确保 Output Directory 设置为 `dist`。

### Q: 数据不保存？
A: 这是正常的，数据保存在浏览器本地存储，不会上传到服务器。

### Q: API 配置丢失？
A: API 配置保存在浏览器本地，每个设备需要单独配置。

## 快速命令

```bash
# 开发
npm run dev

# 构建
npm run build

# 预览构建结果
npm run preview

# 提交代码
git add .
git commit -m "更新说明"
git push

# Vercel 部署（如果使用 CLI）
vercel --prod
```

## 更新部署

当你修改代码后：

1. 测试本地是否正常：`npm run dev`
2. 提交到 GitHub：
   ```bash
   git add .
   git commit -m "描述你的更改"
   git push
   ```
3. Vercel 会自动检测并重新部署

---

部署完成！🎉

项目地址示例：
- GitHub: `https://github.com/YOUR_USERNAME/YOUR_REPO`
- Vercel: `https://YOUR_PROJECT.vercel.app`
