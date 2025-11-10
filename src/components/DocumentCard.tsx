import React, { useMemo } from 'react';
import { getSmartDocumentType } from '../utils/smartDocumentSystem';

interface DocumentCardProps {
  title: string;
  content: string;
  greeting?: string;
  type: 'text' | 'markdown' | 'code';
  onClick: (e?: React.MouseEvent) => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ title, content, greeting, onClick }) => {
  // 🎯 使用智能文档识别系统（缓存结果，避免重复检测）
  const docInfo = useMemo(() => getSmartDocumentType(title, content), [title, content]);
  
  return (
    <div onClick={onClick} className="cursor-pointer">
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md transition-all max-w-[280px]">
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* 图标 */}
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${docInfo.bgColor} flex items-center justify-center flex-shrink-0`}>
              <span className="text-3xl opacity-60">{docInfo.icon}</span>
            </div>
            {/* 内容 */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 mb-1 line-clamp-2 leading-snug">{title}</div>
              <div className="text-xs text-gray-500 flex items-center gap-1.5">
                <span>{greeting || '请查收'}</span>
                <span>•</span>
                <span>{docInfo.label}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentCard;
