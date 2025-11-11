# Word 风格文档系统 - 集成指南

## 🎯 概述

新的文档系统采用 **Word 风格设计**，支持多种格式的文档解析，并提供了更优雅的展示效果。

---

## 📦 新增文件

### 1. **增强文档解析器**
`src/utils/enhancedDocumentParser.ts`

**功能**：
- 支持 5 种解析格式（JSON、HTML、Markdown、自然语言、旧版标记）
- 安全的 HTML 清理
- 文档预览生成

**关键函数**：
```typescript
// 主解析函数
parseEnhancedDocument(content: string): DocumentMessage | null

// 辅助函数
sanitizeHTML(html: string): string
stripHTML(html: string): string
escapeHTML(text: string): string
truncateHTML(html: string, maxLength: number): string
extractDocumentText(doc: DocumentMessage): string
generateDocumentPreview(doc: DocumentMessage, maxLength?: number): string
```

### 2. **Word 风格文档卡片**
`src/components/WordStyleDocumentCard.tsx`

**功能**：
- 紧凑模式：用于聊天气泡
- 标准模式：用于文档库
- 支持保存和转发

**Props**：
```typescript
{
  document: DocumentMessage;
  onClick: () => void;
  onSave?: () => void;
  onForward?: () => void;
  compact?: boolean; // 紧凑模式
}
```

### 3. **Word 风格文档弹窗**
`src/components/WordStyleDocumentModal.tsx`

**功能**：
- A4 纸张效果
- 全屏阅读模式
- 复制、下载、保存、转发功能

**Props**：
```typescript
{
  document: DocumentMessage;
  author?: string;
  authorAvatar?: string;
  timestamp?: number;
  onClose: () => void;
  onSave?: () => void;
  onForward?: () => void;
}
```

---

## 🔄 集成到 ChatScreen

### 步骤 1：更新导入

```typescript
// 替换旧的导入
import DocumentCard from './DocumentCard';
import DocumentViewModal from './DocumentViewModal';

// 为新的导入
import WordStyleDocumentCard from './WordStyleDocumentCard';
import WordStyleDocumentModal from './WordStyleDocumentModal';
import { parseEnhancedDocument } from '../utils/enhancedDocumentParser';
import { saveDocument as saveToLibrary } from '../utils/documentLibrary';
```

### 步骤 2：替换文档解析逻辑

**旧代码** (第 267-451 行)：
```typescript
// 🔥 纯粹化的文档解析逻辑
const DOC_PATTERN = /\[发文档:([^:]+):([^\]]+)\]/g;
// ... 复杂的解析逻辑 ...
```

**新代码**：
```typescript
// 🌟 增强的文档解析（支持多种格式）
const parsedDoc = parseEnhancedDocument(finalContent);

if (parsedDoc) {
  console.log('✅ [文档解析] 成功识别文档');
  
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
  
  // 清空 finalContent（文档已提取）
  finalContent = '';
}
```

### 步骤 3：替换文档渲染

**查找所有 `DocumentCard` 引用并替换为 `WordStyleDocumentCard`**：

```typescript
// 旧代码
{msg.document && (
  <DocumentCard
    document={msg.document}
    onView={() => setViewingDocument(msg.document)}
    onSave={() => saveDocument(msg.document)}
    onForward={() => forwardDocument(msg.document)}
  />
)}

// 新代码
{msg.document && (
  <WordStyleDocumentCard
    document={msg.document}
    compact={true}  // 聊天气泡中使用紧凑模式
    onClick={() => setViewingDocument(msg.document)}
    onSave={() => handleSaveDocument(msg.document)}
    onForward={() => handleForwardDocument(msg.document)}
  />
)}
```

### 步骤 4：替换文档查看弹窗

**查找 `DocumentViewModal` 并替换为 `WordStyleDocumentModal`**：

```typescript
// 旧代码
{viewingDocument && (
  <DocumentViewModal
    document={viewingDocument}
    onClose={() => setViewingDocument(null)}
    onForward={(doc) => {...}}
  />
)}

// 新代码
{viewingDocument && (
  <WordStyleDocumentModal
    document={viewingDocument}
    author={conversation.characterSettings?.nickname || conversation.name}
    authorAvatar={conversation.characterSettings?.avatar || conversation.avatar}
    timestamp={Date.now()}
    onClose={() => setViewingDocument(null)}
    onSave={() => handleSaveDocument(viewingDocument)}
    onForward={() => handleForwardDocument(viewingDocument)}
  />
)}
```

