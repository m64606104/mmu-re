/**
 * 增强音乐分享模态框 - 解决音乐功能性能问题
 * 支持快速搜索、即时播放、本地上传等功能
 */

import React, { useState, useRef } from 'react';
import { X, Search, Upload, Globe, Edit, Music, Sparkles } from 'lucide-react';
import { EnhancedMusicInfo, enhancedMusicService } from '../utils/enhancedMusicService';
import QuickMusicCard from './QuickMusicCard';

interface EnhancedMusicShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShareMusic: (musicInfo: EnhancedMusicInfo) => void;
  characterName: string;
}

const EnhancedMusicShareModal: React.FC<EnhancedMusicShareModalProps> = ({
  isOpen,
  onClose,
  onShareMusic,
  characterName
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'upload' | 'url' | 'manual'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EnhancedMusicInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [previewMusic, setPreviewMusic] = useState<EnhancedMusicInfo | null>(null);
  
  // 手动输入状态
  const [manualInfo, setManualInfo] = useState({
    title: '',
    artist: '',
    album: '',
    genre: '',
    mood: 'happy' as EnhancedMusicInfo['mood'],
    duration: 180,
    lyrics: ''
  });
  
  // 文件上传状态
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    { id: 'search', label: '快速搜索', icon: Search, desc: '搜索流行歌曲' },
    { id: 'upload', label: '本地音频', icon: Upload, desc: '上传音频文件' },
    { id: 'url', label: '在线链接', icon: Globe, desc: '输入音频URL' },
    { id: 'manual', label: '手动输入', icon: Edit, desc: '手动创建音乐' }
  ];

  const moodOptions = [
    { value: 'happy', label: '快乐', emoji: '😊', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'sad', label: '伤感', emoji: '😢', color: 'bg-blue-100 text-blue-800' },
    { value: 'energetic', label: '活力', emoji: '🔥', color: 'bg-red-100 text-red-800' },
    { value: 'calm', label: '平静', emoji: '😌', color: 'bg-green-100 text-green-800' },
    { value: 'romantic', label: '浪漫', emoji: '💕', color: 'bg-pink-100 text-pink-800' },
    { value: 'mysterious', label: '神秘', emoji: '🌙', color: 'bg-purple-100 text-purple-800' }
  ];

  // 重置表单
  const resetForm = () => {
    setSearchQuery('');
    setSearchResults([]);
    setPreviewMusic(null);
    setManualInfo({
      title: '',
      artist: '',
      album: '',
      genre: '',
      mood: 'happy',
      duration: 180,
      lyrics: ''
    });
    setUploadedFile(null);
    setAudioUrl('');
  };

  // 快速搜索
  const handleQuickSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await enhancedMusicService.enhancedMusicSearch(searchQuery);
      setSearchResults(results);
      
      // 如果只有一个结果，自动预览
      if (results.length === 1) {
        setPreviewMusic(results[0]);
      }
    } catch (error) {
      console.error('搜索失败:', error);
      // 搜索失败时自动切换到手动模式
      setActiveTab('manual');
      setManualInfo(prev => ({ ...prev, title: searchQuery }));
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
      const fileName = file.name.replace(/\.[^/.]+$/, ''); // 移除扩展名
      const parts = fileName.split('-').map(part => part.trim());
      
      if (parts.length >= 2) {
        setManualInfo(prev => ({
          ...prev,
          artist: parts[0],
          title: parts[1]
        }));
      } else {
        setManualInfo(prev => ({
          ...prev,
          title: fileName
        }));
      }
    } else {
      alert('请选择有效的音频文件！');
    }
  };

  // 处理URL输入
  const handleUrlInput = () => {
    if (!audioUrl.trim()) return;
    
    try {
      new URL(audioUrl); // 验证URL格式
      
      // 从URL提取可能的音乐信息
      const urlParts = audioUrl.split('/').pop()?.split('?')[0] || '';
      const nameWithoutExt = urlParts.replace(/\.[^/.]+$/, '');
      
      setManualInfo(prev => ({
        ...prev,
        title: nameWithoutExt || '在线音乐'
      }));
    } catch {
      alert('请输入有效的音频URL！');
    }
  };

  // 创建音乐信息
  const createMusicInfo = async (): Promise<EnhancedMusicInfo> => {
    let audioSource: string | undefined;
    
    if (activeTab === 'upload' && uploadedFile) {
      audioSource = URL.createObjectURL(uploadedFile);
    } else if (activeTab === 'url' && audioUrl) {
      audioSource = audioUrl;
    }
    
    const musicInfo: EnhancedMusicInfo = {
      title: manualInfo.title || '未知歌曲',
      artist: manualInfo.artist || '未知歌手',
      album: manualInfo.album,
      genre: manualInfo.genre,
      mood: manualInfo.mood,
      duration: manualInfo.duration,
      lyrics: manualInfo.lyrics,
      audioUrl: audioSource,
      audioFile: uploadedFile || undefined,
      source: activeTab as EnhancedMusicInfo['source']
    };
    
    // 如果没有音频源，生成快速音频
    if (!musicInfo.audioUrl) {
      try {
        musicInfo.audioUrl = await enhancedMusicService.generateQuickAudio(
          musicInfo.mood || 'happy',
          musicInfo.duration || 30
        );
      } catch (error) {
        console.error('生成音频失败:', error);
      }
    }
    
    // 获取歌词
    if (!musicInfo.lyrics && musicInfo.title && musicInfo.artist) {
      try {
        const lyricsResult = await enhancedMusicService.getQuickLyrics(
          musicInfo.title,
          musicInfo.artist
        );
        if (lyricsResult) {
          musicInfo.lyrics = lyricsResult.lyrics;
          musicInfo.lyricsWithTime = lyricsResult.lyricsWithTime;
        }
      } catch (error) {
        console.error('获取歌词失败:', error);
      }
    }
    
    return musicInfo;
  };

  // 分享音乐
  const handleShare = async () => {
    try {
      let musicToShare: EnhancedMusicInfo;
      
      if (previewMusic) {
        musicToShare = previewMusic;
      } else {
        musicToShare = await createMusicInfo();
      }
      
      onShareMusic(musicToShare);
      onClose();
      resetForm();
    } catch (error) {
      console.error('分享音乐失败:', error);
      alert('分享失败，请重试');
    }
  };

  // 预览音乐
  const handlePreview = async () => {
    try {
      const musicInfo = await createMusicInfo();
      setPreviewMusic(musicInfo);
    } catch (error) {
      console.error('预览失败:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">分享音乐给 {characterName}</h2>
            <p className="text-sm text-gray-500 mt-1">让AI和你一起享受音乐的美好</p>
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
                  className={`w-full p-3 rounded-lg text-left transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-white hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <tab.icon className="w-5 h-5" />
                    <div>
                      <div className="font-medium">{tab.label}</div>
                      <div className={`text-xs ${
                        activeTab === tab.id ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {tab.desc}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            {/* 预览区域 */}
            {previewMusic && (
              <div className="p-4 border-t">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  预览播放
                </h3>
                <QuickMusicCard 
                  music={previewMusic}
                  className="w-full"
                />
              </div>
            )}
          </div>

          {/* 右侧内容区域 */}
          <div className="flex-1 overflow-auto">
            <div className="p-6">
              {/* 快速搜索 */}
              {activeTab === 'search' && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="搜索歌曲名或歌手..."
                      className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && handleQuickSearch()}
                    />
                    <button
                      onClick={handleQuickSearch}
                      disabled={isSearching}
                      className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                    >
                      {isSearching ? '搜索中...' : '搜索'}
                    </button>
                  </div>
                  
                  {searchResults.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-medium text-gray-900">搜索结果</h3>
                      {searchResults.map((music, index) => (
                        <div
                          key={index}
                          className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => setPreviewMusic(music)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{music.title}</h4>
                              <p className="text-sm text-gray-600">{music.artist}</p>
                              {music.album && (
                                <p className="text-xs text-gray-500">{music.album}</p>
                              )}
                            </div>
                            <Music className="w-5 h-5 text-gray-400" />
                          </div>
                        </div>
                      ))}
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
                      支持 MP3, WAV, AAC, M4A 等格式
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
                    <input
                      type="url"
                      value={audioUrl}
                      onChange={(e) => setAudioUrl(e.target.value)}
                      placeholder="https://example.com/music.mp3"
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onBlur={handleUrlInput}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      请输入可直接访问的音频文件链接
                    </p>
                  </div>
                </div>
              )}

              {/* 通用音乐信息输入 */}
              {(activeTab === 'manual' || activeTab === 'upload' || activeTab === 'url') && (
                <div className="space-y-4 mt-6">
                  <h3 className="font-medium text-gray-900">音乐信息</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        歌曲名称 *
                      </label>
                      <input
                        type="text"
                        value={manualInfo.title}
                        onChange={(e) => setManualInfo(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="歌曲名称"
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        歌手 *
                      </label>
                      <input
                        type="text"
                        value={manualInfo.artist}
                        onChange={(e) => setManualInfo(prev => ({ ...prev, artist: e.target.value }))}
                        placeholder="歌手名称"
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        专辑
                      </label>
                      <input
                        type="text"
                        value={manualInfo.album}
                        onChange={(e) => setManualInfo(prev => ({ ...prev, album: e.target.value }))}
                        placeholder="专辑名称"
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        流派
                      </label>
                      <input
                        type="text"
                        value={manualInfo.genre}
                        onChange={(e) => setManualInfo(prev => ({ ...prev, genre: e.target.value }))}
                        placeholder="如：流行、摇滚、古典"
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      音乐情绪
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {moodOptions.map((mood) => (
                        <button
                          key={mood.value}
                          onClick={() => setManualInfo(prev => ({ ...prev, mood: mood.value as any }))}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            manualInfo.mood === mood.value
                              ? mood.color + ' ring-2 ring-offset-2 ring-blue-400'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <span className="mr-1">{mood.emoji}</span>
                          {mood.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      时长（秒）
                    </label>
                    <input
                      type="number"
                      value={manualInfo.duration}
                      onChange={(e) => setManualInfo(prev => ({ ...prev, duration: parseInt(e.target.value) || 180 }))}
                      min="10"
                      max="600"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      歌词（可选）
                    </label>
                    <textarea
                      value={manualInfo.lyrics}
                      onChange={(e) => setManualInfo(prev => ({ ...prev, lyrics: e.target.value }))}
                      placeholder="输入歌词，每行一句"
                      rows={4}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-3 mt-8 pt-6 border-t">
                <button
                  onClick={handlePreview}
                  disabled={!manualInfo.title || !manualInfo.artist}
                  className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
                >
                  预览播放
                </button>
                <button
                  onClick={handleShare}
                  disabled={!previewMusic && (!manualInfo.title || !manualInfo.artist)}
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

export default EnhancedMusicShareModal;
