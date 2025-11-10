# 📄 文档解析问题修复方案

## 🔍 **问题分析**

### **当前存在的问题**

#### 1. **格式识别过于宽松**
```typescript
// ❌ 错误：描述性格式会误识别
const descriptiveDocMatches = Array.from(finalContent.matchAll(/发送了?文档[「『]([^」』]+)[」』]/g));
```

**误识别案例：**
- "我发了文档「XX」" → 被当作文档
- "你的文档「XX」很好" → 被当作文档
- "正文在......标签前面？" → 被当作文档（包含"文"字）

#### 2. **内容提取逻辑错误**
```typescript
// ❌ 错误：从标记前面提取内容
if (isPlaceholder) {
  docContent = finalContent.substring(0, tagIndex).trim();
}
```

**导致的问题：**
- AI的普通聊天内容被当作文档内容
- 文档内容泄露到聊天气泡外
- 用户看到文档内容+文档卡片（重复显示）

#### 3. **AI理解错误**
**AI的错误理解：**
"我的流程是：第一步，写好正文；第二步，打出「文文档」标签；第三步，把正文贴出来"

**正确格式应该是：**
```
[发文档:标题:类型] 正文内容紧跟在标记后面...
```

标记和正文是一个整体，不能分开！

#### 4. **日志不够详细**
```typescript
console.log('🔍 开始解析文档，原始内容：', finalContent);
console.log('📋 标准格式匹配结果：', standardDocMatches.length);
```

**缺少的信息：**
- 为什么识别为文档？
- 内容从哪里提取的？
- 每一步的决策依据是什么？

---

## ✅ **修复方案**

### **核心原则**
1. **唯一标准格式**：只认 `[发文档:标题:类型]` 这一种格式
2. **内容紧跟标记**：标记后的内容是文档，标记前的是普通聊天
3. **严格边界**：遇到双换行、下一个标记、消息末尾则停止
4. **详细日志**：记录每一步的识别和提取过程
5. **纯粹实现**：不支持描述性格式，让AI按规则输出

### **新的解析逻辑**

