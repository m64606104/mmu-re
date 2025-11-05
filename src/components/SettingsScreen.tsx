import { useState, useEffect } from 'react';
import { ChevronLeft, Check, Loader2 } from 'lucide-react';
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

    onUpdateConfig({ baseUrl, apiKey, modelName });
    alert('配置已保存');
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
        <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Base URL
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api520.pro"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={testConnection}
            disabled={testing}
            className="w-full bg-blue-500 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 disabled:bg-gray-400"
          >
            {testing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                测试中...
              </>
            ) : testResult === 'success' ? (
              <>
                <Check className="w-5 h-5" />
                测试成功
              </>
            ) : (
              '测试连接'
            )}
          </button>

          {availableModels.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择模型
              </label>
              <select
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableModels.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleSave}
            className="w-full bg-green-500 text-white py-2 rounded-lg font-medium"
          >
            保存配置
          </button>
        </div>

        {/* 头像装饰设置 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mt-4">
          <h2 className="text-base font-semibold text-gray-900 mb-3">头像装饰</h2>
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
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              当前选择: <span className="text-xl ml-2">{selectedBadge}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
