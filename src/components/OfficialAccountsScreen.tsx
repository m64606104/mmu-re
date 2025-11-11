/**
 * 公众号列表界面
 * 显示所有公众号，点击进入详情页查看文章
 */

import React, { useState, useEffect } from 'react';
import { ChevronLeft, CheckCircle } from 'lucide-react';
import { OfficialAccountSettings } from '../types';
import { getAllOfficialAccounts } from '../utils/officialAccounts';
import OfficialAccountDetailScreen from './OfficialAccountDetailScreen';

interface OfficialAccountsScreenProps {
  onBack: () => void;
}

const OfficialAccountsScreen: React.FC<OfficialAccountsScreenProps> = ({ onBack }) => {
  const [accounts, setAccounts] = useState<OfficialAccountSettings[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<OfficialAccountSettings | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = () => {
    const data = getAllOfficialAccounts();
    setAccounts(data);
  };

  if (selectedAccount) {
    return (
      <OfficialAccountDetailScreen 
        account={selectedAccount}
        onBack={() => setSelectedAccount(null)}
      />
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold ml-2">公众号</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* 公众号列表 */}
        <div className="p-4 space-y-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              onClick={() => setSelectedAccount(account)}
              className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-all cursor-pointer active:scale-95"
            >
              <div className="flex items-start gap-3">
                {/* 头像 */}
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-2xl flex-shrink-0">
                  {account.avatar}
                </div>

                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{account.name}</span>
                    {account.verified && (
                      <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                    {account.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{account.followerCount.toLocaleString()} 关注</span>
                    <span>•</span>
                    <span>{account.articles.length} 篇文章</span>
                  </div>
                </div>

                {/* 状态标识 */}
                <div className="flex-shrink-0">
                  {account.enabled ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                      启用中
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
                      已暂停
                    </span>
                  )}
                </div>
              </div>

              {/* 标签 */}
              <div className="flex flex-wrap gap-2 mt-3">
                {account.tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 提示信息 */}
        <div className="p-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
            <p className="text-xs text-blue-700 leading-relaxed">
              <span className="font-semibold">💡 关于公众号：</span><br />
              • 这些公众号会定期推送内容到聊天列表<br />
              • 点击公众号查看历史文章<br />
              • 可以在设置中管理公众号订阅
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfficialAccountsScreen;