```typescript
/**
 * 🔥 纯粹化的文档解析逻辑
 * 
 * 核心规则：
 * 1. 只识别标准格式：[发文档:标题:类型]
 * 2. 标记后的内容是文档内容（直到双换行或消息结束）
 * 3. 标记前的内容是普通聊天文本
 * 4. 不支持描述性格式（如"发送了文档「XX」"）
 */

// 步骤1：识别标准格式标记
const DOC_PATTERN = /\[发文档:([^:]+):([^\]]+)\]/g;
const docMatches = Array.from(finalContent.matchAll(DOC_PATTERN));

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📄 开始文档解析');
console.log('原始内容长度:', finalContent.length);
console.log('原始内容预览:', finalContent.substring(0, 200));
console.log('检测到文档标记数量:', docMatches.length);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

if (docMatches.length === 0) {
  console.log('✅ 未检测到文档标记，按普通消息处理');
  // 继续正常流程
}

// 步骤2：按标记位置分割消息
let currentIndex = 0;
const segments = [];

for (let i = 0; i < docMatches.length; i++) {
  const match = docMatches[i];
  const tagIndex = match.index!;
  const tagEndIndex = tagIndex + match[0].length;
  
  console.log(`\n━━ 处理第${i + 1}个文档标记 ━━`);
  console.log('标题:', match[1]);
  console.log('类型:', match[2]);
  console.log('标记位置:', tagIndex, '-', tagEndIndex);
  
  // 2.1 提取标记前的普通文本
  if (tagIndex > currentIndex) {
    const textBefore = finalContent.substring(currentIndex, tagIndex).trim();
    if (textBefore) {
      segments.push({ type: 'text', content: textBefore });
      console.log('标记前的文本:', textBefore.substring(0, 50) + '...');
      console.log('文本长度:', textBefore.length);
    } else {
      console.log('标记前无内容');
    }
  }
  
  // 2.2 提取文档内容（标记后到双换行/下一个标记/消息结束）
  const nextMatch = docMatches[i + 1];
  const contentEnd = nextMatch ? nextMatch.index! : finalContent.length;
  
  let docContent = finalContent.substring(tagEndIndex, contentEnd).trim();
  
  // 检查是否有双换行（文档内容边界）
  const doubleNewlineIndex = docContent.indexOf('\n\n');
  let textAfterDoc = '';
  
  if (doubleNewlineIndex !== -1) {
    textAfterDoc = docContent.substring(doubleNewlineIndex + 2).trim();
    docContent = docContent.substring(0, doubleNewlineIndex).trim();
    console.log('检测到双换行，文档内容在此结束');
    console.log('双换行后的内容:', textAfterDoc.substring(0, 50) + '...');
  }
  
  console.log('文档内容长度:', docContent.length);
  console.log('文档内容预览:', docContent.substring(0, 100) + '...');
  
  // 验证文档内容
  if (!docContent || docContent.length < 10) {
    console.error('❌ 文档内容过短或为空！');
    console.error('这可能是AI格式错误，应该是: [发文档:标题:类型] 内容...');
    console.error('实际收到的: [发文档:标题:类型]（后面没有内容）');
    
    // 创建错误提示文档
    segments.push({
      type: 'document',
      title: match[1],
      docType: match[2],
      content: `⚠️ 文档格式错误\n\nAI使用了文档标记，但没有提供内容。\n\n正确格式应该是：\n[发文档:${match[1]}:${match[2]}] 文档内容紧跟在后面...\n\n请重新生成。`,
      hasError: true
    });
  } else {
    segments.push({
      type: 'document',
      title: match[1],
      docType: match[2],
      content: docContent
    });
    console.log('✅ 成功提取文档内容');
  }
  
  // 如果有双换行后的内容，添加为普通文本
  if (textAfterDoc) {
    segments.push({ type: 'text', content: textAfterDoc });
    console.log('双换行后的文本:', textAfterDoc.substring(0, 50) + '...');
  }
  
  currentIndex = doubleNewlineIndex !== -1 
    ? tagEndIndex + doubleNewlineIndex + 2 
    : contentEnd;
}

// 步骤3：处理最后剩余的文本
if (currentIndex < finalContent.length) {
  const remainingText = finalContent.substring(currentIndex).trim();
  if (remainingText) {
    segments.push({ type: 'text', content: remainingText });
    console.log('\n━━ 剩余文本 ━━');
    console.log('内容:', remainingText.substring(0, 50) + '...');
  }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 解析结果摘要:');
console.log('总段落数:', segments.length);
segments.forEach((seg, idx) => {
  if (seg.type === 'text') {
    console.log(`  ${idx + 1}. [文本] 长度:${seg.content.length}`);
  } else {
    console.log(`  ${idx + 1}. [文档] "${seg.title}" 长度:${seg.content.length}`);
  }
});
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// 步骤4：根据segments创建消息
// 文本部分合并为 finalContent
// 文档部分创建为 document 消息
```

---

## 📊 **对比：修复前 vs 修复后**

### **修复前的问题**

```typescript
// ❌ 支持描述性格式（容易误识别）
const descriptiveDocMatches = Array.from(
  finalContent.matchAll(/发送了?文档[「『]([^」』]+)[」』]/g)
);

// ❌ 从标记前提取内容
if (isPlaceholder) {
  docContent = finalContent.substring(0, tagIndex).trim();
}

// ❌ 复杂的嵌套逻辑
if (idx === 0) {
  if (textBeforeFirstDoc && !docContent) {
    docContent = textBeforeFirstDoc;
    textBeforeFirstDoc = '';
  }
}
```

