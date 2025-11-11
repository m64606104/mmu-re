# 💬 子聊天功能完整指南

## 📋 功能概述

子聊天功能允许AI和用户创建独立的对话窗口，主要用于角色扮演场景。每个子聊天拥有独立的消息历史，但共享同一个AI角色设置。

---

## 🎯 使用场景

### **场景1：角色扮演切换**
```
主聊天：现实世界对话
子聊天：游戏世界/梦境/平行时空对话
```

### **场景2：私密对话**
```
主聊天：日常交流
子聊天：秘密话题/敏感话题
```

### **场景3：多线程故事**
```
主聊天：主线剧情
子聊天1：支线剧情A
子聊天2：支线剧情B
```

---

## 🏗️ 技术架构

### **1. 数据结构**

```typescript
// SubChat类型定义
interface SubChat {
  id: string;                 // 唯一ID
  name: string;               // 用户命名
  messages: Message[];        // 独立消息列表
  createdAt: number;          // 创建时间
  lastMessageTime: number;    // 最后消息时间
  unreadCount: number;        // 未读数
  isActive: boolean;          // 是否打开
  initiator: 'user' | 'ai';   // 发起方
  purpose?: string;           // AI发起时的目的
  status: 'pending' | 'active' | 'closed';
}

// 扩展Conversation
interface Conversation {
  // ... 其他字段
  subChats?: SubChat[];       // 子聊天列表
}
```

### **2. AI发起子聊天格式**

```
[发起子聊天:目的:建议名称]
```

**示例**：
```
我想和你私下聊聊[发起子聊天:想和你单独说些话:秘密对话]
```

**解析后**：
- 创建待接受的子聊天请求
- 目的："想和你单独说些话"
- 建议名称："秘密对话"
- 用户可以接受/拒绝

### **3. System Prompt添加**

```markdown
【💬 子聊天功能】：
你可以在需要时发起子聊天，用于：
1. 角色扮演场景切换（如进入游戏/梦境）
2. 私密话题讨论
3. 独立的故事线

发起格式：[发起子聊天:目的说明:建议名称]
示例："我想带你进入一个特殊的世界[发起子聊天:进入游戏世界:异世界冒险]"

注意：
- 只在有明确需求时发起
- 目的说明要清晰
- 建议名称要有吸引力
```

---

## 🎨 UI设计

### **子聊天窗口特点**

1. **大小**：
   - 宽度：380px
   - 高度：500px
   - 位置：右下角固定

2. **视觉区分**：
   - 紫蓝渐变主题色
   - 圆角设计
   - 半透明背景
   - 阴影效果

3. **可最小化**：
   - 最小化后显示标题栏
   - 显示未读消息数
   - 点击恢复

### **多功能栏入口**

```tsx
<button className="子聊天按钮">
  <MessageCircle />
  {hasUnreadSubChats && <Badge />}
</button>
```

---

## 📊 集成步骤

### **步骤1：扩展类型** ✅ 已完成
```typescript
// types.ts
export interface SubChat { ... }
export interface SubChatRequest { ... }
```

### **步骤2：创建组件** ✅ 已完成
- SubChatWindow.tsx - 子聊天窗口
- SubChatManager.tsx - 子聊天列表管理

### **步骤3：扩展ChatScreen** 🔄 进行中
需要添加：
1. 子聊天状态管理
2. AI发起子聊天的解析
3. 子聊天窗口渲染
4. 多功能栏按钮

### **步骤4：数据持久化** 📝 待实现
- localStorage存储
- 读取/保存子聊天数据

### **步骤5：AI集成** 📝 待实现
- 解析[发起子聊天]标记
- 生成子聊天请求
- AI在子聊天中的响应逻辑

---

## 🔧 关键功能实现

### **1. 创建子聊天**

