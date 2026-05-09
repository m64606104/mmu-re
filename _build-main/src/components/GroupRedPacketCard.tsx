import React, { useState } from 'react';
import { Gift, Users, Trophy, Lock } from 'lucide-react';
import { GroupRedPacketInfo } from '../types';
import { claimRedPacket, checkRedPacketExpired, getRedPacketDetails, validatePassword } from '../utils/groupRedPacket';

interface GroupRedPacketCardProps {
  redPacket: GroupRedPacketInfo;
  currentUserId: string;
  currentUserName: string;
  isGroup?: boolean;
  onClaim?: (amount: number) => void;
  onUpdate?: (updatedRedPacket: GroupRedPacketInfo) => void;
}

const GroupRedPacketCard: React.FC<GroupRedPacketCardProps> = ({
  redPacket,
  currentUserId,
  currentUserName,
  onClaim,
  onUpdate,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  // 检查是否过期
  const isExpired = checkRedPacketExpired(redPacket);
  
  // 检查用户是否已领取
  const userClaimed = redPacket.claimedBy.find(c => c.userId === currentUserId);
  
  // 是否可领取
  const canClaim = !isExpired && 
                   redPacket.status === 'active' && 
                   !userClaimed &&
                   (redPacket.redPacketType !== 'exclusive' || redPacket.exclusiveUserId === currentUserId);

  const handleClaim = () => {
    // 口令红包需要输入口令
    if (redPacket.password && !showPasswordInput) {
      setShowPasswordInput(true);
      return;
    }

    // 验证口令
    if (redPacket.password) {
      if (!validatePassword(redPacket, passwordInput)) {
        alert('口令错误');
        return;
      }
    }

    // 领取红包
    const result = claimRedPacket(redPacket, currentUserId, currentUserName);
    
    if (result.success && result.amount) {
      alert(`领取成功！获得 ¥${result.amount.toFixed(2)}`);
      onClaim?.(result.amount);
      onUpdate?.(redPacket);
      setShowPasswordInput(false);
      setPasswordInput('');
    } else {
      alert(result.message);
    }
  };

  const details = getRedPacketDetails(redPacket);

  return (
    <div className="max-w-sm mx-auto">
      {/* 红包卡片 */}
      <div 
        className={`relative overflow-hidden rounded-2xl shadow-lg ${
          isExpired || redPacket.status === 'finished' 
            ? 'bg-gray-400' 
            : 'bg-gradient-to-br from-red-500 via-red-600 to-red-700'
        }`}
        onClick={() => !showPasswordInput && setShowDetails(true)}
      >
        {/* 背景装饰 */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-12 -translate-x-12"></div>
        </div>

        <div className="relative p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-white font-medium">{redPacket.senderName}的红包</div>
              <div className="text-white/80 text-sm">{redPacket.message || '恭喜发财，大吉大利'}</div>
            </div>
          </div>

          {/* 红包类型标签 */}
          <div className="flex gap-2 mb-4">
            {redPacket.redPacketType === 'random' && (
              <div className="px-3 py-1 bg-white/20 rounded-full text-white text-xs flex items-center gap-1">
                <Gift className="w-3 h-3" />
                拼手气红包
              </div>
            )}
            {redPacket.redPacketType === 'average' && (
              <div className="px-3 py-1 bg-white/20 rounded-full text-white text-xs flex items-center gap-1">
                <Users className="w-3 h-3" />
                普通红包
              </div>
            )}
            {redPacket.redPacketType === 'exclusive' && (
              <div className="px-3 py-1 bg-white/20 rounded-full text-white text-xs flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                专属红包
              </div>
            )}
            {redPacket.password && (
              <div className="px-3 py-1 bg-white/20 rounded-full text-white text-xs flex items-center gap-1">
                <Lock className="w-3 h-3" />
                口令红包
              </div>
            )}
          </div>

          {/* 口令显示 */}
          {redPacket.password && !userClaimed && !isExpired && redPacket.status !== 'finished' && (
            <div className="mb-4 bg-white/10 rounded-lg p-3 border border-white/20">
              <div className="text-white/70 text-xs mb-1">红包口令</div>
              <div className="text-white font-medium text-sm">"{redPacket.password}"</div>
            </div>
          )}

          {/* 状态显示 */}
          {userClaimed ? (
            <div className="text-center py-4">
              <div className="text-white text-3xl font-bold mb-2">
                ¥{userClaimed.amount.toFixed(2)}
              </div>
              <div className="text-white/80 text-sm">已领取</div>
              {userClaimed.isLuckiest && (
                <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-yellow-400 rounded-full">
                  <Trophy className="w-4 h-4 text-yellow-900" />
                  <span className="text-yellow-900 font-medium text-sm">手气最佳</span>
                </div>
              )}
            </div>
          ) : isExpired || redPacket.status === 'finished' ? (
            <div className="text-center py-4">
              <div className="text-white text-lg">
                {isExpired ? '红包已过期' : '红包已抢完'}
              </div>
            </div>
          ) : redPacket.redPacketType === 'exclusive' && redPacket.exclusiveUserId !== currentUserId ? (
            <div className="text-center py-4">
              <div className="text-white text-lg">
                {redPacket.exclusiveUserName}的专属红包
              </div>
            </div>
          ) : showPasswordInput ? (
            <div className="space-y-3">
              <div className="text-white text-center mb-2">请输入口令</div>
              <input
                type="text"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="输入口令"
                className="w-full px-4 py-2 rounded-lg text-gray-900"
                autoFocus
                onKeyPress={(e) => e.key === 'Enter' && handleClaim()}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleClaim}
                  className="flex-1 bg-white text-red-600 py-2 rounded-lg font-medium hover:bg-gray-100"
                >
                  确定
                </button>
                <button
                  onClick={() => {
                    setShowPasswordInput(false);
                    setPasswordInput('');
                  }}
                  className="flex-1 bg-white/20 text-white py-2 rounded-lg font-medium hover:bg-white/30"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClaim();
              }}
              disabled={!canClaim}
              className={`w-full py-3 rounded-xl font-medium transition-all ${
                canClaim
                  ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-300'
                  : 'bg-white/20 text-white/60 cursor-not-allowed'
              }`}
            >
              {canClaim ? (redPacket.password ? '输入口令' : '开') : '查看详情'}
            </button>
          )}

          {/* 统计信息 */}
          <div className="mt-4 flex justify-between text-white/60 text-xs">
            <span>{details.claimedCount}/{details.totalCount}个</span>
            <span>¥{details.claimedAmount.toFixed(2)}/¥{details.totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 详情弹窗 */}
      {showDetails && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDetails(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">红包详情</h3>
              
              {/* 总览 */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">总金额</span>
                  <span className="font-medium text-gray-900">¥{details.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">红包个数</span>
                  <span className="font-medium text-gray-900">{details.totalCount}个</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">已领取</span>
                  <span className="font-medium text-red-600">{details.claimedCount}个</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">剩余</span>
                  <span className="font-medium text-orange-600">{details.remainingCount}个</span>
                </div>
              </div>

              {/* 领取记录 */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">领取记录</h4>
                <div className="space-y-2">
                  {details.claimedList.map((claim, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center text-white text-sm">
                          {claim.userName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{claim.userName}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(claim.timestamp).toLocaleTimeString('zh-CN', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-red-600">¥{claim.amount.toFixed(2)}</span>
                        {claim.isLuckiest && (
                          <Trophy className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowDetails(false)}
                className="w-full mt-6 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupRedPacketCard;
