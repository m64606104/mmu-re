import { useState, useEffect } from 'react';
import { Database, HardDrive, CheckCircle, XCircle, Loader } from 'lucide-react';
import { migrateData, getStorageStatus } from '../utils/storage';

interface StorageMigrationPromptProps {
  onClose: () => void;
  onMigrationComplete: () => void;
}

export default function StorageMigrationPrompt({ onClose, onMigrationComplete }: StorageMigrationPromptProps) {
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{
    success: boolean;
    migratedKeys: string[];
    errors: string[];
  } | null>(null);
  const [storageInfo, setStorageInfo] = useState<any>(null);

  // 加载存储信息
  const loadStorageInfo = async () => {
    const status = await getStorageStatus();
    // 转换为兼容格式
    setStorageInfo({
      localStorage: {
        usedMB: status.localStorage.sizeMB,
        quotaMB: 10,
        percentage: (status.localStorage.sizeMB / 10) * 100,
        itemCount: status.localStorage.items,
        largeDataInLocalStorage: status.localStorage.needsMigration
      },
      indexedDB: {
        usedMB: status.indexedDB.sizeMB,
        quotaMB: 1024,
        percentage: (status.indexedDB.sizeMB / 1024) * 100
      }
    });
  };

  useEffect(() => {
    loadStorageInfo();
  }, []);

  const handleMigrate = async () => {
    setIsMigrating(true);
    try {
      const result = await migrateData();
      setMigrationResult(result);
      
      if (result.success) {
        // 刷新存储信息
        await loadStorageInfo();
        // 延迟通知完成
        setTimeout(() => {
          onMigrationComplete();
        }, 2000);
      }
    } catch (error) {
      console.error('迁移失败:', error);
      setMigrationResult({
        success: false,
        migratedKeys: [],
        errors: [error instanceof Error ? error.message : '未知错误']
      });
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">存储空间升级</h3>
            <p className="text-sm text-gray-600">扩大存储容量，永久保存数据</p>
          </div>
        </div>

        {!migrationResult ? (
          <>
            {/* 说明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                为什么需要升级？
              </h4>
              <ul className="text-sm text-blue-800 space-y-1 ml-6 list-disc">
                <li>当前使用localStorage，容量限制约10MB</li>
                <li>对话、朋友圈等数据积累会很快占满</li>
                <li>升级到IndexedDB，可存储GB级数据</li>
                <li>浏览器自动管理，永不丢失</li>
              </ul>
            </div>

            {/* 当前存储使用情况 */}
            {storageInfo && (
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <h4 className="font-semibold text-gray-900 mb-3">当前存储使用情况</h4>
                
                {/* localStorage */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700">localStorage</span>
                    <span className="font-medium text-gray-900">
                      {storageInfo.localStorage.usedMB.toFixed(2)} MB / {storageInfo.localStorage.quotaMB.toFixed(0)} MB
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        storageInfo.localStorage.percentage > 80 
                          ? 'bg-red-500' 
                          : storageInfo.localStorage.percentage > 60 
                          ? 'bg-yellow-500' 
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(storageInfo.localStorage.percentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {storageInfo.localStorage.percentage.toFixed(1)}% 已使用 · {storageInfo.localStorage.itemCount} 项数据
                  </p>
                </div>

                {/* IndexedDB */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700">IndexedDB (升级后)</span>
                    <span className="font-medium text-green-600">
                      {storageInfo.indexedDB.quotaMB > 0 
                        ? `可用 ${(storageInfo.indexedDB.quotaMB / 1024).toFixed(2)} GB` 
                        : '容量极大'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    💡 可存储数千条对话和数万条朋友圈
                  </p>
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <button
                onClick={handleMigrate}
                disabled={isMigrating}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isMigrating ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    迁移中...
                  </>
                ) : (
                  <>
                    <Database className="w-5 h-5" />
                    立即升级
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                disabled={isMigrating}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                暂不升级
              </button>
            </div>

            {/* 提示 */}
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-800">
                ⚠️ 升级过程通常只需几秒钟。升级后原数据会自动删除，为您节省空间。
              </p>
            </div>
          </>
        ) : (
          <>
            {/* 迁移结果 */}
            {migrationResult.success ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">升级完成！</h4>
                <p className="text-gray-600 mb-4">
                  成功迁移 {migrationResult.migratedKeys.length} 项数据
                </p>
                
                {/* 迁移详情 */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-left">
                  <h5 className="font-semibold text-green-900 mb-2">已迁移的数据：</h5>
                  <div className="max-h-32 overflow-y-auto">
                    {migrationResult.migratedKeys.map((key, index) => (
                      <div key={index} className="text-sm text-green-800 py-1 flex items-center gap-2">
                        <CheckCircle className="w-3 h-3" />
                        {key}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="mt-4 w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all"
                >
                  完成
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">升级失败</h4>
                <p className="text-gray-600 mb-4">
                  部分数据迁移失败，请稍后重试
                </p>
                
                {/* 错误详情 */}
                {migrationResult.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-left mb-4">
                    <h5 className="font-semibold text-red-900 mb-2">错误详情：</h5>
                    <div className="max-h-32 overflow-y-auto">
                      {migrationResult.errors.map((error, index) => (
                        <div key={index} className="text-sm text-red-800 py-1">
                          <div className="flex items-start gap-2">
                            <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-red-600">{error}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setMigrationResult(null);
                      handleMigrate();
                    }}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all"
                  >
                    重试
                  </button>
                  <button
                    onClick={onClose}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    关闭
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
