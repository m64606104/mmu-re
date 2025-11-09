import React, { useState } from 'react';
import { X, Gift, CreditCard } from 'lucide-react';
import { getBalance } from '../utils/wallet';

interface MoneyTransferModalProps {
  onClose: () => void;
  onSend: (amount: number, type: 'redPacket' | 'transfer', message?: string) => void;
}

const MoneyTransferModal: React.FC<MoneyTransferModalProps> = ({
  onClose,
  onSend
}) => {
  const [type, setType] = useState<'redPacket' | 'transfer'>('redPacket');
  const [amount, setAmount] = useState<string>('');
  const [message, setMessage] = useState('');
  const balance = getBalance();

  const quickAmounts = [1, 5, 10, 20, 50, 100];

  const handleSend = () => {
    const numAmount = parseFloat(amount);
    
    if (!numAmount || numAmount <= 0) {
      alert('请输入有效金额');
      return;
    }
    
    if (numAmount > balance) {
      alert('余额不足');
      return;
    }
    
    onSend(numAmount, type, message || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">
            {type === 'redPacket' ? '💰 发红包' : '💸 转账'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 类型切换 */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setType('redPacket')}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                type === 'redPacket'
                  ? 'border-red-500 bg-red-50 text-red-600'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Gift className="w-5 h-5" />
              <span className="font-medium">红包</span>
            </button>
            <button
              onClick={() => setType('transfer')}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                type === 'transfer'
                  ? 'border-blue-500 bg-blue-50 text-blue-600'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <CreditCard className="w-5 h-5" />
              <span className="font-medium">转账</span>
            </button>
          </div>

          {/* 金额输入 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              金额
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">
                ¥
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-12 pr-4 py-4 text-3xl font-bold border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none"
                step="0.01"
                min="0.01"
              />
            </div>
            <div className="text-sm text-gray-500 mt-2">
              当前余额: ¥{balance.toFixed(2)}
            </div>
          </div>

          {/* 快捷金额 */}
          <div className="mb-6">
            <div className="text-sm font-medium text-gray-700 mb-2">快捷金额</div>
            <div className="grid grid-cols-3 gap-2">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setAmount(amt.toString())}
                  className="py-2 px-4 border border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  ¥{amt}
                </button>
              ))}
            </div>
          </div>

          {/* 留言 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {type === 'redPacket' ? '红包留言（选填）' : '转账备注（选填）'}
            </label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                type === 'redPacket' 
                  ? '恭喜发财，大吉大利' 
                  : '写点什么...'
              }
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-red-500 focus:outline-none"
              maxLength={20}
            />
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t">
          <button
            onClick={handleSend}
            className={`w-full py-3 rounded-lg font-medium transition-colors ${
              type === 'redPacket'
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {type === 'redPacket' ? '🎁 发红包' : '💸 转账'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoneyTransferModal;
