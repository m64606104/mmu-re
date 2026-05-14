import type { Message } from '../../types';
import { messageRowShowsVoiceMenu } from '../../utils/voiceFavoriteStorage';

/** 与 ChatScreen 等宿主中的操作实现一一对应 */
export type MessageActionId =
  | 'quote'
  | 'favoriteVoiceCache'
  | 'favoriteVoiceBookmark'
  | 'forward'
  | 'edit'
  | 'multiSelect'
  | 'delete';

export type MessageActionItem = {
  id: MessageActionId;
  label: string;
  /** 危险操作：单独分区、红色强调 */
  tone?: 'default' | 'danger';
};

export type BuildMessageActionItemsContext = {
  /** 无转发能力时可隐藏（例如无其它会话） */
  showForward: boolean;
  /** 当前菜单锚点行 id（如拆条后的 `…_media_0`），用于判断是否为语音行 */
  menuAnchorRowId?: string | null;
};

/**
 * 纯策略：根据消息与上下文决定展示哪些操作（不含 DOM、不含副作用）。
 */
export function buildMessageActionItems(
  message: Message | undefined,
  ctx: BuildMessageActionItemsContext
): MessageActionItem[] {
  if (!message || message.role === 'system') return [];

  const items: MessageActionItem[] = [{ id: 'quote', label: '引用' }];

  if (messageRowShowsVoiceMenu(message, ctx.menuAnchorRowId)) {
    items.push(
      { id: 'favoriteVoiceCache', label: '缓存并收藏' },
      { id: 'favoriteVoiceBookmark', label: '仅收藏（每次重合成）' },
    );
  }

  if (ctx.showForward) {
    items.push({ id: 'forward', label: '转发' });
  }

  items.push(
    { id: 'edit', label: '编辑' },
    { id: 'multiSelect', label: '多选' }
  );

  items.push({ id: 'delete', label: '删除', tone: 'danger' });

  return items;
}
