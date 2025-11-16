# 群聊功能改进实施计划

## 🎯 核心需求

根据用户反馈，需要实现以下功能：

### 1. AI领取群红包逻辑优化

**当前问题**:
- 使用简单的概率判断（活泼90%，默认70%等）
- 没有考虑角色设置、上下文和记忆库

**改进方案**:
参考私聊AI接收红包的逻辑，让AI基于以下因素自主决定：
- 角色性格设定
- 与发送者的关系
- 群聊上下文（最近的聊天内容）
- 记忆库内容
- 红包金额和类型

**实现方式**:
1. 创建 `aiGroupRedPacketDecision.ts` 构建决策提示词
2. 调用AI API让AI自己决定是否领取
3. 解析AI回复（"领取"或"不领取"）

**技术要点**:
- 需要传入：AI设置、红包信息、最近消息、群名、API配置
- 专属红包：只有指定AI能领取
- 口令红包：AI无法猜测，自动跳过
- 已领取的：不再重复领取

---

### 2. 群聊记忆库功能

**核心需求**:
- 群聊内容需要计入AI的记忆库
- 在角色设置的记忆库里开设"群聊记忆"区域
- 逻辑和私聊记忆一样
- 默认每50条消息总结记忆

**数据结构**:
```typescript
interface MemoryBank {
  conversationId: string;
  memories: MemoryEntry[];
  lastSummaryMessageCount: number;
  
  // 新增：区分私聊和群聊记忆
  privateMemories?: MemoryEntry[];  // 私聊记忆
  groupMemories?: MemoryEntry[];    // 群聊记忆
}

interface MemoryEntry {
  content: string;
  category: string;
  importance: number;
  timestamp: number;
  source: 'private' | 'group';  // 新增：记忆来源
  groupName?: string;            // 新增：如果是群聊记忆，记录群名
}
```

**实现步骤**:

#### 步骤1: 扩展记忆库数据结构
- 修改 `memorySystem.ts` 支持区分私聊和群聊记忆
- 添加 `source` 和 `groupName` 字段
- 保持向后兼容

#### 步骤2: 群聊消息触发记忆总结
- 在群聊生成完成后，检查是否需要总结
- 每50条群聊消息触发一次总结
- 使用独立的计数器 `lastGroupSummaryCount`

#### 步骤3: 群聊记忆总结提示词
```
【群聊记忆总结任务】

请分析以下群聊对话，提取对"你"（${aiName}）有价值的记忆：

【群聊信息】：
- 群名：${groupName}
- 群成员：${members}

【最近对话】：
${messages}

【已有记忆】：
${existingMemories}

请提取：
1. 群友的性格特点、喜好
2. 群里讨论的重要话题
3. 你参与的互动和约定
4. 群里的规则或习惯
```

#### 步骤4: 记忆使用
- 在AI生成回复时，同时注入私聊记忆和群聊记忆
- 区分记忆来源，让AI知道这是群聊记忆

---

### 3. 自定义记忆总结条数

**当前状态**:
- 固定的选项：25条、50条、100条、200条
- 不支持自定义

**改进方案**:
- 添加"自定义"选项
- 弹出输入框让用户输入数字
- 验证范围（10-500条）
- 保存到角色设置

**UI设计**:
```
记忆总结频率：
[ ] 25条消息
[ ] 50条消息
[ ] 100条消息
[ ] 200条消息
[x] 自定义: [___] 条消息  (10-500)
```

**实现位置**:
- `CharacterSettingsScreen.tsx` 或 `MemoryManager.tsx`
- 修改 `MemorySettings` 接口添加 `customInterval?: number`

---

## 🔧 实施顺序

### 优先级 P0（必须先实现）
1. **群聊记忆库功能** - 这是基础功能，AI领取红包需要用到记忆

### 优先级 P1（然后实现）
2. **自定义记忆总结条数** - 用户体验改进

### 优先级 P2（最后实现）
3. **AI领取红包优化** - 依赖记忆库功能

---

## 📝 详细实现指南

### 一、群聊记忆库实现

#### 文件修改清单
1. `src/utils/memorySystem.ts`
   - 添加 `source` 和 `groupName` 字段
   - 修改 `addMemory` 函数支持群聊记忆
   - 添加 `getGroupMemories` 函数

2. `src/utils/groupChatService.ts`
   - 在 `onAllComplete` 回调中检查是否需要总结
   - 调用记忆总结函数
   - 保存群聊记忆

3. `src/components/ChatScreen.tsx`
   - 群聊生成完成后触发记忆总结
   - 传入正确的参数（群名、成员等）

#### 代码示例

