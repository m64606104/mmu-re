import React, { useState, useEffect } from 'react';
import { ChevronLeft, Wallet, Settings } from 'lucide-react';
import { getWalletData, WalletData } from '../utils/wallet';
import { Conversation } from '../types';

interface WalletScreenProps {
  onBack: () => void;
  onNavigateToShop: (shopType: 'food' | 'movie' | 'shopping') => void;
  conversations?: Conversation[]; // 传入对话列表用于选择AI
}

const WalletScreen: React.FC<WalletScreenProps> = ({ onBack, onNavigateToShop, conversations = [] }) => {
  const [walletData, setWalletData] = useState<WalletData | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const data = getWalletData();
      setWalletData(data);
    };
    loadData();
  }, []);

  if (!walletData) {
    return <div>加载中...</div>;
  }

  // 购物服务
  const services = [
    {
      id: 'food',
      icon: '😋',
      name: '饿饿吗',
      description: '美食外卖',
      color: 'from-blue-500 to-cyan-500',
      onClick: () => onNavigateToShop('food')
    },
    {
      id: 'movie',
      icon: '🎬',
      name: '电影票',
      description: '在线选座',
      color: 'from-purple-500 to-pink-500',
      onClick: () => onNavigateToShop('movie')
    },
    {
      id: 'shopping',
      icon: '🛍️',
      name: '淘淘宝',
      description: '网上购物',
      color: 'from-orange-500 to-red-500',
      onClick: () => onNavigateToShop('shopping')
    }
  ];

  // conversations 参数保留兼容（钱包页不再展示 AI 钱包）

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* 头部 */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <button
              onClick={() => {
                onBack();
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold ml-2">
              钱包
            </h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* 余额卡片 */}
        <div className="p-4">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-6 h-6" />
                <span className="text-sm opacity-90">钱包余额</span>
              </div>
              <Settings className="w-5 h-5 opacity-75" />
            </div>
            <div className="text-4xl font-bold mb-1">
              ¥{walletData.balance.toFixed(2)}
            </div>
            <div className="text-sm opacity-75">
              共{walletData.transactions.length}笔交易记录
            </div>
          </div>
        </div>

        {/* 购物服务 */}
        <div className="px-4 pb-4">
          <div className="mb-3">
            <h2 className="text-base font-semibold text-gray-800">购物服务</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {services.map((service) => (
              <button
                key={service.id}
                onClick={service.onClick}
                className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all active:scale-95"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center mx-auto mb-2 text-2xl`}>
                  {service.icon}
                </div>
                <div className="text-sm font-medium text-gray-800 mb-0.5">
                  {service.name}
                </div>
                <div className="text-xs text-gray-500">
                  {service.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 交易记录 */}
        <div className="px-4 pb-4">
          <div className="mb-3">
            <h2 className="text-base font-semibold text-gray-800">交易记录</h2>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {walletData.transactions.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                暂无交易记录
              </div>
            ) : (
              <div className="divide-y">
                {walletData.transactions.slice(0, 20).map((transaction) => (
                  <div key={transaction.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        transaction.type === 'income' 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {transaction.category === 'redPacket' && '🧧'}
                        {transaction.category === 'transfer' && '💸'}
                        {transaction.category === 'shopping' && '🛍️'}
                        {transaction.category === 'recharge' && '💰'}
                        {transaction.category === 'other' && '💳'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-800">
                          {transaction.description}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(transaction.timestamp).toLocaleString('zh-CN', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                    <div className={`text-base font-semibold ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-gray-800'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}¥{transaction.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletScreen;
