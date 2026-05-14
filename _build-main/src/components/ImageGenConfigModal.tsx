import { useState, useEffect } from 'react';
import { X, Loader, Settings } from 'lucide-react';
import { apiPresetsManager, APIPreset } from '../utils/apiPresetsManager';
import { fetchOpenAiCompatibleModelIdsWithDiagnostics } from '../utils/openaiCompatibleModels';
import APIPresetsModal from './APIPresetsModal';

interface ImageGenConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: { apiUrl: string; apiKey: string; model: string }) => void;
  initialConfig?: { apiUrl: string; apiKey: string; model?: string };
  showShopToggle?: boolean; // 是否显示商城生图开关
}

export default function ImageGenConfigModal({
  isOpen,
  onClose,
  onSave,
  initialConfig,
  showShopToggle = false
}: ImageGenConfigModalProps) {
  const [apiUrl, setApiUrl] = useState(initialConfig?.apiUrl || '');
  const [apiKey, setApiKey] = useState(initialConfig?.apiKey || '');
  const [selectedModel, setSelectedModel] = useState(initialConfig?.model || '');
  const [models, setModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [error, setError] = useState('');
  const [shopGenEnabled, setShopGenEnabled] = useState(() => {
    return (localStorage.getItem('image_gen_shop_enabled') ?? 'true') === 'true';
  });
  const [showPresetsModal, setShowPresetsModal] = useState(false);
  const [availablePresets, setAvailablePresets] = useState<APIPreset[]>([]);

  useEffect(() => {
    if (initialConfig) {
      setApiUrl(initialConfig.apiUrl);
      setApiKey(initialConfig.apiKey);
      setSelectedModel(initialConfig.model || '');
    }
  }, [initialConfig]);

  useEffect(() => {
    if (!isOpen) return;
    void (async () => {
      await apiPresetsManager.hydrateFromDisk();
      setAvailablePresets(apiPresetsManager.getPresets());
    })();
  }, [isOpen]);

  // 选择预设
  const handleSelectPreset = (preset: APIPreset) => {
    setApiUrl(preset.apiUrl);
    setApiKey(preset.apiKey);
    setSelectedModel(preset.model);
    
    // 自动测试连接
    setTimeout(() => {
      fetchModels();
    }, 100);
  };

  // 调取模型列表
  const fetchModels = async () => {
    if (!apiUrl || !apiKey) {
      setError('请先填写API地址和Key');
      return;
    }

    setIsLoadingModels(true);
    setError('');

    try {
      const diag = await fetchOpenAiCompatibleModelIdsWithDiagnostics(apiUrl.trim(), apiKey.trim(), {
        modelForChatProbe: selectedModel || undefined,
      });
      if (diag.error) {
        setModels(['dall-e-3', 'dall-e-2', 'stable-diffusion-xl']);
        setError(diag.error);
        if (!selectedModel) setSelectedModel('dall-e-3');
        return;
      }
      if (diag.warning) {
        setModels(['dall-e-3', 'dall-e-2', 'stable-diffusion-xl']);
        setError(diag.warning);
        if (!selectedModel) setSelectedModel('dall-e-3');
        return;
      }
      const allModels = diag.models;
      if (allModels.length === 0) {
        setModels(['dall-e-3', 'dall-e-2', 'stable-diffusion-xl']);
        if (!selectedModel) {
          setSelectedModel('dall-e-3');
        }
      } else {
        setModels(allModels);
        if (!selectedModel) {
          setSelectedModel(allModels[0]);
        }
      }
    } catch (err) {
      console.error('获取模型失败:', err);
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
          {/* API预设选择 / 管理 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                快速选择预设
              </label>
              <button
                onClick={() => setShowPresetsModal(true)}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Settings className="w-3 h-3" />
                管理预设
              </button>
            </div>
            {availablePresets.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {availablePresets.slice(0, 3).map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className="text-left p-2 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <div className="font-medium text-sm text-gray-900">{preset.name}</div>
                    <div className="text-xs text-gray-500 truncate">{preset.apiUrl}</div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                还没有预设，点击「管理预设」可以添加多个API方案
              </p>
            )}
          </div>

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

          {/* 商城生图开关 */}
          {showShopToggle && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">商城生图</p>
                  <p className="text-xs text-gray-500 mt-0.5">搜索商品时调用生图API</p>
                </div>
                <button
                  onClick={() => {
                    const next = !shopGenEnabled;
                    setShopGenEnabled(next);
                    localStorage.setItem('image_gen_shop_enabled', String(next));
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    shopGenEnabled ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      shopGenEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
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
              💡 配置AI生图API后，搜索商品时将自动生成商品图片{showShopToggle ? '\n⚙️ 可在此页面直接开启/关闭商城生图功能' : ''}
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

      {/* API预设管理弹窗 */}
      <APIPresetsModal
        isOpen={showPresetsModal}
        onClose={() => {
          setShowPresetsModal(false);
          void apiPresetsManager.hydrateFromDisk().then(() => {
            setAvailablePresets(apiPresetsManager.getPresets());
          });
        }}
        onSelectPreset={handleSelectPreset}
      />
    </div>
  );
}
