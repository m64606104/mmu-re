# 子聊天功能 - ChatScreen集成指南

本文档包含将子聊天功能集成到ChatScreen所需的代码片段。

---

## 1️⃣ 导入必要的组件和工具

在 `ChatScreen.tsx` 文件顶部添加：

```typescript
// 子聊天相关导入
import { MessageCircle } from 'lucide-react';
import SubChatWindow from './SubChatWindow';
import SubChatManager from './SubChatManager';
import { SubChat } from '../types';
import {
  createSubChat,
  addMessageToSubChat,
  markSubChatAsRead,
  incrementUnreadCount,
  updateSubChatInConversation,
  addSubChatToConversation,
  removeSubChatFromConversation,
  getTotalUnreadCount,
  getPendingSubChatsCount,
} from '../utils/subChatManager';
```

---

## 2️⃣ 添加状态管理

在ChatScreen组件内部，state定义区域添加：

```typescript
// 子聊天相关状态
const [showSubChatManager, setShowSubChatManager] = useState(false);
const [activeSubChatId, setActiveSubChatId] = useState<string | null>(null);
const [minimizedSubChats, setMinimizedSubChats] = useState<Set<string>>(new Set());

// 计算未读数和待处理数
const subChatUnreadCount = getTotalUnreadCount(conversation);
const pendingSubChatsCount = getPendingSubChatsCount(conversation);
```

---

## 3️⃣ 添加子聊天处理函数

在ChatScreen组件内部添加以下函数：

```typescript
// ============ 子聊天功能函数 ============

/**
 * 创建用户发起的子聊天
 */
const handleCreateUserSubChat = (name: string) => {
  const newSubChat = createSubChat(name, 'user');
  const updatedConversation = addSubChatToConversation(conversation, newSubChat);
  onUpdateConversation(conversation.id, {
    subChats: updatedConversation.subChats,
  });
  
  // 自动打开新创建的子聊天
  setActiveSubChatId(newSubChat.id);
  setShowSubChatManager(false);
};

/**
 * 选择/打开子聊天
 */
const handleSelectSubChat = (subChatId: string) => {
  // 标记为已读
  const updatedConversation = updateSubChatInConversation(
    conversation,
    subChatId,
    { unreadCount: 0, status: 'active', isActive: true }
  );
  
  onUpdateConversation(conversation.id, {
    subChats: updatedConversation.subChats,
  });
  
  setActiveSubChatId(subChatId);
  setShowSubChatManager(false);
  
  // 从最小化列表中移除
  setMinimizedSubChats(prev => {
    const newSet = new Set(prev);
    newSet.delete(subChatId);
    return newSet;
  });
};

/**
 * 重命名子聊天
 */
const handleRenameSubChat = (subChatId: string, newName: string) => {
  const updatedConversation = updateSubChatInConversation(
    conversation,
    subChatId,
    { name: newName }
  );
  
  onUpdateConversation(conversation.id, {
    subChats: updatedConversation.subChats,
  });
};

/**
 * 删除子聊天
 */
const handleDeleteSubChat = (subChatId: string) => {
  const updatedConversation = removeSubChatFromConversation(conversation, subChatId);
  
  onUpdateConversation(conversation.id, {
    subChats: updatedConversation.subChats,
  });
  
  // 如果是当前打开的，关闭它
  if (activeSubChatId === subChatId) {
    setActiveSubChatId(null);
  }
  
  // 从最小化列表中移除
  setMinimizedSubChats(prev => {
    const newSet = new Set(prev);
    newSet.delete(subChatId);
    return newSet;
  });
};

/**
 * 关闭子聊天窗口
 */
const handleCloseSubChat = (subChatId: string) => {
  const updatedConversation = updateSubChatInConversation(
    conversation,
    subChatId,
    { isActive: false }
  );
  
  onUpdateConversation(conversation.id, {
    subChats: updatedConversation.subChats,
  });
  
  if (activeSubChatId === subChatId) {
    setActiveSubChatId(null);
  }
  
  setMinimizedSubChats(prev => {
    const newSet = new Set(prev);
    newSet.delete(subChatId);
    return newSet;
  });
};

/**
 * 最小化/恢复子聊天窗口
 */
const handleToggleMinimizeSubChat = (subChatId: string) => {
  setMinimizedSubChats(prev => {
    const newSet = new Set(prev);
    if (newSet.has(subChatId)) {
      newSet.delete(subChatId);
    } else {
      newSet.add(subChatId);
    }
    return newSet;
  });
};

/**
 * 在子聊天中发送消息
 */
const handleSendSubChatMessage = async (subChatId: string, content: string) => {
  const subChat = (conversation.subChats || []).find(sc => sc.id === subChatId);
  if (!subChat) return;
  
  // 1. 创建用户消息
  const userMessage: Message = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    role: 'user',
    content,
    timestamp: Date.now(),
  };
  
  // 2. 添加到子聊天
  let updatedSubChat = addMessageToSubChat(subChat, userMessage);
  
  // 3. 更新对话
  onUpdateConversation(conversation.id, {
    subChats: (conversation.subChats || []).map(sc =>
      sc.id === subChatId ? updatedSubChat : sc
    ),
  });
  
  // 4. 调用AI生成回复
  setIsGenerating(true);
  
  try {
    // 构建子聊天的上下文
    const subChatMessages = updatedSubChat.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
    
    // 使用主对话的角色设置
    const systemPrompt = buildSystemPrompt(conversation.characterSettings!);
    
    const response = await fetch(apiConfig.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: apiConfig.modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          ...subChatMessages,
        ],
        temperature: 0.8,
      }),
    });
    
    if (!response.ok) {
      throw new Error('AI回复失败');
    }
    
    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || '抱歉，我现在无法回复。';
    
    // 5. 创建AI消息
    const aiMessage: Message = {
      id: `msg_${Date.now() + 1}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'assistant',
      content: aiContent,
      timestamp: Date.now(),
    };
    
    // 6. 添加AI回复到子聊天
    updatedSubChat = addMessageToSubChat(updatedSubChat, aiMessage);
    
    // 7. 更新对话
    onUpdateConversation(conversation.id, {
      subChats: (conversation.subChats || []).map(sc =>
        sc.id === subChatId ? updatedSubChat : sc
      ),
    });
    
  } catch (error) {
    console.error('子聊天AI回复失败:', error);
    showToast('AI回复失败，请重试', 'error');
  } finally {
    setIsGenerating(false);
  }
};

