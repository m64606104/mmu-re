# 🧠 AI幼儿园记忆系统设计文档

## 📋 核心设计理念

### 1. 双层存储架构

```
┌─────────────────────────────────────────┐
│          用户可见层 (User Layer)         │
│  - 教过的词语列表                        │
│  - 识字量统计                            │
│  - 成长数据                              │
│  - 学习进度                              │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│        AI记忆库层 (Memory Bank)          │
│  - 深度词汇理解                          │
│  - 完整对话历史                          │
│  - 学习过程细节                          │
│  - 对用户的了解                          │
│  - AI的内部思考                          │
└─────────────────────────────────────────┘
```

### 2. 存储位置：全部在IndexedDB

**重要原则**：
- ✅ 所有AI幼儿园数据存储在IndexedDB
- ✅ 防止localStorage过载（5-10MB限制）
- ✅ 支持无限容量的数据存储
- ✅ 更好的性能和稳定性

**存储键（IndexedDB）**：
- `conversations`: AI的基本数据（用户可见）
- `ai_memory_banks`: AI的记忆库（后台，用户不可见）

---

## 🎯 核心需求实现

### ✅ 需求1：AI的后台记忆库

**用户可见的数据**（存储在`conversations`）：
```typescript
{
  id: "child_xxx",
  name: "小明",
  aiChildData: {
    vocabulary: [
      {
        word: "苹果",
        definition: "红色的水果，脆脆的", // 用户教的原文
        familiarity: 80,
        learnedAt: timestamp
      }
    ],
    totalWordsLearned: 50,
    exp: 1200,
    level: 5,
    ...
  }
}
```

**AI独有的记忆库**（存储在`ai_memory_banks`）：
```typescript
{
  childId: "child_xxx",
  
  // 对话记忆（所有历史对话）
  conversationHistory: [
    {
      id: "conv_xxx",
      timestamp: xxx,
      messages: [...],
      context: "讨论苹果",
      emotionalTone: "happy",
      learnedFromThis: ["苹果", "好吃"]
    }
  ],
  
  // 词汇深度理解
  wordDeepUnderstanding: [
    {
      word: "苹果",
      userDefinition: "红色的水果，脆脆的", // 用户教的
      learnedFrom: "wordcard",
      usageExamples: ["我喜欢吃苹果", "苹果很甜"],
      associatedWords: ["红色", "水果", "好吃"],
      confidenceLevel: 85
    }
  ],
  
  // 对用户的了解
  userProfile: {
    teachingStyle: {
      patience: 80,
      detailLevel: 70,
      encouragement: 90
    },
    preferences: {
      favoriteTopics: ["动物", "水果"],
      teachingTime: ["早上", "晚上"]
    }
  },
  
  // 学习笔记（AI的内部思考）
  learningNotes: [
    {
      type: "insight",
      content: "原来红色的东西都叫'红色'",
      relatedWords: ["红色", "苹果"]
    }
  ]
}
```

---

### ✅ 需求2：聊天中学习统一

**问题**：
之前聊天中学习可能没有保存用户的完整定义

**解决方案**：

#### **词卡教学**
```typescript
// 用户通过词卡教学
await teachWord(childId, "苹果", "红色的水果，脆脆的", []);
↓
// 1. 保存到conversations（用户可见）
child.aiChildData.vocabulary.push({
  word: "苹果",
  definition: "红色的水果，脆脆的",  // 用户原文
  ...
});
↓
// 2. 保存到AI记忆库（后台）
await recordWordLearning(
  childId,
  "苹果",
  "红色的水果，脆脆的",  // 用户原文
  'wordcard',
  "用户教学：红色的水果，脆脚的"
);
```

#### **聊天中学习（AI提问）**
```typescript
// 场景：AI问"苹果是什么？"，用户回答
用户："苹果就是红色的水果，很好吃"
↓
// 检测到教学
await teachWord(childId, "苹果", userInput, []);
↓
// 1. 保存到conversations（用户可见）
vocabulary.push({
  word: "苹果",
  definition: "苹果就是红色的水果，很好吃",  // 用户原文
  ...
});
↓
// 2. 保存到AI记忆库（后台）
await recordWordLearning(
  childId,
  "苹果",
  "苹果就是红色的水果，很好吃",  // 用户原文
  'chat',
  "聊天中学习，用户说：..."
);
```

#### **聊天中学习（主动教学）**
```typescript
// 场景：用户主动说"苹果是红色的水果"
用户："苹果是红色的水果"
↓
// 检测到模式："XX是..."
const word = "苹果";
const definition = "红色的水果";
↓
// 同样的流程
await teachWord(childId, word, definition, []);
await recordWordLearning(childId, word, definition, 'chat', ...);
```

**统一原则**：
- ✅ 无论哪种方式，都保存用户教的原文
- ✅ 不添加任何大模型的知识
- ✅ 系统提示词中包含用户教的定义
- ✅ AI只能基于用户教的定义来理解

