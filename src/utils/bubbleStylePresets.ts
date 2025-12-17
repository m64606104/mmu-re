// 气泡样式预设库

export interface BubbleStylePreset {
  id: string;
  name: string;
  description: string;
  category: '渐变' | '纯色' | '霓虹' | '简约' | '3D' | '特殊';
  css: string;
  preview: {
    userBg: string;
    aiBg: string;
  };
}

export const bubbleStylePresets: BubbleStylePreset[] = [
  {
    id: 'gradient-glass',
    name: '渐变玻璃',
    description: '蓝紫渐变玻璃质感，现代时尚',
    category: '渐变',
    css: `/* 用户消息 - 蓝紫渐变玻璃 */
.message-bubble.user {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.9), rgba(168, 85, 247, 0.9)) !important;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(99, 102, 241, 0.3);
}

/* AI消息 - 白色玻璃 */
.message-bubble.ai {
  background: rgba(255, 255, 255, 0.85) !important;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}`,
    preview: {
      userBg: 'linear-gradient(135deg, rgba(99, 102, 241, 0.9), rgba(168, 85, 247, 0.9))',
      aiBg: 'rgba(255, 255, 255, 0.85)'
    }
  },
  {
    id: 'cute-pink',
    name: '可爱粉色',
    description: '甜美粉色系，温柔浪漫',
    category: '纯色',
    css: `/* 用户消息 - 粉色渐变 */
.message-bubble.user {
  background: linear-gradient(135deg, #FFB6C1, #FF69B4) !important;
  border: none;
  box-shadow: 0 4px 15px rgba(255, 105, 180, 0.3);
}

/* AI消息 - 奶白色 */
.message-bubble.ai {
  background: #FFF5F7 !important;
  border: 2px solid #FFE4E9;
  box-shadow: 0 2px 10px rgba(255, 182, 193, 0.2);
}

.message-content {
  color: #333 !important;
}`,
    preview: {
      userBg: 'linear-gradient(135deg, #FFB6C1, #FF69B4)',
      aiBg: '#FFF5F7'
    }
  },
  {
    id: 'dark-neon',
    name: '深色霓虹',
    description: '赛博朋克风格，炫酷霓虹',
    category: '霓虹',
    css: `/* 用户消息 - 青色霓虹 */
.message-bubble.user {
  background: linear-gradient(135deg, #0F172A, #1E293B) !important;
  border: 2px solid #06B6D4;
  box-shadow: 0 0 20px rgba(6, 182, 212, 0.5), inset 0 0 10px rgba(6, 182, 212, 0.2);
}

/* AI消息 - 紫色霓虹 */
.message-bubble.ai {
  background: linear-gradient(135deg, #1E1B4B, #312E81) !important;
  border: 2px solid #A78BFA;
  box-shadow: 0 0 20px rgba(167, 139, 250, 0.4), inset 0 0 10px rgba(167, 139, 250, 0.2);
}

.message-content {
  color: #E0E7FF !important;
}`,
    preview: {
      userBg: 'linear-gradient(135deg, #0F172A, #1E293B)',
      aiBg: 'linear-gradient(135deg, #1E1B4B, #312E81)'
    }
  },
  {
    id: 'minimal-outline',
    name: '简约线框',
    description: '极简线框设计，清爽干净',
    category: '简约',
    css: `/* 用户消息 - 蓝色线框 */
.message-bubble.user {
  background: transparent !important;
  border: 2px solid #3B82F6;
  box-shadow: none;
}

.message-bubble.user .message-content {
  color: #1E40AF !important;
}

/* AI消息 - 灰色线框 */
.message-bubble.ai {
  background: transparent !important;
  border: 2px solid #9CA3AF;
  box-shadow: none;
}

.message-bubble.ai .message-content {
  color: #374151 !important;
}`,
    preview: {
      userBg: 'transparent',
      aiBg: 'transparent'
    }
  },
  {
    id: 'warm-orange',
    name: '温暖橙黄',
    description: '温暖橙黄色调，活力阳光',
    category: '纯色',
    css: `/* 用户消息 - 橙色渐变 */
.message-bubble.user {
  background: linear-gradient(135deg, #F59E0B, #F97316) !important;
  border: none;
  box-shadow: 0 4px 15px rgba(249, 115, 22, 0.3);
}

/* AI消息 - 米黄色 */
.message-bubble.ai {
  background: #FFFBEB !important;
  border: 2px solid #FDE68A;
  box-shadow: 0 2px 10px rgba(251, 191, 36, 0.15);
}

.message-content {
  color: #78350F !important;
}`,
    preview: {
      userBg: 'linear-gradient(135deg, #F59E0B, #F97316)',
      aiBg: '#FFFBEB'
    }
  },
  {
    id: 'fresh-green',
    name: '清新绿色',
    description: '清新自然绿色，生机盎然',
    category: '纯色',
    css: `/* 用户消息 - 绿色渐变 */
.message-bubble.user {
  background: linear-gradient(135deg, #10B981, #059669) !important;
  border: none;
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
}

/* AI消息 - 浅绿色 */
.message-bubble.ai {
  background: #F0FDF4 !important;
  border: 2px solid #BBF7D0;
  box-shadow: 0 2px 10px rgba(134, 239, 172, 0.2);
}

.message-content {
  color: #14532D !important;
}`,
    preview: {
      userBg: 'linear-gradient(135deg, #10B981, #059669)',
      aiBg: '#F0FDF4'
    }
  },
  {
    id: '3d-effect',
    name: '3D立体',
    description: '立体浮雕效果，层次分明',
    category: '3D',
    css: `/* 用户消息 - 立体蓝色 */
.message-bubble.user {
  background: linear-gradient(145deg, #60A5FA, #3B82F6) !important;
  border: none;
  box-shadow: 
    5px 5px 15px rgba(59, 130, 246, 0.4),
    -2px -2px 10px rgba(147, 197, 253, 0.3),
    inset 2px 2px 5px rgba(255, 255, 255, 0.2);
}

/* AI消息 - 立体白色 */
.message-bubble.ai {
  background: linear-gradient(145deg, #FFFFFF, #F3F4F6) !important;
  border: none;
  box-shadow: 
    5px 5px 15px rgba(0, 0, 0, 0.1),
    -2px -2px 10px rgba(255, 255, 255, 0.8),
    inset 2px 2px 5px rgba(0, 0, 0, 0.05);
}`,
    preview: {
      userBg: 'linear-gradient(145deg, #60A5FA, #3B82F6)',
      aiBg: 'linear-gradient(145deg, #FFFFFF, #F3F4F6)'
    }
  },
  {
    id: 'minimal-bw',
    name: '极简黑白',
    description: '纯粹黑白配色，经典永恒',
    category: '简约',
    css: `/* 用户消息 - 纯黑 */
.message-bubble.user {
  background: #000000 !important;
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.message-bubble.user .message-content {
  color: #FFFFFF !important;
}

/* AI消息 - 纯白 */
.message-bubble.ai {
  background: #FFFFFF !important;
  border: 1px solid #E5E7EB;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.message-bubble.ai .message-content {
  color: #000000 !important;
}`,
    preview: {
      userBg: '#000000',
      aiBg: '#FFFFFF'
    }
  },
  {
    id: 'wechat-classic',
    name: '微信经典',
    description: '仿微信原版配色，熟悉亲切',
    category: '特殊',
    css: `/* 用户消息 - 微信绿 */
.message-bubble.user {
  background: #95EC69 !important;
  border: none;
  box-shadow: 0 2px 6px rgba(149, 236, 105, 0.3);
}

.message-bubble.user .message-content {
  color: #000000 !important;
}

/* AI消息 - 白色 */
.message-bubble.ai {
  background: #FFFFFF !important;
  border: none;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.message-bubble.ai .message-content {
  color: #000000 !important;
}`,
    preview: {
      userBg: '#95EC69',
      aiBg: '#FFFFFF'
    }
  },
  {
    id: 'purple-dream',
    name: '紫色梦幻',
    description: '梦幻紫色渐变，神秘优雅',
    category: '渐变',
    css: `/* 用户消息 - 紫色渐变 */
.message-bubble.user {
  background: linear-gradient(135deg, #A78BFA, #8B5CF6) !important;
  border: none;
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
}

/* AI消息 - 淡紫色 */
.message-bubble.ai {
  background: #FAF5FF !important;
  border: 2px solid #E9D5FF;
  box-shadow: 0 2px 10px rgba(167, 139, 250, 0.2);
}

.message-content {
  color: #4C1D95 !important;
}`,
    preview: {
      userBg: 'linear-gradient(135deg, #A78BFA, #8B5CF6)',
      aiBg: '#FAF5FF'
    }
  },
  {
    id: 'ocean-blue',
    name: '海洋蓝',
    description: '深邃海洋蓝，沉稳大气',
    category: '渐变',
    css: `/* 用户消息 - 海洋蓝渐变 */
.message-bubble.user {
  background: linear-gradient(135deg, #0EA5E9, #0284C7) !important;
  border: none;
  box-shadow: 0 4px 15px rgba(14, 165, 233, 0.3);
}

/* AI消息 - 浅蓝色 */
.message-bubble.ai {
  background: #F0F9FF !important;
  border: 2px solid #BAE6FD;
  box-shadow: 0 2px 10px rgba(56, 189, 248, 0.2);
}

.message-content {
  color: #0C4A6E !important;
}`,
    preview: {
      userBg: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
      aiBg: '#F0F9FF'
    }
  },
  {
    id: 'sunset-glow',
    name: '落日余晖',
    description: '温暖日落色调，浪漫温馨',
    category: '渐变',
    css: `/* 用户消息 - 日落渐变 */
.message-bubble.user {
  background: linear-gradient(135deg, #F472B6, #FB923C) !important;
  border: none;
  box-shadow: 0 4px 15px rgba(251, 146, 60, 0.3);
}

/* AI消息 - 淡橙粉 */
.message-bubble.ai {
  background: #FFF7ED !important;
  border: 2px solid #FED7AA;
  box-shadow: 0 2px 10px rgba(251, 146, 60, 0.15);
}

.message-content {
  color: #7C2D12 !important;
}`,
    preview: {
      userBg: 'linear-gradient(135deg, #F472B6, #FB923C)',
      aiBg: '#FFF7ED'
    }
  }
];

// 按分类获取预设
export const getPresetsByCategory = (category: BubbleStylePreset['category']) => {
  return bubbleStylePresets.filter(preset => preset.category === category);
};

// 获取所有分类
export const getAllCategories = (): BubbleStylePreset['category'][] => {
  return ['渐变', '纯色', '霓虹', '简约', '3D', '特殊'];
};

// 根据ID获取预设
export const getPresetById = (id: string) => {
  return bubbleStylePresets.find(preset => preset.id === id);
};