/**
 * AI发起子聊天（从解析逻辑调用）
 */
const handleAIInitiateSubChat = (purpose: string, suggestedName: string) => {
  const newSubChat = createSubChat(suggestedName, 'ai', purpose);
  const updatedConversation = addSubChatToConversation(conversation, newSubChat);
  
  onUpdateConversation(conversation.id, {
    subChats: updatedConversation.subChats,
  });
  
  // 显示通知
  showToast(`AI想发起子聊天：${suggestedName}`, 'info');
};
```

---

## 4️⃣ 添加AI消息解析逻辑

在AI消息解析部分（`streamText` 或类似函数中）添加：

```typescript
// 检测子聊天发起：[发起子聊天:目的:建议名称]
const subChatMatch = finalContent.match(/\[发起子聊天:([^:]+):([^\]]+)\]/);
if (subChatMatch) {
  const purpose = subChatMatch[1].trim();
  const suggestedName = subChatMatch[2].trim();
  
  console.log(`💬 AI发起子聊天: ${suggestedName}, 目的: ${purpose}`);
  
  // 移除标记
  finalContent = finalContent.replace(subChatMatch[0], '').trim();
  
  // 创建子聊天请求
  handleAIInitiateSubChat(purpose, suggestedName);
}
```

将此代码添加到红包/转账解析之后，文档解析之前。

---

## 5️⃣ 添加多功能栏按钮

在多功能栏（header右侧按钮区域）添加：

```tsx
{/* 子聊天按钮 */}
{conversation.type === 'private' && (
  <button
    onClick={() => setShowSubChatManager(true)}
    className="p-2 hover:bg-gray-100 rounded-full transition-colors relative"
    title="子聊天"
  >
    <MessageCircle className="w-5 h-5 text-gray-700" />
    {/* 未读数角标 */}
    {subChatUnreadCount > 0 && (
      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
        {subChatUnreadCount > 99 ? '99+' : subChatUnreadCount}
      </span>
    )}
    {/* 待处理请求角标 */}
    {pendingSubChatsCount > 0 && subChatUnreadCount === 0 && (
      <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
        {pendingSubChatsCount}
      </span>
    )}
  </button>
)}
```

---

## 6️⃣ 渲染子聊天组件

在ChatScreen组件return的JSX最后，`</div>`之前添加：

```tsx
{/* 子聊天管理器 */}
{showSubChatManager && (
  <SubChatManager
    subChats={conversation.subChats || []}
    onClose={() => setShowSubChatManager(false)}
    onSelectSubChat={handleSelectSubChat}
    onCreateSubChat={handleCreateUserSubChat}
    onRenameSubChat={handleRenameSubChat}
    onDeleteSubChat={handleDeleteSubChat}
  />
)}

