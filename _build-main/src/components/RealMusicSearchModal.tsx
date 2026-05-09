/**
 * 真实音乐搜索模态框 - 使用真实的音乐API进行搜索
 * 不自动触发AI回复，由用户手动控制
 */

import React, { useState, useRef } from 'react';
import { X, Search, Upload, Globe, Loader, AlertCircle, CheckCircle, TestTube, Music } from 'lucide-react';
import { RealMusicInfo, realMusicService } from '../utils/realMusicService';
import audioTestService from '../utils/audioTestService';

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
  
  // 音频测试状态
  const [isTesting, setIsTesting] = useState(false);

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

  // 音频兼容性测试 - 参考DLC实现
  const handleAudioTest = async () => {
    setIsTesting(true);
    
    try {
      console.log('🧪 开始音频兼容性测试...');
      
      // 1. 测试浏览器支持
      const browserCapability = audioTestService.testBrowserCapability();
      console.log('🌐 浏览器音频能力:', browserCapability);
      
      // 2. 生成测试音频
      const testAudioUrl = audioTestService.generateTestAudio();
      console.log('🎵 生成测试音频:', testAudioUrl);
      
      // 3. 测试音乐API
      const musicTestReport = await realMusicService.getMusicTestReport();
      console.log('🎶 音乐API测试:', musicTestReport);
      
      // 4. 如果有搜索结果，测试音频URL
      let audioUrlTests = new Map();
      if (searchResults.length > 0) {
        const testUrls = searchResults.slice(0, 3).map(r => r.audioUrl || r.previewUrl).filter(Boolean) as string[];
        if (testUrls.length > 0) {
          audioUrlTests = await audioTestService.testMultipleUrls(testUrls);
          console.log('🔗 音频URL测试:', audioUrlTests);
        }
      }
      
      // 显示测试结果摘要
      const workingApis = musicTestReport.summary?.workingApis || [];
      const supportedFormats = browserCapability.formats;
      const workingUrls = Array.from(audioUrlTests.values()).filter(r => r.success).length;
      
      alert(`🧪 音频兼容性测试完成！

📊 测试结果:
• 浏览器支持: ${supportedFormats.join(', ')} 格式
• 可用音乐API: ${workingApis.length > 0 ? workingApis.join(', ') : '无'}
• 可播放URL: ${workingUrls}/${audioUrlTests.size}个
• 测试音频: ${testAudioUrl ? '生成成功' : '生成失败'}

${workingApis.length === 0 ? '⚠️ 所有音乐API都不可用，建议使用本地上传或音频链接功能。' : '✅ 音频功能正常可用！'}

详细日志请查看浏览器控制台。`);
      
    } catch (error) {
      console.error('🧪 音频测试失败:', error);
      alert(`❌ 音频测试失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsTesting(false);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden">
        {/* 头部 - 参考图3设计 */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white">搜索并分享音乐</h2>
              <p className="text-sm text-blue-100 mt-1">搜索可播放的音乐分享给 {characterName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
          
          {/* 已选择提示 */}
          {selectedMusic && (
            <div className="mt-4 bg-white/20 backdrop-blur-sm rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Music className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{selectedMusic.title}</p>
                  <p className="text-blue-100 text-sm truncate">{selectedMusic.artist}</p>
                </div>
              </div>
              <button
                onClick={handleConfirmSelection}
                className="ml-3 px-6 py-2.5 bg-white text-blue-600 rounded-xl hover:bg-blue-50 transition-all font-medium shadow-lg flex-shrink-0"
              >
                发送
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col h-[calc(85vh-10rem)]">
          {/* 选项卡 - 横向布局 */}
          <div className="flex border-b bg-gray-50">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-3 px-4 transition-all text-sm font-medium border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-white'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </div>
              </button>
            ))}
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-auto bg-gray-50">
            <div className="p-6">
              {/* 在线搜索 */}
              {activeTab === 'search' && (
                <div className="space-y-4">
                  {/* 搜索框 - 参考图3设计 */}
                  <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="输入歌曲名或歌手..."
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      />
                      <button
                        onClick={handleSearch}
                        disabled={isSearching || !searchQuery.trim()}
                        className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-all font-medium shadow-md flex items-center gap-2 flex-shrink-0"
                      >
                        {isSearching ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" />
                            <span>搜索中</span>
                          </>
                        ) : (
                          <>
                            <Search className="w-4 h-4" />
                            <span>搜索</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                      <Music className="w-3 h-3" />
                      免费音乐平台：Jamendo、iTunes 预览
                    </p>
                  </div>
                  
                  {/* 搜索结果 - 参考图3的卡片设计 */}
                  {searchError && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-3 text-red-600">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm">{searchError}</span>
                      </div>
                    </div>
                  )}
                  
                  {searchResults.length > 0 && (
                    <div className="space-y-3">
                      {searchResults.map((music, index) => (
                        <div 
                          key={`${music.id}-${index}`}
                          onClick={() => setSelectedMusic(music)}
                          className={`bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                            selectedMusic?.id === music.id 
                              ? 'ring-2 ring-blue-500' 
                              : ''
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            {/* 封面图 */}
                            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {music.coverUrl ? (
                                <img src={music.coverUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Music className="w-8 h-8 text-blue-400" />
                              )}
                            </div>
                            
                            {/* 音乐信息 */}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 truncate">{music.title}</h4>
                              <p className="text-sm text-gray-600 truncate">{music.artist}</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                {/* 版本标识 */}
                                {music.isFullVersion === false && (
                                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                                    30秒预览
                                  </span>
                                )}
                                {music.isFullVersion === true && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                    完整版
                                  </span>
                                )}
                                <span className="text-xs text-gray-500 capitalize">
                                  {music.source}
                                </span>
                              </div>
                            </div>
                            
                            {/* 选择状态 */}
                            <div className="flex-shrink-0">
                              {selectedMusic?.id === music.id ? (
                                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                                  <CheckCircle className="w-4 h-4 text-white" />
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 本地上传 - 优化设计 */}
              {activeTab === 'upload' && (
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-blue-300 rounded-2xl p-12 text-center hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
                  >
                    <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                      <Upload className="w-10 h-10 text-blue-500" />
                    </div>
                    <p className="text-lg font-semibold text-gray-900">点击上传音频文件</p>
                    <p className="text-sm text-gray-500 mt-2">
                      支持 MP3, WAV, AAC, M4A, OGG 等格式
                    </p>
                    {uploadedFile && (
                      <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-xl">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">已选择: {uploadedFile.name}</span>
                      </div>
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

              {/* URL输入 - 优化设计 */}
              {activeTab === 'url' && (
                <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      音频链接
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="url"
                        value={audioUrl}
                        onChange={(e) => setAudioUrl(e.target.value)}
                        placeholder="https://example.com/music.mp3"
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
                      />
                      <button
                        onClick={handleUrlValidation}
                        disabled={urlValidating || !audioUrl.trim()}
                        className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 transition-all font-medium shadow-md flex items-center gap-2 flex-shrink-0"
                      >
                        {urlValidating ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" />
                            <span>验证中</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span>验证</span>
                          </>
                        )}
                      </button>
                    </div>
                    {urlValid === true && (
                      <div className="mt-3 flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-xl">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">URL有效，可以播放</span>
                      </div>
                    )}
                    {urlValid === false && (
                      <div className="mt-3 flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-xl">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">URL无效或无法播放</span>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      请输入可直接访问的音频文件链接（支持CORS）
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>
          
          {/* 底部测试按钮 */}
          <div className="border-t bg-white p-4">
            <button
              onClick={handleAudioTest}
              disabled={isTesting}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all font-medium shadow-md flex items-center justify-center gap-2"
            >
              {isTesting ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>测试中...</span>
                </>
              ) : (
                <>
                  <TestTube className="w-5 h-5" />
                  <span>音频兼容性测试</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealMusicSearchModal;
