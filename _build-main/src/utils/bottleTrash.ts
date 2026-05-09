/**
 * 漂流瓶垃圾系统
 * 当AI生成失败时，返回"垃圾"而非简略内容
 */

export interface BottleTrash {
  id: string;
  type: 'trash';
  trashType: 'boot' | 'fish' | 'seaweed' | 'plastic' | 'can';
  name: string;
  description: string;
  emoji: string;
}

const TRASH_ITEMS: Omit<BottleTrash, 'id'>[] = [
  {
    type: 'trash',
    trashType: 'boot',
    name: '破靴子',
    description: '捞到了一只破旧的靴子，看起来在海里泡了很久...',
    emoji: '👢'
  },
  {
    type: 'trash',
    trashType: 'fish',
    name: '臭鱼烂虾',
    description: '捞到了一些臭鱼烂虾，散发着难闻的气味...',
    emoji: '🐟'
  },
  {
    type: 'trash',
    trashType: 'seaweed',
    name: '海藻杂草',
    description: '捞到了一堆缠绕的海藻和杂草，黏糊糊的...',
    emoji: '🌿'
  },
  {
    type: 'trash',
    trashType: 'plastic',
    name: '塑料垃圾',
    description: '捞到了一些塑料瓶和包装袋，海洋污染真严重...',
    emoji: '🗑️'
  },
  {
    type: 'trash',
    trashType: 'can',
    name: '生锈铁罐',
    description: '捞到了一个生锈的铁罐，上面的标签已经看不清了...',
    emoji: '🥫'
  }
];

/**
 * 生成随机垃圾
 */
export function generateBottleTrash(): BottleTrash {
  const trash = TRASH_ITEMS[Math.floor(Math.random() * TRASH_ITEMS.length)];
  return {
    ...trash,
    id: `trash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
}

/**
 * 获取丢弃垃圾的感谢消息
 */
export function getTrashDisposeMessage(): string {
  const messages = [
    '🌊 感谢你净化大海！你的环保行为让海洋更美丽',
    '♻️ 谢谢你清理海洋垃圾！地球因你而更好',
    '🐋 海洋生物向你致谢！你让它们的家园更干净',
    '🌍 你为保护环境做出了贡献！继续加油',
    '✨ 每一次清理都很重要！感谢你的环保意识'
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}
