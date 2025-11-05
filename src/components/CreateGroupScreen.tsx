import { useState, useRef } from 'react';
import { ChevronLeft, Upload, Plus, X } from 'lucide-react';
import { Conversation } from '../types';

interface CreateGroupScreenProps {
  conversations: Conversation[];
  onCreateGroup: (groupData: {
    groupName: string;
    groupRemark: string;
    groupAvatar: string;
    members: string[]; // 成员ID数组
  }) => void;
  onBack: () => void;
}

export default function CreateGroupScreen({ conversations, onCreateGroup, onBack }: CreateGroupScreenProps) {
  const [groupName, setGroupName] = useState('');
  const [groupRemark, setGroupRemark] = useState('');
  const [groupAvatar, setGroupAvatar] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 获取所有私聊联系人
  const contacts = conversations.filter(c => c.type === 'private');

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setGroupAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const removeMember = (memberId: string) => {
    setSelectedMembers(prev => prev.filter(id => id !== memberId));
  };

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      alert('请输入群名称');
      return;
    }

    if (selectedMembers.length === 0) {
      alert('请至少选择一个群成员');
      return;
    }

    onCreateGroup({
      groupName: groupName.trim(),
      groupRemark: groupRemark.trim(),
      groupAvatar,
      members: selectedMembers,
    });
  };

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center">
        <button onClick={onBack} className="p-2 -ml-2">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold ml-2">发起群聊</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Group Avatar */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            群头像
          </label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center overflow-hidden">
              {groupAvatar ? (
                <img src={groupAvatar} alt="Group Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-semibold text-2xl">
                  {groupName.charAt(0) || '群'}
                </span>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Upload className="w-4 h-4" />
              上传头像
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Group Name */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            群名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="输入群名称"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Group Remark */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            群备注名
          </label>
          <input
            type="text"
            value={groupRemark}
            onChange={(e) => setGroupRemark(e.target.value)}
            placeholder="可选：设置群备注名"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">仅自己可见</p>
        </div>

        {/* Selected Members */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              群成员 ({selectedMembers.length})
            </label>
            <button
              onClick={() => setShowMemberSelector(true)}
              className="flex items-center gap-1 text-blue-500 hover:text-blue-600 text-sm"
            >
              <Plus className="w-4 h-4" />
              添加成员
            </button>
          </div>
          
          {selectedMembers.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <p>还未添加群成员</p>
              <p className="text-sm mt-1">点击上方"添加成员"按钮选择联系人</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedMembers.map(memberId => {
                const member = contacts.find(c => c.id === memberId);
                if (!member) return null;
                return (
                  <div key={memberId} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden">
                        {member.characterSettings?.avatar || member.avatar ? (
                          <img 
                            src={member.characterSettings?.avatar || member.avatar} 
                            alt={member.name} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <span className="text-white font-semibold">
                            {member.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{member.characterSettings?.nickname || member.name}</div>
                        {member.characterSettings?.username && (
                          <div className="text-xs text-gray-500">{member.characterSettings.username}</div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeMember(memberId)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 提示信息 */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <p className="text-sm text-blue-700 leading-relaxed">
            💡 创建群聊后，所选择的AI角色会加入群聊，你可以在群里与他们进行多人对话
          </p>
        </div>

        {/* Create Group Button */}
        <button
          onClick={handleCreateGroup}
          className="w-full bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600 active:bg-green-700 transition-colors"
        >
          创建群聊
        </button>
      </div>

      {/* Member Selector Modal */}
      {showMemberSelector && (
        <div className="absolute inset-0 bg-white z-50 flex flex-col">
          {/* Modal Header */}
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">选择群成员</h2>
            <button
              onClick={() => setShowMemberSelector(false)}
              className="p-2 text-gray-600 hover:text-gray-800"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto p-4">
            {contacts.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>还没有联系人</p>
                <p className="text-sm mt-1">先添加一些好友吧</p>
              </div>
            ) : (
              <div className="space-y-2">
                {contacts.map(contact => {
                  const isSelected = selectedMembers.includes(contact.id);
                  return (
                    <button
                      key={contact.id}
                      onClick={() => toggleMember(contact.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-blue-50 border-2 border-blue-500'
                          : 'bg-white border-2 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden">
                          {contact.characterSettings?.avatar || contact.avatar ? (
                            <img 
                              src={contact.characterSettings?.avatar || contact.avatar} 
                              alt={contact.name} 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <span className="text-white font-semibold">
                              {contact.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="text-left">
                          <div className="font-medium">{contact.characterSettings?.nickname || contact.name}</div>
                          {contact.characterSettings?.username && (
                            <div className="text-xs text-gray-500">{contact.characterSettings.username}</div>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="border-t border-gray-200 p-4">
            <button
              onClick={() => setShowMemberSelector(false)}
              className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              确定 ({selectedMembers.length}人)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