**扩展MemoryEntry**:
```typescript
export interface MemoryEntry {
  content: string;
  category: 'info' | 'preference' | 'event' | 'relationship';
  importance: number;
  timestamp: number;
  source?: 'private' | 'group';  // 记忆来源
  groupName?: string;             // 群聊名称
  groupId?: string;               // 群聊ID
}
```

**群聊记忆总结**:
```typescript
export const performGroupMemorySummary = async (
  conversationId: string,
  groupName: string,
  messages: Message[],
  aiName: string,
  apiConfig: ApiConfig
) => {
  const memoryBank = getMemoryBank(conversationId);
  const groupMemories = memoryBank.memories.filter(m => m.source === 'group');
  
  const prompt = buildGroupMemorySummaryPrompt(
    groupName,
    messages,
    groupMemories,
    aiName
  );
  
  // 调用API获取总结
  const response = await callAI(prompt, apiConfig);
  const newMemories = parseMemorySummaryResponse(response);
  
  // 添加群聊标记
  newMemories.forEach(memory => {
    addMemory(conversationId, {
      ...memory,
      source: 'group',
      groupName: groupName
    });
  });
};
```

---

### 二、自定义记忆总结条数

#### 修改 MemorySettings 接口
```typescript
export interface MemorySettings {
  enableAutoSummary: boolean;
  summaryInterval: number;  // 25 | 50 | 100 | 200 | custom
  customInterval?: number;  // 自定义间隔（10-500）
}
```

#### UI 实现
```tsx
<div className="space-y-2">
  <label className="block text-sm font-medium">记忆总结频率</label>
  
  <div className="space-y-2">
    {[25, 50, 100, 200].map(value => (
      <label key={value} className="flex items-center gap-2">
        <input
          type="radio"
          checked={summaryInterval === value}
          onChange={() => setSummaryInterval(value)}
        />
        {value}条消息
      </label>
    ))}
    
    <label className="flex items-center gap-2">
      <input
        type="radio"
        checked={summaryInterval === 'custom'}
        onChange={() => setSummaryInterval('custom')}
      />
      自定义:
      <input
        type="number"
        min="10"
        max="500"
        value={customInterval || 50}
        onChange={(e) => setCustomInterval(parseInt(e.target.value))}
        disabled={summaryInterval !== 'custom'}
        className="w-20 px-2 py-1 border rounded"
      />
      条消息
    </label>
  </div>
</div>
```

---

### 三、AI领取红包优化

#### 决策提示词示例
```
你是${aiName}。

【当前情况】：
- 群聊：${groupName}
- ${senderName}发了红包
- 类型：${redPacketType}
- 金额：¥${amount}
- 留言：${message}

【最近聊天】：
${recentMessages}

【你的记忆】：
${memories}

【你的性格】：
${personality}

请决定是否领取这个红包。
只回复"领取"或"不领取"。
```

#### 调用示例
```typescript
const decision = await aiDecideClaimRedPacket(
  aiSettings,
  redPacket,
  recentMessages,
  groupName,
  apiConfig
);

if (decision) {
  // 领取红包
  const result = await claimRedPacket(...);
}
```

---

## ⚠️ 注意事项

1. **API调用成本**：
   - AI决策领取红包会额外消耗API
   - 群聊记忆总结也会消耗API
   - 建议在设置中提示用户

2. **性能优化**：
   - 群聊记忆总结可以放在后台执行
   - 不阻塞消息发送
   - 失败时不影响正常聊天

3. **数据兼容性**：
   - 新增字段都设置为可选
   - 保持向后兼容
   - 迁移旧数据时添加默认值

4. **用户体验**：
   - 记忆总结进度提示
   - 自定义条数验证
   - 清晰的设置说明

---

## 🎯 预期效果

### AI领取红包
- ✅ 基于真实性格和关系决定
- ✅ 考虑上下文和记忆
- ✅ 更加自然和真实

### 群聊记忆
- ✅ AI记住群聊内容
- ✅ 区分私聊和群聊记忆
- ✅ 提升群聊连贯性

### 自定义设置
- ✅ 用户可自由设置总结频率
- ✅ 10-500条灵活范围
- ✅ 满足不同使用需求

---

## 📋 实施检查清单

- [ ] 扩展 MemoryEntry 接口
- [ ] 实现群聊记忆总结功能
- [ ] 添加自定义间隔设置UI
- [ ] 实现AI红包决策系统
- [ ] 更新相关提示词
- [ ] 测试群聊记忆功能
- [ ] 测试自定义间隔
- [ ] 测试AI领取红包
- [ ] 文档更新
- [ ] 用户指南更新