**结果：**
- ❌ 普通对话被误识别为文档
- ❌ 文档内容泄露到聊天气泡
- ❌ 日志不清晰
- ❌ 难以调试

### **修复后的逻辑**

```typescript
// ✅ 只识别标准格式
const DOC_PATTERN = /\[发文档:([^:]+):([^\]]+)\]/g;

// ✅ 从标记后提取内容
let docContent = finalContent.substring(tagEndIndex, contentEnd).trim();

// ✅ 双换行作为边界
const doubleNewlineIndex = docContent.indexOf('\n\n');
if (doubleNewlineIndex !== -1) {
  textAfterDoc = docContent.substring(doubleNewlineIndex + 2).trim();
  docContent = docContent.substring(0, doubleNewlineIndex).trim();
}

// ✅ 详细日志
console.log('━━ 处理第X个文档标记 ━━');
console.log('标题:', title);
console.log('标记位置:', tagIndex, '-', tagEndIndex);
console.log('文档内容长度:', docContent.length);
console.log('文档内容预览:', docContent.substring(0, 100));
```

**结果：**
- ✅ 只识别正确格式
- ✅ 内容不会泄露
- ✅ 日志清晰详细
- ✅ 易于调试

---

## 🎯 **实现步骤**

### **第1步：移除描述性格式支持**
- 删除 `descriptiveDocMatches` 相关代码
- 只保留标准格式识别

### **第2步：简化内容提取逻辑**
- 标记前 = 普通文本
- 标记后 = 文档内容
- 双换行 = 文档边界

### **第3步：增强日志系统**
- 记录每个标记的位置
- 记录内容提取的来源
- 记录分割的依据

### **第4步：错误提示**
- 如果标记后没有内容，创建错误文档
- 提示用户格式错误
- 不影响其他消息处理

### **第5步：更新System Prompt**
- 强调正确格式：`[发文档:标题:类型] 内容...`
- 明确内容必须紧跟标记
- 禁止使用描述性格式

---

## 🚀 **预期效果**

### **修复后的表现**

#### **场景1：正确格式**
```
输入: "我给你写了个故事 [发文档:小说:text] 第一章\n\n很久很久以前..."
输出:
  - 文本气泡: "我给你写了个故事"
  - 文档卡片: "小说"，内容="第一章\n\n很久很久以前..."
```

#### **场景2：普通对话不被误识别**
```
输入: "我发了文档「XX」给你了"
输出:
  - 文本气泡: "我发了文档「XX」给你了"
  - 无文档卡片
```

#### **场景3：格式错误提示**
```
输入: "[发文档:小说:text]"（后面没有内容）
输出:
  - 文档卡片: "小说"，内容="⚠️ 文档格式错误\n\n..."
```

#### **场景4：多个文档**
```
输入: "第一个 [发文档:A:text] 内容A\n\n第二个 [发文档:B:text] 内容B"
输出:
  - 文本气泡: "第一个"
  - 文档卡片: "A"
  - 文本气泡: "第二个"
  - 文档卡片: "B"
```

---

## 📝 **保留聊天记录**

✅ **不影响历史消息**
- 只修改解析逻辑，不修改数据结构
- 已存在的文档消息继续正常显示
- 新的文档按新规则解析

✅ **向后兼容**
- 如果历史消息中有描述性格式，会被当作普通文本
- 用户可以重新让AI按正确格式生成

---

## 🎊 **总结**

### **核心改进**
1. ✅ **移除描述性格式** → 不再误识别
2. ✅ **简化提取逻辑** → 内容不泄露
3. ✅ **增强日志系统** → 易于调试
4. ✅ **错误提示** → 用户知道问题
5. ✅ **更新System Prompt** → AI理解正确格式

### **修复原则**
- **纯粹化**：只支持一种标准格式
- **可预测**：逻辑简单清晰
- **可调试**：详细的日志
- **可扩展**：易于添加新功能
- **向后兼容**：不影响历史数据
