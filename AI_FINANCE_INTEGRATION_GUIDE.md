# AI财务系统集成指南

## ✅ 已完成

### 1. 类型定义
- ✅ `/src/types.ts` - 添加了财务相关类型
  - `FinanceTransaction` - 交易记录
  - `IncomeConfig` - 收入配置
  - `AIFinanceData` - 财务数据结构

### 2. 工具函数
- ✅ `/src/utils/aiFinance.ts` - 完整的财务管理系统
  - `getAIFinanceData(aiId)` - 获取AI财务数据
  - `addTransaction(...)` - 添加交易记录
  - `addIncomeConfig(...)` - 添加收入配置
  - `processAutoIncome(aiId)` - 处理自动收入
  - `getBalance(aiId)` - 获取余额
  - `checkBalance(aiId, amount)` - 检查余额是否充足
  - `getFinanceStats(aiId)` - 获取财务统计
  - 更多工具函数...

### 3. UI组件
- ✅ `/src/components/AIFinanceModal.tsx` - 财务查看界面
  - 概览标签页：显示余额、本月收支、最近交易
  - 交易记录标签页：完整的交易历史
  - 收入配置标签页：管理AI的收入来源

---

## 🔧 待集成部分

### 1. 在ChatScreen中添加查看入口

在 `src/components/ChatScreen.tsx` 中：

```typescript
// 1. 导入组件
import AIFinanceModal from './AIFinanceModal';

// 2. 添加状态
const [showFinanceModal, setShowFinanceModal] = useState(false);

// 3. 在顶部导航栏添加钱包按钮（在返回按钮旁边）
<button 
  onClick={() => setShowFinanceModal(true)}
  className="p-2 hover:bg-gray-100 rounded-full"
  title="查看财务"
>
  <Wallet className="w-5 h-5" />
</button>

// 4. 在组件末尾渲染弹窗
{showFinanceModal && (
  <AIFinanceModal
    aiId={conversation.id}
    aiName={conversation.characterSettings?.nickname || conversation.name}
    onClose={() => setShowFinanceModal(false)}
  />
)}
```

### 2. 在App.tsx中处理自动收入

在 `src/App.tsx` 中：

```typescript
// 1. 导入工具
import { processAllAutoIncome } from './utils/aiFinance';

// 2. 在useEffect中启动定时检查
useEffect(() => {
  // 立即执行一次
  processAllAutoIncome();
  
  // 每小时检查一次
  const interval = setInterval(() => {
    processAllAutoIncome();
  }, 60 * 60 * 1000); // 1小时
  
  return () => clearInterval(interval);
}, []);
```

### 3. 在支付时扣除AI余额

在处理礼物/红包/代付时：

```typescript
import { addTransaction, checkBalance } from './utils/aiFinance';

// 检查余额
const hasBalance = await checkBalance(aiId, amount);
if (!hasBalance) {
  alert('余额不足');
  return;
}

// 扣除余额
await addTransaction(
  aiId,
  'expense',
  amount,
  '送礼',
  `给${recipientName}送了${giftName}`,
  recipientId,
  messageId,
  false
);
```

### 4. 在AI收到礼物时增加收入

```typescript
// AI收到礼物时
await addTransaction(
  aiId,
  'income',
  amount,
  '礼物收入',
  `收到${senderName}的礼物`,
  senderId,
  messageId,
  false
);
```

---

## 📱 功能特性

### 自动收入系统
- ✅ 支持每天/每周/每月/不定期收入
- ✅ 支持固定金额或随机范围
- ✅ 自动定时发放收入
- ✅ 可配置多个收入来源

### 交易记录
- ✅ 自动记录所有收支
- ✅ 分类管理（工资、奖金、购物、送礼等）
- ✅ 关联相关用户和消息
- ✅ 保留最近1000条记录

### 余额管理
- ✅ 实时余额显示
- ✅ 支出前余额检查
- ✅ 可配置是否允许负余额
- ✅ 余额不足提醒

### 财务统计
- ✅ 总收入/总支出
- ✅ 本月收入/本月支出
- ✅ 今日交易次数
- ✅ 交易历史图表（UI已支持）

---

## 🎯 使用示例

### 示例1：配置月度工资

```typescript
import { addIncomeConfig } from './utils/aiFinance';

await addIncomeConfig('ai-123', {
  enabled: true,
  frequency: 'monthly',
  baseAmount: 8000,
  randomRange: [7500, 9000], // 随机7500-9000之间
  description: '月度工资'
});
```

### 示例2：配置不定期奖金

```typescript
await addIncomeConfig('ai-123', {
  enabled: true,
  frequency: 'random', // 随机1-7天
  baseAmount: 500,
  randomRange: [200, 1000],
  description: '绩效奖金'
});
```

### 示例3：记录购物支出

```typescript
await addTransaction(
  'ai-123',
  'expense',
  199.90,
  '购物',
  '在淘淘宝购买了耳机',
  undefined,
  'msg_123',
  false
);
```

### 示例4：查看财务统计

```typescript
const stats = await getFinanceStats('ai-123');
console.log(`当前余额: ¥${stats.balance}`);
console.log(`本月收入: ¥${stats.thisMonthIncome}`);
console.log(`本月支出: ¥${stats.thisMonthExpense}`);
```

---

## 🚀 快速测试

1. 启动应用
2. 打开任意聊天
3. 点击顶部导航的钱包图标（需要先集成）
4. 查看AI的财务数据（默认有¥1000初始资金）
5. 在"收入配置"标签页添加收入来源
6. 等待自动收入发放（或手动调用 `processAutoIncome`）

---

## 💡 未来扩展建议

### 1. 账单提醒
- 当AI余额低于阈值时通知用户
- 定期发送财务报告

### 2. 消费分析
- 按类别统计支出
- 生成月度/年度报告
- 支出趋势图表

### 3. 理财功能
- 定期存款
- 利息计算
- 投资模拟

### 4. 共享账单
- 用户和AI共享支出
- AA制计算
- 欠款提醒

---

## ⚠️ 注意事项

1. **数据持久化**：财务数据已通过 `smartLoad/smartSave` 持久化
2. **性能优化**：交易记录限制在1000条以内，避免数据过大
3. **余额检查**：所有支出操作前应检查余额
4. **自动收入**：建议在App启动时调用一次，然后定时检查
5. **并发安全**：当前实现不考虑并发，如需要可添加锁机制

---

## 📝 TODO

- [ ] 在ChatScreen顶部添加钱包按钮
- [ ] 在App.tsx启动时处理自动收入
- [ ] 在礼物/红包/代付功能中集成余额扣除
- [ ] 在AI收到礼物时记录收入
- [ ] 在购物功能中记录支出
- [ ] 添加余额不足提示
- [ ] 可选：添加财务报表导出功能
