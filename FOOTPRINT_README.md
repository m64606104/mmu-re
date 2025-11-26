# 🛤️ 人物行动轨迹系统

## 🎯 功能概述

基于你现有的 AI 状态系统设计的完整人物行动轨迹功能，参考 Eve Chat 的足迹系统实现。

### ✨ 核心特性

- **智能轨迹生成** - 基于真实聊天、状态变化、朋友圈等多源数据
- **时间轴可视化** - 现代化弹窗界面，按日期展示活动
- **置信度标记** - 区分真实事件(90%+)和推测活动(60%-)
- **筛选和统计** - 按类型、来源、时间范围筛选，查看统计图表
- **IndexedDB 存储** - 支持大量数据存储和复杂查询

## 🚀 快速开始

### 1. 查看轨迹

在任意**私聊**页面，点击角色状态（在线/忙碌等文字）即可打开轨迹弹窗。

### 2. 测试系统

在浏览器控制台运行：
```javascript
// 为当前对话生成测试数据
await window.testFootprints('conversation_id');

// 清理测试数据
await window.cleanupFootprints('conversation_id');
```

### 3. 自动生成

系统会自动：
- 在进入私聊时启动轨迹生成服务
- 每3小时检查是否需要生成新活动
- 基于聊天、状态、朋友圈等生成轨迹记录

## 📊 数据来源

### 高置信度数据 (90%+)
- **聊天记录** - 真实发生的对话
- **朋友圈动态** - 发布的内容和互动
- **子聊天活动** - 深度讨论记录

### 中置信度数据 (60-80%)
- **状态变化** - 在线/离线/忙碌切换
- **系统事件** - 文档上传、记忆更新

### 低置信度数据 (30-50%)
- **时间推测** - 基于作息规律的日常活动
- **规律补充** - 睡觉、工作等常规活动

## 🎨 界面功能

### 时间轴视图
- 📅 **按日期分组** - 清晰的时间结构
- 🎯 **活动类型图标** - 聊天💬、工作💼、娱乐🎮等
- ⏰ **时间和时长** - 精确的活动时间记录
- 🏷️ **标签系统** - 便于分类和查找

### 筛选功能
- **活动类型** - 只看聊天、工作、娱乐等
- **数据来源** - 聊天、状态、朋友圈等
- **置信度** - 只看高可信度的真实事件

### 统计分析
- **活动总数** - 记录的总活动数量
- **聊天时长** - 累计对话时间
- **活跃天数** - 有活动记录的天数
- **类型分布** - 各类活动的占比图表

## 🔧 系统架构

### 数据表结构
```typescript
// 活动明细表
FootprintActivity {
  id: string;              // 活动ID
  timestamp: number;       // 时间戳
  activity: string;        // 活动描述
  activityType: ActivityType; // 类型(聊天/工作/娱乐等)
  source: ActivitySource;  // 来源(聊天/状态/朋友圈等)
  confidence: number;      // 置信度(0-1)
  duration?: number;       // 持续时长
  location?: string;       // 地点
  tags?: string[];         // 标签
}

// 每日汇总表
DailyFootprint {
  date: string;            // 日期
  totalActivities: number; // 活动总数
  chatDuration: number;    // 聊天时长
  mood: 'positive' | 'neutral' | 'negative'; // 整体情绪
  highlights: string[];    // 重点活动
}
```

### 生成逻辑
```
数据收集 → 事件聚合 → 智能补充 → 置信度评分 → 存储保存
```

## 🛠️ 自定义配置

### 生成策略配置
```typescript
// 活跃角色 - 生成更多轨迹
{
  generationInterval: 2,     // 2小时生成一次
  maxActivitiesPerDay: 25,   // 每天最多25条
  confidenceThreshold: 0.3   // 接受30%以上置信度
}

// 安静角色 - 生成较少轨迹
{
  generationInterval: 6,     // 6小时生成一次
  maxActivitiesPerDay: 10,   // 每天最多10条
  confidenceThreshold: 0.7   // 只接受70%以上置信度
}
```

### UI 定制
```typescript
// 自定义活动类型和颜色
const ACTIVITY_CONFIG = {
  studying: { 
    icon: '📚', 
    color: '#8B5CF6', 
    label: '学习中' 
  },
  gaming: { 
    icon: '🎮', 
    color: '#EC4899', 
    label: '游戏中' 
  }
};
```

## 📈 性能优化

### 数据清理
- 自动清理90天前的数据
- 批量操作优化
- 智能索引查询

### 内存管理
- 按需加载活动数据
- 虚拟滚动支持
- 缓存机制优化

## 🔍 故障排除

### 常见问题

**Q: 轨迹弹窗打不开**
- 确保在私聊页面（群聊不支持轨迹）
- 检查浏览器控制台是否有 IndexedDB 错误

**Q: 没有轨迹数据**
- 等待3小时后轨迹自动生成
- 或运行测试命令生成示例数据

**Q: 界面卡顿**
- 轨迹数据过多时会分页显示
- 使用筛选功能减少显示数量

### 开发调试

```javascript
// 检查存储服务
console.log('IndexedDB状态:', await window.db);

// 手动生成轨迹
const { generateFootprintNow } = await import('./utils/footprintGenerator');
await generateFootprintNow('conversation_id');

// 查看原始数据
const activities = await footprintStorage.getActivities('conversation_id');
console.log('轨迹数据:', activities);
```

## 🎉 使用效果

用户在私聊页面点击 AI 状态文字，会看到：
- 📱 **现代化弹窗** - 仿 Eve Chat 的精美界面
- 🕐 **完整时间线** - 按天分组的活动记录  
- 🎯 **真实数据** - 70%基于实际事件，30%智能推测
- 📊 **数据透明** - 每个活动都标记来源和可信度
- 🔍 **灵活筛选** - 按需查看不同类型活动

**这让 AI 角色更加真实立体，用户能够了解 TA 的"生活轨迹"！** ✨
