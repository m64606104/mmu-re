# 🛤️ 人物行动轨迹系统集成指南

## 一、系统概述

基于现有的 `AIStatus` 系统，扩展实现了完整的人物行动轨迹功能，参考 Eve Chat 的足迹系统设计。

### 核心特性
- **双表存储设计**：`FootprintActivity`（明细）+ `DailyFootprint`（汇总）
- **多数据源聚合**：聊天、状态、朋友圈、子聊天、系统事件
- **智能生成逻辑**：AI 生成 + 规则生成 + 置信度评分
- **时间轴可视化**：现代化弹窗界面，类似 Eve Chat 足迹
- **兼容现有系统**：基于现有 `AIStatusInfo` 扩展

## 二、集成步骤

### 2.1 初始化存储服务

在 `App.tsx` 或应用启动时初始化：

```typescript
import { initFootprintStorage } from './utils/footprintStorage';

// 在 App 组件的 useEffect 中
useEffect(() => {
  const initializeApp = async () => {
    try {
      // 初始化轨迹存储
      await initFootprintStorage();
      console.log('✅ 轨迹系统初始化成功');
    } catch (error) {
      console.error('❌ 轨迹系统初始化失败:', error);
    }
  };

  initializeApp();
}, []);
```

### 2.2 在聊天界面添加轨迹入口

修改显示 AI 状态的地方，添加点击查看轨迹的功能：

```typescript
// 在 ChatScreen.tsx 或相关组件中
import { FootprintModal } from '../components/FootprintModal';

const ChatScreen = () => {
  const [showFootprintModal, setShowFootprintModal] = useState(false);
  
  // 在 AI 状态显示区域添加点击事件
  const handleStatusClick = () => {
    setShowFootprintModal(true);
  };

  return (
    <div>
      {/* 现有的状态显示，添加点击事件 */}
      <div 
        className="ai-status-display cursor-pointer hover:bg-gray-100 p-2 rounded"
        onClick={handleStatusClick}
        title="点击查看行动轨迹"
      >
        <span className="status-indicator">🟢</span>
        <span>{aiStatus?.statusText}</span>
        {aiStatus?.currentActivity && (
          <span className="current-activity">• {aiStatus.currentActivity}</span>
        )}
      </div>

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

### 2.3 启动轨迹生成服务

在创建或进入对话时，启动轨迹生成：

```typescript
import { initializeFootprintGeneration } from './utils/footprintGenerator';

// 在进入聊天页面时
useEffect(() => {
  if (conversationId) {
    // 启动轨迹生成服务
    initializeFootprintGeneration(conversationId);
  }
}, [conversationId]);
```

### 2.4 增强现有 AI 状态管理

扩展现有的 `aiStatusManager.ts`，集成轨迹生成：

```typescript
// 在 aiStatusManager.ts 中添加
import { footprintGenerator } from './footprintGenerator';

export const updateAIStatusWithFootprint = async (
  conversationId: string, 
  status: AIStatus, 
  activity?: string
) => {
  // 调用原有的状态更新
  updateAIStatus(conversationId, status, activity);
  
  // 触发轨迹生成（如果有重要状态变化）
  if (activity && activity !== '在线') {
    try {
      await footprintGenerator.generateActivitiesForConversation(conversationId);
    } catch (error) {
      console.error('生成轨迹活动失败:', error);
    }
  }
};
```

## 三、数据迁移（可选）

如果你想把现有的 `AIActivityLog` 数据迁移到新系统：

```typescript
import { footprintStorage } from './utils/footprintStorage';
import { FootprintActivity } from './types/footprint';

