# 🛍️ 购物功能增强实现指南

## ✅ 已完成的部分

### 1. 类型定义 (`src/types.ts`)
```typescript
// 订单消息类型
interface OrderMessage {
  type: 'gift' | 'payRequest';
  products: OrderProduct[];
  totalAmount: number;
  recipientId?: string;
  recipientName?: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'paid';
  orderNumber?: string;
  shippingAddress?: string;
}

// 订单商品
interface OrderProduct {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}
```

### 2. 核心组件

#### `ImageGenConfigModal.tsx` ✅
- 支持输入API地址和Key
- **调取模型列表**功能
- 选择模型后保存配置
- 类似设置页面的风格

#### `PurchaseOptionsModal.tsx` ✅
- 为自己购买
- 为AI购买（送礼）
- 请AI代付
- 显示AI角色列表

#### `ShoppingScreen.tsx` ✅
- 集成新的配置和购买组件
- **真实商品图片**（Unsplash）
- 支持三种购买方式

---

## ⏳ 待完成的部分

### 3. App.tsx 集成

需要修改ShoppingScreen的调用，添加新的props：

```typescript
// App.tsx 中
{currentScreen === 'shopping' && currentShopType && (
  <ShoppingScreen
    shopType={currentShopType}
    onBack={() => setCurrentScreen('wallet')}
    onPurchase={handleShoppingPurchase}
    conversations={conversations}  // ✅ 新增
    onSendGiftToAI={handleSendGiftToAI}  // ✅ 新增
    onRequestAIPay={handleRequestAIPay}  // ✅ 新增
  />
)}

// 添加处理函数
const handleSendGiftToAI = (product: any, recipientId: string, recipientName: string) => {
  // 创建礼物订单消息
  const giftMessage: Message = {
    id: `msg_${Date.now()}`,
    role: 'user',
    content: `给你的礼物`,
    timestamp: Date.now(),
    order: {
      type: 'gift',
      products: [{
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: product.image
      }],
      totalAmount: product.price,
      recipientId,
      recipientName,
      message: '给你买的小礼物～',
      status: 'pending',
      orderNumber: `ORDER${Date.now()}`
    }
  };
  
  // 添加到对话中
  const conversation = conversations.find(c => c.id === recipientId);
  if (conversation) {
    updateConversation(recipientId, {
      messages: [...conversation.messages, giftMessage],
      lastMessageTime: Date.now()
    });
  }
  
  // 切换到聊天页面
  setCurrentConversation(conversation);
  setCurrentScreen('chat');
};

const handleRequestAIPay = (product: any, aiId: string, aiName: string) => {
  // 创建代付请求消息
  const payRequestMessage: Message = {
    id: `msg_${Date.now()}`,
    role: 'user',
    content: `请你帮我代付`,
    timestamp: Date.now(),
    order: {
      type: 'payRequest',
      products: [{
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: product.image
      }],
      totalAmount: product.price,
      message: '帮我付一下～',
      status: 'pending',
      orderNumber: `PAY${Date.now()}`
    }
  };
  
  const conversation = conversations.find(c => c.id === aiId);
  if (conversation) {
    updateConversation(aiId, {
      messages: [...conversation.messages, payRequestMessage],
      lastMessageTime: Date.now()
    });
  }
  
  setCurrentConversation(conversation);
  setCurrentScreen('chat');
};
```

---

### 4. ChatScreen.tsx - 订单消息气泡

参考图片2-4的样式，添加订单消息渲染：

```tsx
{/* 订单消息气泡 */}
{message.order && (
  <div className={`rounded-2xl overflow-hidden max-w-[280px] ${
    message.order.type === 'gift' 
      ? 'bg-gradient-to-br from-blue-500 to-purple-500' 
      : 'bg-gradient-to-br from-green-500 to-emerald-500'
  }`}>
    {/* 顶部标题 */}
    <div className="text-white text-center py-3 px-4">
      <div className="font-semibold">
        {message.order.type === 'gift' ? '给你的礼物' : '购物车代付请求'}
      </div>
      <div className="text-xs opacity-90">
        {message.order.type === 'gift' 
          ? `${message.order.recipientName} 送给你` 
          : '对方已为你买单'
        }
      </div>
    </div>
    
    {/* 白色内容区 */}
    <div className="bg-white p-4 space-y-3">
      {/* 留言 */}
      {message.order.message && (
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-sm font-medium text-blue-900 mb-1">
            📝 下单留言
          </div>
          <div className="text-sm text-gray-700">
            {message.order.message}
          </div>
        </div>
      )}
      
      {/* 商品列表 */}
      <div className="space-y-2">
        <div className="text-sm font-semibold text-gray-800">商品明细</div>
        {message.order.products.map((product, idx) => (
          <div key={idx} className="flex items-center gap-2">
            {product.image && (
              <img 
                src={product.image} 
                alt={product.name}
                className="w-12 h-12 rounded object-cover"
              />
            )}
            <div className="flex-1 text-sm">
              <div className="text-gray-800">{product.name}</div>
              <div className="text-gray-500">×{product.quantity}</div>
            </div>
            <div className="text-red-600 font-semibold">
              ¥{product.price.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
      
      {/* 配送地址（礼物） */}
      {message.order.type === 'gift' && message.order.shippingAddress && (
        <div className="text-xs text-gray-500">
          <span className="font-medium">配送地址：</span>
          {message.order.shippingAddress}
        </div>
      )}
      
      {/* 订单号 */}
      {message.order.orderNumber && (
        <div className="text-xs text-gray-400">
          订单号：{message.order.orderNumber}
        </div>
      )}
      
      {/* 总价 */}
      <div className="pt-2 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">共 {message.order.products.length} 件商品，合计</span>
          <span className="text-xl font-bold text-red-600">
            ¥{message.order.totalAmount.toFixed(2)}
          </span>
        </div>
      </div>
      
      {/* 操作按钮 */}
      {message.role === 'user' && message.order.status === 'pending' && (
        <div className="flex gap-2">
          {message.order.type === 'gift' ? (
            <>
              <button className="flex-1 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium">
                收下礼物
              </button>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg">
                退回
              </button>
            </>
          ) : (
            <>
              <button className="flex-1 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-medium">
                帮TA付款
              </button>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg">
                拒绝
              </button>
            </>
          )}
        </div>
      )}
      
      {/* 状态显示 */}
      {message.order.status !== 'pending' && (
        <div className="text-center py-2 text-sm">
          {message.order.status === 'accepted' && '✅ 已接收'}
          {message.order.status === 'rejected' && '❌ 已拒绝'}
          {message.order.status === 'paid' && '💰 已支付'}
        </div>
      )}
    </div>
  </div>
)}
```

