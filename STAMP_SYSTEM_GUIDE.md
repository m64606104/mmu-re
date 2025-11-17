# 🎫 邮票收集系统和通知中心使用指南

## ✨ 功能概览

本次更新为慢邮件系统添加了**精美邮票收集册**和**消息通知中心**，完全参考慢邮件App的设计风格。

---

## 🎫 邮票收集系统

### 如何进入？
1. 进入信箱界面
2. 点击顶部"邮票收集"按钮（暂需在LetterBoxScreen中添加入口）
3. 或通过路由：`navigateTo('stamp-collection')`

### 邮票分类

| 系列 | 邮票数量 | 解锁条件 | 完成奖励 |
|------|---------|---------|---------|
| 📮 默认邮票 | 2个 | 初始解锁 | - |
| 💗 甜蜜系列 | 2个 | 发送/收信 | 甜蜜使者称号 |
| 🌄 风物集 | 4个 | 发送信件15-30封 | 解锁极光邮票 |
| 🏙️ 城市印象 | 2个 | 发送信件40-45封 | 旅行家称号 |
| 🐱 可爱胖橘 | 2个 | 收到回信10-15次 | 解锁熊猫邮票 |
| 🎊 节日庆典 | 2个 | 发送50封信/特殊日期 | 庆典之星称号 |
| 🎨 艺术殿堂 | 2个 | 发送35封/收到20次回信 | 解锁画笔邮票 |
| ✨ 神秘珍藏 | 2个 | 漂流瓶10个/收藏30封信 | 收藏家称号 |

### 稀有度说明

- 🟢 **普通** (Common) - 基础邮票
- 🔵 **稀有** (Rare) - 需要一定条件解锁
- 🟣 **史诗** (Epic) - 需要更高条件
- 🟡 **传说** (Legendary) - 极难获得

### 解锁机制

邮票会根据以下行为自动解锁：
- 📤 发送信件数量
- 📬 收到回信次数
- 🌊 漂流瓶发送数
- ⭐ 信件收藏数量

调用 `checkAndUnlockStamps()` 可触发检查。

### 使用邮票

1. 在邮票收集册中点击已解锁的邮票
2. 查看邮票详情
3. 点击"使用此邮票"按钮
4. 邮票将作为当前默认邮票显示在信件上

---

## 📬 消息通知中心

### 如何进入？
1. 进入信箱界面
2. 点击"消息通知"按钮（暂需添加入口）
3. 或通过路由：`navigateTo('letter-notifications')`

### 通知类型

| 图标 | 类型 | 说明 | 触发时机 |
|------|------|------|---------|
| 💌 | 收到回信 | 笔友给你回信了 | AI回复信件时 |
| ✉️ | 信件已送达 | 你的信件成功送达 | 信件发送成功后 |
| ❌ | 信件未送达 | 送达失败提示 | 发送失败时 |
| 🎉 | 新笔友来信 | 收到第一封友信 | 新笔友首次来信 |
| 📬 | 远方来信 | 老朋友的信 | 笔友发信 |
| 🎫 | 解锁新邮票 | 获得新邮票 | 邮票解锁时 |
| 🌊 | 漂流瓶抵达 | 漂流瓶被捡到 | 漂流瓶匹配成功 |

### 通知功能

- ✅ **标记已读** - 点击通知自动标记为已读
- 📑 **筛选功能** - 查看全部/仅未读
- 🔔 **一键已读** - 标记所有通知为已读
- 🗑️ **删除通知** - 单个删除或清空全部
- ⏰ **智能时间** - "刚刚"、"5分钟前"、"昨天"等
- 🔗 **跳转功能** - 点击通知跳转到对应信件

---

## 🔧 开发者集成指南

### 集成邮票系统到信件

```typescript
import { getCurrentStamp } from '../utils/stampSystem';
import { checkAndUnlockStamps } from '../utils/stampSystem';

// 1. 获取当前邮票用于显示
const currentStamp = getCurrentStamp();
// 使用: currentStamp.image (emoji图标)
//      currentStamp.name

// 2. 发送信件后检查解锁
const sentCount = getAllLetters().length;
const repliedCount = getAllLetters().filter(l => l.status === 'replied').length;

const unlockedStamps = checkAndUnlockStamps({
  sentLetters: sentCount,
  receivedReplies: repliedCount
});

// 3. 显示解锁通知
unlockedStamps.forEach(stampId => {
  const stamp = getStampCollection().stamps[stampId];
  createStampUnlockedNotification(stampId, stamp.name);
});
```

