import { useState, useMemo } from 'react';
import { Search, Calendar, Image as ImageIcon, FileText, Music, MapPin, Sparkles, Gift } from 'lucide-react';
import { Conversation, Message } from '../types';

interface ChatSearchModalProps {
  conversation: Conversation;
  onClose: () => void;
  onMessageClick: (messageId: string) => void;
}

type SearchCategory = 'all' | 'date' | 'image' | 'file' | 'link' | 'voice' | 'trade' | 'location' | 'note' | 'gift' | 'applet' | 'video' | 'card';

const ChatSearchModal: React.FC<ChatSearchModalProps> = ({ conversation, onClose, onMessageClick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');

  // 搜索分类配置（参考微信）
  const categories = [
    { key: 'date' as SearchCategory, label: '日期', icon: Calendar },
    { key: 'image' as SearchCategory, label: '图片与视频', icon: ImageIcon },
    { key: 'file' as SearchCategory, label: '文件', icon: FileText },
    { key: 'link' as SearchCategory, label: '链接', icon: Sparkles },
    { key: 'voice' as SearchCategory, label: '音乐与音频', icon: Music },
    { key: 'trade' as SearchCategory, label: '交易', icon: Gift },
    { key: 'location' as SearchCategory, label: '位置', icon: MapPin },
    { key: 'note' as SearchCategory, label: '笔记', icon: FileText },
    { key: 'gift' as SearchCategory, label: '礼物', icon: Gift },
  ];

  // 过滤和搜索消息
  const filteredMessages = useMemo(() => {
    let messages = conversation.messages;

    // 🚫 首先过滤掉系统消息
    messages = messages.filter(msg => msg.role !== 'system');

    // 根据分类筛选
    if (activeCategory !== 'all') {
      messages = messages.filter(msg => {
        switch (activeCategory) {
          case 'image':
            // 只显示AI发送的图片和视频
            return msg.role === 'assistant' && (msg.mediaType === 'image' || msg.mediaType === 'video');
          case 'video':
            // 只显示AI发送的视频
            return msg.role === 'assistant' && msg.mediaType === 'video';
          case 'file':
            // 只显示AI发送的文档
            return msg.role === 'assistant' && msg.document;
          case 'voice':
            // 只显示AI发送的语音
            return msg.role === 'assistant' && msg.mediaType === 'voice';
          case 'link':
            // 只显示AI发送的链接
            return msg.role === 'assistant' && (msg.linkPreview || msg.content.includes('http://') || msg.content.includes('https://'));
          case 'trade':
            // 显示所有交易（AI和用户都可能发起）
            return msg.moneyTransfer;
          case 'gift':
            // 显示所有礼物（AI和用户都可能发起）
            return msg.order;
          case 'date':
            // 日期分类：显示所有非系统消息（已在上面过滤）
            return true;
          case 'location':
            // 位置分类：检查消息内容是否包含位置信息
            return msg.content && (
              msg.content.includes('位置') ||
              msg.content.includes('地址') ||
              msg.content.includes('在') ||
              /[\u4e00-\u9fa5]+[省市区县街道路]\d*号?/.test(msg.content)
            );
          case 'note':
            // 笔记分类：显示较长的文本消息
            return msg.content && msg.content.length > 100 && !msg.mediaType && !msg.document;
          default:
            return true;
        }
      });
    }

    // 文本搜索
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      messages = messages.filter(msg => {
        // 搜索文本内容
        if (msg.content.toLowerCase().includes(query)) return true;
        // 搜索文档标题
        if (msg.document?.title.toLowerCase().includes(query)) return true;
        // 搜索图片/视频描述
        if (msg.mediaDescription?.toLowerCase().includes(query)) return true;
        // 搜索转账/红包备注
        if (msg.moneyTransfer?.message?.toLowerCase().includes(query)) return true;
        return false;
      });
    }

    return messages;
  }, [conversation.messages, activeCategory, searchQuery]);

  // 格式化消息预览
  const getMessagePreview = (message: Message): string => {
    if (message.mediaType === 'image') return '[图片]';
    if (message.mediaType === 'video') return '[视频]';
    if (message.mediaType === 'voice') return '[语音]';
    if (message.mediaType === 'sticker') return '[表情]';
    if (message.document) return `[文档] ${message.document.title}`;
    if (message.moneyTransfer) {
      const type = message.moneyTransfer.type === 'redPacket' ? '红包' : '转账';
      return `[${type}] ¥${message.moneyTransfer.amount}`;
    }
    if (message.order) return `[订单] ${message.order.products.map(p => p.name).join('、')}`;
    if (message.linkPreview) return `[链接] ${message.linkPreview.title}`;
    return message.content.length > 50 ? message.content.substring(0, 50) + '...' : message.content;
  };

  // 格式化时间
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString();

    if (isToday) {
      return `今天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (isYesterday) {
      return `昨天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return `${date.getMonth() + 1}月${date.getDate()}日 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white w-full h-full flex flex-col">
        {/* 搜索头部 */}
        <div className="bg-gray-50 px-4 py-3 flex items-center gap-3 border-b">
          <div className="flex-1 flex items-center gap-2 bg-white rounded-lg px-3 py-2">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索"
              className="flex-1 bg-transparent outline-none text-sm"
              autoFocus
            />
          </div>
          <button
            onClick={onClose}
            className="text-blue-500 text-sm font-medium"
          >
            取消
          </button>
        </div>

        {/* 快速搜索分类 */}
        <div className="bg-white px-4 py-3">
          <div className="text-xs text-gray-500 mb-2">快速搜索聊天内容</div>
          <div className="grid grid-cols-3 gap-3">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = activeCategory === category.key;
              return (
                <button
                  key={category.key}
                  onClick={() => setActiveCategory(isActive ? 'all' : category.key)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors ${
                    isActive ? 'bg-blue-50 text-blue-500' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs">{category.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 搜索结果 */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Search className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-sm">
                {searchQuery ? '没有找到相关消息' : '请输入关键词搜索'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredMessages.map((message) => (
                <button
                  key={message.id}
                  onClick={() => {
                    onMessageClick(message.id);
                    // 不在这里调用onClose()，由父组件的onMessageClick处理
                  }}
                  className="w-full px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-start gap-3">
                    {/* 头像 */}
                    <div className="w-10 h-10 rounded-lg bg-gray-200 flex-shrink-0 flex items-center justify-center text-lg">
                      {message.role === 'user' ? '👤' : '🤖'}
                    </div>

                    {/* 消息内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {message.role === 'user' ? '我' : conversation.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {getMessagePreview(message)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatSearchModal;
