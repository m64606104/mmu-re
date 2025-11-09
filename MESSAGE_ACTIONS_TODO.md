# 消息操作功能实现进度

## ✅ 已完成
1. 创建MessageActionMenu组件（iMessage风格胶囊菜单）
2. 添加消息操作相关状态
   - `selectedMessageId` - 当前选中的消息
   - `menuPosition` - 菜单显示位置
   - `quotedMessage` - 被引用的消息
   - `messageBeingEdited` - 正在编辑的消息
3. 实现核心功能函数
   - `handleMessageClick` - 点击消息显示菜单
   - `handleCloseMenu` - 关闭菜单
   - `handleDeleteMessage` - 删除消息
   - `handleEditMessage` - 编辑消息
   - `handleQuoteMessage` - 引用消息
   - `handleCancelQuote` - 取消引用
   - `handleCancelEdit` - 取消编辑

## 🔧 待修复
1. **删除重复函数** - 存在旧的`handleEditMessage`定义，需要删除
2. **修复toggleMessageSelection** - setSelectedMessages未定义
3. **修复handleStartDelete** - 未定义的函数

## 📝 待实现
1. **渲染MessageActionMenu组件**
   - 在ChatScreen的return中添加
   - 传入所有必要的props

2. **引用消息UI**
   - 在输入框上方显示被引用的消息
   - 显示取消按钮

3. **编辑消息UI**
   - 在输入框上方显示"编辑中"提示
   - 显示原始消息内容
   - 显示取消按钮

4. **修改发送逻辑**
   - 检测是否在编辑模式
   - 编辑模式：更新现有消息而不是添加新消息
   - 引用模式：在消息内容中包含引用信息

5. **消息显示**
   - 显示引用内容（如果有）
   - 显示已编辑标记（如果消息被编辑过）

## 🎯 实现步骤

### 步骤1: 清理冲突代码
- [x] 查找并删除旧的handleEditMessage
- [ ] 删除或修复toggleMessageSelection相关代码
- [ ] 删除或修复handleStartDelete相关代码

### 步骤2: 渲染菜单组件
```tsx
<MessageActionMenu
  isVisible={selectedMessageId !== null}
  position={menuPosition}
  isUserMessage={/* 判断是否为用户消息 */}
  onQuote={handleQuoteMessage}
  onEdit={handleEditMessage}
  onDelete={handleDeleteMessage}
  onClose={handleCloseMenu}
/>
```

### 步骤3: 添加引用/编辑UI
在输入框上方添加提示条：
```tsx
{quotedMessage && (
  <div className="quoted-message-bar">
    <div>引用: {quotedMessage.content}</div>
    <button onClick={handleCancelQuote}>×</button>
  </div>
)}

{messageBeingEdited && (
  <div className="editing-message-bar">
    <div>编辑中: {messageBeingEdited.content}</div>
    <button onClick={handleCancelEdit}>×</button>
  </div>
)}
```

### 步骤4: 修改发送逻辑
在`handleSend`函数中：
```typescript
if (messageBeingEdited) {
  // 编辑模式：更新消息
  const updatedMessages = conversation.messages.map(m =>
    m.id === messageBeingEdited.id ? { ...m, content: input, edited: true } : m
  );
  onUpdateConversation(conversation.id, { messages: updatedMessages });
  setMessageBeingEdited(null);
  return;
}

// 添加引用信息
let messageContent = input;
if (quotedMessage) {
  messageContent = `[引用 @${quotedMessage.role === 'user' ? '我' : conversation.name}]: ${quotedMessage.content}\n\n${input}`;
  setQuotedMessage(null);
}
```

## 🔍 需要查找的位置
- [x] handleMessageClick调用位置 - line 1843
- [ ] handleSend函数位置 - 需要查找
- [ ] 输入框渲染位置 - 需要查找  
- [ ] return语句结尾 - 添加MessageActionMenu

## ⚠️ 注意事项
1. 只有用户消息可以编辑
2. 所有消息（用户+AI）都可以引用和删除
3. 编辑后的消息应该标记为"已编辑"
4. 引用应该在消息中清晰显示
5. 菜单位置要根据消息位置动态计算
