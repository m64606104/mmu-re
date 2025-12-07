import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Heart, MessageCircle, Send, X, Sparkles, ChevronDown } from 'lucide-react';
import { EasyChatUser, EasyChatContact, EasyChatConversation, ApiConfig } from '../types';
import { load, save } from '../utils/storage';
import { generateForumPost } from '../utils/forumAIGenerator';

// 角色类型
type ForumRoleType = 'user' | 'contact';

interface ForumRole {
  id: string;
  type: ForumRoleType;
  name: string;
  avatar: string;
}

// 帖子数据结构
interface ForumPost {
  id: string;
  author: ForumRole;
  content: string;
  createdAt: number;
  likeIds: string[];
  commentIds: string[];
  source?: 'manual' | 'ai'; // 帖子来源：手动或AI生成
  originalRoleId?: string; // AI生成时使用的角色ID
  generationMeta?: { // AI生成的元数据（可选）
    fromConversations?: string[];
    createdByApi?: string;
  };
}

// 评论数据结构
interface ForumComment {
  id: string;
  postId: string;
  author: ForumRole;
  content: string;
  createdAt: number;
  replyToCommentId?: string;
  replyToAuthorName?: string;
}

interface EasyChatForumProps {
  user: EasyChatUser;
  contacts: EasyChatContact[];
  conversations: EasyChatConversation[];
  apiConfig: ApiConfig;
  onBack: () => void;
}

