import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Wallet, Calendar, Plus, Trash2 } from 'lucide-react';
import { AIFinanceData, IncomeConfig } from '../types';
import { 
  getAIFinanceData, 
  getFinanceStats, 
  addIncomeConfig,
  updateIncomeConfig,
  removeIncomeConfig
} from '../utils/aiFinance';

interface AIFinanceModalProps {
  aiId: string;
  aiName: string;
  onClose: () => void;
}

const AIFinanceModal: React.FC<AIFinanceModalProps> = ({ aiId, aiName, onClose }) => {
  const [financeData, setFinanceData] = useState<AIFinanceData | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'income'>('overview');
  const [showAddIncome, setShowAddIncome] = useState(false);
  
  // 新增收入配置表单
  const [newIncome, setNewIncome] = useState<Partial<IncomeConfig>>({
    enabled: true,
    frequency: 'monthly',
    baseAmount: 3000,
    description: '工资'
  });

  useEffect(() => {
    loadData();
  }, [aiId]);

  const loadData = async () => {
    const data = await getAIFinanceData(aiId);
    const statsData = await getFinanceStats(aiId);
    setFinanceData(data);
    setStats(statsData);
  };

  const handleAddIncome = async () => {
    if (!newIncome.description || !newIncome.baseAmount || !newIncome.frequency) {
      alert('请填写完整的收入信息');
      return;
    }

    await addIncomeConfig(aiId, {
      enabled: newIncome.enabled!,
      frequency: newIncome.frequency!,
      baseAmount: newIncome.baseAmount!,
      randomRange: newIncome.randomRange,
      description: newIncome.description!
    });

    setShowAddIncome(false);
    setNewIncome({
      enabled: true,
      frequency: 'monthly',
      baseAmount: 3000,
      description: '工资'
    });
    await loadData();
  };

  const handleToggleIncome = async (index: number) => {
    if (!financeData) return;
    const config = financeData.incomeConfigs[index];
    await updateIncomeConfig(aiId, index, { enabled: !config.enabled });
    await loadData();
  };

  const handleDeleteIncome = async (index: number) => {
    if (confirm('确定要删除这个收入配置吗？')) {
      await removeIncomeConfig(aiId, index);
      await loadData();
    }
  };

  if (!financeData || !stats) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
        <div className="bg-white rounded-2xl p-6 text-center">
          <div className="text-gray-500">加载中...</div>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => `¥${amount.toFixed(2)}`;
  const formatDate = (timestamp: number) => new Date(timestamp).toLocaleString('zh-CN');
  const formatFrequency = (freq: string) => {
    const map: Record<string, string> = {
      daily: '每天',
      weekly: '每周',
      monthly: '每月',
      random: '不定期'
    };
    return map[freq] || freq;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold">{aiName} 的财务</h2>
            <p className="text-sm text-gray-500 mt-1">余额管理 · 收支记录</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 标签页 */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            概览
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'transactions'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            交易记录
          </button>
          <button
            onClick={() => setActiveTab('income')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'income'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            收入配置
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 概览 */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 余额卡片 */}
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-5 h-5" />
                  <span className="text-sm opacity-90">当前余额</span>
                </div>
                <div className="text-4xl font-bold">{formatCurrency(stats.balance)}</div>
                <div className="mt-4 flex items-center gap-4 text-sm opacity-90">
                  <span>总收入: {formatCurrency(stats.totalIncome)}</span>
                  <span>总支出: {formatCurrency(stats.totalExpense)}</span>
                </div>
              </div>

              {/* 本月统计 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-green-600 mb-2">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm font-medium">本月收入</span>
                  </div>
                  <div className="text-2xl font-bold text-green-700">
                    {formatCurrency(stats.thisMonthIncome)}
                  </div>
                </div>
                <div className="bg-red-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-red-600 mb-2">
                    <TrendingDown className="w-4 h-4" />
                    <span className="text-sm font-medium">本月支出</span>
                  </div>
                  <div className="text-2xl font-bold text-red-700">
                    {formatCurrency(stats.thisMonthExpense)}
                  </div>
                </div>
              </div>

              {/* 最近交易 */}
              <div>
                <h3 className="font-semibold mb-3">最近交易</h3>
                <div className="space-y-2">
                  {financeData.transactions.slice(0, 5).map((trans) => (
                    <div key={trans.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-sm">{trans.description}</div>
                        <div className="text-xs text-gray-500">{formatDate(trans.timestamp)}</div>
                      </div>
                      <div className={`font-bold ${trans.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {trans.type === 'income' ? '+' : '-'}{formatCurrency(trans.amount)}
                      </div>
                    </div>
                  ))}
                  {financeData.transactions.length === 0 && (
                    <div className="text-center text-gray-400 py-8">暂无交易记录</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 交易记录 */}
          {activeTab === 'transactions' && (
            <div className="space-y-2">
              {financeData.transactions.map((trans) => (
                <div key={trans.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{trans.description}</span>
                      <span className="text-xs px-2 py-0.5 bg-white rounded-full text-gray-600">
                        {trans.category}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">{formatDate(trans.timestamp)}</div>
                  </div>
                  <div className={`font-bold text-lg ${trans.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {trans.type === 'income' ? '+' : '-'}{formatCurrency(trans.amount)}
                  </div>
                </div>
              ))}
              {financeData.transactions.length === 0 && (
                <div className="text-center text-gray-400 py-12">暂无交易记录</div>
              )}
            </div>
          )}

          {/* 收入配置 */}
          {activeTab === 'income' && (
            <div className="space-y-4">
              {/* 添加按钮 */}
              <button
                onClick={() => setShowAddIncome(true)}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                添加收入来源
              </button>

              {/* 收入配置列表 */}
              {financeData.incomeConfigs.map((config, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="font-semibold text-lg">{config.description}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {formatFrequency(config.frequency)} · {formatCurrency(config.baseAmount)}
                        {config.randomRange && ` ~ ${formatCurrency(config.randomRange[1])}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleIncome(index)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          config.enabled
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {config.enabled ? '已启用' : '已禁用'}
                      </button>
                      <button
                        onClick={() => handleDeleteIncome(index)}
                        className="p-2 hover:bg-red-100 rounded-full text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {config.nextIncomeTime > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>下次收入时间: {formatDate(config.nextIncomeTime)}</span>
                    </div>
                  )}
                </div>
              ))}

              {financeData.incomeConfigs.length === 0 && (
                <div className="text-center text-gray-400 py-12">暂无收入配置</div>
              )}
            </div>
          )}
        </div>

        {/* 添加收入弹窗 */}
        {showAddIncome && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <h3 className="font-bold text-lg mb-4">添加收入来源</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">收入描述</label>
                  <input
                    type="text"
                    value={newIncome.description || ''}
                    onChange={(e) => setNewIncome({ ...newIncome, description: e.target.value })}
                    placeholder="如: 工资、兼职、奖金等"
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">频率</label>
                  <select
                    value={newIncome.frequency || 'monthly'}
                    onChange={(e) => setNewIncome({ ...newIncome, frequency: e.target.value as any })}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="daily">每天</option>
                    <option value="weekly">每周</option>
                    <option value="monthly">每月</option>
                    <option value="random">不定期</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">金额</label>
                  <input
                    type="number"
                    value={newIncome.baseAmount || 0}
                    onChange={(e) => setNewIncome({ ...newIncome, baseAmount: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newIncome.randomRange !== undefined}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewIncome({
                          ...newIncome,
                          randomRange: [newIncome.baseAmount || 0, (newIncome.baseAmount || 0) * 1.5]
                        });
                      } else {
                        const { randomRange, ...rest } = newIncome;
                        setNewIncome(rest);
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <label className="text-sm">随机金额范围</label>
                </div>
                {newIncome.randomRange && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">最小值</label>
                      <input
                        type="number"
                        value={newIncome.randomRange[0]}
                        onChange={(e) => setNewIncome({
                          ...newIncome,
                          randomRange: [parseFloat(e.target.value), newIncome.randomRange![1]]
                        })}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">最大值</label>
                      <input
                        type="number"
                        value={newIncome.randomRange[1]}
                        onChange={(e) => setNewIncome({
                          ...newIncome,
                          randomRange: [newIncome.randomRange![0], parseFloat(e.target.value)]
                        })}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddIncome(false)}
                  className="flex-1 py-2 border rounded-lg"
                >
                  取消
                </button>
                <button
                  onClick={handleAddIncome}
                  className="flex-1 py-2 bg-blue-500 text-white rounded-lg"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIFinanceModal;
