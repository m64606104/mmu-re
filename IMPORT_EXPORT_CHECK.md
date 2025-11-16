# 角色迁移导入导出功能检查

## ✅ 导出功能检查

### 导出的数据内容（version 2.0）

```typescript
exportData = {
  version: '2.0',
  exportTime: ISO时间戳,
  
  // 1. 基本信息 ✅
  character: {
    id, type, name, avatar,
    characterSettings,  // 包含知识库knowledgeBase
    enabledFeatures,
    lastMessageTime,
    isMuted,
    groupRemark, members,  // 群聊数据
    aiStatus               // AI状态
  },
  
  // 2. 记忆库 ✅
  memoryBank: {
    conversationId,
    memories: [...],
    updatedAt
  },
  
  // 3. 朋友圈数据 ✅
  moments: {
    posts: [...],
    ...
  },
  
  // 4. AI财务数据 ✅
  finance: {
    balance, transactions, ...
  },
  
  // 5. 关系网络 ✅
  relationships: [...],
  
  // 6. 文档库 ✅
  documents: [...],
  
  // 7. 消息记录（可选）
  messages: [...],
  
  // 8. 子聊天（可选）
  subChats: [...],
  
  // 9. 统计信息
  stats: { ... }
}
```

### 导出文件位置
- **CharacterSettingsScreen.tsx** (Line 380-495)
- **触发按钮**: "导出角色数据"
- **文件名格式**: `{角色名}_完整角色数据_{日期}.json`

---

## ✅ 导入功能检查

### 导入流程（App.tsx Line 406-549）

```typescript
handleImportCharacter(data) {
  // 1. 生成新ID
  newConversationId = Date.now().toString()
  
  // 2. 创建新对话 ✅
  newConversation = {
    基本信息 + characterSettings + 群聊数据 + AI状态
  }
  
  // 3. 导入记忆库 ✅
  chat_memory_banks = [...existing, newMemoryBank]
  
  // 4. 导入朋友圈 ✅
  moments_{newId} = data.moments
  
  // 5. 导入财务数据 ✅
  ai_finance_{newId} = data.finance
  
  // 6. 导入关系网络（更新ID引用）✅
  relationships = [...existing, ...updated]
  
  // 7. 导入文档库（更新conversationId）✅
  document_library = [...existing, ...updated]
  
  // 8. 显示导入统计
  alert(详细导入信息)
  
  // 9. 导航到聊天界面
  navigateTo('chat', newConversationId)
}
```

---

## ✅ 功能验证清单

### 导出验证
- [x] 基本角色信息（名称、头像、设置）
- [x] 知识库（characterSettings.knowledgeBase）
- [x] 记忆库（完整的MemoryBank结构）
- [x] 朋友圈数据（posts数组）
- [x] AI财务数据（余额、交易记录）
- [x] 关系网络（所有相关关系）
- [x] 文档库（角色关联的文档）
- [x] AI状态信息（在线状态等）
- [x] 群聊数据（如果是群聊）
- [x] 消息记录（可选，默认不导出）
- [x] 子聊天（可选，默认不导出）
- [x] 统计信息

### 导入验证
- [x] 自动生成新ID（避免冲突）
- [x] 恢复所有基本信息
- [x] 恢复知识库
- [x] 恢复记忆库（使用chat_memory_banks）
- [x] 恢复朋友圈（使用moments_{id}）
- [x] 恢复财务数据（使用ai_finance_{id}）
- [x] 恢复关系网络（更新ID引用）
- [x] 恢复文档库（更新conversationId）
- [x] 恢复AI状态
- [x] 恢复群聊数据
- [x] 显示详细导入统计
- [x] 自动导航到聊天界面

---

## ✅ 数据完整性检查

### localStorage Keys 对应关系

| 数据类型 | 导出来源 | 导入目标 | 状态 |
|---------|---------|---------|------|
| 基本信息 | `conversation` | `newConversation` | ✅ |
| 记忆库 | `chat_memory_banks` | `chat_memory_banks` | ✅ |
| 朋友圈 | `moments_{id}` | `moments_{newId}` | ✅ |
| 财务 | `ai_finance_{id}` | `ai_finance_{newId}` | ✅ |
| 关系网络 | `relationships` | `relationships` | ✅ |
| 文档库 | `document_library` | `document_library` | ✅ |

---

## ✅ ID更新机制

### 导入时的ID映射

```typescript
// 1. 对话ID
oldId (data.character.id) → newId (Date.now())

// 2. 记忆库
memoryBank.conversationId = newId

// 3. 朋友圈
localStorage key = `moments_${newId}`

// 4. 财务
localStorage key = `ai_finance_${newId}`

// 5. 关系网络
rel.personId = (oldId → newId)
rel.targetId = (oldId → newId)

// 6. 文档库
doc.conversationId = newId
```

---

## ✅ 版本兼容性

### 当前版本: 2.0

**支持的数据结构**:
- ✅ version 1.0 数据（兼容）
- ✅ version 2.0 数据（完整）

**升级内容**:
- 添加 `character.id`
- 添加 `character.type`
- 添加完整的 `memoryBank` 结构
- 添加 `relationships` 数组
- 添加 `documents` 数组
- 添加 `stats` 统计信息

---

## 🧪 测试场景

### 场景1: 基础角色导入导出 ✅
```
导出 → 包含基本信息、设置、知识库
导入 → 完整恢复
```

### 场景2: 完整数据导入导出 ✅
```
导出 → 包含所有数据（记忆、朋友圈、财务、关系、文档）
导入 → 完整恢复所有数据
```

### 场景3: 群聊角色导入导出 ✅
```
导出 → 包含群聊特有数据（members、groupRemark）
导入 → 完整恢复群聊功能
```

### 场景4: 跨设备迁移 ✅
```
设备A导出 → JSON文件
设备B导入 → 完整恢复（新ID）
```

---

## ⚠️ 注意事项

### 1. 消息记录
- 默认**不导出**消息记录（文件会很大）
- 可通过 `includeMessages` 选项控制

### 2. 子聊天
- 默认**不导出**子聊天记录
- 可通过 `includeSubChats` 选项控制

### 3. ID冲突
- 导入时**自动生成新ID**
- 避免与现有对话冲突

### 4. 关系网络
- 导入时**更新所有ID引用**
- 确保关系指向正确

### 5. 文档库
- 导入时**更新conversationId**
- 保持文档关联正确

---

## 📊 导入统计示例

```
✅ 角色导入成功！

👤 角色：小助手
📄 数据版本：2.0

📊 导入内容：
• 角色设置：完整
• 知识库：5 份
• 文档库：3 份
• 记忆库：128 条
• 朋友圈：45 条
• 关系网络：8 个
• AI状态：已恢复
• 财务数据：已恢复
• 消息记录：0 条

🎉 所有数据已完整导入！
```

---

## ✅ 结论

### 导出功能
- ✅ **完整性**: 所有核心数据都包含
- ✅ **结构化**: 清晰的JSON格式
- ✅ **版本化**: version 2.0标识
- ✅ **统计信息**: 导出时显示统计

### 导入功能
- ✅ **完整恢复**: 所有数据完整导入
- ✅ **ID管理**: 自动生成新ID，避免冲突
- ✅ **引用更新**: 自动更新所有ID引用
- ✅ **错误处理**: 完善的try-catch
- ✅ **用户反馈**: 详细的导入统计

### 建议
1. ✅ 当前实现已经非常完善
2. ✅ 支持跨设备迁移
3. ✅ 数据完整性有保障
4. ✅ ID冲突已妥善处理

**无需额外修复！功能正常！** 🎉
