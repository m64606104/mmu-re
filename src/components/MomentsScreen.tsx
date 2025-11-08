import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Camera, Heart, MessageCircle, Send, Image as ImageIcon, MoreHorizontal, Trash2 } from 'lucide-react';
import { MomentPost, UserProfile, Conversation } from '../types';
import { getAllMomentPosts, likeMomentPost, commentMomentPost, deleteMomentPost } from '../utils/aiMomentsGenerator';

interface MomentsScreenProps {
  moments: MomentPost[];
  conversations: Conversation[];
  userProfile: UserProfile;
  onAddMoment: (content: string, images: string[]) => void;
  onLikeMoment: (momentId: string) => void;
  onCommentMoment: (momentId: string, content: string) => void;
  onBack: () => void;
}

export default function MomentsScreen({
  moments,
  conversations,
  userProfile,
  onAddMoment,
  onLikeMoment,
  onCommentMoment,
  onBack,
}: MomentsScreenProps) {
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImages, setNewPostImages] = useState<string[]>([]);
  const [commentingMomentId, setCommentingMomentId] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState('');
  const [aiMoments, setAiMoments] = useState<MomentPost[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [viewingImageDesc, setViewingImageDesc] = useState<{ desc: string; index: number } | null>(null);
  const [showMenuForMoment, setShowMenuForMoment] = useState<string | null>(null);

  // 加载AI朋友圈（只负责加载，不负责互动）
  useEffect(() => {
    const loadAiMoments = async () => {
      try {
        const posts = await getAllMomentPosts();
        setAiMoments(posts);
      } catch (error) {
        console.error('加载AI朋友圈失败:', error);
      }
    };
    
    // 首次加载
    loadAiMoments();
    
    // 每30秒刷新一次以显示最新内容
    const interval = setInterval(loadAiMoments, 30 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // 合并用户朋友圈和AI朋友圈
  const allMoments = [...moments, ...aiMoments].sort((a, b) => b.timestamp - a.timestamp);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const readers = Array.from(files).map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      });

      Promise.all(readers).then(images => {
        setNewPostImages([...newPostImages, ...images].slice(0, 9));
      });
    }
  };

  const handlePublish = () => {
    if (newPostContent.trim() || newPostImages.length > 0) {
      onAddMoment(newPostContent, newPostImages);
      setNewPostContent('');
      setNewPostImages([]);
      setShowNewPost(false);
    }
  };

  const handleComment = async (momentId: string) => {
    if (commentContent.trim()) {
      // 检查是否是AI朋友圈
      const aiMoment = aiMoments.find(m => m.id === momentId);
      if (aiMoment && aiMoment.authorId) {
        // AI朋友圈评论
        await commentMomentPost(aiMoment.authorId, momentId, {
          authorId: 'user',
          authorName: userProfile.username,
          authorAvatar: userProfile.avatar,
          content: commentContent
        });
        // 重新加载AI朋友圈
        const posts = await getAllMomentPosts();
        setAiMoments(posts);
      } else {
        // 用户朋友圈评论
        onCommentMoment(momentId, commentContent);
      }
      setCommentContent('');
      setCommentingMomentId(null);
    }
  };

  const handleLike = async (momentId: string) => {
    // 检查是否是AI朋友圈
    const aiMoment = aiMoments.find(m => m.id === momentId);
    if (aiMoment && aiMoment.authorId) {
      // AI朋友圈点赞
      await likeMomentPost(aiMoment.authorId, momentId, 'user');
      // 重新加载AI朋友圈
      const posts = await getAllMomentPosts();
      setAiMoments(posts);
    } else {
      // 用户朋友圈点赞
      onLikeMoment(momentId);
    }
  };

  // 删除朋友圈
  const handleDeleteMoment = async (moment: MomentPost) => {
    const authorId = moment.authorId || moment.userId;
    if (!authorId) return;
    
    if (window.confirm('确定要删除这条朋友圈吗？此操作无法撤销。')) {
      try {
        await deleteMomentPost(authorId, moment.id);
        // 重新加载朋友圈列表
        const posts = await getAllMomentPosts();
        setAiMoments(posts);
        setShowMenuForMoment(null);
        alert('✅ 朋友圈已删除');
      } catch (error) {
        console.error('删除朋友圈失败:', error);
        alert('❌ 删除失败，请重试');
      }
    }
  };

  // 获取最新的角色信息（用于动态更新头像和昵称）
  const getLatestAuthorInfo = (moment: MomentPost) => {
    const authorId = moment.authorId || moment.userId;
    
    // 如果是用户的朋友圈，直接返回用户信息
    if (!authorId || authorId === 'user') {
      return {
        avatar: moment.authorAvatar || moment.userAvatar || userProfile.avatar,
        name: moment.authorName || moment.username || userProfile.username
      };
    }
    
    // 查找对应的对话，获取最新的角色设置
    const conversation = conversations.find(c => c.id === authorId);
    if (conversation && conversation.characterSettings) {
      return {
        avatar: conversation.characterSettings.avatar || conversation.avatar || moment.authorAvatar || moment.userAvatar,
        name: conversation.characterSettings.nickname || conversation.name || moment.authorName || moment.username
      };
    }
    
    // 如果找不到对话，使用原始信息
    return {
      avatar: moment.authorAvatar || moment.userAvatar,
      name: moment.authorName || moment.username
    };
  };

  // 获取微信风格的图片网格布局类名（支持1-9张）
  const getImageGridClass = (count: number) => {
    switch (count) {
      case 1:
        return 'grid-cols-1 max-w-[200px]'; // 单图：单独一列
      case 2:
        return 'grid-cols-2 gap-1'; // 2张：横向2列
      case 3:
        return 'grid-cols-3 gap-1'; // 3张：横向3列
      case 4:
        return 'grid-cols-2 gap-1'; // 4张：2x2网格
      default:
        return 'grid-cols-3 gap-1'; // 5-9张：3列布局
    }
  };

  // 获取单张图片的样式类
  const getImageItemClass = (count: number) => {
    if (count === 1) {
      return 'aspect-[4/3]'; // 单图：4:3比例
    }
    return 'aspect-square'; // 其他情况：正方形
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return new Date(timestamp).toLocaleDateString('zh-CN');
  };

  return (
    <div className="h-full bg-[#EDEDED] flex flex-col">
      {/* Header with Cover */}
      <div className="relative h-64">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400">
          {userProfile.coverImage && (
            <img src={userProfile.coverImage} alt="Cover" className="w-full h-full object-cover" />
          )}
        </div>
        
        {/* Header Bar */}
        <div className="absolute top-0 left-0 right-0 px-4 py-3 flex items-center justify-between">
          <button onClick={onBack} className="p-2 -ml-2 bg-black/30 rounded-full backdrop-blur-sm">
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={() => setShowNewPost(true)}
            className="p-2 -mr-2 bg-black/30 rounded-full backdrop-blur-sm"
          >
            <Camera className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* User Info */}
        <div className="absolute bottom-4 right-4 text-right">
          <div className="text-white font-semibold text-lg drop-shadow-lg mb-1">
            {userProfile.username}
          </div>
          <div className="flex items-center justify-end gap-2">
            <div className="w-16 h-16 rounded-lg bg-white p-0.5 shadow-lg">
              <div className="w-full h-full rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden">
                {userProfile.avatar ? (
                  <img src={userProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-semibold text-xl">
                    {userProfile.username.charAt(0)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Moments List */}
      <div className="flex-1 overflow-y-auto">
        {allMoments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Camera className="w-16 h-16 mb-4" />
            <p>还没有动态</p>
            <p className="text-sm mt-2">点击右上角相机发布第一条动态吧</p>
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {allMoments.map((moment) => {
              // 动态获取最新的角色信息
              const authorInfo = getLatestAuthorInfo(moment);
              const username = authorInfo.name || '未知用户';
              const userAvatar = authorInfo.avatar;
              
              return (
              <div key={moment.id} className="bg-white rounded-xl p-4 shadow-sm">
                {/* User Info */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {userAvatar ? (
                      typeof userAvatar === 'string' && userAvatar.startsWith('data:') ? (
                        <img src={userAvatar} alt={username} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-semibold text-2xl">{userAvatar}</span>
                      )
                    ) : (
                      <span className="text-white font-semibold text-sm">
                        {username.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{username}</div>
                    <div className="text-xs text-gray-500">{formatTime(moment.timestamp)}</div>
                  </div>
                  {/* 三点菜单 - 只对AI朋友圈显示 */}
                  {(moment.authorId || moment.userId) && (moment.authorId || moment.userId) !== 'user' && (
                    <div className="relative">
                      <button
                        onClick={() => setShowMenuForMoment(showMenuForMoment === moment.id ? null : moment.id)}
                        className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <MoreHorizontal className="w-5 h-5 text-gray-500" />
                      </button>
                      {showMenuForMoment === moment.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setShowMenuForMoment(null)}
                          />
                          <div className="absolute right-0 top-8 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 min-w-[120px]">
                            <button
                              onClick={() => handleDeleteMoment(moment)}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              删除朋友圈
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Content */}
                {moment.content && (
                  <p className="text-gray-800 mb-3 leading-relaxed">{moment.content}</p>
                )}

                {/* Images (真实图片) */}
                {moment.images && moment.images.length > 0 && (
                  <div className={`grid mb-3 ${getImageGridClass(moment.images.length)}`}>
                    {moment.images.map((image, index) => (
                      <div 
                        key={index} 
                        className={`rounded-lg overflow-hidden bg-gray-100 ${getImageItemClass(moment.images!.length)}`}
                      >
                        <img src={image} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Image Descriptions (AI生成的图片描述 - 半透明灰色占位符) */}
                {moment.imageDescriptions && moment.imageDescriptions.length > 0 && (
                  <div className={`grid mb-3 ${getImageGridClass(moment.imageDescriptions.length)}`}>
                    {moment.imageDescriptions.map((desc, index) => (
                      <div 
                        key={index} 
                        onClick={() => setViewingImageDesc({ desc, index })}
                        className={`rounded-lg overflow-hidden bg-gray-400/30 backdrop-blur-sm cursor-pointer hover:bg-gray-400/40 transition-colors relative ${getImageItemClass(moment.imageDescriptions!.length)}`}
                      >
                        {/* 半透明遮罩效果 */}
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-300/20 to-gray-400/20" />
                        
                        {/* 中心的图片图标 */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center space-y-1">
                            <ImageIcon className="w-10 h-10 text-white/80 mx-auto drop-shadow-md" strokeWidth={1.5} />
                            <p className="text-xs text-white/70 font-medium drop-shadow px-2 line-clamp-2">
                              {desc.length > 20 ? desc.substring(0, 20) + '...' : desc}
                            </p>
                          </div>
                        </div>
                        
                        {/* 模拟图片质感的噪点纹理 */}
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')] opacity-40" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-6 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleLike(moment.id)}
                    className={`flex items-center gap-1.5 text-sm ${
                      moment.likes.includes('user') ? 'text-red-500' : 'text-gray-500'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${moment.likes.includes('user') ? 'fill-current' : ''}`} />
                    <span>{moment.likes.length > 0 ? moment.likes.length : '赞'}</span>
                  </button>
                  <button
                    onClick={() => setCommentingMomentId(moment.id)}
                    className="flex items-center gap-1.5 text-sm text-gray-500"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>{moment.comments.length > 0 ? moment.comments.length : '评论'}</span>
                  </button>
                </div>

                {/* Comments */}
                {moment.comments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                    {moment.comments.map((comment) => {
                      const commentUsername = comment.authorName || comment.username || '未知用户';
                      return (
                        <div key={comment.id} className="text-sm">
                          <span className="font-semibold text-blue-600">{commentUsername}</span>
                          <span className="text-gray-600">: {comment.content}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Comment Input */}
                {commentingMomentId === moment.id && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                    <input
                      type="text"
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      placeholder="写评论..."
                      className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      onClick={() => handleComment(moment.id)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
            })}
          </div>
        )}
      </div>

      {/* New Post Modal */}
      {showNewPost && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white w-full rounded-t-3xl p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">发布动态</h2>
              <button
                onClick={() => {
                  setShowNewPost(false);
                  setNewPostContent('');
                  setNewPostImages([]);
                }}
                className="text-gray-500"
              >
                取消
              </button>
            </div>

            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="分享新鲜事..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              rows={4}
            />

            {/* Image Preview */}
            {newPostImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {newPostImages.map((image, index) => (
                  <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-100 relative">
                    <img src={image} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setNewPostImages(newPostImages.filter((_, i) => i !== index))}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => imageInputRef.current?.click()}
                className="flex-1 py-3 border border-gray-300 rounded-xl flex items-center justify-center gap-2 text-gray-700"
              >
                <ImageIcon className="w-5 h-5" />
                添加图片
              </button>
              <button
                onClick={handlePublish}
                className="flex-1 py-3 bg-green-500 text-white rounded-xl font-medium"
              >
                发布
              </button>
            </div>

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        </div>
      )}

      {/* Image Description Viewer Modal */}
      {viewingImageDesc && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingImageDesc(null)}
        >
          <div 
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-gray-600" />
                图片描述
              </h3>
              <button
                onClick={() => setViewingImageDesc(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {viewingImageDesc.desc}
            </p>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setViewingImageDesc(null)}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