---

### 5. AI识别订单消息

在ChatScreen的system prompt中添加：

```typescript
【🛍️ 订单功能】：
你可能会收到用户送的礼物或代付请求：
- 礼物订单：用户给你买了礼物，根据关系和商品决定是否接受
- 代付请求：用户请你帮忙付款，根据关系和金额决定是否同意

收到订单后的回复格式：
- 接受礼物："谢谢！我很喜欢 [接受礼物]"
- 退回礼物："太贵重了，我不能收 [退回礼物]"  
- 同意代付："没问题，我帮你付 [同意代付]"
- 拒绝代付："抱歉，最近手头有点紧 [拒绝代付]"
```

在处理AI回复时添加订单响应解析：

```typescript
// 检测接受礼物：[接受礼物]
const acceptGiftMatch = content.match(/\[接受礼物\]/);
if (acceptGiftMatch) {
  // 更新订单状态为accepted
  // 从AI余额扣款（如果是代付）
}

// 检测拒绝：[退回礼物] 或 [拒绝代付]
const rejectMatch = content.match(/\[(退回礼物|拒绝代付)\]/);
if (rejectMatch) {
  // 更新订单状态为rejected
  // 退款给用户
}
```

---

## 🎯 实现优先级

1. **高优先级**（核心功能）：
   - ✅ 类型定义
   - ✅ 配置和购买弹窗组件
   - ✅ ShoppingScreen集成
   - ⏳ App.tsx集成（连接购物和聊天）
   - ⏳ ChatScreen订单气泡（UI展示）

2. **中优先级**（AI智能）：
   - ⏳ AI识别订单消息
   - ⏳ AI智能决策（接受/拒绝）
   - ⏳ 订单状态更新

3. **低优先级**（优化）：
   - 订单历史记录
   - 物流追踪
   - 更多商品类型

---

## 📝 测试步骤

### 测试1：AI生图配置
1. 打开商店 → 点击设置
2. 输入API地址和Key
3. 点击"调取可用模型"
4. 选择模型并保存
5. 搜索商品，验证AI生成图片

### 测试2：为自己购买
1. 选择商品 → 点击购物车
2. 选择"为自己购买"
3. 确认扣款
4. 查看钱包交易记录

### 测试3：送礼给AI
1. 选择商品 → 点击购物车
2. 选择"送给XX"
3. 确认购买
4. 切换到聊天页面，查看礼物卡片
5. AI应该回复并决定是否接受

### 测试4：请AI代付
1. 选择商品 → 点击购物车
2. 选择"请XX代付"
3. 切换到聊天页面，查看代付请求
4. AI应该回复并决定是否同意

---

## 🐛 已知问题

1. ShoppingScreen的conversations prop需要从App.tsx传入
2. 订单消息气泡样式需要参考图片实现
3. AI识别订单的prompt需要添加
4. 订单状态更新逻辑需要实现

---

## 💡 建议

由于这是一个复杂的功能，建议分阶段实现：

**第一阶段**（已完成）：
- ✅ 核心组件和类型
- ✅ 商品图片和UI

**第二阶段**（进行中）：
- ⏳ App.tsx连接
- ⏳ 订单气泡UI

**第三阶段**（待完成）：
- ⏳ AI智能响应
- ⏳ 状态管理

**第四阶段**（优化）：
- 错误处理
- 用户体验优化
- 更多功能扩展

---

**核心功能框架已搭建完成，现在需要在App.tsx和ChatScreen中集成这些组件！** 🚀
