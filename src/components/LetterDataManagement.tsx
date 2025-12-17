/**
 * 信件数据管理界面
 * 提供导入、导出、迁移功能
 */

import React, { useState, useRef } from 'react';
import { Download, Upload, FileDown, FileUp, Trash2, X, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import {
  exportAndDownloadAll,
  exportAndDownloadMultiple,
  importAllLetterData,
  readJsonFile,
  clearAllLetterData,
  LetterMigrationData
} from '../utils/letterDataMigration';
import { exportLetterToPDF, exportMultipleLettersToPDF } from '../utils/letterPDFExporter';
import { Letter } from '../types/letter';

interface LetterDataManagementProps {
  onClose: () => void;
  letters: Letter[];
  onRefresh: () => void;
}

const LetterDataManagement: React.FC<LetterDataManagementProps> = ({
  onClose,
  letters,
  onRefresh
}) => {
  const [selectedLetterIds, setSelectedLetterIds] = useState<Set<string>>(new Set());
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理全选/取消全选
  const handleToggleSelectAll = () => {
    if (selectedLetterIds.size === letters.length) {
      setSelectedLetterIds(new Set());
    } else {
      setSelectedLetterIds(new Set(letters.map(l => l.id)));
    }
  };

  // 处理单个信件选择
  const handleToggleSelect = (letterId: string) => {
    const newSet = new Set(selectedLetterIds);
    if (newSet.has(letterId)) {
      newSet.delete(letterId);
    } else {
      newSet.add(letterId);
    }
    setSelectedLetterIds(newSet);
  };

  // 导出全部数据
  const handleExportAll = () => {
    const result = exportAndDownloadAll();
    setMessage({
      type: 'success',
      text: result.message
    });
  };

  // 导出选中的信件
  const handleExportSelected = () => {
    if (selectedLetterIds.size === 0) {
      setMessage({
        type: 'error',
        text: '请先选择要导出的信件'
      });
      return;
    }

    const result = exportAndDownloadMultiple(Array.from(selectedLetterIds), letters);
    if (result.success) {
      setMessage({
        type: 'success',
        text: result.message
      });
      setSelectedLetterIds(new Set());
    } else {
      setMessage({
        type: 'error',
        text: result.message
      });
    }
  };

  // 导出为PDF
  const handleExportPDF = async () => {
    if (selectedLetterIds.size === 0) {
      setMessage({
        type: 'error',
        text: '请先选择要导出的信件'
      });
      return;
    }

    try {
      const selectedLetters = letters.filter(l => selectedLetterIds.has(l.id));
      
      if (selectedLetters.length === 1) {
        await exportLetterToPDF(selectedLetters[0]);
        setMessage({
          type: 'success',
          text: 'PDF导出成功！'
        });
      } else {
        await exportMultipleLettersToPDF(selectedLetters);
        setMessage({
          type: 'success',
          text: `成功导出${selectedLetters.length}封信件为PDF！`
        });
      }
      setSelectedLetterIds(new Set());
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'PDF导出失败：' + (error instanceof Error ? error.message : String(error))
      });
    }
  };

  // 导入数据
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await readJsonFile(file);
      
      // 验证数据格式
      if (!data.letters && !Array.isArray(data)) {
        setMessage({
          type: 'error',
          text: '数据格式不正确'
        });
        return;
      }

      // 如果是单个信件或信件数组
      let migrationData: LetterMigrationData;
      if (Array.isArray(data)) {
        // 信件数组
        migrationData = {
          version: '1.0.0',
          exportDate: Date.now(),
          letters: data,
          customFriends: [],
          statistics: {
            totalLetters: data.length,
            sentLetters: 0,
            repliedLetters: 0,
            customFriendsCount: 0
          }
        };
      } else if (data.id && data.content) {
        // 单个信件
        migrationData = {
          version: '1.0.0',
          exportDate: Date.now(),
          letters: [data],
          customFriends: [],
          statistics: {
            totalLetters: 1,
            sentLetters: 0,
            repliedLetters: 0,
            customFriendsCount: 0
          }
        };
      } else {
        // 完整迁移数据
        migrationData = data;
      }

      const result = importAllLetterData(migrationData, importMode);
      
      if (result.success) {
        setMessage({
          type: 'success',
          text: result.message
        });
        onRefresh();
      } else {
        setMessage({
          type: 'error',
          text: result.message
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: '导入失败：' + (error instanceof Error ? error.message : String(error))
      });
    }

    // 重置文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 清空数据
  const handleClearData = () => {
    const result = clearAllLetterData();
    if (result.success) {
      setMessage({
        type: 'success',
        text: result.message
      });
      setShowConfirmClear(false);
      onRefresh();
    } else {
      setMessage({
        type: 'error',
        text: result.message
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* 标题栏 */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">数据管理</h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* 消息提示 */}
        {message && (
          <div className={`mx-6 mt-4 p-4 rounded-xl flex items-start gap-3 ${
            message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <span className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
              {message.text}
            </span>
            <button
              onClick={() => setMessage(null)}
              className="ml-auto text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* 导出功能 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Download size={20} className="text-orange-500" />
              导出数据
            </h3>
            <div className="space-y-3">
              <button
                onClick={handleExportAll}
                className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <FileDown size={18} />
                导出全部数据（包含所有信件和自定义笔友）
              </button>
              
              <button
                onClick={handleExportSelected}
                disabled={selectedLetterIds.size === 0}
                className="w-full px-4 py-3 bg-blue-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileDown size={18} />
                导出为JSON {selectedLetterIds.size > 0 && `(${selectedLetterIds.size}封)`}
              </button>
              
              <button
                onClick={handleExportPDF}
                disabled={selectedLetterIds.size === 0}
                className="w-full px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText size={18} />
                导出为PDF {selectedLetterIds.size > 0 && `(${selectedLetterIds.size}封)`}
              </button>
            </div>
          </div>

          {/* 导入功能 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Upload size={20} className="text-blue-500" />
              导入数据
            </h3>
            
            {/* 导入模式选择 */}
            <div className="mb-3 p-3 bg-gray-50 rounded-xl">
              <div className="text-sm text-gray-600 mb-2">导入模式：</div>
              <div className="flex gap-3">
                <label className="flex-1 flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="merge"
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                    className="text-orange-500"
                  />
                  <span className="text-sm">合并模式（保留现有数据）</span>
                </label>
                <label className="flex-1 flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="text-orange-500"
                  />
                  <span className="text-sm">替换模式（覆盖现有数据）</span>
                </label>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <FileUp size={18} />
              选择文件导入
            </button>
          </div>

          {/* 信件列表 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-800">选择要导出的信件</h3>
              <button
                onClick={handleToggleSelectAll}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                {selectedLetterIds.size === letters.length ? '取消全选' : '全选'}
              </button>
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-xl p-3">
              {letters.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  暂无信件
                </div>
              ) : (
                letters.map(letter => (
                  <label
                    key={letter.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedLetterIds.has(letter.id)}
                      onChange={() => handleToggleSelect(letter.id)}
                      className="w-4 h-4 text-orange-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 truncate">
                        {letter.isBottle ? '🌊 ' : '📮 '}
                        {letter.receiverName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(letter.sentAt).toLocaleDateString()} · 
                        {letter.status === 'replied' ? ' 已回复' : ' 未回复'}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* 危险操作 */}
          <div>
            <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center gap-2">
              <AlertCircle size={20} />
              危险操作
            </h3>
            {!showConfirmClear ? (
              <button
                onClick={() => setShowConfirmClear(true)}
                className="w-full px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={18} />
                清空所有数据
              </button>
            ) : (
              <div className="border-2 border-red-300 rounded-xl p-4 bg-red-50">
                <div className="text-red-700 mb-3 font-medium">
                  ⚠️ 确定要清空所有数据吗？此操作不可恢复！
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleClearData}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                  >
                    确认清空
                  </button>
                  <button
                    onClick={() => setShowConfirmClear(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LetterDataManagement;
