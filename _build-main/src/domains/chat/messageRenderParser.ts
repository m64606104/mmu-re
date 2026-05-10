import { MediaItem, Message } from '../../types';
import { formatChatRecord } from '../../utils/chatRecordFormatter';
import { splitMessages } from '../../utils/messageFormatter';
import SmartHTMLGenerator from '../../utils/smartHTMLGenerator';
import { wrapModelPayloadForEditedMessage } from './editedMessageModelHint';

function appendEditedTranscriptNotice(msg: Message, text: string): string {
  return wrapModelPayloadForEditedMessage(msg, text);
}

function hasNativeDocumentProtocol(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : trimmed).trim();
  try {
    const parsed = JSON.parse(candidate);
    if (!parsed || typeof parsed !== 'object') return false;
    const doc = (parsed as any).document && typeof (parsed as any).document === 'object' ? (parsed as any).document : parsed;
    return typeof doc.title === 'string' && typeof doc.content === 'string';
  } catch {
    return false;
  }
}

// Format message payload before sending to AI model.
export function formatMessageForAI(msg: Message): string {
  let content = msg.content;

  // Forwarded messages
  if (msg.forwarded) {
    if (msg.forwarded.type === 'merged' && msg.forwarded.messages) {
      const forwardedMessages = msg.forwarded.messages.map(item => ({
        id: `forwarded_${Date.now()}_${Math.random()}`,
        role: item.senderName === '用户' ? ('user' as const) : ('assistant' as const),
        content: item.content,
        timestamp: Date.now(),
      }));

      const formattedChatRecord = formatChatRecord(
        forwardedMessages,
        msg.forwarded.from.conversationName,
        msg.forwarded.from.conversationType === 'group' ? 'subchat' : 'main'
      );

      const userText = msg.content && msg.content.trim() && msg.content !== '转发了聊天记录'
        ? msg.content
        : '请帮我看看这个聊天记录：';

      content = `${userText}\n\n${formattedChatRecord}`;
    } else if (msg.forwarded.type === 'single' && msg.forwarded.originalMessage) {
      const original = msg.forwarded.originalMessage;
      content = `转发了来自【${msg.forwarded.from.conversationName}】的消息:\n\n${original.content}`;
    }
  }

  // Document messages
  if (msg.document) {
    const originalFileInfo = msg.document.originalFile
      ? `\n原始文件：${msg.document.originalFile.fileName} (${msg.document.originalFile.mimeType}, ${(msg.document.originalFile.fileSize / 1024).toFixed(1)}KB)`
      : '';
    const typeLabel = msg.document.type === 'text' ? '文本' : msg.document.type === 'markdown' ? 'Markdown' : '代码';
    if (msg.role === 'user') {
      return appendEditedTranscriptNotice(
        msg,
        `[用户发送了${typeLabel}文档]\n标题：${msg.document.title}${originalFileInfo}\n内容：\n${msg.document.content}`,
      );
    }
    return appendEditedTranscriptNotice(
      msg,
      `[AI发送了${typeLabel}文档]\n标题：${msg.document.title}${originalFileInfo}\n内容：\n${msg.document.content}`,
    );
  }

  // Money transfer/red packet
  if (msg.moneyTransfer) {
    const type = msg.moneyTransfer.type === 'redPacket' ? '红包' : '转账';
    if (msg.role === 'assistant') {
      return appendEditedTranscriptNotice(
        msg,
        msg.moneyTransfer.type === 'redPacket'
          ? `[发红包:${msg.moneyTransfer.amount}:${msg.moneyTransfer.message}]`
          : `[转账:${msg.moneyTransfer.amount}:${msg.moneyTransfer.message}]`,
      );
    }
    if (msg.moneyTransfer.status === 'received') {
      return appendEditedTranscriptNotice(msg, `[接收${type}:${msg.moneyTransfer.message}]`);
    } else if (msg.moneyTransfer.status === 'returned') {
      return appendEditedTranscriptNotice(msg, `[退回${type}:${msg.moneyTransfer.message}]`);
    }
  }

  // Voice messages
  if (msg.mediaType === 'voice') {
    if (msg.mediaDescription && msg.mediaDescription.trim()) {
      return appendEditedTranscriptNotice(msg, `[语音消息] ${msg.mediaDescription}`);
    }
    return appendEditedTranscriptNotice(msg, `[语音消息 ${msg.voiceDuration || 3}秒]`);
  }

  // Sticker and visual media messages (ensure description is visible to AI)
  if (msg.mediaType === 'sticker') {
    const desc = (msg.mediaDescription || msg.content || '').trim();
    return appendEditedTranscriptNotice(msg, desc ? `[表情包] ${desc}` : '[表情包]');
  }
  if (msg.mediaType === 'image') {
    const desc = (msg.mediaDescription || '').trim();
    return appendEditedTranscriptNotice(msg, desc ? `[图片] ${desc}` : '[图片]');
  }
  if (msg.mediaType === 'video') {
    const desc = (msg.mediaDescription || '').trim();
    return appendEditedTranscriptNotice(msg, desc ? `[视频] ${desc}` : '[视频]');
  }

  // Mixed media payload
  if (msg.mediaItems && msg.mediaItems.length > 0) {
    const mediaDesc = msg.mediaItems.map(item => `[${item.type}: ${item.description}]`).join(' ');
    content = `${content} ${mediaDesc}`;
  }

  return appendEditedTranscriptNotice(msg, content);
}

