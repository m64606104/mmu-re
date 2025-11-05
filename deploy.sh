#!/bin/bash

# momoyu小手机 - 快速部署脚本

echo "🚀 开始部署 momoyu小手机..."

# 检查是否有未提交的更改
if [[ -n $(git status -s) ]]; then
  echo "📝 发现未提交的更改"
  
  # 显示更改
  git status -s
  
  # 询问提交信息
  echo ""
  read -p "📌 请输入提交信息: " commit_message
  
  if [ -z "$commit_message" ]; then
    commit_message="Update $(date '+%Y-%m-%d %H:%M:%S')"
  fi
  
  # 提交更改
  echo "💾 正在提交更改..."
  git add .
  git commit -m "$commit_message"
  
  # 推送到 GitHub
  echo "📤 正在推送到 GitHub..."
  git push
  
  if [ $? -eq 0 ]; then
    echo "✅ 成功推送到 GitHub！"
    echo "🔄 Vercel 将自动检测并开始部署..."
    echo ""
    echo "📱 请访问 Vercel 控制台查看部署状态"
  else
    echo "❌ 推送失败，请检查错误信息"
    exit 1
  fi
else
  echo "ℹ️  没有需要提交的更改"
  echo "📤 正在推送到 GitHub..."
  git push
fi

echo ""
echo "🎉 部署流程完成！"
echo ""
echo "📋 后续步骤："
echo "  1. 访问 https://vercel.com 查看部署状态"
echo "  2. 等待部署完成（通常需要 1-2 分钟）"
echo "  3. 访问你的项目 URL 验证更新"
