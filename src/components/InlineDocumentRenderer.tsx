/**
 * 内联文档渲染器
 * 
 * 在聊天气泡内部自然展示文档内容，而不是独立卡片
 * 支持折叠/展开、不同类型的渲染样式
 */

import React, { useState } from 'react';
import { getSmartDocumentType } from '../utils/smartDocumentSystem';

interface InlineDocumentRendererProps {
  title: string;
  content: string;
  type: 'text' | 'markdown' | 'code';
  onViewFull?: () => void;
}

const InlineDocumentRenderer: React.FC<InlineDocumentRendererProps> = ({
  title,
  content,
  type,
  onViewFull
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const docType = getSmartDocumentType(title, content);
  
  // 根据文档类型决定预览长度
  const getPreviewLength = () => {
    if (content.length < 200) return content.length; // 短文档直接全显示
    return 150; // 长文档预览150字
  };
  
  const previewLength = getPreviewLength();
  const needsExpansion = content.length > 200;
  const displayContent = isExpanded ? content : content.substring(0, previewLength);
  
  // 渲染不同类型的内容
  const renderContent = () => {
    if (type === 'markdown') {
      // 🎨 Markdown渲染 - 更精致的样式
      return (
        <div className="prose prose-sm max-w-none text-gray-800">
          {displayContent.split('\n').map((line, idx) => {
            const trimmedLine = line.trim();
            
            // 标题
            if (trimmedLine.startsWith('# ')) {
              return <h1 key={idx} className="text-lg font-bold mt-3 mb-2 text-gray-900">{trimmedLine.substring(2)}</h1>;
            }
            if (trimmedLine.startsWith('## ')) {
              return <h2 key={idx} className="text-base font-bold mt-2.5 mb-1.5 text-gray-900">{trimmedLine.substring(3)}</h2>;
            }
            if (trimmedLine.startsWith('### ')) {
              return <h3 key={idx} className="text-sm font-semibold mt-2 mb-1 text-gray-800">{trimmedLine.substring(4)}</h3>;
            }
            
            // 列表
            if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
              return <li key={idx} className="ml-4 my-0.5 text-gray-700">{trimmedLine.substring(2)}</li>;
            }
            if (/^\d+\.\s/.test(trimmedLine)) {
              return <li key={idx} className="ml-4 my-0.5 list-decimal text-gray-700">{trimmedLine.replace(/^\d+\.\s/, '')}</li>;
            }
            
            // 代码块
            if (trimmedLine.startsWith('```')) {
              return null; // 代码块标记不显示
            }
            
            // 引用
            if (trimmedLine.startsWith('> ')) {
              return <blockquote key={idx} className="border-l-2 border-blue-300 pl-3 my-2 text-gray-600 italic">{trimmedLine.substring(2)}</blockquote>;
            }
            
            // 空行
            if (trimmedLine === '') {
              return <div key={idx} className="h-2"></div>;
            }
            
            // 普通段落
            return <p key={idx} className="leading-relaxed my-1 text-gray-700">{line}</p>;
          })}
        </div>
      );
    }
    
    if (type === 'code') {
      // 🎨 代码渲染 - 更专业的样式
      return (
        <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto font-mono leading-relaxed shadow-inner">
          <code>{displayContent}</code>
        </pre>
      );
    }
    
    // 🎨 普通文本 - 智能格式化，保持自然段落
    const lines = displayContent.split('\n');
    return (
      <div className="text-gray-700 leading-relaxed">
        {lines.map((line, idx) => {
          // 检测是否是列表项
          if (/^[\d]+\./.test(line.trim())) {
            return <div key={idx} className="my-1 pl-1">{line}</div>;
          }
          if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
            return <div key={idx} className="my-1 pl-1">{line}</div>;
          }
          // 空行
          if (line.trim() === '') {
            return <div key={idx} className="h-2"></div>;
          }
          // 普通行
          return <div key={idx} className="my-1">{line}</div>;
        })}
      </div>
    );
  };
  
  return (
    <div className="inline-document-container">
      {/* 🎯 文档头部 - 极简设计，自然融入 */}
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-base">{docType.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-800 truncate">{title}</div>
          <div className="text-xs text-gray-400">{docType.label}</div>
        </div>
        {onViewFull && (
          <button
            onClick={onViewFull}
            className="text-xs text-blue-500 hover:text-blue-600 shrink-0"
          >
            查看
          </button>
        )}
      </div>
      
      {/* 🎯 文档内容 - 自然渲染，无边框 */}
      <div className={`document-content text-sm ${
        isExpanded ? 'max-h-[500px] overflow-y-auto' : ''
      }`}>
        {renderContent()}
        
        {/* 渐变遮罩（未展开且内容较长时） */}
        {!isExpanded && needsExpansion && (
          <div className="relative">
            <div className="h-8 bg-gradient-to-t from-white to-transparent absolute bottom-0 left-0 right-0 pointer-events-none"></div>
          </div>
        )}
      </div>
      
      {/* 🎯 展开/收起按钮 - 更自然的设计 */}
      {needsExpansion && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 w-full text-center text-xs text-gray-500 hover:text-blue-500 transition-colors py-1.5 hover:bg-gray-50 rounded-lg flex items-center justify-center gap-1"
        >
          {isExpanded ? (
            <>
              <span>收起</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </>
          ) : (
            <>
              <span>展开阅读全文</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default InlineDocumentRenderer;
