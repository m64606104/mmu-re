import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Check, AlertCircle, Loader, Download, Upload } from 'lucide-react';
import { apiPresetsManager, APIPreset } from '../utils/apiPresetsManager';

interface APIPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset?: (preset: APIPreset) => void;
}

export default function APIPresetsModal({
  isOpen,
  onClose,
  onSelectPreset
}: APIPresetsModalProps) {
  const [presets, setPresets] = useState<APIPreset[]>([]);
  const [currentPreset, setCurrentPreset] = useState<APIPreset | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPreset, setEditingPreset] = useState<APIPreset | null>(null);
  const [testingPresetId, setTestingPresetId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; models: string[]; error?: string }>>({});

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    apiUrl: '',
    apiKey: '',
    model: '',
    description: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadPresets();
    }
  }, [isOpen]);

  const loadPresets = () => {
    const allPresets = apiPresetsManager.getPresets();
    const current = apiPresetsManager.getCurrentPreset();
    setPresets(allPresets);
    setCurrentPreset(current);
  };

  const handleSavePreset = async () => {
    if (!formData.name || !formData.apiUrl || !formData.apiKey) {
      alert('请填写完整信息');
      return;
    }

    try {
      apiPresetsManager.savePreset({
        name: formData.name,
        apiUrl: formData.apiUrl,
        apiKey: formData.apiKey,
        model: formData.model,
        description: formData.description
      });

      loadPresets();
      setShowAddForm(false);
      setEditingPreset(null);
      resetForm();
      
      alert('预设保存成功');
    } catch (error) {
      alert('保存失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const handleEditPreset = (preset: APIPreset) => {
    setEditingPreset(preset);
    setFormData({
      name: preset.name,
      apiUrl: preset.apiUrl,
      apiKey: preset.apiKey,
      model: preset.model,
      description: preset.description || ''
    });
    setShowAddForm(true);
  };

  const handleDeletePreset = (id: string) => {
    if (confirm('确定要删除这个预设吗？')) {
      apiPresetsManager.deletePreset(id);
      loadPresets();
    }
  };

  const handleSelectPreset = (preset: APIPreset) => {
    apiPresetsManager.switchToPreset(preset.id);
    loadPresets();
    onSelectPreset?.(preset);
    onClose();
  };

  const handleTestPreset = async (preset: APIPreset) => {
    setTestingPresetId(preset.id);
    
    try {
      const result = await apiPresetsManager.testAPIConnection(preset.apiUrl, preset.apiKey);
      setTestResults(prev => ({
        ...prev,
        [preset.id]: result
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [preset.id]: {
          success: false,
          models: [],
          error: error instanceof Error ? error.message : '测试失败'
        }
      }));
    } finally {
      setTestingPresetId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      apiUrl: '',
      apiKey: '',
      model: '',
      description: ''
    });
  };

  const handleExportPresets = () => {
    try {
      const data = apiPresetsManager.exportPresets();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `api-presets-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('导出失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const handleImportPresets = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const text = await file.text();
          const result = apiPresetsManager.importPresets(text);
          if (result.success) {
            loadPresets();
            alert(`成功导入 ${result.imported} 个预设`);
          } else {
            alert('导入失败: ' + result.error);
          }
        } catch (error) {
          alert('导入失败: ' + (error instanceof Error ? error.message : '未知错误'));
        }
      }
    };
    input.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">API方案管理</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* 操作按钮 */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              添加方案
            </button>
            <button
              onClick={handleExportPresets}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
            <button
              onClick={handleImportPresets}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Upload className="w-4 h-4" />
              导入
            </button>
          </div>

          {/* 添加/编辑表单 */}
          {showAddForm && (
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingPreset ? '编辑方案' : '添加新方案'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">方案名称</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例如: OpenAI官方API"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API地址</label>
                  <input
                    type="text"
                    value={formData.apiUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, apiUrl: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://api.openai.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API密钥</label>
                  <input
                    type="password"
                    value={formData.apiKey}
                    onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="sk-..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">默认模型</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="dall-e-3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">描述（可选）</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="描述这个API方案的特点..."
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleSavePreset}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  保存
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingPreset(null);
                    resetForm();
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {/* 预设列表 */}
          <div className="space-y-3">
            {presets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>还没有保存的API方案</p>
                <p className="text-sm">点击"添加方案"开始配置</p>
              </div>
            ) : (
              presets.map((preset) => {
                const testResult = testResults[preset.id];
                const isCurrent = currentPreset?.id === preset.id;
                const isTesting = testingPresetId === preset.id;

                return (
                  <div
                    key={preset.id}
                    className={`border rounded-lg p-4 transition-all ${isCurrent ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-gray-900">{preset.name}</h3>
                          {isCurrent && (
                            <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full">当前使用</span>
                          )}
                          {preset.isDefault && (
                            <span className="px-2 py-1 bg-gray-500 text-white text-xs rounded-full">默认</span>
                          )}
                        </div>
                        {preset.description && (
                          <p className="text-sm text-gray-600 mb-2">{preset.description}</p>
                        )}
                        <div className="text-xs text-gray-500 space-y-1">
                          <p>API: {preset.apiUrl}</p>
                          <p>模型: {preset.model || '未设置'}</p>
                          <p>创建: {new Date(preset.createdAt).toLocaleDateString()}</p>
                          {preset.lastUsed && (
                            <p>最后使用: {new Date(preset.lastUsed).toLocaleDateString()}</p>
                          )}
                        </div>
                        
                        {/* 测试结果 */}
                        {testResult && (
                          <div className={`mt-3 p-2 rounded text-sm ${
                            testResult.success 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {testResult.success ? (
                              <div>
                                <p>✅ 连接成功</p>
                                <p>可用模型: {testResult.models.slice(0, 3).join(', ')}{testResult.models.length > 3 ? '...' : ''}</p>
                              </div>
                            ) : (
                              <p>❌ {testResult.error}</p>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleTestPreset(preset)}
                          disabled={isTesting}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                          title="测试连接"
                        >
                          {isTesting ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <AlertCircle className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEditPreset(preset)}
                          className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleSelectPreset(preset)}
                          className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                          title="使用此方案"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePreset(preset.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
