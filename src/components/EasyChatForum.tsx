import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Heart, MessageCircle, Send, X, ChevronDown } from 'lucide-react';
import { EasyChatUser, EasyChatContact } from '../types';
import { load, save } from '../utils/storage';

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
  onBack: () => void;
}

export function EasyChatForum({ user, contacts, onBack }: EasyChatForumProps) {
  // 状态管理
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [roles, setRoles] = useState<ForumRole[]>([]);
  const [currentRole, setCurrentRole] = useState<ForumRole | null>(null);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState('');
  const [replyToComment, setReplyToComment] = useState<ForumComment | null>(null);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());

  const roleButtonRef = useRef<HTMLButtonElement>(null);

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

  // 发布帖子
  const handlePublishPost = () => {
    if (!newPostContent.trim() || !currentRole) return;

    const newPost: ForumPost = {
      id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      author: currentRole,
      content: newPostContent.trim(),
      createdAt: Date.now(),
      likeIds: [],
      commentIds: []
    };

    setPosts(prev => [newPost, ...prev]);
    setNewPostContent('');
    setShowNewPost(false);
  };

  // 点赞
  const handleLike = (postId: string) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const likeIds = post.likeIds.includes('user')
          ? post.likeIds.filter(id => id !== 'user')
          : [...post.likeIds, 'user'];
        return { ...post, likeIds };
      }
      return post;
    }));
  };

  // 发表评论
  const handleComment = (postId: string) => {
    if (!commentContent.trim() || !currentRole) return;

    const newComment: ForumComment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      postId,
      author: currentRole,
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
          <button
            onClick={() => setShowNewPost(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* 当前角色显示 */}
        <div className="px-4 pb-3">
          <div className="relative">
            <button
              ref={roleButtonRef}
              onClick={() => setShowRoleSelector(!showRoleSelector)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors w-full"
            >
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {currentRole && (currentRole.avatar.startsWith('data:') ? (
                  <img src={currentRole.avatar} alt={currentRole.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm">{currentRole.avatar}</span>
                ))}
              </div>
              <span className="text-sm text-gray-700 flex-1 text-left">
                当前身份：{currentRole?.name || '未选择'}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showRoleSelector ? 'rotate-180' : ''}`} />
            </button>

            {/* 角色选择下拉 */}
            {showRoleSelector && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowRoleSelector(false)}
                />
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-64 overflow-y-auto">
                  {roles.map(role => (
                    <button
                      key={role.id}
                      onClick={() => {
                        setCurrentRole(role);
                        setShowRoleSelector(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                        currentRole?.id === role.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {role.avatar.startsWith('data:') ? (
                          <img src={role.avatar} alt={role.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-base">{role.avatar}</span>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-gray-800">{role.name}</div>
                        <div className="text-xs text-gray-500">{role.type === 'user' ? '我' : '角色'}</div>
                      </div>
                      {currentRole?.id === role.id && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
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
            {posts.map(post => {
              const postComments = getPostComments(post.id);
              const isExpanded = expandedPosts.has(post.id);
              const canDelete = post.author.id === currentRole?.id;

              return (
                <div key={post.id} className="bg-white rounded-xl p-4 shadow-sm">
                  {/* 帖子头部 */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {post.author.avatar.startsWith('data:') ? (
                        <img src={post.author.avatar} alt={post.author.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-base">{post.author.avatar}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-800">{post.author.name}</div>
                          <div className="text-xs text-gray-500">{formatTime(post.createdAt)}</div>
                        </div>
                        {canDelete && (
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

                  {/* 帖子内容 */}
                  <div className="text-gray-800 leading-relaxed mb-3 whitespace-pre-wrap">
                    {post.content}
                  </div>

                  {/* 互动栏 */}
                  <div className="flex items-center gap-6 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-1.5 text-sm transition-colors ${
                        post.likeIds.includes('user') ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${post.likeIds.includes('user') ? 'fill-current' : ''}`} />
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
                            return (
                              <div key={comment.id} className="flex gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                                  {comment.author.avatar.startsWith('data:') ? (
                                    <img src={comment.author.avatar} alt={comment.author.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-xs">{comment.author.avatar}</span>
                                  )}
                                </div>
                                <div className="flex-1 bg-gray-50 rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-gray-800">{comment.author.name}</span>
                                      {comment.replyToAuthorName && (
                                        <>
                                          <span className="text-xs text-gray-400">回复</span>
                                          <span className="text-sm font-medium text-blue-600">{comment.replyToAuthorName}</span>
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
                  {commentingPostId === post.id && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      {replyToComment && (
                        <div className="flex items-center justify-between bg-blue-50 px-3 py-2 rounded-t-lg text-sm mb-2">
                          <span className="text-blue-700">
                            回复 <span className="font-medium">{replyToComment.author.name}</span>
                          </span>
                          <button
                            onClick={() => setReplyToComment(null)}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={commentContent}
                          onChange={(e) => setCommentContent(e.target.value)}
                          placeholder={replyToComment ? `回复 ${replyToComment.author.name}...` : '写评论...'}
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
                  )}
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

            {/* 当前身份提示 */}
            <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-blue-50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                {currentRole && (currentRole.avatar.startsWith('data:') ? (
                  <img src={currentRole.avatar} alt={currentRole.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm">{currentRole.avatar}</span>
                ))}
              </div>
              <span className="text-sm text-gray-700">
                以 <span className="font-medium text-blue-600">{currentRole?.name}</span> 的身份发布
              </span>
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
