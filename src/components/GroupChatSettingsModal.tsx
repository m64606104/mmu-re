import React, { useState } from 'react';
import { X, Users, Info, Image as ImageIcon, UserPlus, UserMinus, Trash2, Camera, ChevronRight } from 'lucide-react';
import { Conversation } from '../types';

interface GroupChatSettingsModalProps {
  conversation: Conversation;
  conversations: Conversation[];
  /** 全局设置里的对话模型名，用于占位提示 */
  globalDefaultModelName?: string;
  onClose: () => void;
  onUpdateConversation: (conversationId: string, updates: Partial<Conversation>) => void;
  onDeleteConversation?: (conversationId: string) => void;
}

const GroupChatSettingsModal: React.FC<GroupChatSettingsModalProps> = ({
  conversation,
  conversations,
  globalDefaultModelName,
  onClose,
  onUpdateConversation,
  onDeleteConversation,
}) => {
  // 状态管理
  const [groupChatMode, setGroupChatMode] = useState<'sequential' | 'free'>(
    conversation.groupChatMode || 'sequential'
  );
  const [groupName, setGroupName] = useState(conversation.name);
  const [groupRemark, setGroupRemark] = useState(conversation.groupRemark || '');
  const [groupAvatar, setGroupAvatar] = useState(conversation.avatar || '');
  const [showAddMember, setShowAddMember] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedNewMembers, setSelectedNewMembers] = useState<string[]>([]);
  
  // 上下文配置状态
  const [contextEnabled, setContextEnabled] = useState(conversation.groupContextConfig?.enabled || false);
  const [contextMessageCount, setContextMessageCount] = useState(conversation.groupContextConfig?.messageCount || 30);
  
  // 生成温度（0-1）
  const [groupTemperature, setGroupTemperature] = useState<number>(
    typeof conversation.groupTemperature === 'number'
      ? Math.max(0, Math.min(1, conversation.groupTemperature))
      : ((conversation.groupChatMode || 'sequential') === 'free' ? 0.6 : 0.8)
  );
  
  const imageInputRef = React.useRef<HTMLInputElement>(null);

  const [groupChatModelOverride, setGroupChatModelOverride] = useState(
    conversation.groupChatModelOverride ?? ''
  );

  const handleSave = () => {
    const trimmedModel = groupChatModelOverride.trim();
    onUpdateConversation(conversation.id, {
      name: groupName,
      groupRemark: groupRemark,
      avatar: groupAvatar,
      groupChatMode: groupChatMode,
      groupTemperature: groupTemperature,
      groupChatModelOverride: trimmedModel ? trimmedModel : undefined,
      groupContextConfig: {
        enabled: contextEnabled,
        messageCount: contextMessageCount,
      },
    });
    onClose();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setGroupAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmAddMembers = () => {
    if (selectedNewMembers.length === 0) return;
    const currentMembers = conversation.members || [];
    const newMembers = [...new Set([...currentMembers, ...selectedNewMembers])];
    onUpdateConversation(conversation.id, {
      members: newMembers,
    });
    setSelectedNewMembers([]);
    setShowAddMember(false);
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedNewMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleRemoveMember = (memberId: string) => {
    const currentMembers = conversation.members || [];
    const newMembers = currentMembers.filter(id => id !== memberId);
    onUpdateConversation(conversation.id, {
      members: newMembers,
    });
  };

  const handleDeleteGroup = () => {
    if (onDeleteConversation) {
      onDeleteConversation(conversation.id);
      onClose();
    }
  };

  const getMembers = () => {
    return (conversation.members || [])
      .map(memberId => conversations.find(c => c.id === memberId))
      .filter(c => c) as Conversation[];
  };

  const getTempLabel = (t: number) => (t <= 0.3 ? '稳重聚焦' : t <= 0.6 ? '均衡自然' : '灵感活跃');
  const getTempDesc = (t: number) => (
    t <= 0.3
      ? '更保守、连贯性最强，可能略显平淡'
      : t <= 0.6
      ? '连贯与变化平衡，适合日常群聊（推荐）'
      : '更有创意与惊喜，可能偶尔跑题或炫技'
  );

  const getAvailableContacts = () => {
    const memberIds = conversation.members || [];
    return conversations.filter(c => 
      c.type === 'private' && !memberIds.includes(c.id)
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-[90%] max-w-md max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
        {/* 标题栏 */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6" />
            <h2 className="text-lg font-semibold">群聊设置</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 折叠面板内容区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          
          {/* 📋 群信息 */}
          <details className="bg-white rounded-lg shadow-sm overflow-hidden group border border-gray-100" open>
            <summary className="px-4 py-3 flex items-center justify-between bg-gray-50 border-b border-gray-100 cursor-pointer list-none select-none hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                <h3 className="text-sm font-medium text-gray-900">群信息</h3>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500 transition-transform group-open:rotate-90" />
            </summary>
            <div className="p-4 space-y-4">
              {/* 群头像 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">群头像</label>
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 shadow-md">
                    {groupAvatar ? (
                      <img src={groupAvatar} alt="群头像" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                        <span className="text-white text-2xl font-semibold">{groupName.charAt(0)}</span>
                      </div>
                    )}
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                    >
                      <Camera className="w-6 h-6 text-white" />
                    </button>
                  </div>
                  <div className="flex-1">
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                    >
                      <ImageIcon className="w-4 h-4" />
                      上传图片
                    </button>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* 群名称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">群名称</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="请输入群名称"
                />
              </div>

              {/* 群备注 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">群备注</label>
                <textarea
                  value={groupRemark}
                  onChange={(e) => setGroupRemark(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="请输入群备注（可选）"
                />
              </div>

              {/* 删除群 */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  删除群聊
                </button>
              </div>
            </div>
          </details>

          {/* 💬 回复模式 */}
          <details className="bg-white rounded-lg shadow-sm overflow-hidden group border border-gray-100">
            <summary className="px-4 py-3 flex items-center justify-between bg-gray-50 border-b border-gray-100 cursor-pointer list-none select-none hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                <h3 className="text-sm font-medium text-gray-900">回复模式</h3>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500 transition-transform group-open:rotate-90" />
            </summary>
            <div className="p-4 space-y-4">
              {/* 对话行为 */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">对话行为</h4>
                
                {/* 顺序模式 */}
                <button
                  onClick={() => setGroupChatMode('sequential')}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    groupChatMode === 'sequential'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-medium text-gray-900">顺序模式</div>
                    {groupChatMode === 'sequential' && (
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    所有AI成员依次回复，确保每个AI都能发言
                  </div>
                </button>

                {/* 自由模式 */}
                <button
                  onClick={() => setGroupChatMode('free')}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    groupChatMode === 'free'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-medium text-gray-900">自由模式</div>
                    {groupChatMode === 'free' && (
                      <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    随机选择0到全部AI回复，AI之间可以自由对话
                  </div>
                </button>
                
                {/* 自由模式说明 */}
                {groupChatMode === 'free' && (
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <div className="flex items-start gap-2">
                      <Info className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-gray-700">
                        <div className="font-medium text-purple-900 mb-2">自由模式特性：</div>
                        <ul className="space-y-1 list-disc list-inside text-xs">
                          <li>每次生成时随机选择参与回复的AI数量</li>
                          <li>AI可以根据其他AI的消息进行回复</li>
                          <li>AI可以引入新话题，保持对话活跃</li>
                          <li>即使没有新消息，AI也会继续聊天</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 生成温度设置 */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">生成温度</h4>
                  <div className="text-sm font-medium text-orange-600">
                    {getTempLabel(groupTemperature)} · {groupTemperature.toFixed(1)}
                  </div>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={groupTemperature}
                    onChange={(e) => setGroupTemperature(parseFloat(e.target.value))}
                    className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>稳重</span>
                    <span>均衡</span>
                    <span>活跃</span>
                  </div>
                  <div className="text-xs text-gray-600 bg-white/70 rounded-md p-2 mt-3">
                    {getTempDesc(groupTemperature)}
                  </div>
                </div>
              </div>

              {/* 自定义上下文数量 */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">自定义上下文数量</h4>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={contextEnabled}
                      onChange={(e) => setContextEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>
                
                {contextEnabled && (
                  <div className="space-y-3">
                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">上下文消息数量：</span>
                        <span className="text-sm font-bold text-green-600">{contextMessageCount} 条</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={contextMessageCount}
                        onChange={(e) => setContextMessageCount(parseInt(e.target.value))}
                        className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>1条</span>
                        <span>100条</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3">
                      💡 控制AI回复时参考的历史消息数量。消息越多，AI理解上下文越准确，但会增加API调用成本。
                    </div>
                  </div>
                )}
              </div>
            </div>
          </details>

          {/* 🤖 单独配置模型 */}
          <details className="bg-white rounded-lg shadow-sm overflow-hidden group border border-gray-100">
            <summary className="px-4 py-3 flex items-center justify-between bg-gray-50 border-b border-gray-100 cursor-pointer list-none select-none hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                <h3 className="text-sm font-medium text-gray-900">单独配置模型</h3>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500 transition-transform group-open:rotate-90" />
            </summary>
            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-600 leading-relaxed">
                留空则使用设置里的全局对话模型。本群所有 AI 发言与群记忆总结会优先使用此处模型；成员角色上的单独模型仅在未填写群模型时生效。视觉模型仍在全局设置中配置。
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">对话模型 ID</label>
                <input
                  type="text"
                  value={groupChatModelOverride}
                  onChange={(e) => setGroupChatModelOverride(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                  placeholder={globalDefaultModelName ? `默认：${globalDefaultModelName}` : '例如 gpt-4o'}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
            </div>
          </details>

          {/* 👥 成员管理 */}
          <details className="bg-white rounded-lg shadow-sm overflow-hidden group border border-gray-100">
            <summary className="px-4 py-3 flex items-center justify-between bg-gray-50 border-b border-gray-100 cursor-pointer list-none select-none hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-green-500 rounded-full"></div>
                <h3 className="text-sm font-medium text-gray-900">成员管理</h3>
                <span className="text-xs text-gray-500">({getMembers().length})</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500 transition-transform group-open:rotate-90" />
            </summary>
            <div className="p-4 space-y-4">
              {/* 添加成员按钮 */}
              <button
                onClick={() => setShowAddMember(true)}
                className="w-full py-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <UserPlus className="w-4 h-4" />
                添加成员
              </button>

              {/* 成员列表 */}
              <div className="space-y-2">
                {getMembers().map(member => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm">
                        {member.characterSettings?.avatar || member.avatar ? (
                          <img
                            src={member.characterSettings?.avatar || member.avatar}
                            alt={member.characterSettings?.nickname || member.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                            <span className="text-white text-sm font-semibold">
                              {(member.characterSettings?.nickname || member.name).charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {member.characterSettings?.nickname || member.name}
                        </div>
                        {member.characterSettings?.personality && (
                          <div className="text-xs text-gray-500">
                            {member.characterSettings.personality.slice(0, 20)}...
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm(`确定要将 ${member.characterSettings?.nickname || member.name} 移出群聊吗？`)) {
                          handleRemoveMember(member.id);
                        }
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="移出群聊"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {getMembers().length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    暂无成员
                  </div>
                )}
              </div>
            </div>
          </details>
        </div>

        {/* 底部按钮 */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
          >
            保存
          </button>
        </div>
      </div>

      {/* 添加成员弹窗 */}
      {showAddMember && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-[90%] max-w-md max-h-[70vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">添加群成员</h3>
              <button
                onClick={() => {
                  setShowAddMember(false);
                  setSelectedNewMembers([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {getAvailableContacts().length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  没有可添加的联系人
                </div>
              ) : (
                <div className="space-y-2">
                  {getAvailableContacts().map(contact => (
                    <button
                      key={contact.id}
                      onClick={() => toggleMemberSelection(contact.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        selectedNewMembers.includes(contact.id)
                          ? 'bg-blue-50 border-2 border-blue-500'
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm">
                        {contact.characterSettings?.avatar || contact.avatar ? (
                          <img
                            src={contact.characterSettings?.avatar || contact.avatar}
                            alt={contact.characterSettings?.nickname || contact.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                            <span className="text-white font-semibold">
                              {(contact.characterSettings?.nickname || contact.name).charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-gray-900">
                          {contact.characterSettings?.nickname || contact.name}
                        </div>
                        {contact.characterSettings?.personality && (
                          <div className="text-sm text-gray-500">
                            {contact.characterSettings.personality.slice(0, 30)}...
                          </div>
                        )}
                      </div>
                      {selectedNewMembers.includes(contact.id) && (
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <div className="w-3 h-3 bg-white rounded-full"></div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setShowAddMember(false);
                  setSelectedNewMembers([]);
                }}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmAddMembers}
                disabled={selectedNewMembers.length === 0}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  selectedNewMembers.length > 0
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                添加 {selectedNewMembers.length > 0 && `(${selectedNewMembers.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-[90%] max-w-sm p-6 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除群聊？</h3>
              <p className="text-sm text-gray-600">
                删除后，群聊记录将被永久清除，且无法恢复
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDeleteGroup}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupChatSettingsModal;
