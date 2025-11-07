import { useState, useRef } from 'react';
import { ChevronLeft, User, Users, QrCode, Upload } from 'lucide-react';

interface NewConversationScreenProps {
  onNavigateToAddFriend: () => void;
  onNavigateToCreateGroup: () => void;
  onImportCharacter: (data: any) => void;
  onBack: () => void;
}

export default function NewConversationScreen({ onNavigateToAddFriend, onNavigateToCreateGroup, onImportCharacter, onBack }: NewConversationScreenProps) {
  const [showScan, setShowScan] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // 验证数据格式
      if (!data.version || !data.character) {
        alert('❗ 无效的角色文件格式');
        return;
      }
      
      onImportCharacter(data);
      setShowScan(false);
    } catch (error) {
      console.error('导入失败:', error);
      alert('❌ 文件解析失败，请选择正确的JSON文件');
    }
  };
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

          {/* 扫一扫导入 */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              其他方式
            </label>
            <button
              onClick={() => setShowScan(true)}
              className="w-full p-4 rounded-lg border-2 border-orange-200 hover:border-orange-400 hover:bg-orange-50 flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-3">
                <QrCode className="w-6 h-6 text-orange-500" />
                <div className="text-left">
                  <div className="font-medium text-orange-700">扫一扫</div>
                  <div className="text-xs text-gray-500">导入迁移的角色数据</div>
                </div>
              </div>
              <ChevronLeft className="w-5 h-5 text-gray-400 rotate-180" />
            </button>
          </div>

          {/* 提示信息 */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mt-6">
            <p className="text-sm text-blue-700 leading-relaxed">
              💡 添加好友：创建一个AI角色进行一对一聊天<br/>
              💡 发起群聊：邀请多个AI角色进行群组对话<br/>
              💡 扫一扫：导入他人分享的角色数据
            </p>
          </div>
        </div>
      </div>

      {/* 扫一扫导入弹窗 */}
      {showScan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                导入角色数据
              </h3>
              <button
                onClick={() => setShowScan(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              选择之前导出的角色JSON文件，一键导入角色设置、记忆库和聊天记录
            </p>

            {/* 选择文件 */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 border-2 border-dashed border-orange-300 hover:border-orange-500 hover:bg-orange-50 rounded-xl transition-colors flex flex-col items-center gap-3"
            >
              <Upload className="w-12 h-12 text-orange-500" />
              <div>
                <div className="font-medium text-orange-700">选择JSON文件</div>
                <div className="text-xs text-gray-500 mt-1">支持角色迁移导出的文件</div>
              </div>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* 提示 */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700 leading-relaxed">
                📌 <strong>支持的数据：</strong><br/>
                • 角色设置（名称、头像、特性）<br/>
                • 记忆库内容<br/>
                • 聊天记录（如果包含）
              </p>
            </div>

            <button
              onClick={() => setShowScan(false)}
              className="w-full mt-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