{/* 子聊天窗口 */}
{activeSubChatId && (
  (() => {
    const subChat = (conversation.subChats || []).find(
      sc => sc.id === activeSubChatId
    );
    
    if (!subChat) return null;
    
    return (
      <SubChatWindow
        subChat={subChat}
        conversation={conversation}
        apiConfig={apiConfig}
        onClose={() => handleCloseSubChat(activeSubChatId)}
        onMinimize={() => handleToggleMinimizeSubChat(activeSubChatId)}
        onSendMessage={handleSendSubChatMessage}
        onUpdateSubChat={(subChatId, updates) => {
          const updatedConversation = updateSubChatInConversation(
            conversation,
            subChatId,
            updates
          );
          onUpdateConversation(conversation.id, {
            subChats: updatedConversation.subChats,
          });
        }}
        isMinimized={minimizedSubChats.has(activeSubChatId)}
      />
    );
  })()
)}

{/* 最小化的子聊天列表 */}
{conversation.subChats?.map((subChat) => {
  if (
    !minimizedSubChats.has(subChat.id) ||
    activeSubChatId !== subChat.id
  )
    return null;
  
  return (
    <SubChatWindow
      key={subChat.id}
      subChat={subChat}
      conversation={conversation}
      apiConfig={apiConfig}
      onClose={() => handleCloseSubChat(subChat.id)}
      onMinimize={() => handleToggleMinimizeSubChat(subChat.id)}
      onSendMessage={handleSendSubChatMessage}
      onUpdateSubChat={(subChatId, updates) => {
        const updatedConversation = updateSubChatInConversation(
          conversation,
          subChatId,
          updates
        );
        onUpdateConversation(conversation.id, {
          subChats: updatedConversation.subChats,
        });
      }}
      isMinimized={true}
    />
  );
})}
```

---

## 7️⃣ 更新System Prompt

在System Prompt构建函数中添加：

```typescript
const subChatInstructions = `
【💬 子聊天功能】：
当需要进行独立的对话场景时，你可以发起子聊天：

发起格式：[发起子聊天:目的说明:建议名称]

适用场景：
1. 角色扮演场景切换（进入游戏、梦境、平行世界等）
2. 私密话题讨论（不想在主聊天显示的内容）
3. 独立的故事线发展

示例：
- "我想带你进入一个特殊的世界[发起子聊天:进入游戏世界:异世界冒险]"
- "有些话想私下和你说[发起子聊天:私密对话:秘密]"
- "让我们开启一段新的故事[发起子聊天:新故事线:未来回忆]"

注意事项：
- 只在有明确需求时发起，不要频繁创建
- 目的说明要清晰（10-20字）
- 建议名称要有吸引力（2-6字）
- 用户可以接受或拒绝请求
`;

// 将此添加到System Prompt的末尾
```

---

## 8️⃣ 集成总结

完成以上步骤后，子聊天功能将完全集成到ChatScreen中。

**测试检查项**：
- ✅ 点击多功能栏子聊天按钮打开管理器
- ✅ 创建新的用户子聊天
- ✅ AI发起子聊天请求
- ✅ 接受/拒绝AI请求
- ✅ 在子聊天中发送消息
- ✅ AI在子聊天中回复
- ✅ 最小化/恢复子聊天窗口
- ✅ 重命名子聊天
- ✅ 删除子聊天
- ✅ 未读数显示正确

---

## 🔧 辅助函数

如果需要buildSystemPrompt函数，添加：

```typescript
const buildSystemPrompt = (characterSettings: CharacterSettings): string => {
  // 这里应该返回完整的system prompt
  // 可以复用主聊天的system prompt构建逻辑
  return `你是${characterSettings.nickname}，${characterSettings.personality}...`;
};
```

---

## 📝 注意事项

1. **性能优化**：子聊天消息较多时考虑虚拟滚动
2. **数据持久化**：确保子聊天数据正确保存到localStorage
3. **错误处理**：API调用失败时的错误提示
4. **UI响应**：loading状态的显示
5. **边界情况**：处理空子聊天、无消息等情况

---

**集成完成后记得测试所有功能！** ✅