```typescript
const createSubChat = (name: string, initiator: 'user' | 'ai', purpose?: string): SubChat => {
  return {
    id: `subchat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    messages: [],
    createdAt: Date.now(),
    lastMessageTime: Date.now(),
    unreadCount: 0,
    isActive: false,
    initiator,
    purpose,
    status: initiator === 'ai' ? 'pending' : 'active',
  };
};
```

### **2. 发送消息到子聊天**

```typescript
const sendMessageToSubChat = async (subChatId: string, content: string) => {
  // 1. 创建用户消息
  const userMessage: Message = {
    id: `msg_${Date.now()}`,
    role: 'user',
    content,
    timestamp: Date.now(),
  };
  
  // 2. 添加到子聊天消息列表
  const updatedSubChat = {
    ...subChat,
    messages: [...subChat.messages, userMessage],
    lastMessageTime: Date.now(),
  };
  
  // 3. 调用AI生成回复（使用主对话的角色设置）
  const aiResponse = await callAI(content, subChat.messages, characterSettings);
  
  // 4. 添加AI回复
  const aiMessage: Message = {
    id: `msg_${Date.now() + 1}`,
    role: 'assistant',
    content: aiResponse,
    timestamp: Date.now(),
  };
  
  updatedSubChat.messages.push(aiMessage);
  
  // 5. 更新对话
  onUpdateConversation(conversationId, {
    subChats: subChats.map(sc => 
      sc.id === subChatId ? updatedSubChat : sc
    )
  });
};
```

### **3. 解析AI发起子聊天**

```typescript
// 在AI消息解析中添加
const subChatMatch = finalContent.match(/\[发起子聊天:([^:]+):([^\]]+)\]/);
if (subChatMatch) {
  const purpose = subChatMatch[1];
  const suggestedName = subChatMatch[2];
  
  // 创建待接受的子聊天
  const newSubChat = createSubChat(suggestedName, 'ai', purpose);
  
  // 添加到对话
  onUpdateConversation(conversation.id, {
    subChats: [...(conversation.subChats || []), newSubChat]
  });
  
  // 移除标记
  finalContent = finalContent.replace(subChatMatch[0], '').trim();
}
```

---

## 🧪 测试场景

### **场景1：用户主动创建**
1. 点击多功能栏的"子聊天"按钮
2. 点击"创建新子聊天"
3. 输入名称："平行世界"
4. 开始对话

### **场景2：AI主动发起**
1. AI消息："我想带你看看另一个世界[发起子聊天:带你进入梦境:梦中世界]"
2. 用户收到子聊天请求通知
3. 用户点击"接受"
4. 子聊天窗口打开
5. 开始独立对话

### **场景3：多个子聊天管理**
1. 创建3个子聊天
2. 在不同子聊天间切换
3. 重命名子聊天
4. 删除不需要的子聊天

---

## 🎯 下一步计划

1. ✅ 类型定义完成
2. ✅ 基础组件完成
3. 🔄 ChatScreen集成
4. 📝 AI解析逻辑
5. 📝 数据持久化
6. 📝 System Prompt更新
7. 📝 测试和优化

---

## 💡 使用建议

### **适合使用子聊天的情况**：
- ✅ 角色扮演不同场景
- ✅ 私密对话
- ✅ 多线程故事发展
- ✅ 临时话题讨论

### **不适合使用子聊天的情况**：
- ❌ 简单的话题切换
- ❌ 短期的插话
- ❌ 需要频繁切换的对话

---

## 📞 待解决问题

1. **子聊天上下文**：子聊天是否需要访问主聊天的历史消息？
2. **AI记忆**：子聊天中的内容是否影响主聊天的AI记忆？
3. **通知机制**：子聊天有新消息时如何通知用户？
4. **最大数量**：限制每个对话最多创建多少个子聊天？

**建议方案**：
1. 子聊天独立，不访问主聊天历史（保持纯净）
2. 子聊天内容不影响主聊天记忆（隔离）
3. 最小化状态显示未读数（提醒）
4. 限制最多5个活跃子聊天（避免混乱）

---

## 🎉 功能亮点

1. **完全独立**：消息完全分离，互不干扰
2. **视觉区分**：紫蓝渐变主题，一眼可辨
3. **灵活管理**：创建、重命名、删除、最小化
4. **AI智能**：AI可以主动发起，判断使用时机
5. **用户友好**：简单直观的操作流程

---

## 📝 后续优化

1. **动画效果**：窗口打开/关闭动画
2. **拖拽移动**：允许用户拖动窗口位置
3. **多窗口并列**：同时打开多个子聊天窗口
4. **快捷键支持**：Ctrl+数字键快速切换
5. **导出功能**：导出子聊天记录

---

**状态**：✅ 基础框架完成，待集成到ChatScreen
**预计完成时间**：继续实施中...