interface PrepareAssistantSegmentsOptions {
  assistantMessage: string;
  conversation: {
    id: string;
    type: 'private' | 'group';
    messages: Message[];
    replySplitPreference?: 'smart' | 'single' | 'split';
    characterSettings?: {
      personality?: string;
      languageStyle?: string;
      systemPrompt?: string;
    };
  };
  now?: () => number;
}

interface PrepareAssistantSegmentsResult {
  earlyReturnMessages: Message[] | null;
  splitSegments: string[];
}

const PLATFORM_NAMES: Record<string, string> = {
  xiaohongshu: '小红书',
  zhihu: '知乎',
  weibo: '微博',
  'search-history': '搜索记录',
};

export function prepareAssistantSegments(
  options: PrepareAssistantSegmentsOptions
): PrepareAssistantSegmentsResult {
  const { assistantMessage, conversation, now = () => Date.now() } = options;

  // 文档优先：如果整段回复能识别为文档，禁止拆条，交给后续文档管线处理为文档卡片
  if (hasNativeDocumentProtocol(assistantMessage)) {
    return {
      earlyReturnMessages: null,
      splitSegments: [assistantMessage],
    };
  }

  const htmlType = SmartHTMLGenerator.detectHTMLType(assistantMessage);
  if (htmlType) {
    return {
      earlyReturnMessages: [
        {
          id: `${now()}_html`,
          role: 'assistant',
          content: `分享了${PLATFORM_NAMES[htmlType] || '内容'}`,
          timestamp: now() + 100,
          socialFeed: {
            platform: htmlType,
            rawContent: assistantMessage,
          },
        },
      ],
      splitSegments: [],
    };
  }

  const hasHTMLTags = /<[^>]+>/.test(assistantMessage);
  let isHTMLOutputMode = false;
  if (hasHTMLTags) {
    const htmlTagMatches = assistantMessage.match(/<[^>]+>/g) || [];
    const htmlTagCount = htmlTagMatches.length;
    const totalLength = assistantMessage.length;

    if (htmlTagCount >= 3) {
      const htmlContentLength = htmlTagMatches.reduce((sum, tag) => sum + tag.length, 0);
      const htmlRatio = htmlContentLength / totalLength;
      if (htmlRatio > 0.2) {
        isHTMLOutputMode = true;
      }
    }

    if (!isHTMLOutputMode) {
      const structuralTags = ['<div', '<style', '<span', '<table', '<ul', '<ol', '<section', '<article'];
      const hasStructuralTags = structuralTags.some(tag => assistantMessage.includes(tag));
      if (hasStructuralTags && htmlTagCount >= 2) {
        isHTMLOutputMode = true;
      }
    }

    if (!isHTMLOutputMode) {
      const openTagMatches = assistantMessage.match(/<(\w+)[^>]*>/g) || [];
      const closeTagMatches = assistantMessage.match(/<\/(\w+)>/g) || [];
      if (openTagMatches.length >= 2 && openTagMatches.length === closeTagMatches.length) {
        isHTMLOutputMode = true;
      }
    }
  }

  if (isHTMLOutputMode) {
    return {
      earlyReturnMessages: [
        {
          id: `${now()}_html_output`,
          role: 'assistant',
          content: assistantMessage,
          timestamp: now(),
        },
      ],
      splitSegments: [],
    };
  }

  const lastUserMessage = [...conversation.messages].reverse().find(msg => msg.role === 'user')?.content;
  const characterProfileText = [
    conversation.characterSettings?.personality,
    conversation.characterSettings?.languageStyle,
    conversation.characterSettings?.systemPrompt,
  ]
    .filter(Boolean)
    .join('\n');

  const splitSegments = splitMessages(assistantMessage, {
    preference: conversation.replySplitPreference ?? 'smart',
    conversationType: conversation.type,
    lastUserMessage,
    maxBubbles: 4,
    characterProfileText,
  });

  return {
    earlyReturnMessages: null,
    splitSegments,
  };
}

