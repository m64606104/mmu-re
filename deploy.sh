#!/bin/bash

# 简单的手动部署脚本
# 使用方法：./deploy.sh "你的更新说明"

echo "🚀 开始部署到 Vercel..."

# 检查是否提供了提交信息
if [ -z "$1" ]; then
  COMMIT_MSG="更新代码"
else
  COMMIT_MSG="$1"
fi

# 添加所有更改
git add .

# 提交
git commit -m "$COMMIT_MSG"

# 推送到 GitHub
git push

echo "✅ 代码已推送到 GitHub"
echo ""
echo "📱 现在去 Vercel 手动部署："
echo "1. 访问: https://vercel.com/kkin123/momoyu--world"
echo "2. 点击右上角 '...' → 'Redeploy'"
echo "3. 选择 'Redeploy without cache'"
echo "4. 等待 1-2 分钟完成"
echo ""
echo "🌐 网站地址: https://momoyu-world.vercel.app"
