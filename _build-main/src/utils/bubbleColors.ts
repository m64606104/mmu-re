// 气泡颜色预设配置

export interface BubbleColorTheme {
  id: string;
  name: string;
  emoji: string;
  bgClass: string; // 背景色类名
  textClass: string; // 文字颜色类名
  preview: string; // 预览背景色（用于显示色块）
}

export const BUBBLE_COLOR_THEMES: BubbleColorTheme[] = [
  {
    id: 'blue',
    name: '经典蓝',
    emoji: '💙',
    bgClass: 'bg-[#1e90ff]',
    textClass: 'text-white',
    preview: '#1e90ff'
  },
  {
    id: 'yellow',
    name: '温馨黄',
    emoji: '💛',
    bgClass: 'bg-gradient-to-br from-yellow-400 to-orange-400',
    textClass: 'text-white',
    preview: 'linear-gradient(to bottom right, #facc15, #fb923c)'
  },
  {
    id: 'green',
    name: '清新绿',
    emoji: '💚',
    bgClass: 'bg-gradient-to-br from-green-400 to-emerald-500',
    textClass: 'text-white',
    preview: 'linear-gradient(to bottom right, #4ade80, #10b981)'
  },
  {
    id: 'purple',
    name: '梦幻紫',
    emoji: '💜',
    bgClass: 'bg-gradient-to-br from-purple-400 to-pink-400',
    textClass: 'text-white',
    preview: 'linear-gradient(to bottom right, #c084fc, #f472b6)'
  },
  {
    id: 'pink',
    name: '甜蜜粉',
    emoji: '💗',
    bgClass: 'bg-gradient-to-br from-pink-400 to-rose-400',
    textClass: 'text-white',
    preview: 'linear-gradient(to bottom right, #f472b6, #fb7185)'
  },
  {
    id: 'orange',
    name: '活力橙',
    emoji: '🧡',
    bgClass: 'bg-gradient-to-br from-orange-400 to-red-400',
    textClass: 'text-white',
    preview: 'linear-gradient(to bottom right, #fb923c, #f87171)'
  },
  {
    id: 'teal',
    name: '海洋青',
    emoji: '🩵',
    bgClass: 'bg-gradient-to-br from-teal-400 to-cyan-500',
    textClass: 'text-white',
    preview: 'linear-gradient(to bottom right, #2dd4bf, #06b6d4)'
  },
  {
    id: 'indigo',
    name: '深邃靛',
    emoji: '💙',
    bgClass: 'bg-gradient-to-br from-indigo-500 to-blue-600',
    textClass: 'text-white',
    preview: 'linear-gradient(to bottom right, #6366f1, #2563eb)'
  }
];

// 获取气泡颜色主题
export function getBubbleColorTheme(colorId?: string): BubbleColorTheme {
  if (!colorId) {
    return BUBBLE_COLOR_THEMES[0]; // 默认蓝色
  }
  return BUBBLE_COLOR_THEMES.find(theme => theme.id === colorId) || BUBBLE_COLOR_THEMES[0];
}
