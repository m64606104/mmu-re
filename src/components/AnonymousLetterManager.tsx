/**
 * 匿名信件管理组件
 * 显示分区和合并功能
 */

import { useState, useEffect } from 'react';
import { ArrowLeft, Users, Merge, AlertTriangle, CheckCircle } from 'lucide-react';
import { 
  detectAnonymousGroups, 
  mergeAnonymousIdentities, 
  getReceiversNeedingMerge,
  type AnonymousLetterData 
} from '../utils/anonymousLetterManager';
import { formatLastActivity } from '../utils/letterListManager';
import { getAIDisplayName } from '../utils/letterNicknameManager';

interface AnonymousLetterManagerProps {
  receiverId: string;
  onBack: () => void;
  onRefresh?: () => void;
}

export default function AnonymousLetterManager({
  receiverId,
  onBack,
  onRefresh
}: AnonymousLetterManagerProps) {
  const [anonymousData, setAnonymousData] = useState<AnonymousLetterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMergeConfirm, setShowMergeConfirm] = useState(false);
  const [mergeResult, setMergeResult] = useState<string | null>(null);

  useEffect(() => {
    loadAnonymousData();
  }, [receiverId]);

  const loadAnonymousData = () => {
    setIsLoading(true);
    const data = detectAnonymousGroups(receiverId);
    setAnonymousData(data);
    setIsLoading(false);
  };

  const handleMerge = async () => {
    if (!anonymousData) return;

    const result = mergeAnonymousIdentities(receiverId);
    
    if (result.success) {
      setMergeResult(`成功合并 ${result.mergedCount} 封信件到统一身份`);
      loadAnonymousData();
      if (onRefresh) onRefresh();
    } else {
      setMergeResult(`合并失败: ${result.error}`);
    }
    
    setShowMergeConfirm(false);
    setTimeout(() => setMergeResult(null), 3000);
  };

  const displayName = anonymousData ? getAIDisplayName(receiverId, anonymousData.receiverName) : '';

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!anonymousData || !anonymousData.hasMultipleAnonymous) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 z-50 flex flex-col">
        {/* 头部 */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-indigo-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-2 hover:bg-indigo-100 rounded-full transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-gray-800">匿名信管理</h1>
          <div className="w-10"></div>
        </div>

        {/* 空状态 */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <div className="text-6xl mb-4">🎭</div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">没有多重匿名身份</h3>
            <p className="text-gray-500">
              {anonymousData?.totalLetters === 0 
                ? '此联系人没有匿名信件' 
                : '此联系人只使用了一个匿名身份'
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 z-50 flex flex-col">
      {/* 头部 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-indigo-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 hover:bg-indigo-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-gray-800">匿名身份管理</h1>
          <p className="text-sm text-gray-600">{displayName}</p>
        </div>
        <div className="w-10"></div>
      </div>

      {/* 统计信息 */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-indigo-100 px-4 py-3">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-3">
          <AlertTriangle size={20} className="text-orange-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-orange-800 mb-1">检测到多重匿名身份</h3>
            <p className="text-sm text-orange-700">
              发现 {anonymousData.groups.length} 个不同匿名身份，共 {anonymousData.totalLetters} 封信件
            </p>
          </div>
        </div>
      </div>

      {/* 身份分组列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {anonymousData.groups.map((group, index) => (
            <div
              key={group.anonymousName}
              className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100"
            >
              <div className={`px-4 py-3 flex items-center justify-between ${
                index === 0 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                  : 'bg-gradient-to-r from-gray-500 to-gray-600'
              }`}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">{index + 1}</span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{group.anonymousName}</h3>
                    {index === 0 && (
                      <span className="text-white/80 text-xs">主要身份（保留）</span>
                    )}
                  </div>
                </div>
                <div className="text-white/80 text-sm text-right">
                  {group.letters.length} 封信
                  <br />
                  {group.totalRounds} 轮对话
                </div>
              </div>

              <div className="p-4">
                <div className="text-sm text-gray-600 mb-3">
                  最后活动: {formatLastActivity(group.lastActivity)}
                </div>
                
                <div className="space-y-2">
                  {group.letters.map(letter => (
                    <div key={letter.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 truncate">
                        "{letter.content.substring(0, 30)}..."
                      </span>
                      <span className="text-gray-500 flex-shrink-0 ml-2">
                        {letter.conversationRounds.length} 轮
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="bg-white/80 backdrop-blur-sm border-t border-indigo-100 px-4 py-3">
        <button
          onClick={() => setShowMergeConfirm(true)}
          className="w-full py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
        >
          <Merge size={20} />
          合并到主要身份
        </button>
        
        <p className="text-xs text-gray-500 text-center mt-2">
          将所有信件合并到最近活动的身份（{anonymousData.groups[0].anonymousName}）
        </p>
      </div>

      {/* 合并确认弹窗 */}
      {showMergeConfirm && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">确认合并</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                此操作将把其他 {anonymousData.groups.length - 1} 个匿名身份的信件全部合并到:
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="font-medium text-green-800">
                  {anonymousData.groups[0].anonymousName}
                </div>
                <div className="text-sm text-green-600">
                  主要身份，共 {anonymousData.groups[0].letters.length} 封信
                </div>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-orange-800">
                ⚠️ 合并后无法撤销，所有信件将显示为同一个匿名身份发送
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowMergeConfirm(false)}
                className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleMerge}
                className="flex-1 px-4 py-2 text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
              >
                确认合并
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 结果提示 */}
      {mergeResult && (
        <div className="absolute top-20 left-4 right-4 z-20">
          <div className="bg-green-500 text-white rounded-lg px-4 py-3 flex items-center gap-2">
            <CheckCircle size={20} />
            <span>{mergeResult}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// 全局匿名管理器组件
export function GlobalAnonymousManager({ onBack }: { onBack: () => void }) {
  const [needMergeList, setNeedMergeList] = useState<any[]>([]);
  const [selectedReceiver, setSelectedReceiver] = useState<string | null>(null);

  useEffect(() => {
    const list = getReceiversNeedingMerge();
    setNeedMergeList(list);
  }, []);

  if (selectedReceiver) {
    return (
      <AnonymousLetterManager
        receiverId={selectedReceiver}
        onBack={() => setSelectedReceiver(null)}
        onRefresh={() => {
          const list = getReceiversNeedingMerge();
          setNeedMergeList(list);
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 z-50 flex flex-col">
      {/* 头部 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-indigo-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 hover:bg-indigo-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800">匿名信管理</h1>
        <div className="w-10"></div>
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto">
          {needMergeList.length > 0 ? (
            <div className="space-y-3">
              {needMergeList.map(receiver => (
                <div
                  key={receiver.receiverId}
                  onClick={() => setSelectedReceiver(receiver.receiverId)}
                  className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all cursor-pointer p-4 border border-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800">
                        {getAIDisplayName(receiver.receiverId, receiver.receiverName)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {receiver.anonymousCount} 个匿名身份 · {receiver.letterCount} 封信件
                      </p>
                    </div>
                    <div className="text-orange-500">
                      <Users size={24} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">所有匿名信都很整洁</h3>
              <p className="text-gray-500">没有发现需要合并的多重匿名身份</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
