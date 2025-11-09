# 🚀 剩余任务和已知问题

## ⚠️ 已知问题（高优先级修复）

### 问题1：AI红包响应机制冲突 🔴
**当前状态**：
- 存在两套并行的红包处理机制
- 机制A：`handleAIMoneyResponse` - 旧的自动处理
- 机制B：system prompt + `[接收]`/`[退回]` 标记 - 新的智能处理

**问题表现**：
1. 用户发送红包
2. `handleAIMoneyResponse`被调用（2-5秒延迟）
3. AI API返回决策
4. `handleReceiveMoney`立即发送临时回复："不好意思，退回给你了"
5. 同时，正常的AI对话流程也在生成回复
6. 导致出现重复/混乱的回复

**根本原因**：
```typescript
// 第3353-3357行
// AI自动决定是否接收
setTimeout(() => {
  handleAIMoneyResponse(newMessage);  // 🔴 这个自动调用导致冲突
}, 2000 + Math.random() * 3000);
```

**解决方案**：
1. **方案A（推荐）**：完全禁用旧机制
   - 注释或删除`handleAIMoneyResponse`的自动调用
   - 只保留system prompt驱动的响应
   - AI通过`[接收]`/`[退回]`标记响应

2. **方案B**：合并两套机制
   - 保留`handleAIMoneyResponse`作为fallback
   - 仅在AI未使用标记时才调用
   - 增加复杂度，不推荐

**实施步骤**：
```typescript
// 删除或注释这段代码（第3353-3357行）
/*
setTimeout(() => {
  handleAIMoneyResponse(newMessage);
}, 2000 + Math.random() * 3000);
*/
```

---

### 问题2：AI无法识别红包金额和留言 🟡
**当前状态**：
- AI可以看到用户发送的红包气泡
- 但AI的system prompt中可能没有足够的信息来理解红包内容

**需要检查**：
1. System prompt是否包含红包识别指令 ✅（已包含）
2. 红包消息是否被正确传递给AI
3. AI是否能访问`message.moneyTransfer`的数据

**System Prompt检查**：
```typescript
// 第1133-1138行 - 已存在
【💰 接收红包转账规则】：
- 当收到用户红包时，根据你的性格和关系决定是否接收
- 如果关系亲密、金额合理，可以接收并表示感谢
- 如果关系疏远、金额过大，可以婉拒退回
- 接收示例："谢谢！[接收]"
- 退回示例："不用这么客气 [退回]"
```

**问题**：
- System prompt有指令，但红包的**具体金额和留言**可能没有传递给AI
- AI看到的可能只是"用户发了一个红包"，但不知道金额多少

**解决方案**：
在发送消息给AI时，需要将红包信息注入到context中：
```typescript
// 在构建API请求时添加
if (message.moneyTransfer) {
  const mtInfo = `[用户发送了${message.moneyTransfer.type === 'redPacket' ? '红包' : '转账'}]
金额：¥${message.moneyTransfer.amount}
${message.moneyTransfer.message ? `留言：${message.moneyTransfer.message}` : ''}`;
  
  // 将这个信息添加到消息内容中
  message.content += `\n${mtInfo}`;
}
```

---

## ⏳ 待实现功能

### 高优先级

#### 1. 钱包集成 💰
**功能清单**：
- [ ] 代付成功：从AI余额扣款
- [ ] 代付成功：用户余额增加
- [ ] 退回礼物：退款给用户
- [ ] 余额不足检查
- [ ] 交易记录完善

**实施位置**：
```typescript
// src/components/ChatScreen.tsx
handleAcceptOrder(message) {
  if (message.order.type === 'payRequest') {
    // TODO: 从AI余额扣款
    const aiBalance = getBalance(); // 需要AI钱包系统
    if (aiBalance < message.order.totalAmount) {
      alert('AI余额不足');
      return;
    }
    // 扣款逻辑
  }
}
```

**依赖**：
- AI钱包系统（每个AI角色有独立余额）
- 交易记录系统
- `src/utils/wallet.ts`扩展

---

#### 2. Toast提示 🔔
**功能清单**：
- [ ] 订单状态更新提示
- [ ] "AI已接受你的礼物 🎁"
- [ ] "AI已同意代付 💰"
- [ ] "订单已被拒绝 ❌"
- [ ] 钱包余额变化提示
- [ ] "余额 +¥100" / "余额 -¥50"

