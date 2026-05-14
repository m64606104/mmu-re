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
import { normalizeLooseAssistantMediaBrackets } from '../domains/chat/assistantMessageBuilder';
import { calculateVoiceDuration, stripTrailingVoiceTranscriptArtifacts } from './voiceDurationCalculator';

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

const ASSISTANT_INLINE_MEDIA_REGEX =
  /\[(图片|IMG|IMAGE|视频|VIDEO|语音|VOICE|表情包|STICKER)[:：]([^\]]+)\]/gi;

/** 与 ChatScreen expandAssistantInlineMediaForRender 一致：第 n 个媒体占位是否为语音 */
export function contentNthMediaIsVoice(content: string | undefined, zeroBasedIndex: number): boolean {
  if (content == null || content === '') return false;
  const source = normalizeLooseAssistantMediaBrackets(content);
  let idx = 0;
  ASSISTANT_INLINE_MEDIA_REGEX.lastIndex = 0;
  for (const match of source.matchAll(ASSISTANT_INLINE_MEDIA_REGEX)) {
    if (idx === zeroBasedIndex) {
      const rawType = (match[1] || '').trim().toLowerCase();
      return rawType === '语音' || rawType === 'voice';
    }
    idx++;
  }
  return false;
}

/**
 * 当前打开的菜单是否应对「语音」行展示收藏/转文字（避免拆条后的纯文字行也出现语音菜单）。
 */
export function messageRowShowsVoiceMenu(
  message: Message | undefined,
  menuAnchorRowId: string | null | undefined,
): boolean {
  if (!message || message.role === 'system') return false;
  if (message.mediaType === 'voice') return true;
  if (message.mediaItems?.some((it) => it.type === 'voice')) return true;
  const m = menuAnchorRowId?.match(/_media_(\d+)$/);
  if (message.role === 'assistant' && m) {
    return contentNthMediaIsVoice(message.content, Number(m[1]));
  }
  return false;
}

function sliceNthBracketVoiceFromAssistantContent(message: Message, zeroBasedMediaIndex: number): Message | null {
  const source = normalizeLooseAssistantMediaBrackets(message.content || '');
  let idx = 0;
  ASSISTANT_INLINE_MEDIA_REGEX.lastIndex = 0;
  for (const match of source.matchAll(ASSISTANT_INLINE_MEDIA_REGEX)) {
    if (idx !== zeroBasedMediaIndex) {
      idx++;
      continue;
    }
    const rawType = (match[1] || '').trim().toLowerCase();
    if (rawType !== '语音' && rawType !== 'voice') return null;
    const rawPayload = (match[2] || '').trim();
    let mediaDescription = rawPayload;
    let voiceDuration = 3;
    const durationMatch = rawPayload.match(/(.+?)(?:[，,]\s*(?:时长)?(\d+)秒?)$/i);
    if (durationMatch) {
      mediaDescription = durationMatch[1].trim();
      voiceDuration = Number(durationMatch[2]) || 3;
    }
    const stripped = stripTrailingVoiceTranscriptArtifacts(mediaDescription.trim());
    mediaDescription = stripped.text;
    if (stripped.secondsHint !== undefined) voiceDuration = stripped.secondsHint;
    return {
      ...message,
      content: '[语音]',
      mediaType: 'voice',
      mediaDescription,
      voiceDuration,
      isMediaDescriptionOnly: true,
    };
  }
  return null;
}

/**
 * 供收藏写入：单条 voice 直接返回；mediaItems 取首段语音；正文内联按 expand 的 `_media_n` 下标取对应语音段。
 * @param bracketMediaIndex 与拆条行 id `…_media_n` 中的 n 一致；缺省为 0。
 */
export function resolveMessageForVoiceFavorite(message: Message, bracketMediaIndex = 0): Message | null {
  if (message.mediaType === 'voice') return message;
  const voiceItems = message.mediaItems?.filter((it) => it.type === 'voice') || [];
  if (voiceItems.length > 0) {
    const item = voiceItems[0];
    const stripped = stripTrailingVoiceTranscriptArtifacts((item.description || '').trim());
    const duration =
      typeof item.duration === 'number' && item.duration > 0
        ? item.duration
        : stripped.secondsHint ?? Math.max(3, calculateVoiceDuration(stripped.text));
    return {
      ...message,
      content: '[语音]',
      mediaType: 'voice',
      mediaDescription: stripped.text,
      voiceDuration: duration,
      isMediaDescriptionOnly: true,
      mediaUrl: item.url,
    };
  }
  return sliceNthBracketVoiceFromAssistantContent(message, bracketMediaIndex);
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
