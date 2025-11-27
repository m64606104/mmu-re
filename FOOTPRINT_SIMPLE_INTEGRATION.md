# 🛤️ 人物行动轨迹 - 简单集成指南

## 🎯 核心逻辑（基于 Eve Chat 分析）

### 数据来源优先级：
1. **硬事实（高置信度 0.9+）**
   - 聊天记录 → "和你聊了关于工作的话题，感觉学到了很多"
   - 朋友圈动态 → "在上海分享了自己的心情..."
   - 子聊天活动 → "在私密空间和你深入讨论学习"

2. **状态记录（中置信度 0.7）**
   - AI状态变化 → "在认真学习中"

3. **合理补档（低置信度 0.3）**
   - 仅填补明显空档（如深夜睡眠时段）

### 个性化生成：
- **学生角色**：学习相关描述，温柔语气
- **上班族**：工作相关描述，放松语气  
- **自由职业**：创作相关描述，灵感语气

---

## 🚀 最简集成（3步搞定）

### 第1步：添加轨迹按钮

找到你现有的 AI 状态显示位置，添加点击事件：

```typescript
// 在 ChatScreen.tsx 或相关组件中
import { useState } from 'react';
import { FootprintModal } from '../components/FootprintModal';

const ChatScreen = () => {
  const [showFootprintModal, setShowFootprintModal] = useState(false);
  
  // 假设你现有的状态显示代码
  const renderAIStatus = () => {
    return (
      <div 
        className="ai-status-display cursor-pointer hover:bg-gray-100 p-2 rounded transition-colors"
        onClick={() => setShowFootprintModal(true)}
        title="点击查看行动轨迹"
      >
        <span className="status-indicator">🟢</span>
        <span>{aiStatus?.statusText}</span>
        {aiStatus?.currentActivity && (
          <span className="current-activity">• {aiStatus.currentActivity}</span>
        )}
        <span className="text-xs text-gray-400 ml-2">👆 查看轨迹</span>
      </div>
    );
  };

  return (
    <div>
      {renderAIStatus()}
      
      {/* 轨迹查看弹窗 */}
      <FootprintModal
        conversationId={conversationId}
        characterName={conversation?.name || ''}
        isOpen={showFootprintModal}
        onClose={() => setShowFootprintModal(false)}
      />
    </div>
  );
};
```

### 第2步：初始化存储服务

在应用启动时初始化（App.tsx）：

```typescript
import { useEffect } from 'react';
import { initFootprintStorage } from './utils/footprintStorage';

const App = () => {
  useEffect(() => {
    // 初始化轨迹存储（一次性操作）
    const initializeStorage = async () => {
      try {
        await initFootprintStorage();
        console.log('✅ 轨迹系统初始化成功');
      } catch (error) {
        console.error('❌ 轨迹系统初始化失败:', error);
      }
    };
    
    initializeStorage();
  }, []);

  // ... 其他应用逻辑
};
```

### 第3步：启动自动生成（可选）

在进入聊天页面时启动轨迹生成：

```typescript
import { useEffect } from 'react';
import { initializeFootprintGeneration } from './utils/footprintGenerator';

const ChatScreen = ({ conversationId }) => {
  useEffect(() => {
    if (conversationId) {
      // 启动轨迹自动生成
      initializeFootprintGeneration(conversationId);
    }
  }, [conversationId]);

  // ... 其他聊天逻辑
};
```

---

## 📱 效果展示

### 点击前：
```
🟢 在线 • 和你聊天中 👆 查看轨迹
```

### 点击后：
```
┌─────────────────────────────────┐
│  🎭 小明的行动轨迹              │
│  最近30天的活动记录             │
├─────────────────────────────────┤
│ 时间轨迹 | 统计分析            │
├─────────────────────────────────┤
│ 📅 2024年11月27日 (3项活动)    │
│                                │
│ 💬 14:30-15:00 和你聊了关于工作 │
│    的话题，感觉学到了很多       │
│    📍线上 • 置信度95%          │
│                                │
│ 📱 16:15 发了朋友圈，记录了... │
│    📍上海 • 置信度90%          │
│                                │
│ 😴 23:00-02:00 已经进入梦乡了   │
│    📍家 • 置信度30%            │
└─────────────────────────────────┘
```

---

## 🎨 个性化示例

### 学生角色：
```
💬 和你聊了关于学习的话题，感觉学到了很多
📚 在认真学习中
😴 已经进入梦乡了
```

### 上班族角色：
```
💬 和你聊了聊工作，放松了一下心情  
💼 在专注工作中
😴 正在休息中
```

### 活泼性格：
```
💬 和你聊了关于娱乐的话题，超开心！
🎮 在专注工作中，心情愉快
😴 开心地睡着了
```

### 温柔性格：
```
💬 温柔地和你聊了关于生活的话题
💼 在专注工作中，很安静
😴 温柔地睡着了
```

---

## ⚡ 立即可用功能

即使不启动自动生成，系统也能：

1. **显示已有轨迹** - 从 `AIActivityLog` 迁移的数据
2. **手动生成** - 调用 `generateFootprintNow(conversationId)`
3. **筛选查看** - 按类型、时间、置信度筛选
4. **统计分析** - 活动分布、聊天时长等

---

## 🔧 高级配置

### 调整生成频率：
```typescript
await initializeFootprintGeneration(conversationId, {
  generationInterval: 6,        // 6小时生成一次
  maxActivitiesPerDay: 15,     // 每日最多15个活动
  useAIGeneration: false,      // 暂时关闭AI生成
  confidenceThreshold: 0.5     // 只显示50%以上置信度
});
```

### 自定义角色模板：
```typescript
// 在 footprintGenerator.ts 中添加
const templates = {
  '程序员': [
    '和你聊了关于代码的话题，灵感又多了不少',
    '在编写代码中',
    '进入了代码的梦乡'
  ],
  '设计师': [
    '和你讨论了设计思路，很有收获的对话', 
    '在创作设计中',
    '进入了设计的梦乡'
  ]
};
```

---

## 🎯 总结

这套系统的核心优势：

✅ **真实数据优先** - 70%基于真实事件，30%合理推断  
✅ **个性化描述** - 根据角色设定调整语气和内容  
✅ **渐进式集成** - 可以先显示已有数据，再逐步启用生成  
✅ **用户友好** - 点击即可查看，界面现代化  
✅ **性能优化** - IndexedDB存储，支持大量历史数据  

现在你的项目就拥有了媲美 Eve Chat 的人物行动轨迹功能！🎉
