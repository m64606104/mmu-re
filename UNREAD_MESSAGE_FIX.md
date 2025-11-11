# 未读消息逻辑修复方案

## 🐛 发现的问题

### 1. **进入聊天页面时未读消息不清零**

**问题位置**：`src/App.tsx` - `navigateTo` 函数

**当前代码**（第 206-212 行）：
```typescript
const navigateTo = useCallback((screen: Screen, conversationId?: string) => {
  setPreviousScreen(currentScreen);
  if (conversationId) {
    setCurrentConversationId(conversationId);
  }
  setCurrentScreen(screen);
}, [currentScreen]);
```

**问题**：
- ❌ 切换到聊天页面时，没有清零 `unreadCount`
- ❌ 用户打开对话后，未读标记仍然显示

---

### 2. **未读消息增长逻辑不正确**

**当前逻辑**：
1. AI 主动发消息时：`unreadCount + 1` ✅（正确）
2. 用户在聊天页面内接收 AI 回复时：**无处理** ❌（错误）

**问题**：
- ❌ 用户在聊天页面时，AI 回复不应该增加未读数
- ❌ 用户离开聊天页面后，新消息才应该增加未读数

---

## ✅ 修复方案

### 修复 1：进入聊天页面时清零未读消息

**位置**：`src/App.tsx` - `navigateTo` 函数

```typescript
const navigateTo = useCallback((screen: Screen, conversationId?: string) => {
  setPreviousScreen(currentScreen);
  
  // 切换到聊天页面时，清零未读消息
  if (screen === 'chat' && conversationId) {
    setCurrentConversationId(conversationId);
    // 清零该对话的未读数
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId 
        ? { ...conv, unreadCount: 0 } 
        : conv
    ));
  } else if (conversationId) {
    setCurrentConversationId(conversationId);
  }
  
  setCurrentScreen(screen);
}, [currentScreen]);
```

---

### 修复 2：正确管理未读消息增长

#### 方案 A：在 ChatScreen 中管理（推荐）

**位置**：`src/components/ChatScreen.tsx`

在 `handleGenerate` 函数中，当 AI 回复时：

```typescript
// 在 AI 消息创建后，立即清零未读数（因为用户正在查看）
useEffect(() => {
  // 用户正在查看聊天页面，清零未读数
  onUpdateConversation(conversation.id, { unreadCount: 0 });
}, [conversation.messages.length]); // 每次消息更新时触发
```

#### 方案 B：在 App.tsx 中管理

**位置**：`src/App.tsx`

添加一个 effect 监听当前对话：

```typescript
// 当用户在聊天页面时，持续清零未读数
useEffect(() => {
  if (currentScreen === 'chat' && currentConversationId) {
    const interval = setInterval(() => {
      setConversations(prev => prev.map(conv => 
        conv.id === currentConversationId && conv.unreadCount > 0
          ? { ...conv, unreadCount: 0 } 
          : conv
      ));
    }, 500); // 每 500ms 检查一次
    
    return () => clearInterval(interval);
  }
}, [currentScreen, currentConversationId]);
```

---

### 修复 3：AI 主动发消息时的未读逻辑

**当前代码**（第 314-326 行）：
```typescript
const addMessageToConversation = useCallback((conversationId: string, message: Message) => {
  setConversations(prev => prev.map(conv => {
    if (conv.id === conversationId) {
      return {
        ...conv,
        messages: [...conv.messages, message],
        lastMessageTime: message.timestamp,
        unreadCount: conv.unreadCount + 1  // ⚠️ 始终增加
      };
    }
    return conv;
  }));
}, []);
```

**修复后**：
```typescript
const addMessageToConversation = useCallback((conversationId: string, message: Message) => {
  setConversations(prev => prev.map(conv => {
    if (conv.id === conversationId) {
      // 🔥 只有当用户不在该对话的聊天页面时，才增加未读数
      const shouldIncreaseUnread = !(
        currentScreen === 'chat' && 
        currentConversationId === conversationId
      );
      
      return {
        ...conv,
        messages: [...conv.messages, message],
        lastMessageTime: message.timestamp,
        unreadCount: shouldIncreaseUnread ? conv.unreadCount + 1 : 0
      };
    }
    return conv;
  }));
}, [currentScreen, currentConversationId]);
```

---