export function EasyChatForum({ user, contacts, conversations, apiConfig, onBack }: EasyChatForumProps) {
  // 状态管理
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [roles, setRoles] = useState<ForumRole[]>([]);
  const [currentRole, setCurrentRole] = useState<ForumRole | null>(null);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [postingRole, setPostingRole] = useState<ForumRole | null>(null); // 发帖时选择的角色
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState('');
  const [replyToComment, setReplyToComment] = useState<ForumComment | null>(null);
  const [commentingRoles, setCommentingRoles] = useState<Record<string, ForumRole>>({}); // 每个帖子的评论角色
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [sortMode, setSortMode] = useState<'latest' | 'hot'>('latest'); // 排序模式
  const [editingPostId, setEditingPostId] = useState<string | null>(null); // 正在编辑的帖子ID
  const [editContent, setEditContent] = useState(''); // 编辑内容
  const [isGenerating, setIsGenerating] = useState(false); // AI生成中

  // 初始化角色列表
  useEffect(() => {
    const userRole: ForumRole = {
      id: 'user',
      type: 'user',
      name: user.name,
      avatar: user.avatar
    };

    const contactRoles: ForumRole[] = contacts.map(contact => ({
      id: contact.id,
      type: 'contact',
      name: contact.name,
      avatar: contact.avatar
    }));

    const allRoles = [userRole, ...contactRoles];
    setRoles(allRoles);
    setCurrentRole(userRole); // 默认选中用户自己
  }, [user, contacts]);

  // 根据角色ID获取最新的角色信息（用于名字修改同步）
  const getLatestRoleInfo = (role: ForumRole): ForumRole => {
    if (role.type === 'user') {
      // 用户角色，返回最新的用户信息
      return {
        id: 'user',
        type: 'user',
        name: user.name,
        avatar: user.avatar
      };
    } else {
      // 联系人角色，从联系人列表中查找
      const contact = contacts.find(c => c.id === role.id);
      if (contact) {
        return {
          id: contact.id,
          type: 'contact',
          name: contact.name,
          avatar: contact.avatar
        };
      }
      // 如果联系人被删除，返回原始信息
      return role;
    }
  };

  // 从 IndexedDB 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedPosts = await load('easychat_forum_posts');
        const savedComments = await load('easychat_forum_comments');
        
        if (savedPosts) setPosts(savedPosts);
        if (savedComments) setComments(savedComments);
      } catch (error) {
        console.error('加载论坛数据失败:', error);
      }
    };

    loadData();
  }, []);

  // 保存帖子到 IndexedDB（防抖）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (posts.length > 0) {
        save('easychat_forum_posts', posts).catch(console.error);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [posts]);

  // 保存评论到 IndexedDB（防抖）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (comments.length > 0) {
        save('easychat_forum_comments', comments).catch(console.error);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [comments]);

  // 格式化时间
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
    
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 计算帖子热度分数
  const getPostScore = (post: ForumPost): number => {
    const now = Date.now();
    const ageHours = (now - post.createdAt) / (1000 * 60 * 60);
    
    // 基础分数：点赞数 * 2 + 评论数 * 3
    const baseScore = post.likeIds.length * 2 + post.commentIds.length * 3;
    
    // 时间衰减：48小时内权重1.0，之后每24小时衰减20%
    let timeDecay = 1.0;
    if (ageHours > 48) {
      const daysOld = (ageHours - 48) / 24;
      timeDecay = Math.pow(0.8, daysOld);
    }
    
    return baseScore * timeDecay;
  };

  // 获取排序后的帖子列表
  const getSortedPosts = (): ForumPost[] => {
    if (sortMode === 'latest') {
      return [...posts].sort((a, b) => b.createdAt - a.createdAt);
    } else {
      return [...posts].sort((a, b) => getPostScore(b) - getPostScore(a));
    }
  };

  // 获取热门帖子（用于热门讨论横条）
  const getHotPosts = (count: number = 3): ForumPost[] => {
    return [...posts]
      .sort((a, b) => getPostScore(b) - getPostScore(a))
      .slice(0, count);
  };

  // 打开发帖弹窗
  const handleOpenNewPost = () => {
    setShowNewPost(true);
    setPostingRole(currentRole || roles[0]); // 默认选择当前角色或第一个角色
  };

  // 发布帖子
  const handlePublishPost = () => {
    if (!newPostContent.trim() || !postingRole) return;

    const newPost: ForumPost = {
      id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      author: postingRole,
      content: newPostContent.trim(),
      createdAt: Date.now(),
      likeIds: [],
      commentIds: [],
      source: 'manual' // 手动发布的帖子
    };

    setPosts(prev => [newPost, ...prev]);
    setNewPostContent('');
    setShowNewPost(false);
    setCurrentRole(postingRole); // 更新当前角色为发帖使用的角色
  };

  // 编辑帖子
  const handleEditPost = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      setEditingPostId(postId);
      setEditContent(post.content);
    }
  };

  // 保存编辑
  const handleSaveEdit = (postId: string) => {
    if (!editContent.trim()) return;
    
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, content: editContent.trim() }
        : post
    ));
    
    setEditingPostId(null);
    setEditContent('');
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingPostId(null);
    setEditContent('');
  };

  // AI生成论坛帖子
  const handleAIGenerate = async () => {
    console.log('🚀 [论坛AI生成] 开始生成...');
    console.log('📊 [论坛AI生成] 联系人数量:', contacts.length);
    console.log('📊 [论坛AI生成] 对话数量:', conversations.length);
    console.log('📊 [论坛AI生成] API配置:', apiConfig);
    
    // 在EasyChat模式下，随机选择一个有对话记录的联系人
    const contactsWithConv = contacts.filter(contact => {
      return conversations.some(c => c.participants.includes(contact.id));
    });

    console.log('📊 [论坛AI生成] 有对话的联系人数量:', contactsWithConv.length);

    if (contactsWithConv.length === 0) {
      console.warn('⚠️ [论坛AI生成] 没有找到有对话记录的联系人');
      alert('没有找到有对话记录的联系人\n\n请先与联系人聊天，AI才能学习其语言风格');
      return;
    }

    // 随机选择一个联系人
    const randomContact = contactsWithConv[Math.floor(Math.random() * contactsWithConv.length)];
    console.log('👤 [论坛AI生成] 选择的联系人:', randomContact.name, randomContact.id);
    
    const conv = conversations.find(c => c.participants.includes(randomContact.id));
    console.log('💬 [论坛AI生成] 找到的对话:', conv ? `对话ID: ${conv.id}, 消息数: ${conv.messages?.length || 0}` : '未找到');

    if (!conv) {
      console.error('❌ [论坛AI生成] 找不到该角色的对话记录');
      alert('找不到该角色的对话记录');
      return;
    }

    setIsGenerating(true);
    console.log('⏳ [论坛AI生成] 开始调用API...');

    try {
      const result = await generateForumPost({
        roleId: randomContact.id,
        roleName: randomContact.name,
        personality: undefined, // EasyChat没有personality设置，使用默认值
        languageStyle: undefined, // EasyChat没有languageStyle设置，使用默认值
        conversations: conversations,
        apiConfig: apiConfig
      });

      console.log('📝 [论坛AI生成] API返回结果:', result);

      if (result.success && result.content) {
        // 创建AI生成的帖子
        const aiPost: ForumPost = {
          id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          author: {
            id: randomContact.id,
            type: 'contact',
            name: randomContact.name,
            avatar: randomContact.avatar
          },
          content: result.content,
          createdAt: Date.now(),
          likeIds: [],
          commentIds: [],
          source: 'ai',
          originalRoleId: randomContact.id,
          generationMeta: {
            fromConversations: conversations.filter(c => c.id.includes(randomContact.id)).map(c => c.id),
            createdByApi: apiConfig.modelName
          }
        };

        setPosts(prev => [aiPost, ...prev]);
        console.log('✅ [论坛AI生成] 帖子创建成功');
        
        alert(`✨ AI生成成功！\n\n角色：${randomContact.name}\n使用了 ${result.stats?.samplesUsed || 0} 条学习样本`);
      } else {
        console.error('❌ [论坛AI生成] 生成失败:', result.error);
        throw new Error(result.error || '生成失败');
      }
    } catch (error) {
      console.error('❌ [论坛AI生成] 发生错误:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      alert(`AI生成失败：${errorMessage}\n\n请检查：\n1. API配置是否正确\n2. 网络连接是否正常\n3. API额度是否充足\n\n详细错误请查看控制台`);
    } finally {
      setIsGenerating(false);
      console.log('🏁 [论坛AI生成] 结束');
    }
  };

  // 点赞
  const handleLike = (postId: string) => {
    if (!currentRole) return;
    
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const likeIds = post.likeIds.includes(currentRole.id)
          ? post.likeIds.filter(id => id !== currentRole.id)
          : [...post.likeIds, currentRole.id];
        return { ...post, likeIds };
      }
      return post;
    }));
  };

  // 获取或初始化帖子的评论角色
  const getCommentingRole = (postId: string): ForumRole => {
    if (commentingRoles[postId]) {
      return commentingRoles[postId];
    }
    // 默认使用当前角色或第一个角色
    return currentRole || roles[0];
  };

  // 设置帖子的评论角色
  const setCommentingRole = (postId: string, role: ForumRole) => {
    setCommentingRoles(prev => ({ ...prev, [postId]: role }));
    setCurrentRole(role); // 同步更新当前角色，用于点赞
  };

  // 发表评论
  const handleComment = (postId: string) => {
    const commentRole = getCommentingRole(postId);
    if (!commentContent.trim() || !commentRole) return;

    const newComment: ForumComment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      postId,
      author: commentRole,
      content: commentContent.trim(),
      createdAt: Date.now(),
      replyToCommentId: replyToComment?.id,
      replyToAuthorName: replyToComment?.author.name
    };

    setComments(prev => [...prev, newComment]);
    
    // 更新帖子的评论ID列表
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return { ...post, commentIds: [...post.commentIds, newComment.id] };
      }
      return post;
    }));

    setCommentContent('');
    setReplyToComment(null);
  };

  // 删除帖子
  const handleDeletePost = (postId: string) => {
    if (confirm('确定删除这条帖子吗？')) {
      setPosts(prev => prev.filter(post => post.id !== postId));
      setComments(prev => prev.filter(comment => comment.postId !== postId));
    }
  };

  // 删除评论
  const handleDeleteComment = (commentId: string, postId: string) => {
    if (confirm('确定删除这条评论吗？')) {
      setComments(prev => prev.filter(comment => comment.id !== commentId));
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return { ...post, commentIds: post.commentIds.filter(id => id !== commentId) };
        }
        return post;
      }));
    }
  };

  // 切换帖子展开/收起
  const togglePostExpanded = (postId: string) => {
    setExpandedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  // 获取帖子的评论
  const getPostComments = (postId: string) => {
    return comments.filter(comment => comment.postId === postId);
  };

  return (
    <div className="w-full h-full bg-gray-50 flex flex-col">
      {/* 顶部导航栏 */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-gray-800">论坛</h1>
          <div className="flex items-center gap-1">
            {/* AI生成按钮 */}
            <button
              onClick={handleAIGenerate}
              disabled={isGenerating}
              className={`p-2 hover:bg-purple-50 rounded-lg transition-colors ${
                isGenerating ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title="AI生成帖子"
            >
              {isGenerating ? (
                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Sparkles className="w-5 h-5 text-purple-500" />
              )}
            </button>
            {/* 新帖子按钮 */}
            <button
              onClick={handleOpenNewPost}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>

        {/* 排序切换 */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortMode('latest')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                sortMode === 'latest'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              最新
            </button>
            <button
              onClick={() => setSortMode('hot')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                sortMode === 'hot'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              🔥 热门
            </button>
          </div>
        </div>

        {/* 热门讨论横条 */}
        {posts.length > 0 && sortMode === 'latest' && (
          <div className="px-4 pb-3">
            <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-3 border border-orange-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-orange-600">🔥 热门讨论</span>
              </div>
              <div className="space-y-1.5">
                {getHotPosts(3).map((hotPost, index) => {
                  const latestAuthor = getLatestRoleInfo(hotPost.author);
                  const preview = hotPost.content.length > 30 
                    ? hotPost.content.slice(0, 30) + '...' 
                    : hotPost.content;
                  return (
                    <button
                      key={hotPost.id}
                      onClick={() => {
                        const postElement = document.getElementById(`post-${hotPost.id}`);
                        if (postElement) {
                          postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          if (!expandedPosts.has(hotPost.id)) {
                            togglePostExpanded(hotPost.id);
                          }
                        }
                      }}
                      className="w-full text-left hover:bg-white/50 rounded px-2 py-1 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-orange-500">#{index + 1}</span>
                        <span className="text-xs text-gray-600 flex-1">{latestAuthor.name}：{preview}</span>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Heart className="w-3 h-3" />
                          <span>{hotPost.likeIds.length}</span>
                          <MessageCircle className="w-3 h-3 ml-1" />
                          <span>{hotPost.commentIds.length}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 帖子列表 */}
      <div className="flex-1 overflow-y-auto">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MessageCircle className="w-16 h-16 mb-4" />
            <p className="text-sm">暂无帖子，点击右上角发布第一条</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {getSortedPosts().map((post, index) => {
              const postComments = getPostComments(post.id);
              const isExpanded = expandedPosts.has(post.id);
              const canDelete = post.author.id === currentRole?.id;
              const canEdit = post.source === 'ai'; // AI生成的帖子可编辑
              const latestAuthor = getLatestRoleInfo(post.author); // 获取最新的作者信息
              const isEditing = editingPostId === post.id;
              const isHot = sortMode === 'hot' && index < 3; // 热门模式下前3名

              return (
                <div key={post.id} id={`post-${post.id}`} className="bg-white rounded-xl p-4 shadow-sm relative">
                  {/* 帖子头部 */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {latestAuthor.avatar.startsWith('data:') ? (
                        <img src={latestAuthor.avatar} alt={latestAuthor.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-base">{latestAuthor.avatar}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium text-gray-800">{latestAuthor.name}</div>
                            <div className="text-xs text-gray-500">{formatTime(post.createdAt)}</div>
                          </div>
                          {/* AI 标记 */}
                          {post.source === 'ai' && (
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] rounded-full border border-purple-200">
                              AI 生成
                            </span>
                          )}
                          {/* 热门标记 */}
                          {isHot && (
                            <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-[10px] rounded-full border border-orange-200">
                              🔥 热门
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {/* 编辑按钮（仅AI帖子） */}
                          {canEdit && !isEditing && (
                            <button
                              onClick={() => handleEditPost(post.id)}
                              className="text-gray-400 hover:text-blue-500 transition-colors text-xs"
                            >
                              编辑
                            </button>
                          )}
                          {/* 删除按钮 */}
                          {(canDelete || canEdit) && (
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 帖子内容 */}
                  {isEditing ? (
                    <div className="mb-3">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows={4}
                        autoFocus
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleSaveEdit(post.id)}
                          className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                        >
                          保存
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-800 leading-relaxed mb-3 whitespace-pre-wrap">
                      {post.content}
                    </div>
                  )}

                  {/* 互动栏 */}
                  <div className="flex items-center gap-6 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-1.5 text-sm transition-colors ${
                        currentRole && post.likeIds.includes(currentRole.id) ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${currentRole && post.likeIds.includes(currentRole.id) ? 'fill-current' : ''}`} />
                      <span>{post.likeIds.length || '赞'}</span>
                    </button>
                    <button
                      onClick={() => {
                        if (commentingPostId === post.id) {
                          setCommentingPostId(null);
                        } else {
                          setCommentingPostId(post.id);
                          if (!isExpanded) togglePostExpanded(post.id);
                        }
                      }}
                      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-500 transition-colors"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span>{postComments.length || '评论'}</span>
                    </button>
                  </div>

                  {/* 评论区 */}
                  {postComments.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => togglePostExpanded(post.id)}
                        className="text-sm text-blue-500 hover:text-blue-600 mb-2"
                      >
                        {isExpanded ? '收起评论' : `展开 ${postComments.length} 条评论`}
                      </button>

                      {isExpanded && (
                        <div className="space-y-3">
                          {postComments.map(comment => {
                            const canDeleteComment = comment.author.id === currentRole?.id;
                            const latestCommentAuthor = getLatestRoleInfo(comment.author); // 获取最新的评论作者信息
                            
                            // 如果有回复对象，也获取其最新信息
                            let latestReplyToName = comment.replyToAuthorName;
                            if (comment.replyToCommentId) {
                              const replyToComment = comments.find(c => c.id === comment.replyToCommentId);
                              if (replyToComment) {
                                const latestReplyToAuthor = getLatestRoleInfo(replyToComment.author);
                                latestReplyToName = latestReplyToAuthor.name;
                              }
                            }

                            return (
                              <div key={comment.id} className="flex gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                                  {latestCommentAuthor.avatar.startsWith('data:') ? (
                                    <img src={latestCommentAuthor.avatar} alt={latestCommentAuthor.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-xs">{latestCommentAuthor.avatar}</span>
                                  )}
                                </div>
                                <div className="flex-1 bg-gray-50 rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-gray-800">{latestCommentAuthor.name}</span>
                                      {latestReplyToName && (
                                        <>
                                          <span className="text-xs text-gray-400">回复</span>
                                          <span className="text-sm font-medium text-blue-600">{latestReplyToName}</span>
                                        </>
                                      )}
                                    </div>
                                    {canDeleteComment && (
                                      <button
                                        onClick={() => handleDeleteComment(comment.id, post.id)}
                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-700 mb-1">{comment.content}</div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-400">{formatTime(comment.createdAt)}</span>
                                    <button
                                      onClick={() => {
                                        setReplyToComment(comment);
                                        setCommentingPostId(post.id);
                                      }}
                                      className="text-xs text-blue-500 hover:text-blue-600"
                                    >
                                      回复
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 评论输入框 */}
                  {commentingPostId === post.id && (() => {
                    const latestReplyToAuthor = replyToComment ? getLatestRoleInfo(replyToComment.author) : null;
                    
                    return (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        {replyToComment && latestReplyToAuthor && (
                          <div className="flex items-center justify-between bg-blue-50 px-3 py-2 rounded-t-lg text-sm mb-2">
                            <span className="text-blue-700">
                              回复 <span className="font-medium">{latestReplyToAuthor.name}</span>
                            </span>
                            <button
                              onClick={() => setReplyToComment(null)}
                              className="text-blue-500 hover:text-blue-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      <div className="flex gap-2 items-center">
                        {/* 角色选择下拉框 */}
                        <div className="relative flex-shrink-0">
                          <select
                            value={getCommentingRole(post.id).id}
                            onChange={(e) => {
                              const selectedRole = roles.find(r => r.id === e.target.value);
                              if (selectedRole) {
                                setCommentingRole(post.id, selectedRole);
                              }
                            }}
                            className="appearance-none pl-10 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-100 transition-colors cursor-pointer"
                          >
                            {roles.map(role => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                          {/* 头像显示 */}
                          <div className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center overflow-hidden pointer-events-none">
                            {(() => {
                              const role = getCommentingRole(post.id);
                              return role.avatar.startsWith('data:') ? (
                                <img src={role.avatar} alt={role.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xs">{role.avatar}</span>
                              );
                            })()}
                          </div>
                          {/* 下拉箭头 */}
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                        
                        <input
                          type="text"
                          value={commentContent}
                          onChange={(e) => setCommentContent(e.target.value)}
                          placeholder={replyToComment && latestReplyToAuthor ? `回复 ${latestReplyToAuthor.name}...` : '写评论...'}
                          className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleComment(post.id);
                            }
                          }}
                        />
                        <button
                          onClick={() => handleComment(post.id)}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 发帖弹窗 */}
      {showNewPost && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white w-full rounded-t-3xl p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">发布帖子</h2>
              <button
                onClick={() => {
                  setShowNewPost(false);
                  setNewPostContent('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 角色选择器 */}
            <div className="mb-4">
              <label className="text-sm text-gray-600 mb-2 block">选择发布身份</label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {roles.map(role => (
                  <button
                    key={role.id}
                    onClick={() => setPostingRole(role)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all flex-shrink-0 ${
                      postingRole?.id === role.id 
                        ? 'bg-blue-50 ring-2 ring-blue-500' 
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center overflow-hidden">
                      {role.avatar.startsWith('data:') ? (
                        <img src={role.avatar} alt={role.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg">{role.avatar}</span>
                      )}
                    </div>
                    <span className="text-xs font-medium text-gray-700">{role.name}</span>
                    {role.type === 'user' && (
                      <span className="text-[10px] text-gray-400">我</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="分享你的想法..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              rows={6}
              autoFocus
            />

            <button
              onClick={handlePublishPost}
              disabled={!newPostContent.trim()}
              className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              发布
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