---

### ✅ 需求3：长期记忆

**实现方式**：

#### **对话历史记忆**
```typescript
// 每次对话后自动记录
await recordConversation(
  childId,
  messages,           // 最近10条消息
  "讨论苹果和水果",  // 对话背景
  ["苹果"]           // 学到的新词
);
```

#### **词汇学习轨迹**
```typescript
wordMemory.reviewHistory.push({
  timestamp: Date.now(),
  context: "用户问：你知道苹果吗",
  performance: 85  // AI使用正确度
});
```

#### **长期记忆摘要（用于系统提示词）**
```typescript
const memorySummary = await getLongTermMemorySummary(childId);

// 输出示例：
【长期记忆】
最近重要对话：
- 2025-11-23: 学习了水果相关的词
- 2025-11-22: 讨论了颜色

掌握很好的词：苹果、红色、好吃、高兴

最近的思考：
- 原来红色的东西都叫'红色'
- 我想学更多关于水果的词
```

#### **检索机制**
```typescript
// 获取某个词的深度记忆
const wordMemory = await getWordMemory(childId, "苹果");
// 返回：用户定义、使用例子、关联词、学习轨迹等

// 获取对用户的了解
const memoryBank = await getAIMemoryBank(childId);
const userStyle = memoryBank.userProfile.teachingStyle;
// 了解用户的教学风格、偏好、情感模式
```

---

### ✅ 需求4：存储方案确认

**存储架构图**：
```
localStorage (< 1MB)
├── apiConfig        // API配置
├── userProfile      // 用户资料
├── theme            // 主题设置
└── appSettings      // 应用设置

IndexedDB (无限容量) ⭐
├── conversations           // AI基本数据
│   ├── child_001          // 小明
│   ├── child_002          // 小红
│   └── ...
│
├── ai_memory_banks         // AI记忆库 ⭐ NEW
│   ├── child_001          // 小明的记忆库
│   │   ├── conversationHistory
│   │   ├── wordDeepUnderstanding
│   │   ├── userProfile
│   │   └── learningNotes
│   └── child_002          // 小红的记忆库
│
├── moments                 // 朋友圈
├── chat_memory_banks       // 主聊天记忆库
└── ...其他数据
```

**确认事项**：
- ✅ AI幼儿园所有数据在IndexedDB中
- ✅ 不使用localStorage存储大数据
- ✅ 防止内存过载
- ✅ 支持数据无限增长

**访问方式**：
```typescript
// 统一使用smartSave/smartLoad
import { smartSave, smartLoad } from './utils/storage';

// 自动路由到IndexedDB
await smartSave('conversations', data);
const data = await smartLoad('conversations');

await smartSave('ai_memory_banks', memoryBanks);
const banks = await smartLoad('ai_memory_banks');
```

---

## 🔄 数据流程图

### 教学流程

```
用户教词
  ↓
teachWord()
  ↓
┌─────────────────────────┬─────────────────────────┐
│                         │                         │
│  保存到conversations     │  保存到ai_memory_banks   │
│  (用户可见)              │  (AI后台)               │
│                         │                         │
│  - word: "苹果"         │  - userDefinition       │
│  - definition: "..."    │  - learnedFrom          │
│  - familiarity          │  - usageExamples        │
│  - learnedAt            │  - associatedWords      │
│                         │  - confidenceLevel      │
│                         │  - reviewHistory        │
└─────────────────────────┴─────────────────────────┘
```

### 聊天流程

```
用户发送消息
  ↓
AI回复
  ↓
检测：用户是否在教新词？
  ↓ 是
teachWord() + recordWordLearning()
  ↓
recordConversation() [未来功能]
  ↓
保存到conversations和ai_memory_banks
```

### 系统提示词构建

```
buildChildSystemPrompt()
  ↓
获取用户可见数据（conversations）
  ↓
获取长期记忆摘要（ai_memory_banks）
  ↓
构建提示词：
  - 用户教的词和定义（前30个）
  - 极其重要的认知规则
  - 长期记忆摘要
  - 语言规则
  - 示例对话
```

---

## 💾 存储容量分析

### localStorage（弃用大数据）
```
只存储配置：< 1MB
- apiConfig: ~1KB
- userProfile: ~5KB
- theme: ~1KB
- appSettings: ~2KB
总计：< 100KB
```

### IndexedDB（主要存储）
```
conversations:
- 每个AI: ~50KB-500KB
- 10个AI: ~5MB

ai_memory_banks:
- 每个AI: ~100KB-1MB
- 对话历史（100次）: ~200KB
- 词汇深度理解（500个）: ~300KB
- 学习笔记（50条）: ~50KB
- 10个AI: ~10MB

总计：15-50MB（完全可控）
```

