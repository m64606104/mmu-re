import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Check, Loader2, Download, Upload, Database } from 'lucide-react';
import { ApiConfig } from '../types';

interface SettingsScreenProps {
  apiConfig: ApiConfig;
  onUpdateConfig: (config: ApiConfig) => void;
  onBack: () => void;
}

const AVATAR_BADGES = ['🎵', '🎮', '🎧', '🎨', '🎬', '📷', '⚡', '🔥', '💫', '✨', '🌟', '💎'];

export default function SettingsScreen({ apiConfig, onUpdateConfig, onBack }: SettingsScreenProps) {
  const [baseUrl, setBaseUrl] = useState(apiConfig.baseUrl);
  const [apiKey, setApiKey] = useState(apiConfig.apiKey);
  const [modelName, setModelName] = useState(apiConfig.modelName);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [selectedBadge, setSelectedBadge] = useState('🎵');
  const importInputRef = useRef<HTMLInputElement>(null);
  
  // 语音转文字配置
  const [sttEnabled, setSttEnabled] = useState(apiConfig.speechToText?.enabled || false);
  const [sttApiUrl, setSttApiUrl] = useState(apiConfig.speechToText?.apiUrl || '');
  const [sttApiKey, setSttApiKey] = useState(apiConfig.speechToText?.apiKey || '');
  const [sttModel, setSttModel] = useState(apiConfig.speechToText?.model || 'glm-4-flash');

  useEffect(() => {
    // 加载用户头像装饰配置
    try {
      const profile = localStorage.getItem('userProfile');
      if (profile) {
        const parsed = JSON.parse(profile);
        setSelectedBadge(parsed.avatarBadge || '🎵');
      }
    } catch (e) {
      console.error('Failed to load user profile:', e);
    }
  }, []);

  const handleBadgeChange = (badge: string) => {
    setSelectedBadge(badge);
    // 保存到localStorage
    try {
      const profile = localStorage.getItem('userProfile');
      const parsed = profile ? JSON.parse(profile) : {};
      parsed.avatarBadge = badge;
      localStorage.setItem('userProfile', JSON.stringify(parsed));
    } catch (e) {
      console.error('Failed to save badge:', e);
    }
  };

  const testConnection = async () => {
    if (!baseUrl || !apiKey) {
      alert('请填写 Base URL 和 API Key');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(`${baseUrl}/v1/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('API 连接失败');
      }

      const data = await response.json();
      const models = data.data?.map((m: any) => m.id) || [];
      setAvailableModels(models);
      setTestResult('success');
      
      if (models.length > 0 && !modelName) {
        setModelName(models[0]);
      }
    } catch (error) {
      console.error('Test failed:', error);
      setTestResult('error');
      alert('连接测试失败，请检查配置');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    if (!baseUrl || !apiKey || !modelName) {
      alert('请完成所有配置项');
      return;
    }

    // 检查语音转文字配置
    if (sttEnabled && (!sttApiUrl || !sttApiKey)) {
      alert('请完成语音转文字API配置');
      return;
    }

    onUpdateConfig({ 
      baseUrl, 
      apiKey, 
      modelName,
      speechToText: sttEnabled ? {
        enabled: true,
        apiUrl: sttApiUrl,
        apiKey: sttApiKey,
        model: sttModel
      } : {
        enabled: false
      }
    });
    alert('配置已保存');
  };

  // 导出全部数据
  const handleExportAllData = () => {
    try {
      // 收集所有localStorage数据
      const allData: { [key: string]: any } = {};
      
      // 🔍 统计各类数据
      const stats = {
        conversations: 0,      // 对话数
        messages: 0,          // 消息数
        moments: 0,           // 朋友圈数
        contacts: 0,          // 联系人数
        documents: 0,         // 文档数
        memories: 0,          // 记忆数
        images: 0,            // 图片数
        profiles: 0,          // 角色数
        relationships: 0      // 关系数
      };
      
      // 遍历localStorage获取所有数据
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            try {
              // 尝试解析JSON
              const parsed = JSON.parse(value);
              allData[key] = parsed;
              
              // 📊 统计数据量
              if (key === 'conversations' && Array.isArray(parsed)) {
                stats.conversations = parsed.length;
                stats.messages = parsed.reduce((sum: number, conv: any) => 
                  sum + (conv.messages?.length || 0), 0);
                stats.profiles = parsed.filter((c: any) => c.characterSettings).length;
              } else if (key.startsWith('moments_') && parsed.posts) {
                stats.moments += parsed.posts.length;
              } else if (key === 'contacts' && Array.isArray(parsed)) {
                stats.contacts = parsed.length;
              } else if (key === 'document_library' && Array.isArray(parsed)) {
                stats.documents = parsed.length;
              } else if (key === 'chat_memory_banks' && Array.isArray(parsed)) {
                // 统计记忆库中的记忆数量
                stats.memories = parsed.reduce((sum: number, bank: any) => 
                  sum + (bank.memories?.length || 0), 0);
              } else if (key === 'relationships' && Array.isArray(parsed)) {
                stats.relationships = parsed.length;
              } else if (key === 'landscapeImage' || key === 'bannerImage') {
                stats.images++;
              }
            } catch {
              // 如果不是JSON，直接存储字符串
              allData[key] = value;
            }
          }
        }
      }

      // 添加元数据
      const exportData = {
        exportDate: new Date().toISOString(),
        appVersion: '1.0.0',
        dataType: 'full-backup',
        stats: stats,  // 添加统计信息
        data: allData
      };

      // 创建并下载文件
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `momoyu_全数据备份_${new Date().toLocaleDateString()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // 显示详细的导出信息
      const message = `✅ 全部数据已导出！\n\n` +
        `📊 包含内容：\n` +
        `• 对话记录: ${stats.conversations} 个（${stats.messages} 条消息）\n` +
        `• AI角色: ${stats.profiles} 个\n` +
        `• 联系人: ${stats.contacts} 个\n` +
        `• 朋友圈: ${stats.moments} 条\n` +
        `• 文档库: ${stats.documents} 份\n` +
        `• 记忆库: ${stats.memories} 条\n` +
        `• 关系网络: ${stats.relationships} 条\n` +
        `• 背景图片: ${stats.images} 张\n` +
        `• 其他设置和数据\n\n` +
        `💾 文件已保存到下载文件夹`;
      
      alert(message);
    } catch (error) {
      console.error('导出失败:', error);
      alert('❌ 导出失败，请重试\n\n错误: ' + error);
    }
  };

  // 导入全部数据
  const handleImportAllData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        
        // 验证数据格式
        if (!importedData.data || typeof importedData.data !== 'object') {
          alert('❌ 导入文件格式不正确');
          return;
        }

        // 构建详细的确认消息
        const stats = importedData.stats || {};
        const confirmMsg = `📥 即将导入数据备份\n\n` +
          `📅 备份时间: ${new Date(importedData.exportDate).toLocaleString()}\n` +
          `📊 数据内容:\n` +
          `  • 对话记录: ${stats.conversations || '?'} 个\n` +
          `  • AI角色: ${stats.profiles || '?'} 个\n` +
          `  • 联系人: ${stats.contacts || '?'} 个\n` +
          `  • 朋友圈: ${stats.moments || '?'} 条\n` +
          `  • 文档库: ${stats.documents || '?'} 份\n` +
          `  • 记忆库: ${stats.memories || '?'} 条\n` +
          `  • 关系网络: ${stats.relationships || '?'} 条\n` +
          `  • 背景图片: ${stats.images || '?'} 张\n` +
          `  • 总数据项: ${Object.keys(importedData.data).length}\n\n` +
          `⚠️ 警告：这将覆盖当前所有数据！\n` +
          `建议先导出当前数据作为备份。\n\n` +
          `✅ 包含内容：\n` +
          `  • 所有对话和消息\n` +
          `  • 所有AI角色设置（含记忆库）\n` +
          `  • 联系人和关系网络\n` +
          `  • 朋友圈内容\n` +
          `  • 文档库和知识库\n` +
          `  • 头像和背景图片\n` +
          `  • API配置和其他设置\n\n` +
          `确定要继续吗？`;
        
        if (!window.confirm(confirmMsg)) {
          return;
        }

        // 清空localStorage
        localStorage.clear();

        // 恢复所有数据
        const data = importedData.data;
        let importedCount = 0;
        for (const key in data) {
          const value = data[key];
          if (typeof value === 'object') {
            localStorage.setItem(key, JSON.stringify(value));
          } else {
            localStorage.setItem(key, value);
          }
          importedCount++;
        }

        alert(`✅ 数据导入成功！\n\n` +
          `已恢复 ${importedCount} 项数据\n` +
          `页面将刷新以应用更改。`);
        
        // 刷新页面
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        
      } catch (error) {
        console.error('导入失败:', error);
        alert('导入失败：文件格式错误或数据损坏');
      }
    };
    reader.readAsText(file);

    // 重置input
    if (importInputRef.current) {
      importInputRef.current.value = '';
    }
  };

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center">
        <button onClick={onBack} className="p-2 -ml-2">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold ml-2">设置</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* API 配置卡片 */}
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-500" />
            API 配置
          </h2>

          {/* Base URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Base URL
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api520.pro"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* 模型选择 - 始终显示 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              模型名称
            </label>
            {availableModels.length > 0 ? (
              // 有可用模型列表时，使用下拉选择
              <div className="space-y-2">
                <select
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                >
                  {availableModels.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  已获取 {availableModels.length} 个可用模型
                </p>
              </div>
            ) : (
              // 没有可用模型列表时，使用文本输入
              <div className="space-y-2">
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="gpt-3.5-turbo"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <p className="text-xs text-gray-500">
                  💡 点击"测试连接"可自动获取可用模型列表
                </p>
              </div>
            )}
          </div>

          {/* 当前配置状态 */}
          {modelName && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                <span className="font-semibold">当前模型：</span>
                <span className="ml-1 font-mono">{modelName}</span>
              </p>
            </div>
          )}

          {/* 测试连接按钮 */}
          <button
            onClick={testConnection}
            disabled={testing}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {testing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                测试连接中...
              </>
            ) : testResult === 'success' ? (
              <>
                <Check className="w-5 h-5" />
                连接成功 · 点击重新测试
              </>
            ) : (
              '测试 API 连接'
            )}
          </button>

          {/* 保存按钮 */}
          <button
            onClick={handleSave}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-lg font-medium transition-colors"
          >
            保存配置
          </button>
        </div>

        {/* 语音转文字设置 */}
        <div className="bg-white rounded-xl shadow-sm p-5 mt-4">
          <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            🎤 语音转文字
          </h2>
          
          {/* 开关 */}
          <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <p className="font-medium text-gray-900">启用语音识别</p>
              <p className="text-xs text-gray-500 mt-1">关闭后发送语音需手动输入文字</p>
            </div>
            <button
              onClick={() => setSttEnabled(!sttEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                sttEnabled ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  sttEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {sttEnabled && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API 地址
                </label>
                <input
                  type="text"
                  value={sttApiUrl}
                  onChange={(e) => setSttApiUrl(e.target.value)}
                  placeholder="https://open.bigmodel.cn/api/paas/v4"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={sttApiKey}
                  onChange={(e) => setSttApiKey(e.target.value)}
                  placeholder="请输入语音识别API Key"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  识别模型
                </label>
                <input
                  type="text"
                  value={sttModel}
                  onChange={(e) => setSttModel(e.target.value)}
                  placeholder="glm-4-flash"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* 推荐提示 */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800 leading-relaxed">
                  <span className="font-semibold">💡 推荐使用：</span><br />
                  • <span className="font-medium">智谱清言 glm-4-flash</span><br />
                  • 免费无限次数，识别准确度高<br />
                  • 支持60秒语音识别<br />
                  • API地址: <span className="font-mono text-xs">https://open.bigmodel.cn/api/paas/v4</span><br />
                  • 在 <a href="https://open.bigmodel.cn" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">智谱AI开放平台</a> 获取免费API Key
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 头像装饰设置 */}
        <div className="bg-white rounded-xl shadow-sm p-5 mt-4">
          <h2 className="text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
            ✨ 头像装饰
          </h2>
          <p className="text-sm text-gray-500 mb-4">选择你喜欢的头像装饰图标</p>
          <div className="grid grid-cols-6 gap-3">
            {AVATAR_BADGES.map((badge) => (
              <button
                key={badge}
                onClick={() => handleBadgeChange(badge)}
                className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all ${
                  selectedBadge === badge
                    ? 'bg-blue-500 scale-110 shadow-lg'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {badge}
              </button>
            ))}
          </div>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="text-sm text-blue-700">
              当前选择: <span className="text-xl ml-2">{selectedBadge}</span>
            </p>
          </div>
        </div>

        {/* 数据管理 */}
        <div className="bg-white rounded-xl shadow-sm p-5 mt-4">
          <h2 className="text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-500" />
            数据管理
          </h2>
          <p className="text-sm text-gray-500 mb-4">导出或导入所有应用数据</p>
          
          <div className="grid grid-cols-2 gap-3">
            {/* 导出全部数据 */}
            <button
              onClick={handleExportAllData}
              className="py-3 border-2 border-green-200 hover:border-green-400 hover:bg-green-50 rounded-lg transition-colors flex flex-col items-center justify-center gap-2 text-green-700"
            >
              <Download className="w-6 h-6" />
              <span className="font-medium text-sm">导出全部数据</span>
            </button>
            
            {/* 导入全部数据 */}
            <button
              onClick={() => importInputRef.current?.click()}
              className="py-3 border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 rounded-lg transition-colors flex flex-col items-center justify-center gap-2 text-blue-700"
            >
              <Upload className="w-6 h-6" />
              <span className="font-medium text-sm">导入全部数据</span>
            </button>
          </div>

          {/* 隐藏的文件输入 */}
          <input
            ref={importInputRef}
            type="file"
            accept=".json"
            onChange={handleImportAllData}
            className="hidden"
          />

          {/* 说明信息 */}
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800 leading-relaxed">
              <span className="font-semibold">📦 数据迁移说明：</span><br />
              <span className="font-semibold">✅ 包含内容：</span><br />
              • 所有对话记录和消息<br />
              • 所有AI角色设置（头像、性格、知识库等）<br />
              • 联系人和关系网络<br />
              • 朋友圈内容和互动记录<br />
              • 文档库和已保存的文档<br />
              • 用户头像和背景图片<br />
              • API配置和其他设置<br />
              <span className="font-semibold mt-2 block">⚠️ 注意：</span>
              • 导入会覆盖当前所有数据<br />
              • 建议定期备份数据
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