export interface StructuredAssistantSegment {
  text: string;
  mediaItems: MediaItem[];
}

export interface StructuredAssistantResponse {
  skip: boolean;
  segments: StructuredAssistantSegment[];
}

function normalizeMediaType(rawType: string): MediaItem['type'] | null {
  const t = rawType.trim().toLowerCase();
  if (t === 'image' || t === 'img' || t === '图片') return 'image';
  if (t === 'video' || t === 'vid' || t === '视频') return 'video';
  if (t === 'voice' || t === 'audio' || t === '语音') return 'voice';
  if (t === 'sticker' || t === 'emoji' || t === '表情包') return 'sticker';
  return null;
}

function normalizeMediaItem(item: any): MediaItem | null {
  if (!item || typeof item !== 'object') return null;
  const type = normalizeMediaType(String(item.type || ''));
  if (!type) return null;
  const description = String(item.description || item.desc || '').trim();
  if (!description && !item.url) return null;

  const normalized: MediaItem = {
    type,
    description: description || `[${type}]`,
  };
  if (typeof item.url === 'string' && item.url.trim()) normalized.url = item.url.trim();
  if (typeof item.duration === 'number' && Number.isFinite(item.duration)) normalized.duration = item.duration;
  return normalized;
}

function parseJsonFromRawResponse(raw: string): any | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : trimmed).trim();

  if (candidate.startsWith('{') || candidate.startsWith('[')) {
    try {
      return JSON.parse(candidate);
    } catch {
      // fall through
    }
  }

  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const objText = candidate.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(objText);
    } catch {
      return null;
    }
  }

  return null;
}

function decodeMaybeEscapedString(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  try {
    return JSON.parse(`"${trimmed.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
  } catch {
    return trimmed
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\\\/g, '\\');
  }
}

function parseStructuredResponseLoosely(raw: string): StructuredAssistantResponse | null {
  const body = raw
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .trim();

  if (!body) return null;

  if (/"skip"\s*:\s*true/i.test(body)) {
    return { skip: true, segments: [] };
  }

  const textMatches = [...body.matchAll(/"text"\s*:\s*"((?:\\.|[^"\\])*)"/g)];
  if (textMatches.length === 0) return null;

  const segments: StructuredAssistantSegment[] = textMatches.map(match => ({
    text: decodeMaybeEscapedString(match[1] || ''),
    mediaItems: [],
  }));

  const mediaMatches = [...body.matchAll(/\{\s*"type"\s*:\s*"([^"]+)"[\s\S]*?"description"\s*:\s*"((?:\\.|[^"\\])*)"[\s\S]*?(?:"duration"\s*:\s*(\d+))?[\s\S]*?\}/g)];
  mediaMatches.forEach((match, idx) => {
    const type = normalizeMediaType(match[1] || '');
    if (!type) return;
    const description = decodeMaybeEscapedString(match[2] || '');
    const duration = match[3] ? Number(match[3]) : undefined;
    const target = segments[Math.min(idx, segments.length - 1)];
    if (!target) return;
    target.mediaItems.push({
      type,
      description: description || `[${type}]`,
      ...(duration ? { duration } : {}),
    });
  });

  return { skip: false, segments };
}

export function parseStructuredAssistantResponse(raw: string): StructuredAssistantResponse | null {
  const data = parseJsonFromRawResponse(raw);
  if (!data || typeof data !== 'object') {
    return parseStructuredResponseLoosely(raw);
  }

  const skip = Boolean((data as any).skip);
  const messages = Array.isArray((data as any).messages) ? (data as any).messages : null;

  if (messages && messages.length > 0) {
    const segments: StructuredAssistantSegment[] = messages
      .map((msg: any) => {
        const text = String(msg?.text || msg?.content || '').trim();
        const mediaRaw = Array.isArray(msg?.media) ? msg.media : [];
        const mediaItems = mediaRaw.map(normalizeMediaItem).filter(Boolean) as MediaItem[];
        return { text, mediaItems };
      })
      .filter((seg: StructuredAssistantSegment) => seg.text || seg.mediaItems.length > 0);

    if (segments.length > 0 || skip) {
      return { skip, segments };
    }
    return null;
  }

  const text = String((data as any).text || (data as any).content || '').trim();
  const mediaRaw = Array.isArray((data as any).media) ? (data as any).media : [];
  const mediaItems = mediaRaw.map(normalizeMediaItem).filter(Boolean) as MediaItem[];

  if (!text && mediaItems.length === 0 && !skip) return null;
  return { skip, segments: [{ text, mediaItems }] };
}

