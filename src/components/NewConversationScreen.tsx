import { ChevronLeft, User, Users } from 'lucide-react';

interface NewConversationScreenProps {
  onNavigateToAddFriend: () => void;
  onNavigateToCreateGroup: () => void;
  onBack: () => void;
}

export default function NewConversationScreen({ onNavigateToAddFriend, onNavigateToCreateGroup, onBack }: NewConversationScreenProps) {
  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center">
        <button onClick={onBack} className="p-2 -ml-2">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold ml-2">新建对话</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              选择对话类型
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onNavigateToAddFriend}
                className="p-6 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 flex flex-col items-center gap-3 transition-all"
              >
                <User className="w-10 h-10 text-blue-500" />
                <span className="font-medium text-lg">添加好友</span>
                <span className="text-xs text-gray-500">添加AI角色好友</span>
              </button>
              <button
                onClick={onNavigateToCreateGroup}
                className="p-6 rounded-lg border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 flex flex-col items-center gap-3 transition-all"
              >
                <Users className="w-10 h-10 text-green-500" />
                <span className="font-medium text-lg">发起群聊</span>
                <span className="text-xs text-gray-500">创建AI群聊</span>
              </button>
            </div>
          </div>

          {/* 提示信息 */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mt-6">
            <p className="text-sm text-blue-700 leading-relaxed">
              💡 添加好友：创建一个AI角色进行一对一聊天<br/>
              💡 发起群聊：邀请多个AI角色进行群组对话
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