### 集成通知系统

```typescript
import {
  createReplyReceivedNotification,
  createLetterDeliveredNotification,
  createNewPenfriendNotification,
  createStampUnlockedNotification
} from '../utils/letterNotificationSystem';

// 收到回信时
createReplyReceivedNotification(
  letter.id,
  letter.receiverName,
  letter.receiverAvatar
);

// 信件送达时
createLetterDeliveredNotification(
  letter.id,
  letter.receiverName
);

// 新笔友来信
createNewPenfriendNotification(
  letter.id,
  letter.senderName,
  letter.senderAvatar
);
```

### 添加入口按钮

在 `LetterBoxScreen.tsx` 中添加：

```tsx
// 在快捷功能区添加按钮
<button
  onClick={() => navigateTo('stamp-collection')}
  className="px-4 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl"
>
  <span>🎫</span> 邮票收集
</button>

<button
  onClick={() => navigateTo('letter-notifications')}
  className="px-4 py-3 bg-gradient-to-r from-blue-400 to-indigo-500 text-white rounded-xl"
>
  <span>🔔</span> 消息通知
  {unreadCount > 0 && (
    <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">
      {unreadCount}
    </span>
  )}
</button>
```

### 显示未读角标

```typescript
import { getUnreadCount } from '../utils/letterNotificationSystem';

const unreadCount = getUnreadCount();
// 显示在按钮或图标上
```

---

## 🎨 UI设计特点

### 邮票收集册
- 📦 金黄色渐变背景
- 🎴 信封式卡片设计
- 🌊 波浪形邮票边框
- ⭐ 当前使用标记
- 🔒 未解锁灰度显示
- 💫 hover动画效果

### 通知中心
- 💙 蓝色渐变主题
- 💬 消息气泡样式
- 🔴 未读红点标记
- 🎯 点击交互反馈
- ⏰ 相对时间显示
- 🧹 批量操作按钮

---

## 📊 数据存储

### localStorage Keys

```typescript
'stamp_collection'        // 邮票收集数据
'letter_notifications'    // 通知历史记录
```

### 数据结构

```typescript
// 邮票收集
{
  stamps: Record<string, Stamp>,
  series: Record<string, StampSeries>,
  totalUnlocked: number,
  totalStamps: number,
  favoriteStampId: string
}

// 通知记录
LetterNotification[] // 最多保留50条
```

---

## 🚀 未来扩展

### 邮票系统
- [ ] 添加更多主题邮票
- [ ] 邮票交易功能
- [ ] 限时特殊邮票
- [ ] 邮票动画效果
- [ ] 邮票组合奖励

### 通知系统
- [ ] 推送通知设置
- [ ] 通知声音/震动
- [ ] 通知分组功能
- [ ] 智能通知推荐
- [ ] 通知统计分析

---

## 💡 使用建议

1. **定期查看邮票进度** - 了解解锁条件
2. **收集完整系列** - 获得特殊奖励
3. **及时查看通知** - 不错过重要信息
4. **清理过期通知** - 保持界面整洁
5. **使用精美邮票** - 让信件更有个性

---

## 🐛 已知问题

1. 邮票收集册和通知中心入口需要在LetterBoxScreen中手动添加
2. 邮票解锁检查需要在适当时机手动调用
3. 通知创建需要集成到letterService的各个函数中

---

## 📝 更新日志

### v1.0.0 (2025-11-17)
- ✨ 新增精美邮票收集系统
- ✨ 新增消息通知中心
- 🎨 参考慢邮件App设计
- 📦 18个精美邮票
- 🔔 7种通知类型
- 💾 完整的数据持久化

---

## 📧 反馈与建议

如有问题或建议，欢迎反馈！

**享受精美的慢邮件体验吧！** 📮✨
