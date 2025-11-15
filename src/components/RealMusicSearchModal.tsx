/**
 * 真实音乐搜索模态框 - 使用真实的音乐API进行搜索
 * 不自动触发AI回复，由用户手动控制
 */

import React, { useState, useRef } from 'react';
import { X, Search, Upload, Globe, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { RealMusicInfo, realMusicService } from '../utils/realMusicService';
import RealMusicCard from './RealMusicCard';

interface RealMusicSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMusic: (musicInfo: RealMusicInfo) => void;
  characterName: string;
}

const RealMusicSearchModal: React.FC<RealMusicSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectMusic,
  characterName
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'upload' | 'url'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RealMusicInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedMusic, setSelectedMusic] = useState<RealMusicInfo | null>(null);
  
  // 文件上传状态
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [urlValidating, setUrlValidating] = useState(false);
  const [urlValid, setUrlValid] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    { id: 'search', label: '在线搜索', icon: Search },
    { id: 'upload', label: '本地上传', icon: Upload },
    { id: 'url', label: '音频链接', icon: Globe }
  ];

  // 搜索真实音乐
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);
    
    try {
      console.log('🔍 开始搜索:', searchQuery);
      const results = await realMusicService.searchPlayableMusic(searchQuery);
      
      if (results.length === 0) {
        setSearchError('没有找到相关音乐，请尝试其他关键词');
      } else {
        setSearchResults(results);
        console.log('✅ 搜索完成，找到', results.length, '个结果');
      }
    } catch (error) {
      console.error('搜索失败:', error);
      setSearchError('搜索失败，请检查网络连接或稍后重试');
    } finally {
      setIsSearching(false);
    }
  };

  // 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setUploadedFile(file);
      
      // 从文件名提取音乐信息
      const fileName = file.name.replace(/\.[^/.]+$/, '');
      const parts = fileName.split('-').map(part => part.trim());
      
      const musicInfo: RealMusicInfo = {
        id: `upload_${Date.now()}`,
        title: parts[1] || fileName,
        artist: parts[0] || '本地音乐',
        audioUrl: URL.createObjectURL(file),
        source: 'local',
        playable: true,
        isFullVersion: true, // 用户上传的音乐都是完整版
        duration: 0 // 将在音频加载后获取
      };
      
      setSelectedMusic(musicInfo);
    } else {
      alert('请选择有效的音频文件（MP3、WAV、AAC、M4A等）！');
    }
  };

  // 验证URL
  const handleUrlValidation = async () => {
    if (!audioUrl.trim()) return;
    
    setUrlValidating(true);
    setUrlValid(null);
    
    try {
      new URL(audioUrl); // 验证URL格式
      const isValid = await realMusicService.validateAudioUrl(audioUrl);
      setUrlValid(isValid);
      
      if (isValid) {
        // 获取音频元数据
        const metadata = await realMusicService.getAudioMetadata(audioUrl);
        
        const urlParts = audioUrl.split('/').pop()?.split('?')[0] || '';
        const nameWithoutExt = urlParts.replace(/\.[^/.]+$/, '');
        
        const musicInfo: RealMusicInfo = {
          id: `url_${Date.now()}`,
          title: nameWithoutExt || '在线音乐',
          artist: '未知歌手',
          audioUrl: audioUrl,
          duration: metadata?.duration,
          source: 'url',
          playable: true,
          isFullVersion: true // URL音乐通常是完整版
        };
        
        setSelectedMusic(musicInfo);
      }
    } catch {
      setUrlValid(false);
    } finally {
      setUrlValidating(false);
    }
  };

  // 确认选择并分享
  const handleConfirmSelection = () => {
    if (selectedMusic) {
      onSelectMusic(selectedMusic);
      onClose();
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">搜索真实音乐</h2>
            <p className="text-sm text-gray-500 mt-1">搜索可播放的音乐分享给 {characterName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row h-[calc(90vh-5rem)]">
          {/* 左侧选项卡 */}
          <div className="lg:w-80 border-r bg-gray-50">
            <div className="p-4 space-y-2">
              {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 p-2 rounded-lg transition-all text-sm ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <tab.icon className="w-4 h-4" />
                  <div className="font-medium">{tab.label}</div>
                </div>
              </button>
            ))}
            </div>
            
            
            {/* 预览区域 */}
            {selectedMusic && (
              <div className="p-4 border-t">
                <h3 className="font-medium text-gray-900 mb-3">已选择</h3>
                <RealMusicCard 
                  music={selectedMusic}
                  className="w-full"
                  showGenerateButton={false}
                />
              </div>
            )}
          </div>

          {/* 右侧内容区域 */}
          <div className="flex-1 overflow-auto">
            <div className="p-6">
              {/* 在线搜索 */}
              {activeTab === 'search' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      搜索音乐
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="输入歌曲名、歌手或专辑..."
                        className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      />
                      <button
                        onClick={handleSearch}
                        disabled={isSearching || !searchQuery.trim()}
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center gap-2"
                      >
                        {isSearching ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" />
                            搜索中...
                          </>
                        ) : (
                          <>
                            <Search className="w-4 h-4" />
                            搜索
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      搜索来自多个免费音乐平台的可播放音乐
                    </p>
                  </div>
                  
                  {/* 搜索结果 */}
                  {searchError && (
                    <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                      <AlertCircle className="w-5 h-5" />
                      <span>{searchError}</span>
                    </div>
                  )}
                  
                  {searchResults.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-medium text-gray-900 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        搜索结果 ({searchResults.length})
                      </h3>
                      <div className="grid gap-3">
                        {searchResults.map((music, index) => (
                          <div 
                            key={`${music.id}-${index}`}
                            onClick={() => setSelectedMusic(music)}
                            className={`p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer ${
                              selectedMusic?.id === music.id 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium">{music.title}</h4>
                                <p className="text-sm text-gray-600">{music.artist}</p>
                                {music.album && (
                                  <p className="text-xs text-gray-500">{music.album}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                                  music.playable 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                  <div className={`w-2 h-2 rounded-full ${
                                    music.playable ? 'bg-green-400' : 'bg-gray-400'
                                  }`} />
                                  {music.playable ? '可播放' : '仅信息'}
                                </div>
                                <p className="text-xs text-gray-500 mt-1 capitalize">
                                  {music.source}
                                </p>
                                {/* 版本标识 */}
                                {music.isFullVersion === false && (
                                  <div className="text-xs text-orange-600 mt-1 font-medium">
                                    30秒预览
                                  </div>
                                )}
                                {music.isFullVersion === true && (
                                  <div className="text-xs text-green-600 mt-1 font-medium">
                                    完整版
                                  </div>
                                )}
                                {selectedMusic?.id === music.id && (
                                  <div className="text-blue-500 text-xs mt-1 font-medium">
                                    ✓ 已选择
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 本地上传 */}
              {activeTab === 'upload' && (
                <div className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                  >
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-lg font-medium text-gray-700">点击上传音频文件</p>
                    <p className="text-sm text-gray-500 mt-1">
                      支持 MP3, WAV, AAC, M4A, OGG 等格式
                    </p>
                    {uploadedFile && (
                      <p className="text-sm text-blue-600 mt-2">
                        已选择: {uploadedFile.name}
                      </p>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}

              {/* URL输入 */}
              {activeTab === 'url' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      音频链接
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={audioUrl}
                        onChange={(e) => setAudioUrl(e.target.value)}
                        placeholder="https://example.com/music.mp3"
                        className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={handleUrlValidation}
                        disabled={urlValidating || !audioUrl.trim()}
                        className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors flex items-center gap-2"
                      >
                        {urlValidating ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" />
                            验证中...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            验证
                          </>
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {urlValid === true && (
                        <div className="flex items-center gap-1 text-green-600 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          URL有效，可以播放
                        </div>
                      )}
                      {urlValid === false && (
                        <div className="flex items-center gap-1 text-red-600 text-sm">
                          <AlertCircle className="w-4 h-4" />
                          URL无效或无法播放
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      请输入可直接访问的音频文件链接（支持CORS）
                    </p>
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-3 mt-8 pt-6 border-t">
                <button
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmSelection}
                  disabled={!selectedMusic}
                  className="flex-1 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                  分享给 {characterName}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealMusicSearchModal;
