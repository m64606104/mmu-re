/**
 * PDF导出选项模态框
 * 允许用户选择导出哪些轮次和内容类型
 */

import { useState } from 'react';
import { X, Download, FileText } from 'lucide-react';
import { Letter } from '../types/letter';
import { exportLetterToPDF, PDFExportOptions } from '../utils/letterPDFExporter';

interface PDFExportModalProps {
  letter: Letter;
  onClose: () => void;
}

export default function PDFExportModal({ letter, onClose }: PDFExportModalProps) {
  const [selectedRounds, setSelectedRounds] = useState<number[]>(
    letter.conversationRounds.map(r => r.roundNumber)
  );
  const [includeUserLetters, setIncludeUserLetters] = useState(true);
  const [includeAIReplies, setIncludeAIReplies] = useState(true);
  const [exporting, setExporting] = useState(false);

  const handleToggleRound = (roundNumber: number) => {
    setSelectedRounds(prev =>
      prev.includes(roundNumber)
        ? prev.filter(r => r !== roundNumber)
        : [...prev, roundNumber].sort((a, b) => a - b)
    );
  };

  const handleSelectAll = () => {
    setSelectedRounds(letter.conversationRounds.map(r => r.roundNumber));
  };

  const handleDeselectAll = () => {
    setSelectedRounds([]);
  };

  const handleExport = async () => {
    if (selectedRounds.length === 0) {
      alert('请至少选择一轮对话');
      return;
    }

    if (!includeUserLetters && !includeAIReplies) {
      alert('请至少选择一种内容类型');
      return;
    }

    setExporting(true);
    try {
      const options: PDFExportOptions = {
        selectedRounds,
        includeUserLetters,
        includeAIReplies
      };
      await exportLetterToPDF(letter, options);
      alert('✅ PDF导出成功！');
      onClose();
    } catch (error) {
      console.error('PDF导出失败:', error);
      alert('❌ PDF导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-orange-100 to-amber-100 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <FileText size={24} className="text-orange-600" />
            <div>
              <h2 className="text-lg font-bold text-gray-800">导出为PDF</h2>
              <p className="text-xs text-gray-600">选择要导出的内容</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 轮次选择 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-gray-700">选择轮次</label>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAll}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                >
                  全选
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                >
                  清空
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {letter.conversationRounds.map((round) => (
                <button
                  key={round.roundNumber}
                  onClick={() => handleToggleRound(round.roundNumber)}
                  className={`
                    p-3 rounded-xl border-2 transition-all
                    ${selectedRounds.includes(round.roundNumber)
                      ? 'bg-blue-100 border-blue-400 text-blue-700'
                      : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="text-center">
                    <div className="text-lg font-bold">第{round.roundNumber}轮</div>
                    <div className="text-xs mt-1">
                      {round.aiReply ? '✓' : '等待中'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="mt-2 text-xs text-gray-500">
              已选择 {selectedRounds.length} / {letter.conversationRounds.length} 轮
            </div>
          </div>

          {/* 内容类型选择 */}
          <div>
            <label className="text-sm font-bold text-gray-700 mb-3 block">选择内容类型</label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={includeUserLetters}
                  onChange={(e) => setIncludeUserLetters(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">包含我的信件</div>
                  <div className="text-xs text-gray-500">我寄给对方的信</div>
                </div>
              </label>
              
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={includeAIReplies}
                  onChange={(e) => setIncludeAIReplies(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">包含对方回信</div>
                  <div className="text-xs text-gray-500">对方寄给我的回信</div>
                </div>
              </label>
            </div>
          </div>

          {/* 预览信息 */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-2">📄 导出预览</div>
              <div className="text-xs space-y-1 text-blue-700">
                <div>• 轮次：{selectedRounds.length > 0 ? selectedRounds.join(', ') + ' 轮' : '未选择'}</div>
                <div>• 内容：{[
                  includeUserLetters && '我的信件',
                  includeAIReplies && '对方回信'
                ].filter(Boolean).join(' + ') || '未选择'}</div>
                <div>• 格式：精美卡片布局，带装饰边框</div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="px-6 py-4 bg-gray-50 flex gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || selectedRounds.length === 0 || (!includeUserLetters && !includeAIReplies)}
            className={`
              flex-1 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2
              ${exporting || selectedRounds.length === 0 || (!includeUserLetters && !includeAIReplies)
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white'
              }
            `}
          >
            <Download size={18} />
            {exporting ? '导出中...' : '导出PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
