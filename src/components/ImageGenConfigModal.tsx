import { useState, useEffect } from 'react';
import { X, Loader } from 'lucide-react';

interface ImageGenConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: { apiUrl: string; apiKey: string; model: string }) => void;
  initialConfig?: { apiUrl: string; apiKey: string; model?: string };
}

export default function ImageGenConfigModal({
  isOpen,
  onClose,
  onSave,
  initialConfig
}: ImageGenConfigModalProps) {
  const [apiUrl, setApiUrl] = useState(initialConfig?.apiUrl || '');
  const [apiKey, setApiKey] = useState(initialConfig?.apiKey || '');
  const [selectedModel, setSelectedModel] = useState(initialConfig?.model || '');
  const [models, setModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialConfig) {
      setApiUrl(initialConfig.apiUrl);
      setApiKey(initialConfig.apiKey);
      setSelectedModel(initialConfig.model || '');
    }
  }, [initialConfig]);

  // 调取模型列表
  const fetchModels = async () => {
    if (!apiUrl || !apiKey) {
      setError('请先填写API地址和Key');
      return;
    }

    setIsLoadingModels(true);
    setError('');

    try {
      // 🔥 正确处理API地址：移除末尾斜杠，然后添加 /v1/models
      let baseUrl = apiUrl.trim();
      // 移除可能的尾部斜杠
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
      }
      // 移除可能的API路径后缀
      baseUrl = baseUrl.replace(/\/(v1\/)?chat\/completions$/, '');
      baseUrl = baseUrl.replace(/\/(v1\/)?images\/generations$/, '');
      
      // 确保有 /v1 前缀
      const modelsUrl = baseUrl.includes('/v1') 
        ? `${baseUrl}/models` 
        : `${baseUrl}/v1/models`;
      
      console.log('🔍 获取模型列表:', modelsUrl);
      
      // 尝试获取模型列表
      const response = await fetch(modelsUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`获取模型失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // 🔥 参考SettingsScreen的实现，获取所有模型
      const allModels = data.data?.map((m: any) => m.id) || [];
      
      if (allModels.length === 0) {
        // 如果没有找到，使用常见的默认模型
        setModels(['dall-e-3', 'dall-e-2', 'stable-diffusion-xl']);
        if (!selectedModel) {
          setSelectedModel('dall-e-3');
        }
      } else {
        // 🔥 显示所有模型，而不是过滤（参考SettingsScreen的做法）
        setModels(allModels);
        
        // 如果没有选择模型，默认选择第一个
        if (!selectedModel) {
          setSelectedModel(allModels[0]);
        }
      }
    } catch (err) {
      console.error('获取模型失败:', err);
      // 使用默认模型列表
      setModels(['dall-e-3', 'dall-e-2', 'stable-diffusion-xl']);
      setError('无法获取模型列表，已加载默认选项');
      if (!selectedModel) {
        setSelectedModel('dall-e-3');
      }
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleSave = () => {
    if (!apiUrl || !apiKey) {
      setError('请填写完整信息');
      return;
    }

    if (!selectedModel) {
      setError('请选择模型');
      return;
    }

    onSave({ apiUrl, apiKey, model: selectedModel });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">AI生图设置</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* API地址 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API地址
            </label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://api520.pro"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* 获取模型按钮 */}
          <button
            onClick={fetchModels}
            disabled={isLoadingModels || !apiUrl || !apiKey}
            className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isLoadingModels ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                加载中...
              </>
            ) : (
              '调取可用模型'
            )}
          </button>

          {/* 模型选择 */}
          {models.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                选择模型 ({models.length}个可用)
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none max-h-48 overflow-y-auto"
                size={Math.min(models.length + 1, 8)}
              >
                <option value="">请选择模型</option>
                {models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* 提示信息 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-600 leading-relaxed">
              💡 配置AI生图API后，搜索商品时将自动生成商品图片
            </p>
          </div>

          {/* 保存按钮 */}
          <button
            onClick={handleSave}
            disabled={!apiUrl || !apiKey || !selectedModel}
            className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
}
