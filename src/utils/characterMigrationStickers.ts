import type { StickerItem } from '../types/sticker';
import type { Sticker } from './stickerStore';
import { stickerStore } from './stickerStore';
import { getCharacterStickers } from './stickerStorage';
import { addData, STORES } from './indexedDBHelper';

export type CharacterStickerMigrationBundle = {
  /** 主聊天 WeChatSimulator（characterStickers） */
  wechatSimulatorCharacterStickers: StickerItem[];
  /** EasyChat 库（EasyChatDB stickers，按角色） */
  easyChatCharacterStickers: Sticker[];
};

function newLocalId(suffix: number): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}_${suffix}`;
}

/** 导出：该会话在两套表情库存下的角色专属表情 */
export async function exportCharacterStickerBundle(characterId: string): Promise<CharacterStickerMigrationBundle> {
  const [wechatSimulatorCharacterStickers, lib] = await Promise.all([
    getCharacterStickers(characterId),
    stickerStore.getLibrary(),
  ]);
  const easyChatCharacterStickers = lib.character[characterId] ? [...lib.character[characterId]] : [];
  return { wechatSimulatorCharacterStickers, easyChatCharacterStickers };
}

export type CharacterStickerImportPayload = Partial<CharacterStickerMigrationBundle> | undefined;

/**
 * 导入：写入新会话 ID，生成新主键，避免与现有表情冲突。
 */
export async function importCharacterStickerBundle(
  newConversationId: string,
  payload: CharacterStickerImportPayload
): Promise<{ wechatCount: number; easyChatCount: number }> {
  let wechatCount = 0;
  let easyChatCount = 0;

  for (const s of payload?.wechatSimulatorCharacterStickers ?? []) {
    try {
      const id = newLocalId(wechatCount);
      await addData(STORES.CHARACTER_STICKERS, {
        ...s,
        id,
        characterId: newConversationId,
        scope: 'character' as const,
        updatedAt: Date.now(),
      });
      wechatCount++;
    } catch (e) {
      console.warn('[角色迁移] 写入 WeChatSimulator 表情跳过:', e);
    }
  }

  for (const s of payload?.easyChatCharacterStickers ?? []) {
    try {
      await stickerStore.addSticker('character', s.url, newConversationId);
      easyChatCount++;
    } catch (e) {
      console.warn('[角色迁移] 写入 EasyChat 表情跳过:', e);
    }
  }

  return { wechatCount, easyChatCount };
}
