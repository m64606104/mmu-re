# ChatScreen.tsx 迁移步骤

## 🎯 目标

将 ChatScreen.tsx 中的旧文档系统替换为新的 Word 风格文档系统。

---

## ✅ 已完成

- [x] 更新导入语句（第 7-11 行）

---

## 📝 需要修改的地方

### 1. 替换文档解析逻辑（第 267-451 行）

**位置**：`handleGenerate` 函数中的文档解析部分

**查找代码**：
```typescript
// 🔥 纯粹化的文档解析逻辑
const DOC_PATTERN = /\[发文档:([^:]+):([^\]]+)\]/g;
```

**替换为**：
```typescript
// 🌟 增强的文档解析（支持多种格式）
const parsedDoc = parseEnhancedDocument(finalContent);

if (parsedDoc) {
  console.log('✅ [文档解析] 成功识别文档:', parsedDoc.title);
  
  // 创建文档消息
  allExtraMessages.push({
    id: `${baseId}_doc`,
    role: 'assistant',
    content: `发送了文档「${parsedDoc.title}」`,
    timestamp: Date.now() + 100,
    document: {
      title: parsedDoc.title,
      content: parsedDoc.content,
      type: parsedDoc.type,
      greeting: parsedDoc.greeting || '请查收'
    }
  });
  
  // 文档已提取，清空正文
  finalContent = '';
  console.log('📄 [文档解析] 文档已提取为单独消息');
}
```

**说明**：
- 删除整个旧的解析逻辑（约185行）
- 替换为简洁的新逻辑（约20行）
- 保留相同的消息结构，确保兼容性

---

### 2. 替换文档卡片渲染（约第 3724 行）

**查找代码**：
```typescript
<DocumentCard
  document={msg.document}
  onView={() => setViewingDocument(msg.document)}
  ...
/>
```

**替换为**：
```typescript
<WordStyleDocumentCard
  document={msg.document}
  compact={true}
  onClick={() => setViewingDocument(msg.document)}
  onSave={() => {
    try {
      saveToLibrary(msg.document!, conversation.id);
      alert('✅ 文档已保存到文档库');
    } catch (error) {
      alert('❌ 保存失败');
    }
  }}
  onForward={() => {
    setForwardingDocument(msg.document!);
    setShowSelectContact(true);
  }}
/>
```

---

### 3. 替换文档查看弹窗（约第 4751 行）

**查找代码**：
```typescript
{viewingDocument && (
  <DocumentViewModal
    document={viewingDocument}
    onClose={() => setViewingDocument(null)}
    onForward={(document) => {
      setForwardingDocument(document);
      ...
    }}
  />
)}
```

**替换为**：
```typescript
{viewingDocument && (
  <WordStyleDocumentModal
    document={viewingDocument}
    author={conversation.characterSettings?.nickname || conversation.name}
    authorAvatar={conversation.characterSettings?.avatar || conversation.avatar}
    timestamp={Date.now()}
    onClose={() => setViewingDocument(null)}
    onSave={() => {
      try {
        saveToLibrary(viewingDocument, conversation.id);
        alert('✅ 文档已保存到文档库');
        setViewingDocument(null);
      } catch (error) {
        alert('❌ 保存失败');
      }
    }}
    onForward={() => {
      setForwardingDocument(viewingDocument);
      setViewingDocument(null);
      setShowSelectContact(true);
    }}
  />
)}
```

---

### 4. 更新转发逻辑（约第 4769 行）

**保持不变**，转发逻辑已经是正确的，只需确保 `forwardingDocument` 类型正确。

---

## 🗑️ 可以删除的旧文件

完成上述修改后，可以安全删除：

```bash
rm src/components/DocumentCard.tsx
rm src/components/DocumentViewModal.tsx
rm src/utils/documentParser.ts
rm src/utils/smartDocumentSystem.ts
rm src/utils/structuredDocumentParser.ts
```

---

## 🔍 搜索和替换命令

如果使用 VS Code，可以使用以下搜索替换：

### 1. 替换组件引用
- 查找：`DocumentCard`
- 替换为：`WordStyleDocumentCard`
- 范围：ChatScreen.tsx

### 2. 替换弹窗组件
- 查找：`DocumentViewModal`
- 替换为：`WordStyleDocumentModal`
- 范围：ChatScreen.tsx

---

## ⚠️ 注意事项

1. **类型检查**：确保 `msg.document` 存在时才渲染组件
2. **错误处理**：保存和转发功能都添加 try-catch
3. **用户反馈**：使用 alert 提示操作结果
4. **时间戳**：文档弹窗传入消息的时间戳

---

## 🧪 测试清单

完成修改后，请测试：

- [ ] AI 发送旧格式文档 `[发文档:标题:text]`
- [ ] AI 发送自然语言文档 `发送了文档《标题》`
- [ ] AI 发送 Markdown 格式 `# 标题\n内容`
- [ ] 点击文档卡片查看完整内容
- [ ] 文档弹窗中的复制功能
- [ ] 文档弹窗中的下载功能
- [ ] 保存文档到文档库
- [ ] 转发文档到其他对话
- [ ] 在文档库中查看已保存的文档

---

## 💡 建议

由于 ChatScreen.tsx 文件很大（4800+行），建议：

1. **分步修改**：先完成一个功能，测试通过后再进行下一个
2. **备份代码**：修改前先备份 ChatScreen.tsx
3. **使用 Git**：每完成一步就提交一次
4. **逐步测试**：每修改一处就测试相关功能

---

## 🚀 快速开始

最简单的方式是按照以下顺序：

1. ✅ 导入已更新
2. → 替换文档解析逻辑
3. → 替换文档卡片
4. → 替换文档弹窗
5. → 测试所有功能
6. → 删除旧文件

每一步完成后都运行应用测试，确保没有破坏现有功能。
