/**
 * 音乐分享弹窗 - 让用户可以分享音乐给AI
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Music, Search, FileText, Upload } from 'lucide-react';
import { musicInfoService, MusicInfo } from '../utils/musicService';
import { enhanceMusicWithLyrics } from '../utils/lyricsService';

interface MusicShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShareMusic: (musicInfo: MusicInfo) => void;
  characterName: string;
}

const MusicShareModal: React.FC<MusicShareModalProps> = ({
  isOpen,
  onClose,
  onShareMusic,
  characterName
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MusicInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<MusicInfo | null>(null);
  // const [manualMode, setManualMode] = useState(false); // 现在使用uploadMode替代
  
  // 手动输入模式的状态
  const [manualTitle, setManualTitle] = useState('');
  const [manualArtist, setManualArtist] = useState('');
  const [manualLyrics, setManualLyrics] = useState('');
  const [showLyricsInput, setShowLyricsInput] = useState(false);
  const [manualMood, setManualMood] = useState<MusicInfo['mood']>('happy');
  const [manualDuration, setManualDuration] = useState('180');
  
  // 🎵 本地音频上传和URL输入状态
  const [uploadMode, setUploadMode] = useState<'search' | 'manual' | 'upload' | 'url'>('search');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedMusic(null);
    // setManualMode(false); // 不再需要
    setManualTitle('');
    setManualArtist('');
    setManualLyrics('');
    setShowLyricsInput(false);
    setManualMood('happy');
    setManualDuration('180');
    setUploadMode('search');
    setAudioFile(null);
    setAudioUrl('');
    setAudioPreview(null);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await musicInfoService.smartSearch(searchQuery);
      setSearchResults(results);
      
      if (results.length === 0) {
        // 如果没有找到结果，建议使用手动输入
        setUploadMode('manual');
        setManualTitle(searchQuery);
      }
    } catch (error) {
      console.error('音乐搜索失败:', error);
      setUploadMode('manual');
      setManualTitle(searchQuery);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectMusic = (music: MusicInfo) => {
    setSelectedMusic(music);
  };

  // 🎵 处理音频文件上传
  const handleAudioFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // 检查文件类型
      if (!file.type.startsWith('audio/')) {
        alert('请选择音频文件！');
        return;
      }
      
      setAudioFile(file);
      // 创建预览URL
      const previewUrl = URL.createObjectURL(file);
      setAudioPreview(previewUrl);
      
      // 自动填充文件名作为歌曲标题
      if (!manualTitle.trim()) {
        const fileName = file.name.replace(/\.[^/.]+$/, ''); // 移除扩展名
        setManualTitle(fileName);
      }
    }
  };

  const handleShareManual = async () => {
    if (!manualTitle.trim() || !manualArtist.trim()) return;
    
    // 🎵 动态获取歌词
    const lyricsInfo = await enhanceMusicWithLyrics(
      manualTitle, 
      manualArtist, 
      manualLyrics.trim() || undefined
    );
    
    const musicInfo: MusicInfo & { audioUrl?: string; audioFile?: File } = {
      title: manualTitle,
      artist: manualArtist,
      mood: manualMood,
      duration: parseInt(manualDuration) || 180,
      // 添加歌词信息
      ...(lyricsInfo.lyrics && { lyrics: lyricsInfo.lyrics }),
      ...(lyricsInfo.lyricsWithTime && { lyricsWithTime: lyricsInfo.lyricsWithTime }),
      // 🎵 添加音频源
      ...(audioPreview && { audioUrl: audioPreview }),
      ...(audioFile && { audioFile }),
      ...(audioUrl.trim() && { audioUrl: audioUrl.trim() })
    };
    
    console.log(`🎵 分享音乐 (歌词来源: ${lyricsInfo.source}):`, musicInfo.title);
    
    onShareMusic(musicInfo as MusicInfo);
    onClose();
  };

  const handleShare = () => {
    if (selectedMusic) {
      onShareMusic(selectedMusic);
      onClose();
    }
  };

  const getMoodColor = (mood?: MusicInfo['mood']) => {
    switch (mood) {
      case 'happy': return 'bg-yellow-100 text-yellow-700';
      case 'sad': return 'bg-blue-100 text-blue-700';
      case 'energetic': return 'bg-red-100 text-red-700';
      case 'calm': return 'bg-green-100 text-green-700';
      case 'romantic': return 'bg-pink-100 text-pink-700';
      case 'mysterious': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getMoodText = (mood?: MusicInfo['mood']) => {
    switch (mood) {
      case 'happy': return '欢快';
      case 'sad': return '忧伤';
      case 'energetic': return '激情';
      case 'calm': return '平静';
      case 'romantic': return '浪漫';
      case 'mysterious': return '神秘';
      default: return '未知';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Music className="w-6 h-6 text-purple-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">分享音乐</h3>
              <p className="text-sm text-gray-600">让{characterName}和你一起听音乐</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {uploadMode === 'search' ? (
            <>
              {/* 搜索区域 */}
              <div className="mb-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索歌名、歌手..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </div>
                <div className="mt-2 flex gap-2 text-sm">
                  <button
                    onClick={() => setUploadMode('manual')}
                    className="text-purple-600 hover:text-purple-700 transition-colors"
                  >
                    手动输入
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() => setUploadMode('upload')}
                    className="text-purple-600 hover:text-purple-700 transition-colors"
                  >
                    上传音频
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() => setUploadMode('url')}
                    className="text-purple-600 hover:text-purple-700 transition-colors"
                  >
                    音频链接
                  </button>
                </div>
              </div>

              {/* 搜索结果 */}
              {isSearching && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                  <p className="text-gray-500">搜索中...</p>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">搜索结果</h4>
                  {searchResults.map((music, index) => (
                    <div
                      key={index}
                      onClick={() => handleSelectMusic(music)}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedMusic === music
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-medium text-gray-900 truncate">{music.title}</h5>
                          <p className="text-sm text-gray-600 truncate">{music.artist}</p>
                          {music.album && (
                            <p className="text-xs text-gray-500 truncate">{music.album}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {music.duration && (
                              <span className="text-xs text-gray-500">
                                {Math.floor(music.duration / 60)}:{(music.duration % 60).toString().padStart(2, '0')}
                              </span>
                            )}
                            {music.mood && (
                              <span className={`px-2 py-1 rounded-full text-xs ${getMoodColor(music.mood)}`}>
                                {getMoodText(music.mood)}
                              </span>
                            )}
                          </div>
                        </div>
                        {selectedMusic === music && (
                          <div className="ml-2">
                            <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : uploadMode === 'upload' ? (
            /* 音频文件上传模式 */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">上传音频文件</h4>
                <button
                  onClick={() => setUploadMode('search')}
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  返回搜索
                </button>
              </div>
              
              {/* 文件上传区域 */}
              <div 
                onClick={() => audioInputRef.current?.click()}
                className="border-2 border-dashed border-purple-300 rounded-lg p-6 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors"
              >
                {audioFile ? (
                  <div>
                    <Music className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900">{audioFile.name}</p>
                    <p className="text-xs text-gray-600 mt-1">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    {audioPreview && (
                      <audio 
                        controls 
                        className="mt-3 w-full" 
                        src={audioPreview}
                        style={{ maxWidth: '300px' }}
                      />
                    )}
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">点击选择音频文件</p>
                    <p className="text-xs text-gray-500 mt-1">支持 MP3, WAV, AAC, M4A 等格式</p>
                  </div>
                )}
              </div>
              
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                onChange={handleAudioFileUpload}
                className="hidden"
              />
              
              {/* 基本信息输入 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">歌名 *</label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="输入歌名"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">歌手 *</label>
                <input
                  type="text"
                  value={manualArtist}
                  onChange={(e) => setManualArtist(e.target.value)}
                  placeholder="输入歌手名"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          ) : uploadMode === 'url' ? (
            /* 音频URL输入模式 */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">输入音频链接</h4>
                <button
                  onClick={() => setUploadMode('search')}
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  返回搜索
                </button>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">音频URL *</label>
                <input
                  type="url"
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  placeholder="https://example.com/music.mp3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {audioUrl.trim() && (
                  <div className="mt-2">
                    <audio 
                      controls 
                      className="w-full" 
                      src={audioUrl}
                      onError={() => alert('音频链接无效或无法访问')}
                    />
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">歌名 *</label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="输入歌名"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">歌手 *</label>
                <input
                  type="text"
                  value={manualArtist}
                  onChange={(e) => setManualArtist(e.target.value)}
                  placeholder="输入歌手名"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          ) : (
            /* 手动输入模式 */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">手动输入音乐信息</h4>
                <button
                  onClick={() => setUploadMode('search')}
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  返回搜索
                </button>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">歌名 *</label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="输入歌名"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">歌手 *</label>
                <input
                  type="text"
                  value={manualArtist}
                  onChange={(e) => setManualArtist(e.target.value)}
                  placeholder="输入歌手名"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* 歌词输入区域 */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">歌词 (可选)</label>
                  <button
                    type="button"
                    onClick={() => setShowLyricsInput(!showLyricsInput)}
                    className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
                  >
                    <FileText className="w-4 h-4" />
                    {showLyricsInput ? '隐藏歌词' : '添加歌词'}
                  </button>
                </div>
                
                {showLyricsInput && (
                  <div className="space-y-2">
                    <textarea
                      value={manualLyrics}
                      onChange={(e) => setManualLyrics(e.target.value)}
                      placeholder="输入歌词内容，或使用时间标记格式：&#10;[00:12] 第一句歌词&#10;[00:20] 第二句歌词&#10;&#10;如果不输入，系统会尝试自动获取歌词"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y min-h-[100px]"
                    />
                    <p className="text-xs text-gray-500">
                      💡 支持时间标记格式 [mm:ss] 或纯文本。留空将自动尝试获取歌词。
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">音乐情绪</label>
                <select
                  value={manualMood}
                  onChange={(e) => setManualMood(e.target.value as MusicInfo['mood'])}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="happy">欢快</option>
                  <option value="sad">忧伤</option>
                  <option value="energetic">激情</option>
                  <option value="calm">平静</option>
                  <option value="romantic">浪漫</option>
                  <option value="mysterious">神秘</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">时长 (秒)</label>
                <input
                  type="number"
                  value={manualDuration}
                  onChange={(e) => setManualDuration(e.target.value)}
                  placeholder="180"
                  min="30"
                  max="600"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            {uploadMode !== 'search' ? (
              <button
                onClick={handleShareManual}
                disabled={!manualTitle.trim() || !manualArtist.trim() || (uploadMode === 'url' && !audioUrl.trim())}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                分享音乐
              </button>
            ) : (
              <button
                onClick={handleShare}
                disabled={!selectedMusic}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                分享音乐
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicShareModal;
