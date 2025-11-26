import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Camera, Heart, MessageCircle, Send, Image as ImageIcon, MoreHorizontal, Trash2, Bell } from 'lucide-react';
import { MomentPost, UserProfile, Conversation, ApiConfig } from '../types';
import { getAllMomentPosts, likeMomentPost, commentMomentPost, deleteMomentPost, handleUserInteractionResponse } from '../utils/aiMomentsGenerator';
import { getUnreadNotificationCount } from '../utils/momentsNotificationManager';
import MomentsNotifications from './MomentsNotifications';
import ShareCard from './ShareCard';

interface MomentsScreenProps {
  moments: MomentPost[];
  conversations: Conversation[];
  userProfile: UserProfile;
  apiConfig: ApiConfig;
  onAddMoment: (content: string, images: string[]) => void;
  onLikeMoment: (momentId: string) => void;
  onCommentMoment: (momentId: string, content: string) => void;
  onBack: () => void;
}

export default function MomentsScreen({
  moments,
  conversations,
  userProfile,
  apiConfig,
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
  const [viewingImage, setViewingImage] = useState<{ url: string; index: number } | null>(null);
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());
  const [selectedComment, setSelectedComment] = useState<{ momentId: string; commentId: string } | null>(null);
  const [replyToComment, setReplyToComment] = useState<{ id: string; authorName: string } | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  // 朋友圈图片描述占位渲染开关（默认关闭）：纯文本就是文本，图片就显示真实图片
  const SHOW_IMAGE_DESCRIPTION_PLACEHOLDERS = false;

  // —— 按需(on-view)生图：最小接入 ——
  const momentRefs = useRef<Map<string, HTMLElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const scheduledRef = useRef<Map<string, number>>(new Map());
  const generatedRef = useRef<Set<string>>(new Set());
  const isGeneratingRef = useRef<boolean>(false);

  const registerMomentRef = (id: string, el: HTMLElement | null) => {
    if (el) {
      momentRefs.current.set(id, el);
      if (observerRef.current) observerRef.current.observe(el);
    } else {
      const prev = momentRefs.current.get(id);
      if (prev && observerRef.current) observerRef.current.unobserve(prev);
      momentRefs.current.delete(id);
    }
  };

  const getTodayKey = () => {
    const d = new Date();
    const mm = `${d.getMonth() + 1}`.padStart(2, '0');
    const dd = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  };

  const getDailyCount = () => {
    try {
      const key = `image_gen_moments_daily_${getTodayKey()}`;
      return parseInt(localStorage.getItem(key) || '0', 10) || 0;
    } catch { return 0; }
  };

  const getDailyLimit = () => {
    try {
      const raw = localStorage.getItem('image_gen_moments_daily_limit');
      const val = raw ? parseInt(raw, 10) : 10;
      return Number.isFinite(val) && val >= 0 ? val : 10;
    } catch {
      return 10;
    }
  };

  const incDailyCount = (delta: number = 1) => {
    try {
      const key = `image_gen_moments_daily_${getTodayKey()}`;
      const curr = getDailyCount();
      localStorage.setItem(key, String(curr + delta));
    } catch {}
  };

  const getImageGenConfig = () => ({
    apiUrl: localStorage.getItem('image_gen_api_url') || '',
    apiKey: localStorage.getItem('image_gen_api_key') || '',
    model: localStorage.getItem('image_gen_model') || ''
  });

  const buildImagesEndpoint = (base: string) => {
    let apiUrl = base.trim();
    if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);
    if (apiUrl.includes('openai.com') || apiUrl.includes('api.openai.com')) {
      return `${apiUrl}/v1/images/generations`;
    }
    if (!apiUrl.includes('/v1/')) return `${apiUrl}/v1/images/generations`;
    return apiUrl.endsWith('/images/generations') ? apiUrl : `${apiUrl}/images/generations`;
  };

  const persistMomentImages = async (authorId: string, momentId: string, urls: string[]) => {
    try {
      const momentsKey = 'moments_data';
      const stored = localStorage.getItem(momentsKey);
      if (!stored) return;
      const all = JSON.parse(stored);
      const bucket = all.find((d: any) => d.contactId === authorId);
      if (!bucket) return;
      const post = bucket.posts.find((p: any) => p.id === momentId);
      if (!post) return;
      post.images = Array.isArray(post.images) ? post.images : [];
      for (const u of urls) if (!post.images.includes(u)) post.images.push(u);
      localStorage.setItem(momentsKey, JSON.stringify(all));
      const updated = await getAllMomentPosts();
      setAiMoments(updated);
    } catch (e) {
      console.error('保存朋友圈图片失败:', e);
    }
  };

  const generateImageFromDescription = async (desc: string): Promise<string | null> => {
    const cfg = getImageGenConfig();
    if (!cfg.apiUrl || !cfg.apiKey || !cfg.model) return null;
    try {
      const endpoint = buildImagesEndpoint(cfg.apiUrl);
      const requestBody: any = {
        prompt: `${desc}\nrealistic photography, high quality, detailed lighting, natural colors, social media style`,
        model: cfg.model,
        n: 1
      };
      if (cfg.model.includes('dall-e')) {
        requestBody.size = '1024x1024';
        requestBody.quality = 'standard';
      } else if (cfg.model.includes('stable-diffusion') || cfg.model.includes('sd')) {
        requestBody.width = 1024;
        requestBody.height = 1024;
        requestBody.steps = 20;
        requestBody.cfg_scale = 7;
      } else {
        requestBody.size = '1024x1024';
      }
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.apiKey}` },
        body: JSON.stringify(requestBody)
      });
      if (!resp.ok) {
        console.error('朋友圈生图API失败:', await resp.text());
        return null;
      }
      const data = await resp.json();
      let imageUrl = '';
      if (data.data && data.data.length > 0) imageUrl = data.data[0].url || data.data[0].b64_json;
      else if (data.url) imageUrl = data.url;
      else if (data.images && data.images.length > 0) imageUrl = data.images[0];
      else if (data.image) imageUrl = data.image;
      else if (data.output && data.output.length > 0) imageUrl = data.output[0];
      if (!imageUrl) return null;
      if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:image/')) {
        const base = cfg.apiUrl.endsWith('/') ? cfg.apiUrl.slice(0, -1) : cfg.apiUrl;
        imageUrl = imageUrl.startsWith('/') ? `${base}${imageUrl}` : imageUrl;
      }
      return imageUrl;
    } catch (e) {
      console.error('朋友圈生图异常:', e);
      return null;
    }
  };

  const scheduleGenerateFor = (moment: any) => {
    const enabled = (localStorage.getItem('image_gen_moments_enabled') || 'false') === 'true';
    if (!enabled) return;
    if (!moment || !moment.authorId) return; // 仅AI朋友圈
    if (Array.isArray(moment.images) && moment.images.length > 0) return;
    if (!Array.isArray(moment.imageDescriptions) || moment.imageDescriptions.length === 0) return;
    if (getDailyCount() >= getDailyLimit()) return;
    if (generatedRef.current.has(moment.id)) return;

    // 去抖：进入视口后延迟1.2s
    if (!scheduledRef.current.has(moment.id)) {
      const timer = window.setTimeout(async () => {
        scheduledRef.current.delete(moment.id);
        if (isGeneratingRef.current) return; // 简单串行
        if (getDailyCount() >= getDailyLimit()) return;
        isGeneratingRef.current = true;
        try {
          const desc = String(moment.imageDescriptions[0] || '').slice(0, 500);
          const url = await generateImageFromDescription(desc);
          if (url) {
            incDailyCount(1);
            await persistMomentImages(moment.authorId, moment.id, [url]);
            generatedRef.current.add(moment.id);
          }
        } finally {
          isGeneratingRef.current = false;
        }
      }, 1200);
      scheduledRef.current.set(moment.id, timer);
    }
  };

  // moved below after allMoments definition

  // 加载未读通知数量
  useEffect(() => {
    const loadUnreadCount = async () => {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    };
    
    loadUnreadCount();
    
    // 每30秒刷新一次未读数量
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // 点击其他地方关闭评论菜单
  useEffect(() => {
    const handleClickOutside = () => {
      if (selectedComment) {
        setSelectedComment(null);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [selectedComment]);

  // 加载AI朋友圈并触发智能互动
  useEffect(() => {
    const loadAiMoments = async () => {
      try {
        const posts = await getAllMomentPosts();
        setAiMoments(posts);
        console.log(`🔄 朋友圈数据已更新，共${posts.length}条`);
      } catch (error) {
        console.error('加载AI朋友圈失败:', error);
      }
    };
    
    // 首次加载
    loadAiMoments();
    
    // 🎯 将刷新函数暴露到window，供AI互动后调用
    // @ts-ignore
    window.refreshMomentsScreen = () => {
      console.log('📲 收到刷新请求，重新加载朋友圈...');
      loadAiMoments();
    };
    
    // 🎯 触发AI智能互动（模拟用户打开朋友圈，AI们也在看）
    // @ts-ignore
    if (window.triggerAIMomentsInteraction) {
      // 随机延迟5-15秒，模拟AI不是立即看到
      const randomDelay = 5000 + Math.random() * 10000;
      const interactionTimer = setTimeout(() => {
        // @ts-ignore
        window.triggerAIMomentsInteraction?.();
      }, randomDelay);
      
      // 清理定时器
      return () => clearTimeout(interactionTimer);
    }
    
    // ⚠️ 不再自动刷新，改为手动刷新或由AI互动后触发刷新
    // 正常人浏览朋友圈不会每30秒刷一次，而是手动下拉刷新
    // 仅在有新内容时由AI互动触发刷新即可
    
    return () => {
      // @ts-ignore
      delete window.refreshMomentsScreen;
    };
  }, []);

  // 合并用户朋友圈和AI朋友圈
  const allMoments = [...moments, ...aiMoments].sort((a, b) => b.timestamp - a.timestamp);

  // 监听卡片进入视口，按需(on-view)触发生图调度
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // 查找对应的moment
          for (const m of allMoments) {
            const el = momentRefs.current.get(m.id);
            if (el === entry.target) {
              scheduleGenerateFor(m);
              break;
            }
          }
        }
      });
    }, { threshold: 0.35 });
    observerRef.current = io;
    // 绑定现有元素
    momentRefs.current.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [allMoments]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const readers = Array.from(files).map(file => {
        return new Promise<string>((resolve, reject) => {
          // 检查文件大小（限制5MB）
          if (file.size > 5 * 1024 * 1024) {
            alert(`图片 "${file.name}" 超过5MB，请选择更小的图片`);
            reject(new Error('File too large'));
            return;
          }
          
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => {
            alert(`图片 "${file.name}" 加载失败`);
            reject(new Error('Failed to read file'));
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(readers)
        .then(images => {
          setNewPostImages([...newPostImages, ...images].slice(0, 9));
        })
        .catch(error => {
          console.error('图片上传错误:', error);
        });
    }
  };

  const handlePublish = () => {
    if (newPostContent.trim() || newPostImages.length > 0) {
      onAddMoment(newPostContent, newPostImages);
      setNewPostContent('');
      setNewPostImages([]);
      setShowNewPost(false);
      
      // 🎯 用户发布朋友圈后，触发AI互动（事件驱动）
      setTimeout(() => {
        // @ts-ignore
        if (window.triggerAIMomentsInteraction) {
          console.log('📢 用户发布了新朋友圈，AI们正在查看...');
          // @ts-ignore
          window.triggerAIMomentsInteraction();
        }
      }, 5000 + Math.random() * 10000); // 5-15秒后AI看到
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
          content: commentContent,
          replyTo: replyToComment?.id,
          replyToName: replyToComment?.authorName
        });
        
        // 🔄 立即刷新朋友圈显示
        const updatedPosts = await getAllMomentPosts();
        setAiMoments(updatedPosts);
        console.log('💬 用户评论后刷新朋友圈');
        
        // 🎯 触发AI智能响应用户的评论
        const aiConversation = conversations.find(c => c.id === aiMoment.authorId);
        if (aiConversation) {
          // 朋友圈作者可能回复
          setTimeout(() => {
            handleUserInteractionResponse(
              aiConversation,
              aiMoment,
              'comment',
              commentContent,
              apiConfig
            );
          }, 2000 + Math.random() * 3000); // 2-5秒后响应，模拟真人
          
          // 💬 其他AI看到评论区有新评论，自主决定是否参与讨论
          setTimeout(() => {
            // @ts-ignore
            if (window.triggerAICommentSectionInteraction) {
              console.log('💬 用户评论后，其他AI正在查看评论区...');
              // @ts-ignore
              window.triggerAICommentSectionInteraction();
            }
          }, 5000 + Math.random() * 10000); // 5-15秒后，其他AI看到
        }
        
        // 重新加载AI朋友圈
        const posts = await getAllMomentPosts();
        setAiMoments(posts);
      } else {
        // 用户朋友圈评论
        onCommentMoment(momentId, commentContent);
      }
      setCommentContent('');
      setCommentingMomentId(null);
      setReplyToComment(null);
    }
  };

  // 点击评论显示菜单
  const handleCommentClick = (e: React.MouseEvent, momentId: string, commentId: string) => {
    e.stopPropagation(); // 阻止事件冒泡
    setSelectedComment({ momentId, commentId });
  };

  // 删除评论
  const handleDeleteComment = async (momentId: string, commentId: string) => {
    console.log(`🗑️ 尝试删除评论: momentId=${momentId}, commentId=${commentId}`);
    
    const aiMoment = aiMoments.find(m => m.id === momentId);
    if (!aiMoment) {
      console.error('❌ 未找到朋友圈:', momentId);
      setSelectedComment(null);
      return;
    }
    
    if (!aiMoment.authorId) {
      console.error('❌ 朋友圈缺少authorId:', aiMoment);
      setSelectedComment(null);
      return;
    }
    
    try {
      // 从 localStorage 删除评论
      const momentsKey = `moments_data`;
      const stored = localStorage.getItem(momentsKey);
      if (!stored) {
        console.error('❌ localStorage中没有朋友圈数据');
        setSelectedComment(null);
        return;
      }
      
      const allMomentsData = JSON.parse(stored);
      console.log('📊 当前朋友圈数据结构:', allMomentsData);
      
      const momentData = allMomentsData.find((d: any) => d.contactId === aiMoment.authorId);
      if (!momentData) {
        console.error('❌ 未找到对应的朋友圈数据:', aiMoment.authorId);
        setSelectedComment(null);
        return;
      }
      
      const post = momentData.posts.find((p: any) => p.id === momentId);
      if (!post) {
        console.error('❌ 未找到对应的朋友圈帖子:', momentId);
        setSelectedComment(null);
        return;
      }
      
      const commentsBefore = post.comments.length;
      post.comments = post.comments.filter((c: any) => c.id !== commentId);
      const commentsAfter = post.comments.length;
      
      console.log(`📊 评论数量变化: ${commentsBefore} -> ${commentsAfter}`);
      
      if (commentsBefore === commentsAfter) {
        console.warn('⚠️ 评论数量没有变化，可能评论ID不匹配');
        console.log('现有评论IDs:', post.comments.map((c: any) => c.id));
        console.log('要删除的评论ID:', commentId);
      }
      
      localStorage.setItem(momentsKey, JSON.stringify(allMomentsData));
      
      // 刷新显示
      const updatedPosts = await getAllMomentPosts();
      setAiMoments(updatedPosts);
      console.log('✅ 评论删除完成，界面已刷新');
      
    } catch (error) {
      console.error('❌ 删除评论失败:', error);
    }
    
    setSelectedComment(null);
  };

  // 回复评论
  const handleReplyComment = (momentId: string, comment: any) => {
    setReplyToComment({
      id: comment.id,
      authorName: comment.authorName || comment.username
    });
    setCommentingMomentId(momentId);
    setSelectedComment(null);
  };

  const handleLike = async (momentId: string) => {
    // 检查是否是AI朋友圈
    const aiMoment = aiMoments.find(m => m.id === momentId);
    if (aiMoment && aiMoment.authorId) {
      // AI朋友圈点赞
      await likeMomentPost(aiMoment.authorId, momentId, 'user');
      
      // 🎯 触发AI智能响应用户的点赞
      const aiConversation = conversations.find(c => c.id === aiMoment.authorId);
      if (aiConversation) {
        setTimeout(() => {
          handleUserInteractionResponse(
            aiConversation,
            aiMoment,
            'like',
            undefined,
            apiConfig
          );
        }, 3000 + Math.random() * 5000); // 3-8秒后响应，模拟真人
      }
      
      // 🔄 立即刷新朋友圈显示
      const updatedPosts2 = await getAllMomentPosts();
      setAiMoments(updatedPosts2);
      console.log('❤️ 用户点赞后刷新朋友圈');
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

    // 🔥 微信风格：1分钟内显示“刚刚”
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    
    // 🔥 今天：显示具体时间（如“13:09”）
    const today = new Date();
    const postDate = new Date(timestamp);
    if (postDate.toDateString() === today.toDateString()) {
      return postDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    
    // 🔥 昨天：显示“昨天”
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (postDate.toDateString() === yesterday.toDateString()) {
      return '昨天';
    }
    
    // 🔥 更早：显示月日（如“11月25日”）
    if (days < 7) {
      return postDate.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
    }
    
    // 🔥 超过一周：显示完整日期
    return postDate.toLocaleDateString('zh-CN');
  };

  return (
    <div className="h-full bg-[#EDEDED] flex flex-col overflow-x-hidden">
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
          <div className="flex items-center gap-2">
            {/* 通知按钮 */}
            <button
              onClick={() => setShowNotifications(true)}
              className="relative p-2 bg-black/30 rounded-full backdrop-blur-sm"
            >
              <Bell className="w-6 h-6 text-white" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowNewPost(true)}
              className="p-2 bg-black/30 rounded-full backdrop-blur-sm"
            >
              <Camera className="w-6 h-6 text-white" />
            </button>
          </div>
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
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {allMoments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Camera className="w-16 h-16 mb-4" />
            <p>还没有动态</p>
            <p className="text-sm mt-2">点击右上角相机发布第一条动态吧</p>
          </div>
        ) : (
          <div className="space-y-4 p-4 max-w-full">
            {allMoments.map((moment) => {
              // 动态获取最新的角色信息
              const authorInfo = getLatestAuthorInfo(moment);
              const username = authorInfo.name || '未知用户';
              const userAvatar = authorInfo.avatar;
              
              return (
              <div
                key={moment.id}
                ref={(el) => registerMomentRef(moment.id, el)}
                className="bg-white rounded-xl p-4 shadow-sm max-w-full overflow-hidden"
              >
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
                  <p className="text-gray-800 mb-3 leading-relaxed break-words whitespace-pre-wrap">{moment.content}</p>
                )}

                {/* Images (真实图片) */}
                {moment.images && moment.images.length > 0 && (
                  <div className={`grid mb-3 ${getImageGridClass(moment.images.length)}`}>
                    {moment.images.map((image, index) => (
                      <div 
                        key={index} 
                        onClick={() => setViewingImage({ url: image, index })}
                        className={`rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity ${getImageItemClass(moment.images!.length)}`}
                      >
                        {!imageLoadErrors.has(`${moment.id}-${index}`) ? (
                          <img 
                            src={image} 
                            alt="" 
                            className="w-full h-full object-cover"
                            onError={() => {
                              console.error('图片加载失败:', image);
                              setImageLoadErrors(prev => new Set(prev).add(`${moment.id}-${index}`));
                            }}
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-200">
                            <div className="text-center text-gray-400">
                              <ImageIcon className="w-8 h-8 mx-auto mb-1" />
                              <p className="text-xs">加载失败</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Image Descriptions (AI生成的图片描述 - 半透明灰色占位符) */}
                {SHOW_IMAGE_DESCRIPTION_PLACEHOLDERS && moment.imageDescriptions && moment.imageDescriptions.length > 0 && !(moment.images && moment.images.length > 0) && (
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

                {/* Music Share Card - 音乐分享卡片 */}
                {moment.musicInfo && (
                  <ShareCard
                    type="music"
                    title={moment.musicInfo.title}
                    artist={moment.musicInfo.artist}
                    coverUrl={moment.musicInfo.coverUrl}
                    onClick={() => {
                      // 可以添加点击后的播放逻辑
                      console.log('点击音乐:', moment.musicInfo);
                    }}
                  />
                )}

                {/* Link/Article Share Card - 链接/文章分享卡片 */}
                {moment.linkInfo && (
                  <ShareCard
                    type={moment.contentType === 'link' ? 'link' : 'article'}
                    title={moment.linkInfo.title}
                    description={moment.linkInfo.description}
                    coverUrl={moment.linkInfo.coverUrl}
                    onClick={() => {
                      // 可以添加点击后打开链接的逻辑
                      if (moment.linkInfo?.url) {
                        window.open(moment.linkInfo.url, '_blank');
                      }
                      console.log('点击链接/文章:', moment.linkInfo);
                    }}
                  />
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

                {/* 点赞和评论区 - 仿微信朋友圈样式 */}
                {(moment.likes.length > 0 || moment.comments.length > 0) && (
                  <div className="mt-3 bg-gray-50 rounded-md p-3 space-y-2">
                    {/* 点赞列表 */}
                    {moment.likes.length > 0 && (
                      <div className="flex items-start gap-1.5 text-sm">
                        <Heart className="w-4 h-4 text-red-500 fill-current flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <span className="text-gray-700">
                            {moment.likes.map((likeId, index) => {
                              // 获取点赞者名称
                              let likeName = '';
                              if (likeId === 'user') {
                                likeName = userProfile.username;
                              } else {
                                const likeConv = conversations.find(c => c.id === likeId);
                                likeName = likeConv?.characterSettings?.nickname || likeConv?.name || '未知';
                              }
                              
                              return (
                                <span key={likeId}>
                                  <span className="text-blue-600 font-medium">{likeName}</span>
                                  {index < moment.likes.length - 1 && <span className="text-gray-400">、</span>}
                                </span>
                              );
                            })}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* 分隔线 */}
                    {moment.likes.length > 0 && moment.comments.length > 0 && (
                      <div className="border-t border-gray-200" />
                    )}
                    
                    {/* 评论列表 */}
                    {moment.comments.length > 0 && (
                      <div className="space-y-1">
                        {moment.comments.map((comment) => {
                          const commentUsername = comment.authorName || comment.username || '未知用户';
                          const replyToName = comment.replyToName || comment.replyToUsername;
                          const isSelected = selectedComment?.momentId === moment.id && selectedComment?.commentId === comment.id;
                          
                          return (
                            <div key={comment.id} className="relative">
                              <div 
                                onClick={(e) => handleCommentClick(e, moment.id, comment.id)}
                                className="text-sm leading-relaxed cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5 transition-colors"
                              >
                                <span className="text-blue-600 font-medium">{commentUsername}</span>
                                {replyToName && (
                                  <>
                                    <span className="text-gray-500"> 回复 </span>
                                    <span className="text-blue-600 font-medium">{replyToName}</span>
                                  </>
                                )}
                                <span className="text-gray-700">: {comment.content}</span>
                              </div>
                              
                              {/* 评论操作菜单 */}
                              {isSelected && (
                                <div 
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-10 min-w-[120px]"
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReplyComment(moment.id, comment);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                                  >
                                    💬 回复
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteComment(moment.id, comment.id);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                                  >
                                    🗑️ 删除
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Comment Input */}
                {commentingMomentId === moment.id && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    {replyToComment && (
                      <div className="flex items-center justify-between bg-blue-50 px-3 py-2 rounded-t-lg text-sm">
                        <span className="text-blue-700">
                          回复 <span className="font-medium">{replyToComment.authorName}</span>
                        </span>
                        <button
                          onClick={() => setReplyToComment(null)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={commentContent}
                        onChange={(e) => setCommentContent(e.target.value)}
                        placeholder={replyToComment ? `回复 ${replyToComment.authorName}...` : "写评论..."}
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

      {/* Image Description Viewer Modal (AI图片描述) */}
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

      {/* Image Viewer Modal (用户真实图片大图查看) */}
      {viewingImage && (
        <div 
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-50"
          onClick={() => setViewingImage(null)}
        >
          <button
            onClick={() => setViewingImage(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 z-10"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img 
            src={viewingImage.url} 
            alt="" 
            className="max-w-[90%] max-h-[90%] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* 朋友圈通知面板 */}
      {showNotifications && (
        <MomentsNotifications
          onClose={async () => {
            setShowNotifications(false);
            // 刷新未读数量
            const count = await getUnreadNotificationCount();
            setUnreadCount(count);
          }}
          onNavigateToPost={(postId, commentId) => {
            // 找到对应的帖子并滚动到评论位置
            // 这里可以添加滚动逻辑，暂时先关闭通知面板
            console.log('跳转到帖子:', postId, '评论:', commentId);
            // TODO: 实现滚动到指定帖子和评论的逻辑
          }}
        />
      )}
    </div>
  );
}