const migrateExistingActivities = async (conversationId: string) => {
  try {
    // 读取现有的活动日志
    const statusData = localStorage.getItem(`ai_status_${conversationId}`);
    if (!statusData) return;

    const { activityLogs } = JSON.parse(statusData);
    if (!activityLogs || activityLogs.length === 0) return;

    // 转换为新格式
    const newActivities: FootprintActivity[] = activityLogs.map((log: any) => ({
      id: log.id,
      conversationId,
      timestamp: log.timestamp,
      activity: log.activity,
      activityType: inferActivityTypeFromOldLog(log.activity),
      status: log.status || 'online',
      location: log.location,
      source: 'system',
      confidence: 0.8, // 旧数据默认置信度
      createdAt: log.timestamp,
      tags: ['迁移数据']
    }));

    // 保存到新系统
    await footprintStorage.saveActivities(newActivities);
    console.log(`✅ 成功迁移 ${newActivities.length} 条活动记录`);
  } catch (error) {
    console.error('迁移活动记录失败:', error);
  }
};
```

## 四、配置选项

### 4.1 轨迹生成配置

```typescript
// 为不同角色设置不同的生成策略
const footprintConfigs = {
  // 活跃角色：生成更多轨迹
  activeCharacter: {
    enableAutoGeneration: true,
    generationInterval: 2, // 2小时
    maxActivitiesPerDay: 25,
    useAIGeneration: true,
    confidenceThreshold: 0.3
  },
  
  // 安静角色：生成较少轨迹
  quietCharacter: {
    enableAutoGeneration: true,
    generationInterval: 6, // 6小时
    maxActivitiesPerDay: 10,
    useAIGeneration: false,
    confidenceThreshold: 0.7
  }
};
```

### 4.2 UI 定制

你可以通过修改 `FootprintModal.tsx` 来定制界面：

```typescript
// 自定义活动类型配色
const CUSTOM_ACTIVITY_CONFIG = {
  // 添加新的活动类型
  studying: { icon: '📚', color: '#8B5CF6', label: '学习中' },
  gaming: { icon: '🎮', color: '#EC4899', label: '游戏中' },
  // 修改现有颜色
  chatting: { icon: '💬', color: '#YOUR_BRAND_COLOR', label: '聊天中' },
};
```

## 五、性能优化建议

### 5.1 数据清理

设置定期清理过期数据：

```typescript
// 每周清理90天前的数据
setInterval(async () => {
  try {
    const deletedCount = await footprintStorage.cleanupOldData(90);
    console.log(`🧹 清理了 ${deletedCount} 条过期轨迹记录`);
  } catch (error) {
    console.error('清理数据失败:', error);
  }
}, 7 * 24 * 60 * 60 * 1000); // 7天
```

### 5.2 批量生成优化

```typescript
// 为多个对话批量生成轨迹
const batchGenerateFootprints = async (conversationIds: string[]) => {
  const promises = conversationIds.map(id => 
    footprintGenerator.generateActivitiesForConversation(id)
  );
  
  const results = await Promise.allSettled(promises);
  console.log('批量生成完成:', results);
};
```

## 六、故障排除

### 6.1 常见问题

**Q: IndexedDB 初始化失败**
```typescript
// 添加降级到 localStorage 的机制
const fallbackStorage = {
  async saveActivity(activity: FootprintActivity) {
    const key = `footprint_${activity.conversationId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push(activity);
    localStorage.setItem(key, JSON.stringify(existing));
  }
};
```

**Q: 轨迹生成过于频繁**
```typescript
// 调整生成间隔
await footprintGenerator.initialize(conversationId, {
  generationInterval: 6, // 增加到6小时
  maxActivitiesPerDay: 10 // 减少每日最大数量
});
```

**Q: UI 性能问题（活动太多）**
```typescript
// 在 FootprintModal 中添加虚拟滚动或分页
const ITEMS_PER_PAGE = 50;
const [currentPage, setCurrentPage] = useState(1);

const paginatedActivities = useMemo(() => {
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  return filteredActivities.slice(start, start + ITEMS_PER_PAGE);
}, [filteredActivities, currentPage]);
```

## 七、扩展功能

### 7.1 导出轨迹数据

```typescript
const exportFootprintData = async (conversationId: string) => {
  const activities = await footprintStorage.getActivities(conversationId);
  const data = {
    conversationId,
    exportTime: new Date().toISOString(),
    totalActivities: activities.length,
    activities
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `footprint_${conversationId}_${Date.now()}.json`;
  a.click();
};
```

### 7.2 AI 智能分析

```typescript
// 使用 AI 分析轨迹模式
const analyzeFootprintPatterns = async (conversationId: string, apiConfig: any) => {
  const recentStats = await footprintStorage.getRecentStats(conversationId, 30);
  
  const prompt = `分析以下30天的活动轨迹，总结行为模式和建议：
活动总数：${recentStats.activities.length}
主要活动类型：${JSON.stringify(recentStats.activities.map(a => a.activityType))}
请提供：1. 行为模式总结 2. 作息习惯分析 3. 互动偏好 4. 改进建议`;

  // 调用你的 AI API
  const analysis = await callAIAPI(prompt, apiConfig);
  return analysis;
};
```

## 八、部署检查清单

- [ ] 添加新的类型定义文件 (`types/footprint.ts`)
- [ ] 集成存储服务初始化 (`footprintStorage.ts`)
- [ ] 添加轨迹生成服务 (`footprintGenerator.ts`)
- [ ] 添加轨迹查看弹窗 (`FootprintModal.tsx`)
- [ ] 修改现有状态显示，添加点击事件
- [ ] 启动自动生成服务
- [ ] 测试数据存储和读取
- [ ] 测试 UI 交互和性能
- [ ] 配置定期数据清理
- [ ] 添加错误处理和降级方案

完成这些步骤后，你的项目就会拥有一个功能完整的人物行动轨迹系统！🎉
