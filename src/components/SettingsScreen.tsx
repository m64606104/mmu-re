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

  // 导出全部数据
  const handleExportAllData = () => {
    try {
      // 收集所有localStorage数据
      const allData: { [key: string]: any } = {};
      
      // 遍历localStorage获取所有数据
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            try {
              // 尝试解析JSON
              allData[key] = JSON.parse(value);
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
      
      alert('✅ 全部数据已导出！');
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
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
          alert('导入文件格式不正确');
          return;
        }

        // 确认导入
        const confirmMsg = `即将导入数据备份\n\n` +
          `备份时间: ${new Date(importedData.exportDate).toLocaleString()}\n` +
          `数据项数: ${Object.keys(importedData.data).length}\n\n` +
          `⚠️ 警告：这将覆盖当前所有数据！\n` +
          `建议先导出当前数据作为备份。\n\n` +
          `确定要继续吗？`;
        
        if (!window.confirm(confirmMsg)) {
          return;
        }

        // 清空localStorage
        localStorage.clear();

        // 恢复所有数据
        const data = importedData.data;
        for (const key in data) {
          const value = data[key];
          if (typeof value === 'object') {
            localStorage.setItem(key, JSON.stringify(value));
          } else {
            localStorage.setItem(key, value);
          }
        }

        alert('✅ 数据导入成功！\n\n页面将刷新以应用更改。');
        
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

        {/* 数据管理 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-5 h-5 text-gray-700" />
            <h2 className="text-base font-semibold text-gray-900">数据管理</h2>
          </div>
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
              • 导出：保存所有对话、朋友圈、设置等数据<br />
              • 导入：恢复之前导出的数据到新设备<br />
              • ⚠️ 导入会覆盖当前数据，请谨慎操作
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
