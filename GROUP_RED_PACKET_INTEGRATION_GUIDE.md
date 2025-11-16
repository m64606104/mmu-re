# 群红包功能集成指南

## 已完成的功能

✅ 群红包类型定义 (`src/types.ts`)
✅ 群红包工具函数 (`src/utils/groupRedPacket.ts`)
✅ 群红包发送弹窗 (`src/components/GroupRedPacketModal.tsx`)
✅ 群红包卡片组件 (`src/components/GroupRedPacketCard.tsx`)

## 集成步骤

### 1. 在ChatScreen中添加群红包按钮

在群聊的输入框工具栏中，添加发群红包按钮：

```tsx
// 约在第5637行，红包按钮旁边添加
{conversation.type === 'group' && (
  <button 
    className="flex-shrink-0"
    onClick={() => setShowGroupRedPacketModal(true)}
  >
    <div className="w-9 h-9 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors">
      <Gift className="w-4 h-4 text-red-500" />
    </div>
  </button>
)}
```

### 2. 添加群红包发送处理函数

在约第5951行handleSendMoney附近添加：

```tsx
const handleSendGroupRedPacket = (redPacket: GroupRedPacketInfo, message: string) => {
  const newMessage: Message = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    role: 'user',
    content: '', // 群红包不显示文字，只显示卡片
    timestamp: Date.now(),
    moneyTransfer: {
      type: 'groupRedPacket',
      amount: redPacket.totalAmount,
      message: message,
      status: 'pending',
      groupRedPacket: redPacket,
    }
  };

  onUpdateConversation(conversation.id, {
    messages: [...conversation.messages, newMessage],
    lastMessageTime: Date.now()
  });

  // 扣除用户余额
  const balance = getBalance();
  if (balance >= redPacket.totalAmount) {
    sendMoney(redPacket.totalAmount, 'groupRedPacket', conversation.id, message);
  }

  setShowGroupRedPacketModal(false);
};
```

### 3. 在红包弹窗渲染区域添加

在约第5947行MoneyTransferModal附近添加：

```tsx
{/* 群红包弹窗 */}
{conversation.type === 'group' && showGroupRedPacketModal && (
  <GroupRedPacketModal
    isOpen={showGroupRedPacketModal}
    onClose={() => setShowGroupRedPacketModal(false)}
    onSend={handleSendGroupRedPacket}
    groupMembers={conversation.members?.map(mid => {
      const member = conversations.find(c => c.id === mid);
      return {
        id: mid,
        name: member?.characterSettings?.nickname || member?.name || '未知'
      };
    }) || []}
    currentUserId="user" // 用户ID
    currentUserName={userProfile?.name || '你'}
  />
)}
```

### 4. 在消息渲染中添加群红包卡片

在消息渲染逻辑中（约第5200行的消息列表渲染处）添加：

```tsx
{/* 群红包卡片 */}
{msg.moneyTransfer?.type === 'groupRedPacket' && msg.moneyTransfer.groupRedPacket && (
  <GroupRedPacketCard
    redPacket={msg.moneyTransfer.groupRedPacket}
    currentUserId="user"
    currentUserName={userProfile?.name || '你'}
    onClaim={(amount) => {
      // 领取成功，更新用户余额
      receiveMoney(amount, 'groupRedPacket', conversation.id, '群红包');
    }}
    onUpdate={(updatedRedPacket) => {
      // 更新红包状态
      const updatedMessages = conversation.messages.map(m => {
        if (m.id === msg.id && m.moneyTransfer?.groupRedPacket) {
          return {
            ...m,
            moneyTransfer: {
              ...m.moneyTransfer,
              groupRedPacket: updatedRedPacket
            }
          };
        }
        return m;
      });
      
      onUpdateConversation(conversation.id, {
        messages: updatedMessages
      });
    }}
  />
)}
```

### 5. 修复wallet.ts的类型错误

在 `src/utils/wallet.ts` 中更新类型定义：

```typescript
export const sendMoney = (
  amount: number,
  type: 'redPacket' | 'transfer' | 'groupRedPacket',
  conversationId: string,
  message?: string
) => {
  // ... 现有代码
};

export const receiveMoney = (
  amount: number,
  type: 'redPacket' | 'transfer' | 'groupRedPacket',
  conversationId: string,
  message?: string
) => {
  // ... 现有代码
};
```

### 6. AI自动领取群红包（可选）

在AI生成回复时检测群红包并自动领取：

```tsx
// 在handleGenerate或群聊生成逻辑中添加
const checkAndClaimGroupRedPacket = () => {
  const recentMessages = conversation.messages.slice(-5);
  const unclaimedRedPacket = recentMessages.find(msg => 
    msg.moneyTransfer?.type === 'groupRedPacket' &&
    msg.moneyTransfer.groupRedPacket &&
    msg.moneyTransfer.groupRedPacket.status === 'active' &&
    !msg.moneyTransfer.groupRedPacket.claimedBy.find(c => c.userId === conversation.id)
  );

  if (unclaimedRedPacket?.moneyTransfer?.groupRedPacket) {
    const result = claimRedPacket(
      unclaimedRedPacket.moneyTransfer.groupRedPacket,
      conversation.id,
      conversation.characterSettings?.nickname || conversation.name
    );
    
    if (result.success) {
      // 更新红包状态
      // ... 更新逻辑
    }
  }
};
```

### 7. 口令红包自动发送口令

在口令红包领取时，自动发送口令消息到聊天：

```tsx
// 在GroupRedPacketCard的handleClaim中
if (redPacket.password && passwordInput) {
  // 发送口令消息
  const passwordMessage: Message = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    role: 'user',
    content: passwordInput,
    timestamp: Date.now()
  };
  
  // 添加到对话
  onUpdateConversation?.(conversation.id, {
    messages: [...conversation.messages, passwordMessage],
    lastMessageTime: Date.now()
  });
}
```

## 测试清单

- [ ] 在群聊中点击发红包按钮
- [ ] 创建普通红包（平均分配）
- [ ] 创建拼手气红包（随机金额）
- [ ] 创建专属红包（指定接收者）
- [ ] 创建口令红包（输入口令）
- [ ] 领取红包成功
- [ ] 领取自己的红包（应提示已领取）
- [ ] 领取过期红包（应提示已过期）
- [ ] 领取已抢完的红包（应提示已抢完）
- [ ] 查看红包详情（领取记录）
- [ ] 手气最佳标记显示正确
- [ ] 余额扣除和增加正确

## 已知问题

1. `wallet.ts` 中的类型需要更新以支持 `groupRedPacket`
2. AI自动领取逻辑需要实现
3. 口令自动发送功能需要完善

## 下一步

1. 更新 `wallet.ts` 的类型定义
2. 在ChatScreen中集成上述代码
3. 测试所有红包类型
4. 实现AI自动领取逻辑
5. 优化UI和动画效果