**优势**：
- ✅ IndexedDB无容量限制（实际上GB级）
- ✅ 数据结构化，查询快速
- ✅ 支持事务，数据安全
- ✅ 不影响页面性能

---

## 🎯 API集成点

### 1. teachWord（词卡教学）
```typescript
位置：src/utils/aiKindergartenManager.ts

修改：
- 保存到conversations ✅
- 调用recordWordLearning() ✅
- 保存用户教的原始定义 ✅
```

### 2. 聊天中学习
```typescript
位置：src/components/AIChildChat.tsx

修改：
- 检测AI提问 ✅
- 检测用户教学 ✅
- 调用teachWord() ✅
- 调用recordWordLearning() ✅
- 保存用户教的原始定义 ✅
```

### 3. 系统提示词
```typescript
位置：src/components/AIChildChat.tsx
     src/components/TopicDiscussionScreen.tsx

修改：
- 包含用户教的词和定义 ✅
- 强调只基于用户教的内容 ✅
- 添加认知规则 ✅
- 错误和正确示范 ✅
```

### 4. 记忆系统核心
```typescript
新增文件：src/utils/aiMemorySystem.ts

功能：
- getAIMemoryBank() ✅
- saveAIMemoryBank() ✅
- recordConversation() ✅
- recordWordLearning() ✅
- getWordMemory() ✅
- addLearningNote() ✅
- updateUserMemory() ✅
- getLongTermMemorySummary() ✅
```

---

## 📊 未来扩展

### 阶段1（已完成）：
- ✅ 基础记忆库结构
- ✅ 词汇学习记录
- ✅ 用户教的定义保存
- ✅ IndexedDB存储

### 阶段2（待开发）：
- ⏳ 对话记录自动保存
- ⏳ 长期记忆摘要融入提示词
- ⏳ AI学习笔记自动生成
- ⏳ 对用户的深度了解

### 阶段3（远期）：
- ⏳ 记忆检索优化
- ⏳ 记忆遗忘机制
- ⏳ 记忆重要性评分
- ⏳ 跨AI记忆共享（可选）

---

## 🔐 数据安全

### 隐私保护
- ✅ 记忆库完全本地存储
- ✅ 不上传到服务器
- ✅ 用户可以删除AI和所有记忆
- ✅ 导出功能包含完整记忆

### 数据备份
- ✅ IndexedDB持久化存储
- ✅ 支持导出JSON备份
- ✅ 可恢复到任意时间点

---

## 🎓 使用示例

### 创建AI并教学
```typescript
// 1. 创建AI
const child = createAIChild("小明");

// 2. 教词
await teachWord(child.id, "苹果", "红色的水果，脆脆的", []);
// ✅ 保存到conversations
// ✅ 保存到ai_memory_banks

// 3. 聊天
用户："你知道苹果吗？"
AI："知道！苹果...红色的！脆脆的！"
// ✅ AI基于用户教的定义回答

// 4. 聊天中学习
AI："香蕉...是什么？"
用户："香蕉是黄色的水果"
// ✅ 自动学习"香蕉"
// ✅ 保存用户教的定义
```

### 查询记忆
```typescript
// 获取AI的记忆库
const memoryBank = await getAIMemoryBank(childId);

// 查看对话历史
console.log(memoryBank.conversationHistory);

// 查看词汇深度理解
console.log(memoryBank.wordDeepUnderstanding);

// 了解用户
console.log(memoryBank.userProfile);
```

---

## ✅ 实现确认清单

- [x] 数据结构设计
- [x] IndexedDB存储配置
- [x] 记忆系统核心函数
- [x] 词卡教学集成
- [x] 聊天中学习集成（AI提问）
- [x] 聊天中学习集成（主动教学）
- [x] 系统提示词强化
- [x] 用户定义保存统一
- [x] 移除localStorage大数据
- [x] 长期记忆功能
- [ ] 对话记录自动保存（阶段2）
- [ ] 记忆摘要融入提示词（阶段2）

---

## 🎉 总结

### 核心特点

1. **双层架构**：用户可见 + AI后台记忆
2. **统一定义**：无论哪种方式，都保存用户教的原文
3. **IndexedDB存储**：防止内存过载，支持无限数据
4. **长期记忆**：AI记住所有交互和学习过程
5. **个性化**：每个AI有独特的记忆库

### 用户体验

- ✅ 用户教什么，AI就学什么
- ✅ AI不使用大模型自己的知识
- ✅ 真实的从零学习体验
- ✅ 完整的成长记录
- ✅ 永久的数据保存

### 技术优势

- ✅ 清晰的数据架构
- ✅ 高效的存储方案
- ✅ 可扩展的记忆系统
- ✅ 安全的隐私保护
- ✅ 完整的备份机制

**这是一个真正有记忆、有成长、有个性的AI教育系统！** 🌱✨