### 步骤 5：实现保存和转发功能

```typescript
// 保存文档到文档库
const handleSaveDocument = (doc: DocumentMessage) => {
  try {
    saveToLibrary(doc, conversation.id);
    alert('✅ 文档已保存到文档库');
    setViewingDocument(null);
  } catch (error) {
    alert('❌ 保存失败：' + error);
  }
};

// 转发文档
const handleForwardDocument = (doc: DocumentMessage) => {
  setForwardingDocument(doc);
  setViewingDocument(null);
  setShowSelectContact(true);
};
```

---

## 🎨 样式说明

### Word 风格设计特点

1. **顶部装饰条**：不同类型文档有不同颜色
   - 文本文档：蓝色 `bg-blue-500`
   - Markdown：紫色 `bg-purple-500`
   - 代码文档：绿色 `bg-green-500`

2. **A4 纸张效果**：白色背景 + 阴影
   ```css
   bg-white shadow-lg rounded-lg
   ```

3. **专业排版**：
   - 字体：系统字体栈
   - 行高：1.8
   - 字号：16px
   - 最大宽度：4xl (56rem)

4. **渐变图标背景**：
   ```css
   text-blue-600 bg-blue-50
   ```

---

## 🔧 支持的文档格式

### 1. JSON 格式 (优先级最高)
```json
{
  "title": "失控",
  "content": "<p>这是内容...</p>",
  "type": "text",
  "greeting": "请查收"
}
```

### 2. HTML <doc> 标签
```html
<doc title="失控" doc-type="text" greeting="请查收">
  <h2>第一章</h2>
  <p>内容...</p>
</doc>
```

### 3. Markdown 格式
```markdown
# 失控

## 第一章

这是内容...
```

### 4. 自然语言
```
发送了文档《失控》
这是一本关于复杂系统的书...
```

### 5. 旧版标记 (兼容)
```
[发文档:失控:text] 这是内容...
```

---

## 🚀 优势对比

| 特性 | 旧系统 | 新系统 (Word 风格) |
|------|--------|-------------------|
| 解析格式 | 仅标记格式 | 5种格式 |
| 容错性 | 低 | 高 |
| 视觉效果 | 简单卡片 | Word 风格 |
| 安全性 | 基础 | HTML 白名单过滤 |
| 功能 | 基础查看 | 复制/下载/保存/转发 |
| 代码量 | 185行 | 简化后50行 |

---

## 📝 迁移检查清单

- [x] 创建 `enhancedDocumentParser.ts`
- [x] 创建 `WordStyleDocumentCard.tsx`
- [x] 创建 `WordStyleDocumentModal.tsx`
- [ ] 更新 ChatScreen 导入
- [ ] 替换文档解析逻辑
- [ ] 替换 DocumentCard 为 WordStyleDocumentCard
- [ ] 替换 DocumentViewModal 为 WordStyleDocumentModal
- [ ] 实现 handleSaveDocument 函数
- [ ] 实现 handleForwardDocument 函数
- [ ] 删除旧组件 DocumentCard.tsx
- [ ] 删除旧组件 DocumentViewModal.tsx
- [ ] 测试所有文档格式
- [ ] 测试保存功能
- [ ] 测试转发功能

---

## 🔍 需要删除的旧文件

完成集成后，可以安全删除：

1. `src/components/DocumentCard.tsx`
2. `src/components/DocumentViewModal.tsx`
3. `src/utils/documentParser.ts` (如果存在)
4. `src/utils/smartDocumentSystem.ts` (如果不再使用)
5. `src/utils/structuredDocumentParser.ts` (如果不再使用)

---

## 💡 使用建议

### AI 提示词更新

建议更新 AI 的系统提示词，告知支持的格式：

```
发送文档时，你可以使用以下任一格式：

1. 最简单：
发送了文档《标题》
正文内容...

2. 结构化：
# 标题

正文内容...

3. 标准格式：
[发文档:标题:text] 正文内容...

选择最适合的格式即可，系统会自动识别。
```

---

## 🎉 总结

新的 Word 风格文档系统：
- ✅ **更智能**：支持多种格式，AI 输出更自由
- ✅ **更安全**：HTML 白名单过滤
- ✅ **更美观**：专业的 Word 风格设计
- ✅ **更实用**：复制、下载、保存、转发功能完善
- ✅ **更简洁**：代码大幅简化

完成迁移后，文档系统将更加强大和易用！
