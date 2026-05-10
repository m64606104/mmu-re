/**
 * 聊天语音收藏：
 * - 缓存并收藏：尽量把音频写入 IndexedDB，收藏列表里每次播放同一段；
 * - 仅收藏：不存音频字节；助手「仅描述」类语音在收藏列表里每次播放重新走 MiniMax（与聊天一致）。
 */

import type { ApiConfig, CharacterTtsSettings, Conversation, Message } from '../types';
import { STORES, updateData, deleteData, getDataByIndex } from './indexedDBHelper';
import { stripDisplayControlTags } from './messageFormatter';
import {
  isCharacterTtsVoiceConfigured,
  isMinimaxTtsReady,
  plainTextForMinimaxTts,
} from './minimaxTts';
import { stripTrailingVoiceTranscriptArtifacts } from './voiceDurationCalculator';

const STORE = STORES.VOICE_FAVORITES;

export type VoiceFavoriteSaveMode = 'cache_audio' | 'favorite_only';

export type VoiceFavoriteRecord = {
  id: string;
  conversationId: string;
  messageId: string;
  role: 'user' | 'assistant';
  transcriptPreview: string;
  durationSec: number;
  favoritedAt: number;
  mimeType: string;
  /** 抓取成功的音频 */
  audioBytes?: ArrayBuffer;
  /** 当时的 mediaUrl（blob/http/data），可能已失效 */
  sourceMediaUrl?: string;
  cachedAudio: boolean;
  /**
   * 用户主动选择「仅收藏」：不缓存字节；助手无 URL 时在收藏列表按次合成。
   * 旧数据无此字段时视为 false。
   */
  favoriteOnly?: boolean;
  /** 助手语音：用于按次 TTS 的全文（与聊天 playAssistantTts 同源逻辑） */
  ttsPlainText?: string;
  /** 群聊助手消息：对应成员的会话 id，用于解析角色朗读配置 */
  assistantSenderId?: string;
};

export function voiceFavoriteId(conversationId: string, messageId: string): string {
  return `vf_${conversationId}_${messageId}`;
}

async function fetchAudioBytes(url: string): Promise<{ bytes: ArrayBuffer; mime: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (!buf.byteLength) return null;
    let mime = 'audio/webm';
    const ct = res.headers.get('content-type');
    if (ct && /^audio\//i.test(ct.split(';')[0].trim())) {
      mime = ct.split(';')[0].trim();
    }
    return { bytes: buf, mime };
  } catch {
    return null;
  }
}

function ttsPlainTextFromVoiceMessage(message: Message): string {
  if (message.role !== 'assistant') return '';
  const voiceStrip = stripTrailingVoiceTranscriptArtifacts((message.mediaDescription || '').trim());
  const fromDesc = plainTextForMinimaxTts(voiceStrip.text);
  if (fromDesc) return fromDesc;
  return plainTextForMinimaxTts(stripDisplayControlTags(message.content || '').trim());
}

export async function saveVoiceFavorite(
  conversationId: string,
  message: Message,
  mode: VoiceFavoriteSaveMode = 'cache_audio',
): Promise<VoiceFavoriteRecord> {
  const id = voiceFavoriteId(conversationId, message.id);
  const transcriptPreview = stripTrailingVoiceTranscriptArtifacts((message.mediaDescription || '').trim()).text.slice(
    0,
    280,
  );
  const durationSec = Math.max(1, Math.round(Number(message.voiceDuration) || 3));
  const role: 'user' | 'assistant' = message.role === 'assistant' ? 'assistant' : 'user';
  const ttsPlainText = role === 'assistant' ? ttsPlainTextFromVoiceMessage(message) : undefined;
  const assistantSenderId =
    role === 'assistant' ? ((message as { senderId?: string }).senderId || '').trim() || undefined : undefined;

  let audioBytes: ArrayBuffer | undefined;
  let mimeType = 'audio/webm';
  let cachedAudio = false;
  const url = (message.mediaUrl || '').trim();
  const favoriteOnly = mode === 'favorite_only';

  if (!favoriteOnly && url) {
    const got = await fetchAudioBytes(url);
    if (got) {
      audioBytes = got.bytes;
      mimeType = got.mime;
      cachedAudio = true;
    }
  }

  const record: VoiceFavoriteRecord = {
    id,
    conversationId,
    messageId: message.id,
    role,
    transcriptPreview: transcriptPreview || (cachedAudio ? '语音' : '（仅转写或占位）'),
    durationSec,
    favoritedAt: Date.now(),
    mimeType,
    cachedAudio,
    favoriteOnly: favoriteOnly || undefined,
    ...(ttsPlainText ? { ttsPlainText } : {}),
    ...(assistantSenderId ? { assistantSenderId } : {}),
    sourceMediaUrl: url || undefined,
    ...(audioBytes ? { audioBytes } : {}),
  };

  await updateData(STORE, record);
  return record;
}

export async function removeVoiceFavorite(id: string): Promise<void> {
  await deleteData(STORE, id);
}

export async function listVoiceFavoritesForConversation(conversationId: string): Promise<VoiceFavoriteRecord[]> {
  const rows = await getDataByIndex<VoiceFavoriteRecord>(STORE, 'conversationId', conversationId);
  return rows.sort((a, b) => b.favoritedAt - a.favoritedAt);
}

export function resolveVoiceFavoriteTtsCharacter(
  entry: VoiceFavoriteRecord,
  conversations: Conversation[],
): CharacterTtsSettings | undefined {
  const conv = conversations.find((c) => c.id === entry.conversationId);
  if (!conv) return undefined;
  if (conv.type === 'group' && entry.assistantSenderId) {
    return conversations.find((c) => c.id === entry.assistantSenderId)?.characterSettings?.tts;
  }
  return conv.characterSettings?.tts;
}

/** 用于按次合成：新数据 ttsPlainText；旧数据可退回转写预览（可能不完整） */
export function resolveVoiceFavoriteTtsPlain(entry: VoiceFavoriteRecord): string {
  const direct = (entry.ttsPlainText || '').trim();
  if (direct) return direct;
  if (entry.role === 'assistant' && (entry.transcriptPreview || '').trim()) {
    return plainTextForMinimaxTts((entry.transcriptPreview || '').trim());
  }
  return '';
}

export function canPlayVoiceFavorite(
  entry: VoiceFavoriteRecord,
  apiConfig: ApiConfig,
  conversations: Conversation[],
): boolean {
  const pinned = Boolean(entry.cachedAudio && entry.audioBytes && entry.audioBytes.byteLength > 0);
  if (pinned) return true;
  if ((entry.sourceMediaUrl || '').trim()) return true;
  if (entry.role === 'assistant') {
    const plain = resolveVoiceFavoriteTtsPlain(entry);
    if (!plain) return false;
    if (!isMinimaxTtsReady(apiConfig)) return false;
    return isCharacterTtsVoiceConfigured(resolveVoiceFavoriteTtsCharacter(entry, conversations));
  }
  return false;
}

/** 用于播放：返回可传给 Audio.src 的 URL；调用方负责 revoke blob URL */
export function resolveVoiceFavoritePlaySrc(entry: VoiceFavoriteRecord): string | null {
  if (entry.cachedAudio && entry.audioBytes && entry.audioBytes.byteLength > 0) {
    const blob = new Blob([entry.audioBytes], { type: entry.mimeType || 'audio/webm' });
    return URL.createObjectURL(blob);
  }
  if (entry.sourceMediaUrl) return entry.sourceMediaUrl;
  return null;
}
