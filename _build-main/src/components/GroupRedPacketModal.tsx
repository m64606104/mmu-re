import React, { useState } from 'react';
import { X, Gift, Users, Lock, User } from 'lucide-react';
import { createGroupRedPacket } from '../utils/groupRedPacket';
import { GroupRedPacketInfo } from '../types';

interface GroupRedPacketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (redPacket: GroupRedPacketInfo, message: string) => void;
  groupMembers: Array<{ id: string; name: string }>; // 群成员列表
  currentUserId: string;
  currentUserName: string;
}

const GroupRedPacketModal: React.FC<GroupRedPacketModalProps> = ({
  isOpen,
  onClose,
  onSend,
  groupMembers,
  currentUserId,
  currentUserName,
}) => {
  const [redPacketType, setRedPacketType] = useState<'average' | 'random' | 'exclusive'>('random');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [totalCount, setTotalCount] = useState<string>('');
  const [message, setMessage] = useState<string>('恭喜发财，大吉大利');
  const [password, setPassword] = useState<string>('');
  const [exclusiveUserId, setExclusiveUserId] = useState<string>('');
  const [usePassword, setUsePassword] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSend = () => {
    const amount = parseFloat(totalAmount);
    const count = parseInt(totalCount);

    // 验证
    if (!amount || amount <= 0) {
      alert('请输入有效的金额');
      return;
    }

    if (redPacketType !== 'exclusive') {
      if (!count || count <= 0) {
        alert('请输入有效的红包个数');
        return;
      }

      if (count > 100) {
        alert('红包个数不能超过100个');
        return;
      }

      if (amount < count * 0.01) {
        alert('每个红包至少0.01元');
        return;
      }
    } else {
      // 专属红包只能1个
      if (!exclusiveUserId) {
        alert('请选择专属红包接收者');
        return;
      }
    }

    if (usePassword && !password.trim()) {
      alert('请输入口令');
      return;
    }

    // 创建红包
    const exclusiveMember = groupMembers.find(m => m.id === exclusiveUserId);
    const redPacket = createGroupRedPacket(
      currentUserId,
      currentUserName,
      amount,
      redPacketType === 'exclusive' ? 1 : count,
      redPacketType,
      {
        message: message || '恭喜发财，大吉大利',
        password: usePassword ? password : undefined,
        exclusiveUserId: redPacketType === 'exclusive' ? exclusiveUserId : undefined,
        exclusiveUserName: exclusiveMember?.name,
      }
    );

    onSend(redPacket, message);
    onClose();
    
    // 重置表单
    setTotalAmount('');
    setTotalCount('');
    setMessage('恭喜发财，大吉大利');
    setPassword('');
    setExclusiveUserId('');
    setUsePassword(false);
    setRedPacketType('random');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Gift className="w-6 h-6 text-red-500" />
            <h2 className="text-xl font-bold text-gray-900">发群红包</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* 红包类型选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              红包类型
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setRedPacketType('random')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  redPacketType === 'random'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-red-200'
                }`}
              >
                <Gift className={`w-6 h-6 mx-auto mb-2 ${
                  redPacketType === 'random' ? 'text-red-500' : 'text-gray-400'
                }`} />
                <div className="text-sm font-medium text-gray-900">拼手气</div>
                <div className="text-xs text-gray-500 mt-1">随机金额</div>
              </button>

              <button
                onClick={() => setRedPacketType('average')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  redPacketType === 'average'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-red-200'
                }`}
              >
                <Users className={`w-6 h-6 mx-auto mb-2 ${
                  redPacketType === 'average' ? 'text-red-500' : 'text-gray-400'
                }`} />
                <div className="text-sm font-medium text-gray-900">普通</div>
                <div className="text-xs text-gray-500 mt-1">平均分配</div>
              </button>

              <button
                onClick={() => setRedPacketType('exclusive')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  redPacketType === 'exclusive'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-red-200'
                }`}
              >
                <User className={`w-6 h-6 mx-auto mb-2 ${
                  redPacketType === 'exclusive' ? 'text-red-500' : 'text-gray-400'
                }`} />
                <div className="text-sm font-medium text-gray-900">专属</div>
                <div className="text-xs text-gray-500 mt-1">指定接收</div>
              </button>
            </div>
          </div>

          {/* 金额输入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              总金额
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
              <input
                type="number"
                step="0.01"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none text-lg"
              />
            </div>
          </div>

          {/* 红包个数（非专属红包） */}
          {redPacketType !== 'exclusive' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                红包个数
              </label>
              <input
                type="number"
                value={totalCount}
                onChange={(e) => setTotalCount(e.target.value)}
                placeholder="请输入红包个数"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none"
              />
              <div className="mt-2 text-xs text-gray-500">
                {totalAmount && totalCount && parseInt(totalCount) > 0 && (
                  <span>
                    平均每个 ¥{(parseFloat(totalAmount) / parseInt(totalCount)).toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 专属红包接收者选择 */}
          {redPacketType === 'exclusive' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                专属接收者
              </label>
              <select
                value={exclusiveUserId}
                onChange={(e) => setExclusiveUserId(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none"
              >
                <option value="">请选择接收者</option>
                {groupMembers.filter(m => m.id !== currentUserId).map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 口令设置 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                口令红包
              </label>
              <button
                onClick={() => setUsePassword(!usePassword)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  usePassword ? 'bg-red-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    usePassword ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {usePassword && (
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入口令，如：新年快乐"
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* 留言 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              留言
            </label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="恭喜发财，大吉大利"
              maxLength={20}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 space-y-3">
          <button
            onClick={handleSend}
            className="w-full bg-red-500 text-white py-3 rounded-xl font-medium hover:bg-red-600 transition-colors"
          >
            塞钱进红包
          </button>
          <button
            onClick={onClose}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupRedPacketModal;