## 🎯 完整的未读消息逻辑规则

### **规则 1：进入聊天页面**
```
用户点击对话 → navigateTo('chat', conversationId)
→ 清零该对话的 unreadCount
```

### **规则 2：在聊天页面中**
```
用户正在查看对话 → AI 回复
→ 不增加 unreadCount（保持为 0）
```

### **规则 3：离开聊天页面**
```
用户在其他页面 → AI 主动发消息
→ unreadCount + 1
```

### **规则 4：用户发送消息**
```
用户发送消息 → 清零 unreadCount
（因为用户显然正在查看对话）
```

---

## 📊 预期行为

### 场景 1：用户打开对话
```
1. 用户在社交页面，看到对话有 3 条未读
2. 用户点击对话 → 进入聊天页面
3. ✅ 未读标记清零（0 条未读）
4. 用户查看消息
5. AI 回复新消息
6. ✅ 未读数仍为 0（用户正在查看）
```

### 场景 2：AI 主动发消息
```
1. 用户在主页面
2. AI 在后台主动发消息给用户
3. ✅ 未读数 +1
4. 用户切换到社交页面
5. ✅ 看到对话有 1 条未读
6. 用户点击对话
7. ✅ 未读标记清零
```

### 场景 3：用户在聊天中
```
1. 用户正在和 AI 聊天
2. 用户发送消息
3. AI 回复
4. ✅ 未读数保持为 0
5. 用户离开聊天页面
6. AI 再次主动发消息
7. ✅ 未读数 +1
```

---

## 🔧 实施步骤

### 步骤 1：修复 navigateTo（必须）
```typescript
// 在 App.tsx 中
const navigateTo = useCallback((screen: Screen, conversationId?: string) => {
  setPreviousScreen(currentScreen);
  
  if (screen === 'chat' && conversationId) {
    setCurrentConversationId(conversationId);
    // 清零未读数
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId 
        ? { ...conv, unreadCount: 0 } 
        : conv
    ));
  } else if (conversationId) {
    setCurrentConversationId(conversationId);
  }
  
  setCurrentScreen(screen);
}, [currentScreen]);
```

### 步骤 2：修复 addMessageToConversation（推荐）
```typescript
// 在 App.tsx 中
const addMessageToConversation = useCallback((conversationId: string, message: Message) => {
  setConversations(prev => prev.map(conv => {
    if (conv.id === conversationId) {
      const shouldIncreaseUnread = !(
        currentScreen === 'chat' && 
        currentConversationId === conversationId
      );
      
      return {
        ...conv,
        messages: [...conv.messages, message],
        lastMessageTime: message.timestamp,
        unreadCount: shouldIncreaseUnread ? conv.unreadCount + 1 : 0
      };
    }
    return conv;
  }));
}, [currentScreen, currentConversationId]);
```

### 步骤 3：在 ChatScreen 中添加保护（可选）
```typescript
// 在 ChatScreen.tsx 的 useEffect 中
useEffect(() => {
  // 确保用户查看聊天时，未读数始终为 0
  if (conversation.unreadCount > 0) {
    onUpdateConversation(conversation.id, { unreadCount: 0 });
  }
}, [conversation.messages.length]);
```

---

## 🧪 测试清单

完成修复后，请测试：

- [ ] 在社交页面点击有未读消息的对话
- [ ] 进入聊天页面后，未读标记消失
- [ ] 在聊天页面中，AI 回复后未读数保持为 0
- [ ] 离开聊天页面，回到社交页面
- [ ] AI 主动发消息，未读数增加
- [ ] 再次进入聊天页面，未读数清零
- [ ] 用户发送消息后，未读数保持为 0

---

## 📝 总结

### 问题根源
1. ❌ `navigateTo` 没有清零未读数
2. ❌ `addMessageToConversation` 没有检查用户是否在查看对话
3. ❌ 缺少在聊天页面时的未读数保护

### 修复要点
1. ✅ 进入聊天页面时清零
2. ✅ 根据用户位置决定是否增加未读数
3. ✅ 在聊天页面中保持未读数为 0

### 优先级
1. **高优先级**：修复 `navigateTo`（必须）
2. **高优先级**：修复 `addMessageToConversation`（推荐）
3. **中优先级**：ChatScreen 保护（可选）

完成这些修复后，未读消息系统将正常工作！
