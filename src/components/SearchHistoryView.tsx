/**
 * 搜索记录组件
 * 模拟浏览器搜索历史界面
 */

import React, { useState } from 'react';

interface SearchRecord {
  keyword: string;
  time: string;
  device: string;
  details: string;
}

interface SearchHistoryViewProps {
  rawContent: string;
}

const SearchHistoryView: React.FC<SearchHistoryViewProps> = ({ rawContent }) => {
  const [selectedRecord, setSelectedRecord] = useState<SearchRecord | null>(null);

  const parseContent = (): SearchRecord[] => {
    const records: SearchRecord[] = [];
    
    // 解析：搜索记录[keyword|time|device|details]
    const recordRegex = /搜索记录\[(.*?)\|(.*?)\|(.*?)\|([\s\S]*?)\]/g;
    let match;

    while ((match = recordRegex.exec(rawContent)) !== null) {
      records.push({
        keyword: match[1],
        time: match[2],
        device: match[3],
        details: match[4]
      });
    }

    return records;
  };

  const records = parseContent();

  return (
    <div className="w-[280px] border border-gray-300 rounded-lg font-sans overflow-hidden relative bg-white">
      {/* 详情视图（滑动面板） */}
      <div 
        className={`absolute top-0 left-0 w-full h-full bg-white flex flex-col transition-transform duration-300 ease-in-out ${
          selectedRecord ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <strong className="text-sm text-gray-800">{selectedRecord?.keyword || '详情'}</strong>
          <button 
            onClick={() => setSelectedRecord(null)}
            className="text-2xl text-gray-500 hover:text-gray-700 leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-3 text-sm text-gray-600 leading-relaxed flex-1 overflow-y-auto">
          {selectedRecord ? (
            <>
              <div className="mb-2"><strong>时间:</strong> {selectedRecord.time}</div>
              <div className="mb-2"><strong>设备:</strong> {selectedRecord.device}</div>
              <div><strong>详情:</strong> {selectedRecord.details}</div>
            </>
          ) : (
            <p className="text-gray-400">请先选择一条记录...</p>
          )}
        </div>
      </div>

      {/* 列表视图 */}
      <div className={selectedRecord ? 'hidden' : ''}>
        <div className="p-3 border-b border-gray-200 bg-gray-50">
          <strong className="text-sm text-gray-800">搜索记录</strong>
        </div>
        <ul className="m-0 p-0 list-none max-h-[400px] overflow-y-auto">
          {records.map((record, idx) => (
            <li
              key={idx}
              onClick={() => setSelectedRecord(record)}
              className="p-3 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50"
            >
              <div className="text-sm text-gray-700 truncate">{record.keyword}</div>
              <div className="text-xs text-gray-400 mt-1">{record.time}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SearchHistoryView;
