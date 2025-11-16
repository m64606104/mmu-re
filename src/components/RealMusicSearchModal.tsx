/**
 * 真实音乐搜索模态框 - 使用真实的音乐API进行搜索
 * 不自动触发AI回复，由用户手动控制
 */

import React, { useState, useRef } from 'react';
import { X, Search, Upload, Globe, Loader, AlertCircle, CheckCircle, TestTube } from 'lucide-react';
import { RealMusicInfo, realMusicService } from '../utils/realMusicService';
import RealMusicCard from './RealMusicCard';
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
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-5 border-b bg-gradient-to-r from-gray-50 to-white">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">搜索并分享音乐</h2>
            <p className="text-sm text-gray-500 mt-1">为 <span className="font-medium text-blue-600">{characterName}</span> 选择一首好听的歌</p>
          </div>
          <div className="flex items-center gap-3">
            {/* 发送按钮 - 移到头部右侧 */}
            <button
              onClick={handleConfirmSelection}
              disabled={!selectedMusic}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl disabled:shadow-none font-medium"
              title={selectedMusic ? `发送: ${selectedMusic.title}` : '请选择音乐'}
            >
              确认分享
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row h-[calc(90vh-5rem)]">
          {/* 左侧选项卡 */}
          <div className="lg:w-80 border-r bg-gradient-to-b from-gray-50 to-white">
            <div className="p-4 space-y-3">
              {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full p-3 rounded-xl transition-all text-sm font-medium ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
                    : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <tab.icon className="w-5 h-5" />
                  <div>{tab.label}</div>
                </div>
              </button>
            ))}
            </div>
            
            {/* 音频测试按钮 */}
            <div className="p-4 border-t">
              <button
                onClick={handleAudioTest}
                disabled={isTesting}
                className="w-full p-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 font-medium"
              >
                {isTesting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    测试中...
                  </>
                ) : (
                  <>
                    <TestTube className="w-4 h-4" />
                    音频兼容性测试
                  </>
                )}
              </button>
            </div>
            
            {/* 预览区域 */}
            {selectedMusic && (
              <div className="p-4 border-t bg-blue-50/50">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-500" />
                  已选择
                </h3>
                <RealMusicCard 
                  music={selectedMusic}
                  className="w-full"
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
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      />
                      <button
                        onClick={handleSearch}
                        disabled={isSearching || !searchQuery.trim()}
                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-medium"
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
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-lg">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        搜索结果 ({searchResults.length})
                      </h3>
                      <div className="grid gap-3">
                        {searchResults.map((music, index) => (
                          <div 
                            key={`${music.id}-${index}`}
                            onClick={() => setSelectedMusic(music)}
                            className={`p-4 border-2 rounded-2xl hover:shadow-lg transition-all cursor-pointer ${
                              selectedMusic?.id === music.id 
                                ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-white shadow-md' 
                                : 'border-gray-200 hover:border-blue-300 bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0 pr-4">
                                <h4 className="font-semibold text-gray-900 truncate" title={music.title}>{music.title}</h4>
                                <p className="text-sm text-gray-600 truncate" title={music.artist}>{music.artist}</p>
                                {music.album && (
                                  <p className="text-xs text-gray-500 truncate" title={music.album}>{music.album}</p>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                                  music.playable 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                  <div className={`w-2 h-2 rounded-full ${
                                    music.playable ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                                  }`} />
                                  {music.playable ? '可播放' : '仅信息'}
                                </div>
                                <p className="text-xs text-gray-500 mt-1.5 capitalize font-medium">
                                  {music.source}
                                </p>
                                {/* 版本标识 */}
                                {music.isFullVersion === false && (
                                  <div className="text-xs text-orange-600 mt-1.5 font-semibold">
                                    30秒预览
                                  </div>
                                )}
                                {music.isFullVersion === true && (
                                  <div className="text-xs text-green-600 mt-1.5 font-semibold">
                                    完整版
                                  </div>
                                )}
                                {selectedMusic?.id === music.id && (
                                  <div className="text-blue-600 text-sm mt-1.5 font-semibold flex items-center gap-1">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    已选
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

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealMusicSearchModal;
