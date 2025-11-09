# 🎭 行为轨迹生成逻辑说明

## 当前的生成逻辑（已修复）

### 原有问题
**问题**：每次打开行为轨迹都会看到不同的活动，导致活动历史不一致。

**原因**：
1. `getAIStatus()` 函数每次被调用时都会检查是否需要生成新活动
2. 原有的检查逻辑只看 `lastUpdateTime`（最后更新时间）
3. 即使活动日志中有最近的活动，仍然会重新生成

### 修复后的逻辑

#### 1. **活动生成触发条件**（aiStatusManager.ts）

```typescript
// 检查两个条件：
1. 距离上次更新时间超过3小时 (hoursSinceUpdate > 3)
2. 没有近期活动记录 (!hasRecentActivity)

// 近期活动定义：
- 活动日志不为空
- 最新一条活动的时间距现在不超过3小时
```

#### 2. **完整的检查流程**

```
打开行为轨迹页面
    ↓
调用 getAIStatus(conversationId, apiConfig)
    ↓
检查 localStorage 中的状态数据
    ↓
计算 hoursSinceUpdate (距上次更新的小时数)
    ↓
检查 hasRecentActivity (是否有3小时内的活动)
    ↓
如果 hoursSinceUpdate > 3 且 !hasRecentActivity
    ↓ (是)
    生成新活动
        ↓
        1. 优先使用AI生成（如果有apiConfig）
        2. 降级使用模板生成
        ↓
        添加到活动日志
        ↓
        更新 lastUpdateTime
        ↓
        保存到 localStorage
    ↓ (否)
    直接返回现有状态
    ↓
显示活动日志
```

#### 3. **活动生成方式**

**AI生成模式**（优先）：
```typescript
if (apiConfig) {
  newActivity = await generateActivityWithAI(conversation, apiConfig);
}
```
- 使用API调用AI模型
- 根据角色性格生成个性化活动
- 更真实、更符合角色设定

**模板生成模式**（降级）：
```typescript
if (!newActivity) {
  newActivity = generateCurrentActivity(conversation);
}
```
- 使用预设模板
- 基于时间、性格快速生成
- 无需API调用

#### 4. **活动去重保护**（updateAIStatus）

在手动更新AI状态时，也有去重保护：

```typescript
// 检查最近的活动时间
if (initialStatus.activityLogs && initialStatus.activityLogs.length > 0) {
  const lastLog = initialStatus.activityLogs[0];
  const timeSinceLastLog = now - lastLog.timestamp;
  
  // 如果距离上次活动不到10分钟，不添加新活动
  if (timeSinceLastLog < 10 * 60 * 1000) {
    console.log(`⏸️ 跳过活动生成：距离上次活动仅${Math.floor(timeSinceLastLog / 1000 / 60)}分钟`);
    return;
  }
}
```

---

## 活动数据结构

### AIStatusInfo
```typescript
{
  status: 'online' | 'offline' | 'busy' | 'resting' | 'away',
  statusText: string,          // 状态文本（如"在线"）
  currentActivity?: string,    // 当前活动
  activityLogs: AIActivityLog[], // 活动日志数组
  lastUpdateTime: number       // 最后更新时间戳
}
```

### AIActivityLog
```typescript
{
  id: string,                  // 活动ID
  timestamp: number,           // 活动时间戳
  activity: string,            // 活动描述
  location?: string,           // 活动地点
  status: AIStatus             // 活动时的状态
}
```

---

## 存储机制

### localStorage 键名
```
ai_status_${conversationId}
```

### 数据持久化
- 每次生成新活动后立即保存
- 活动日志按时间倒序排列（最新的在最前面）
- 数据不会自动清理，会一直累积

---

## 时间控制

### 3小时规则
- **目的**：避免频繁生成活动，提高性能
- **效果**：同一个活动会持续显示至少3小时

### 10分钟规则
- **目的**：防止短时间内重复生成相同类型的活动
- **效果**：手动更新状态时的保护机制

---

## 使用场景

### 场景1：正常查看（已有活动）
```
用户打开行为轨迹
  ↓
发现有2小时前的活动记录
  ↓
直接显示现有活动
  ↓
不生成新活动
```

### 场景2：长时间未查看（超过3小时）
```
用户打开行为轨迹
  ↓
上次活动是5小时前
  ↓
触发新活动生成
  ↓
显示新生成的活动
```

### 场景3：首次查看（无活动记录）
```
用户首次打开行为轨迹
  ↓
活动日志为空
  ↓
立即生成第一条活动
  ↓
显示生成的活动
```

---

## Console 日志说明

### 正常日志
```
✅ 成功生成活动: 在咖啡厅写作
🤖 尝试使用AI生成活动...
📋 使用模板生成活动（降级模式）
```

### 保护日志
```
⏸️ 跳过活动生成：距离上次活动仅8分钟
```

### 错误日志
```
Failed to get AI status: [错误信息]
AI生成活动失败: [错误信息]
```

---

## 常见问题

### Q1：为什么有时候活动不变化？
**A**：因为有3小时的更新间隔，这是为了保持活动的连续性和稳定性。

### Q2：如何强制刷新活动？
**A**：需要等待3小时，或者清除localStorage中的 `ai_status_${conversationId}` 数据。

### Q3：活动会一直累积吗？
**A**：是的，所有活动都会保存在activityLogs数组中。如需清理，可以考虑添加最大条数限制。

### Q4：AI生成和模板生成有什么区别？
**A**：
- **AI生成**：更个性化，需要API，速度较慢，成本较高
- **模板生成**：速度快，免费，但相对固定

---

## 优化建议

### 1. 添加活动日志上限
```typescript
// 只保留最近50条活动
status.activityLogs = status.activityLogs.slice(0, 50);
```

### 2. 添加手动刷新按钮
```typescript
// 允许用户主动请求生成新活动
const forceRefreshActivity = async () => {
  // 清除hasRecentActivity检查
  // 强制生成新活动
};
```

### 3. 添加活动历史导出
```typescript
// 导出活动历史为JSON文件
const exportActivityLog = () => {
  const data = JSON.stringify(status.activityLogs, null, 2);
  // 下载文件
};
```

---

**修复后的逻辑确保活动轨迹的稳定性和一致性！** ✅