**实施方案**：
```typescript
// 创建 Toast 组件
const showToast = (message: string, type: 'success' | 'error' | 'info') => {
  // 显示3秒后自动消失
};

// 在订单状态更新时调用
processAIOrderResponse(aiMessage) {
  // ...
  showToast(`AI已${newStatus === 'accepted' ? '接受' : '拒绝'}你的礼物`, 
    newStatus === 'accepted' ? 'success' : 'error');
}
```

**UI设计**：
```
┌────────────────────────┐
│ ✅ AI已接受你的礼物    │
└────────────────────────┘
  （3秒后自动消失）
```

---

### 中优先级

#### 3. AI购物功能 🛒
**功能清单**：
- [ ] AI可以浏览商品（需要AI主动触发）
- [ ] AI可以购买商品
- [ ] AI主动送礼物给用户
- [ ] AI主动请用户代付

**挑战**：
- AI如何触发购物？（需要新的AI指令机制）
- AI如何选择商品？（随机 vs 基于对话上下文）

**可能的实现方式**：

**方式A：AI通过特殊指令触发**
```
AI回复："我想给你买个礼物 [购物:礼物]"
系统解析标记，打开购物界面让AI选择
```

**方式B：AI直接在回复中创建订单**
```
AI回复："我给你买了个耳机当礼物 [送礼物:无线蓝牙耳机:199]"
系统创建订单消息
```

**推荐：方式B** - 更简单，AI直接决定商品

**实施步骤**：
1. 扩展system prompt，添加AI购物指令
2. 在`createGenerationTask`中解析`[送礼物:商品:价格]`
3. 创建订单消息（role='assistant'）
4. 用户收到订单卡片并可以响应

---

#### 4. 订单历史 📋
**功能清单**：
- [ ] 查看所有订单列表
- [ ] 按状态筛选（待处理/已完成/已拒绝）
- [ ] 按时间排序
- [ ] 按金额排序
- [ ] 订单详情查看

**UI设计**：
```
┌──────────────────────────┐
│  📦 订单历史              │
├──────────────────────────┤
│                           │
│  🎁 礼物 - 环先生         │
│  肥牛饭 ¥28.80           │
│  状态：✅ 已接收          │
│  2024-11-10 03:00        │
│                           │
│  💰 代付请求 - 测试       │
│  蓝牙耳机 ¥199.00        │
│  状态：❌ 已拒绝          │
│  2024-11-10 02:45        │
│                           │
└──────────────────────────┘
```

**数据存储**：
- 订单数据已经在`message.order`中
- 需要从所有对话中提取订单消息
- 聚合和排序

---

### 低优先级

#### 5. 物流追踪 📦
- [ ] 礼物发货状态
- [ ] 预计送达时间
- [ ] 物流更新通知

#### 6. 订单评价 ⭐
- [ ] 订单完成后评价
- [ ] 商品质量反馈

#### 7. 优惠券系统 🎫
- [ ] 创建优惠券
- [ ] 使用优惠券
- [ ] 优惠券分享

---

## 📊 功能完成度

### 购物订单系统
```
✅ 类型定义（OrderMessage, OrderProduct）
✅ UI组件（礼物卡片、代付卡片）
✅ 用户购买流程
✅ AI响应按钮
✅ AI识别和响应
✅ 状态管理（pending/accepted/rejected/paid）
⏳ 钱包集成
⏳ Toast提示
⏳ AI购物功能
⏳ 订单历史
```

### 红包转账系统
```
✅ 类型定义（MoneyTransfer）
✅ UI组件（红包气泡）
✅ 用户发送流程
✅ System prompt指令
⚠️ AI响应机制（需要修复冲突）
⏳ 红包内容传递给AI
⏳ 钱包集成
```

---

## 🔧 修复优先级

1. **立即修复** 🔴
   - 禁用`handleAIMoneyResponse`自动调用
   - 避免重复回复

2. **短期修复** 🟡
   - 完善红包信息传递给AI
   - 添加基础Toast提示

3. **中期实现** 🟢
   - 钱包集成
   - 订单历史

4. **长期规划** 🔵
   - AI购物功能
   - 物流追踪
   - 优惠券系统

---

**当前最紧急：修复AI红包响应冲突！**
