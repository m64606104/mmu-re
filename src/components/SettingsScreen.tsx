import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Check, Loader2, Download, Upload, Database } from 'lucide-react';
import { ApiConfig } from '../types';
import { smartLoad, smartSave, checkStorageQuota, saveBatch, getStorageStatus, migrateData, clearAllData, loadBatch } from '../utils/storage';
import ImageGenConfigModal from './ImageGenConfigModal';
import { apiPresetsManager, APIPreset } from '../utils/apiPresetsManager';
import APIPresetsModal from './APIPresetsModal';

interface SettingsScreenProps {
  apiConfig: ApiConfig;
  onUpdateConfig: (config: ApiConfig) => void;
  onBack: () => void;
  fullscreenMode: boolean;
  onToggleFullscreen: (enabled: boolean) => void;
}

const AVATAR_BADGES = ['🎵', '🎮', '🎧', '🎨', '🎬', '📷', '⚡', '🔥', '💫', '✨', '🌟', '💎'];

export default function SettingsScreen({ apiConfig, onUpdateConfig, onBack, fullscreenMode, onToggleFullscreen }: SettingsScreenProps) {
  const [baseUrl, setBaseUrl] = useState(apiConfig.baseUrl);
  const [apiKey, setApiKey] = useState(apiConfig.apiKey);
  const [modelName, setModelName] = useState(apiConfig.modelName);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [apiPresets, setApiPresets] = useState<APIPreset[]>([]);
  const [showApiPresetsModal, setShowApiPresetsModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState('🎵');
  const importInputRef = useRef<HTMLInputElement>(null);
  
  // 存储状态
  const [storageInfo, setStorageInfo] = useState<any>(null);
  const [isLoadingStorage, setIsLoadingStorage] = useState(false);
  
  // 语音转文字配置
  const [sttEnabled] = useState(apiConfig.speechToText?.enabled || false);
  const [sttApiUrl] = useState(apiConfig.speechToText?.apiUrl || '');
  const [sttApiKey] = useState(apiConfig.speechToText?.apiKey || '');
  const [sttModel] = useState(apiConfig.speechToText?.model || 'glm-4-flash');

  // AI生图全局配置（商城/朋友圈共用）
  const [showImageGenModal, setShowImageGenModal] = useState(false);
  const [imageGenConfig, setImageGenConfig] = useState<{ apiUrl: string; apiKey: string; model: string }>({
    apiUrl: '',
    apiKey: '',
    model: ''
  });
  const [shopGenEnabled, setShopGenEnabled] = useState<boolean>(true);
  const [momentsGenEnabled, setMomentsGenEnabled] = useState<boolean>(false);
  const [momentsDailyLimit, setMomentsDailyLimit] = useState<number>(10);

  // 初始化API预设列表
  useEffect(() => {
    const presets = apiPresetsManager.getPresets();
    setApiPresets(presets);
  }, []);

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
    
    // 加载存储状态信息
    loadStorageInfo();

    // 加载AI生图配置（全局）
    try {
      const apiUrl = localStorage.getItem('image_gen_api_url') || '';
      const apiKey = localStorage.getItem('image_gen_api_key') || '';
      const model = localStorage.getItem('image_gen_model') || '';
      setImageGenConfig({ apiUrl, apiKey, model });

      // 加载开关（商城默认开，朋友圈默认关）
      const shopEnabledStr = localStorage.getItem('image_gen_shop_enabled');
      const momentsEnabledStr = localStorage.getItem('image_gen_moments_enabled');
      setShopGenEnabled(shopEnabledStr === null ? true : shopEnabledStr === 'true');
      setMomentsGenEnabled(momentsEnabledStr === 'true');
      const limitStr = localStorage.getItem('image_gen_moments_daily_limit');
      const limitVal = limitStr ? parseInt(limitStr, 10) : 10;
      setMomentsDailyLimit(Number.isFinite(limitVal) && limitVal >= 0 ? limitVal : 10);
    } catch (e) {
      console.error('加载AI生图配置失败:', e);
    }
  }, []);
  
  const loadStorageInfo = async () => {
    try {
      setIsLoadingStorage(true);
      const [storageStatus, quotaInfo] = await Promise.all([
        getStorageStatus(),
        checkStorageQuota()
      ]);
      
      // 计算localStorage使用量
      let localStorageUsage = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key) || '';
          localStorageUsage += key.length + value.length;
        }
      }
      
      // 计算IndexedDB使用量（估算）
      let indexedDBUsage = 0;
      const indexedDBKeys = ['conversations', 'moments', 'chat_memory_banks', 'ai_finance_data', 'documents', 'relationships'];
      for (const key of indexedDBKeys) {
        try {
          const data = await smartLoad(key);
          if (data) {
            indexedDBUsage += JSON.stringify(data).length * 2; // UTF-16估算
          }
        } catch (error) {
          console.warn(`无法计算${key}大小:`, error);
        }
      }
      
      setStorageInfo({
        ...storageStatus,
        quota: quotaInfo,
        localStorage: {
          usage: localStorageUsage
        },
        indexedDB: {
          usage: indexedDBUsage
        }
      });
    } catch (error) {
      console.error('加载存储信息失败:', error);
    } finally {
      setIsLoadingStorage(false);
    }
  };

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

  // 应用选中的API预设（仅填充字段，不自动保存）
  const handleApplyApiPreset = (preset: APIPreset) => {
    if (!preset) return;
    setBaseUrl(preset.apiUrl || '');
    setApiKey(preset.apiKey || '');
    setModelName(preset.model || '');
    // 记录当前预设，便于在预设管理弹窗中高亮
    apiPresetsManager.switchToPreset(preset.id);
  };

  // 保存AI生图配置（商城/朋友圈共用）
  const handleSaveImageGenConfig = (config: { apiUrl: string; apiKey: string; model: string }) => {
    try {
      localStorage.setItem('image_gen_api_url', config.apiUrl || '');
      localStorage.setItem('image_gen_api_key', config.apiKey || '');
      localStorage.setItem('image_gen_model', config.model || '');
      setImageGenConfig(config);
      alert('✅ AI生图配置已保存');
    } catch (error) {
      console.error('保存AI生图配置失败:', error);
      alert('❌ 保存AI生图配置失败，请重试');
    }
  };

  // 导出全部数据
  const handleExportAllData = async () => {
    try {
      console.log('🔄 开始导出全部数据...');
      
      // 收集所有数据
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
      
      // 🧠 **从新存储系统获取所有大数据**
      console.log('🧠 从新存储系统获取数据...');
      
      // 定义可能存储在IndexedDB中的大数据key
      const indexedDBKeys = [
        'conversations',
        'moments', 
        'chat_memory_banks',
        'ai_finance_data',
        'documents',
        'relationships',
        'user_documents'
      ];
      
      // 逐一获取IndexedDB数据
      for (const key of indexedDBKeys) {
        try {
          console.log(`🔍 检查 ${key}...`);
          
          // 先尝试智能加载
          let data = await smartLoad(key);
          
          // 如果智能加载没有数据，尝试分批加载
          if (!data) {
            data = await loadBatch(key);
          }
          
          if (data) {
            allData[key] = data;
            console.log(`✅ ${key}数据获取成功`);
            
            // 📊 统计数据
            if (key === 'conversations' && Array.isArray(data)) {
              stats.conversations = data.length;
              stats.messages = data.reduce((sum: number, conv: any) => 
                sum + (conv.messages?.length || 0), 0);
              stats.profiles = data.filter((c: any) => c.characterSettings).length;
            } else if (key === 'moments' && Array.isArray(data)) {
              stats.moments = data.length;
            } else if (key === 'chat_memory_banks' && Array.isArray(data)) {
              stats.memories = data.reduce((sum: number, bank: any) => 
                sum + (bank.memories?.length || 0), 0);
            } else if (key === 'relationships' && Array.isArray(data)) {
              stats.relationships = data.length;
            } else if (key === 'documents' && Array.isArray(data)) {
              stats.documents = data.length;
            }
          }
        } catch (error) {
          console.warn(`⚠️ 获取 ${key} 数据失败:`, error);
        }
      }
      
      // 🗂️ **遍历localStorage获取其他数据**
      console.log('🗂️ 遍历localStorage...');
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          // 跳过已经从IndexedDB获取的数据
          if (indexedDBKeys.includes(key) && allData[key]) {
            continue;
          }
          
          const value = localStorage.getItem(key);
          if (value) {
            try {
              // 尝试解析JSON
              const parsed = JSON.parse(value);
              allData[key] = parsed;
              
              // 📊 统计数据量
              if (key.startsWith('moments_') && parsed.posts) {
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

      console.log('📊 统计信息:', stats);

      // 添加元数据
      const exportData = {
        exportDate: new Date().toISOString(),
        appVersion: '1.0.0',
        dataType: 'full-backup',
        storageType: 'smart-storage-compatible', // 标记支持智能存储
        stats: stats,
        data: allData
      };

      // 创建并下载文件
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `momoyu_全数据备份_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
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
        `💾 文件已保存到下载文件夹\n` +
        `🔧 支持智能存储系统`;
      
      alert(message);
      console.log('✅ 数据导出完成');
    } catch (error) {
      console.error('❌ 导出失败:', error);
      alert('❌ 导出失败，请重试\n\n错误: ' + error);
    }
  };

  // 手动迁移数据
  const handleManualMigration = async () => {
    try {
      const result = await migrateData();
      alert(`✅ 数据迁移完成！\n\n迁移成功: ${result.migratedKeys.length} 项\n迁移失败: ${result.errors.length} 项`);
      await loadStorageInfo(); // 刷新存储信息
    } catch (error) {
      console.error('手动迁移失败:', error);
      alert('❌ 迁移失败，请查看控制台了解详情');
    }
  };

  // 清除所有数据
  const handleClearAllData = async () => {
    const confirmMsg = '⚠️ 危险操作：清除所有数据\n\n' +
      '这将删除：\n' +
      '• 所有对话记录\n' +
      '• 所有AI角色数据\n' +
      '• 所有朋友圈内容\n' +
      '• 所有配置设置\n' +
      '• 所有文档和记忆库\n\n' +
      '此操作无法撤销！确定继续吗？';
    
    if (window.confirm(confirmMsg)) {
      try {
        await clearAllData();
        alert('✅ 所有数据已清除！页面将刷新。');
        setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
        console.error('清除数据失败:', error);
        alert('❌ 清除失败，请查看控制台了解详情');
      }
    }
  };

  // 导入全部数据
  const handleImportAllData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        
        // 验证数据格式
        if (!importedData.data || typeof importedData.data !== 'object') {
          alert('❌ 导入文件格式不正确');
          return;
        }

        // 预检查存储配额
        const preQuota = await checkStorageQuota();
        const estimateDataSize = JSON.stringify(importedData.data).length * 2; // UTF-16估算
        const estimateMB = estimateDataSize / 1024 / 1024;
        
        // 构建详细的确认消息
        const stats = importedData.stats || {};
        let confirmMsg = `📥 即将导入数据备份\n\n` +
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
          `💾 存储信息:\n` +
          `  • 设备类型: ${preQuota.isMobile ? '📱移动设备' : '🖥️桌面设备'}\n` +
          `  • 数据大小: 约${estimateMB.toFixed(1)}MB\n` +
          `  • 存储配额: ${(preQuota.quota / 1024 / 1024).toFixed(1)}MB\n` +
          `  • 可用空间: ${(preQuota.available / 1024 / 1024).toFixed(1)}MB\n`;
        
        // 添加存储空间警告
        if (estimateMB > preQuota.available / 1024 / 1024) {
          confirmMsg += `\n🚨 **存储空间警告**\n` +
            `数据大小(${estimateMB.toFixed(1)}MB) > 可用空间(${(preQuota.available / 1024 / 1024).toFixed(1)}MB)\n` +
            `建议：清理应用数据或使用桌面浏览器\n\n`;
        } else if (preQuota.isMobile && estimateMB > 10) {
          confirmMsg += `\n📱 **移动设备提示**\n` +
            `检测到大数据集(${estimateMB.toFixed(1)}MB)，将使用分批导入模式\n` +
            `这可能需要更长时间，请保持网络连接\n\n`;
        }
          
        confirmMsg += `⚠️ 警告：这将覆盖当前所有数据！\n` +
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

        // 🗂️ 清空所有存储
        localStorage.clear();
        
        // 🔧 如果支持智能存储，清空所有IndexedDB数据
        if (importedData.storageType === 'smart-storage-compatible') {
          try {
            // 清空所有可能的IndexedDB数据
            const indexedDBKeys = [
              'conversations', 'moments', 'chat_memory_banks', 
              'ai_finance_data', 'documents', 'relationships', 'user_documents'
            ];
            
            for (const key of indexedDBKeys) {
              try {
                await smartSave(key, null);
                console.log(`✅ 已清空 ${key}`);
              } catch (error) {
                console.warn(`⚠️ 清空 ${key} 失败:`, error);
              }
            }
            console.log('✅ IndexedDB数据清空完成');
          } catch (error) {
            console.warn('清空IndexedDB失败:', error);
          }
        }

        // 📊 检查存储配额
        const quota = await checkStorageQuota();
        const finalDataSize = JSON.stringify(importedData.data).length * 2; // UTF-16估算
        const finalDataMB = finalDataSize / 1024 / 1024;
        console.log(`📱 设备类型: ${quota.isMobile ? '移动设备' : '桌面设备'}`);
        console.log(`💾 存储配额: ${(quota.quota / 1024 / 1024).toFixed(1)}MB / 可用: ${(quota.available / 1024 / 1024).toFixed(1)}MB`);
        console.log(`📦 数据大小: ${finalDataMB.toFixed(1)}MB`);
        
        // 🔄 恢复所有数据
        const data = importedData.data;
        let importedCount = 0;
        let conversationsRestored = false;
        
        for (const key in data) {
          const value = data[key];
          
          // 🎯 conversations等大数据使用移动设备优化存储
          if (key === 'conversations' && importedData.storageType === 'smart-storage-compatible') {
            try {
              // 移动设备使用分批保存，避免配额超限
              if (quota.isMobile || (Array.isArray(value) && value.length > 100)) {
                console.log(`📱 检测到${quota.isMobile ? '移动设备' : '大数据集'}，使用分批保存模式...`);
                await saveBatch('conversations', value, {
                  batchSize: quota.isMobile ? 20 : 50,
                  onProgress: (progress) => {
                    console.log(`📊 导入进度: ${progress.toFixed(1)}%`);
                  }
                });
              } else {
                // 桌面设备或小数据集使用常规保存
                await smartSave('conversations', value);
              }
              
              conversationsRestored = true;
              console.log('✅ conversations数据已恢复到智能存储');
            } catch (error) {
              console.error('智能存储恢复失败:', error);
              
              // 检查是否为配额错误
              if (error instanceof Error && error.message.includes('存储空间不足')) {
                alert(`❌ 导入失败：${error.message}\n\n建议：\n1. 清理应用数据释放空间\n2. 尝试导入较小的数据集\n3. 使用桌面版浏览器进行导入`);
                return;
              } else {
                // 其他错误，回退到localStorage
                console.log('⚠️ 回退到localStorage保存');
                localStorage.setItem(key, JSON.stringify(value));
              }
            }
          } else if (['moments', 'chat_memory_banks', 'ai_finance_data', 'documents', 'relationships', 'user_documents'].includes(key) && importedData.storageType === 'smart-storage-compatible') {
            try {
              // 其他大数据也使用移动设备优化
              if (quota.isMobile && Array.isArray(value) && value.length > 50) {
                await saveBatch(key, value, { 
                  batchSize: 20,
                  onProgress: (progress) => {
                    console.log(`📊 ${key} 导入进度: ${progress.toFixed(1)}%`);
                  }
                });
              } else {
                await smartSave(key, value);
              }
              console.log(`✅ ${key}数据已恢复到智能存储`);
            } catch (error) {
              console.error(`${key}智能存储恢复失败，回退到localStorage:`, error);
              localStorage.setItem(key, JSON.stringify(value));
            }
          } else {
            // 🗂️ 其他数据恢复到localStorage
            if (typeof value === 'object') {
              localStorage.setItem(key, JSON.stringify(value));
            } else {
              localStorage.setItem(key, value);
            }
          }
          importedCount++;
        }

        const successMsg = `✅ 数据导入成功！\n\n` +
          `📊 导入统计:\n` +
          `• 已恢复 ${importedCount} 项数据\n` +
          `${conversationsRestored ? '• 对话数据已恢复到智能存储\n' : ''}` +
          `• 设备类型: ${quota.isMobile ? '📱移动设备' : '🖥️桌面设备'}\n` +
          `${quota.isMobile ? '• 已使用移动设备优化模式\n' : ''}` +
          `• 所有其他数据已恢复\n\n` +
          `💾 当前存储状态:\n` +
          `• 已用: ${((quota.quota - quota.available + finalDataMB * 1024 * 1024) / 1024 / 1024).toFixed(1)}MB\n` +
          `• 总计: ${(quota.quota / 1024 / 1024).toFixed(1)}MB\n\n` +
          `页面将刷新以应用更改。`;
        
        alert(successMsg);
        
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

          {/* API 预设方案 */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-700">API 预设方案</span>
              <button
                onClick={() => setShowApiPresetsModal(true)}
                className="px-2 py-1 text-xs rounded-md bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 flex items-center gap-1"
              >
                管理预设
              </button>
            </div>
            {apiPresets.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {apiPresets.slice(0, 3).map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleApplyApiPreset(preset)}
                    className="px-3 py-1 text-xs rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                还没有预设，点击「管理预设」可以添加多个API方案
              </p>
            )}
          </div>

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

          {/* 友情提示 */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <div className="text-amber-500 mt-0.5">⚠️</div>
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">友情提示</p>
                <p className="mb-2">请不要选择带"思考"功能的模型，这些模型会返回思考内容，影响正常聊天体验。</p>
                <p>建议使用带联网（search）的对话模型对话体验更佳，以及部分小众内容或者网络资料繁杂的内容可以使用资料库功能自定义上传资料，让AI更贴合你的需要。</p>
              </div>
            </div>
          </div>

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

        {/* 外观设置 */}
        <div className="bg-white rounded-xl shadow-sm p-5 mt-4">
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            🎨 外观设置
          </h2>

          {/* 全屏显示 */}
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm font-medium text-gray-900">全屏显示</div>
              <div className="text-xs text-gray-500 mt-1">自动适应浏览器屏幕，无边框全屏效果</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={fullscreenMode}
                onChange={(e) => onToggleFullscreen(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* AI生图（商城/朋友圈） */}
        <div className="bg-white rounded-xl shadow-sm p-5 mt-4">
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            🎨 AI生图（商城/朋友圈）
          </h2>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 text-sm text-gray-700">
            <p>用于商城商品与朋友圈图片生成的专用AI配置，独立于对话模型。</p>
            <p className="mt-1">当前状态：{imageGenConfig.apiUrl && imageGenConfig.apiKey && imageGenConfig.model ? <span className="text-green-600 font-medium">已配置</span> : <span className="text-red-600 font-medium">未配置</span>}</p>
            {imageGenConfig.model && (
              <p className="mt-1">当前模型：<span className="font-mono">{imageGenConfig.model}</span></p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowImageGenModal(true)}
              className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              配置生图AI
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('image_gen_api_url');
                localStorage.removeItem('image_gen_api_key');
                localStorage.removeItem('image_gen_model');
                setImageGenConfig({ apiUrl: '', apiKey: '', model: '' });
                alert('已清空AI生图配置');
              }}
              className="py-2.5 px-4 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-lg font-medium text-gray-700 transition-colors"
            >
              清空配置
            </button>
          </div>

          {/* 开关设置 */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 商城开关（默认开） */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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

            {/* 朋友圈开关（默认关） */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">朋友圈生图</p>
                <p className="text-xs text-gray-500 mt-0.5">仅按需(on-view)生成，受每日限额控制</p>
              </div>
              <button
                onClick={() => {
                  const next = !momentsGenEnabled;
                  setMomentsGenEnabled(next);
                  localStorage.setItem('image_gen_moments_enabled', String(next));
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  momentsGenEnabled ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    momentsGenEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 朋友圈每日上限 */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">朋友圈每日上限</p>
                <p className="text-xs text-gray-500 mt-0.5">每天最多触发的生图次数</p>
              </div>
              <input
                type="number"
                min={0}
                max={50}
                value={momentsDailyLimit}
                onChange={(e) => {
                  const v = parseInt(e.target.value || '0', 10);
                  setMomentsDailyLimit(Number.isFinite(v) && v >= 0 ? Math.min(v, 50) : 0);
                }}
                onBlur={() => {
                  const v = Number.isFinite(momentsDailyLimit) && momentsDailyLimit >= 0 ? momentsDailyLimit : 10;
                  localStorage.setItem('image_gen_moments_daily_limit', String(v));
                }}
                className="w-24 px-2 py-1 border border-gray-300 rounded-md text-right"
              />
            </div>
          </div>
        </div>

        {/* 头像装饰设置 */}
        <div className="bg-white rounded-xl shadow-sm p-5 mt-4">
          <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
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

        {/* 存储管理卡片 */}
        <div className="bg-white rounded-xl shadow-sm p-5 mt-4">
          <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-500" />
            存储管理
          </h2>
          
          {/* 存储状态显示 */}
          {isLoadingStorage ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                <span className="text-sm text-gray-600">加载存储信息中...</span>
              </div>
            </div>
          ) : storageInfo ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">存储使用情况</span>
              </div>
              
              <div className="space-y-4">
                {/* 总用量 */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">已用空间:</span>
                  <span className="font-mono text-gray-800">
                    {storageInfo.localStorage && storageInfo.indexedDB 
                      ? `${((storageInfo.localStorage.usage + storageInfo.indexedDB.usage) / 1024 / 1024).toFixed(1)} MB`
                      : '计算中...'
                    }
                  </span>
                </div>
                
                {/* localStorage */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">localStorage</span>
                    <span className="font-mono text-gray-800">
                      {storageInfo.localStorage 
                        ? `${(storageInfo.localStorage.usage / 1024).toFixed(1)} KB (${((storageInfo.localStorage.usage / (10 * 1024 * 1024)) * 100).toFixed(1)}%)`
                        : '计算中...'
                      }
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-green-500 h-1.5 rounded-full transition-all" 
                      style={{ 
                        width: storageInfo.localStorage 
                          ? `${Math.min(100, (storageInfo.localStorage.usage / (10 * 1024 * 1024)) * 100).toFixed(1)}%`
                          : '0%'
                      }}
                    />
                  </div>
                </div>

                {/* IndexedDB */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">IndexedDB</span>
                    <span className="font-mono text-gray-800">
                      {storageInfo.indexedDB && storageInfo.quota
                        ? `${(storageInfo.indexedDB.usage / 1024 / 1024).toFixed(1)} MB (${((storageInfo.indexedDB.usage / storageInfo.quota.quota) * 100).toFixed(1)}%)`
                        : '计算中...'
                      }
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full transition-all" 
                      style={{ 
                        width: storageInfo.indexedDB && storageInfo.quota
                          ? `${Math.min(100, (storageInfo.indexedDB.usage / storageInfo.quota.quota) * 100).toFixed(1)}%`
                          : '0%'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <span className="text-sm text-red-600">存储信息加载失败</span>
            </div>
          )}
          
          {/* 存储管理操作 */}
          <div className="space-y-3 mb-4">
            <button
              onClick={handleManualMigration}
              className="w-full py-2.5 px-4 border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-2 text-blue-700"
            >
              <Database className="w-4 h-4" />
              <span className="font-medium text-sm">手动数据迁移</span>
            </button>
            
            <button
              onClick={handleClearAllData}
              className="w-full py-2.5 px-4 border-2 border-red-200 hover:border-red-400 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-2 text-red-700"
            >
              <Database className="w-4 h-4" />
              <span className="font-medium text-sm">清除所有数据</span>
            </button>
          </div>
        </div>

        {/* 数据管理卡片 */}
        <div className="bg-white rounded-xl shadow-sm p-5 mt-4">
          <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Database className="w-5 h-5 text-green-500" />
            数据备份
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
      {/* API预设管理弹窗（主聊天/生图共用） */}
      <APIPresetsModal
        isOpen={showApiPresetsModal}
        onClose={() => {
          setShowApiPresetsModal(false);
          setApiPresets(apiPresetsManager.getPresets());
        }}
        onSelectPreset={handleApplyApiPreset}
      />

      {/* AI生图配置弹窗（商城/朋友圈共用） */}
      <ImageGenConfigModal
        isOpen={showImageGenModal}
        onClose={() => setShowImageGenModal(false)}
        onSave={handleSaveImageGenConfig}
        initialConfig={imageGenConfig}
      />
    </div>
  );
}
