import type { Conversation } from '../types';

const LS_PRESET_UI_MIGRATION_KEY = 'momoyu_migration_conversation_preset_ui_v';

/** 与 `maybeApplyConversationPresetUiMigration` 内逻辑一致：提高后会对老库再跑一轮归一化 */
export const CONVERSATION_PRESET_UI_MIGRATION_VERSION = 1;

function readPresetUiMigrationVersion(): number {
  try {
    const s = localStorage.getItem(LS_PRESET_UI_MIGRATION_KEY);
    if (!s) return 0;
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function commitPresetUiMigrationVersion(): void {
  try {
    localStorage.setItem(LS_PRESET_UI_MIGRATION_KEY, String(CONVERSATION_PRESET_UI_MIGRATION_VERSION));
  } catch {
    /* private mode / quota */
  }
}

function assetUrl(relativePath: string): string {
  const normalizedPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  return normalizedPath;
}

export function buildPresetConversation(kind: 'aa' | 'worker' | 'oo1', now = Date.now()): Conversation {
  if (kind === 'aa') {
    return {
      id: 'preset-aa',
      type: 'private',
      name: 'aa',
      avatar: assetUrl('avatars/aa-default.png'),
      messages: [],
      characterSettings: {
        avatar: assetUrl('avatars/aa-default.png'),
        realName: 'aa',
        nickname: 'aa',
        username: 'aa不是研究生',
        systemPrompt: '你叫aa，女生，是我的网友，和我关系很好，在上海读研。',
        personality: '喜欢网上冲浪、刷小红书、分享生活',
        languageStyle: '偶尔会使用网络用语，语气轻松活泼',
        languageExample: '哈哈哈太好笑了吧！今天又在小红书上刷到好多有趣的东西～',
        memoryEvents: '',
        disableWorldbook: true,
        proactiveMessaging: {
          enabled: false,
          minInterval: 30,
          maxInterval: 180,
          activeHourStart: 8,
          activeHourEnd: 23,
          autoIntervalByAI: true,
          relationAware: true,
          wakeSensitivityMode: 'auto',
          sleepSimulationEnabled: true,
        },
      },
      enabledFeatures: ['memory-system'],
      lastMessageTime: now,
      unreadCount: 0,
    };
  }
  if (kind === 'worker') {
    return {
      id: 'preset-worker',
      type: 'private',
      name: '测',
      avatar: assetUrl('avatars/ce-default.png'),
      messages: [],
      characterSettings: {
        avatar: assetUrl('avatars/ce-default.png'),
        realName: '测',
        nickname: '测',
        username: '只要涨薪不要996',
        systemPrompt: '你是一个上班族，26岁，男，在公司做总裁助理。',
        personality: '',
        languageStyle: '',
        languageExample: '',
        memoryEvents: '',
        disableWorldbook: true,
        proactiveMessaging: {
          enabled: false,
          minInterval: 30,
          maxInterval: 180,
          activeHourStart: 8,
          activeHourEnd: 23,
          autoIntervalByAI: true,
          relationAware: true,
          wakeSensitivityMode: 'auto',
          sleepSimulationEnabled: true,
        },
      },
      enabledFeatures: ['memory-system'],
      lastMessageTime: now,
      unreadCount: 0,
    };
  }
  return {
    id: 'preset-oo1',
    type: 'private',
    name: 'oo1',
    avatar: assetUrl('avatars/oo1.png'),
    messages: [],
    characterSettings: {
      avatar: assetUrl('avatars/oo1.png'),
      realName: 'oo1',
      nickname: 'oo1',
      username: '',
      interactionMode: 'tool',
      systemPrompt:
        '你是 oo1，一个对标 ChatGPT/Gemini 的通用智能助手。\n目标：帮助用户把事情做成。\n\n回答偏好：先给结论，再给可执行步骤；必要时给方案对比与推荐。\n表达：简洁、自然、不过度客套；不自我设限。\n\n文档/文件：当用户发送文档时，系统会把可读正文附在消息里（“内容：”之后）。你应直接阅读并处理；不要说“看不到附件/打不开文件/请复制粘贴”。',
      personality: '',
      languageStyle: '简洁、自然、可执行',
      languageExample: '',
      memoryEvents: '',
      disableWorldbook: true,
      proactiveMessaging: {
        enabled: false,
        minInterval: 30,
        maxInterval: 180,
        activeHourStart: 8,
        activeHourEnd: 23,
        autoIntervalByAI: true,
        relationAware: true,
        wakeSensitivityMode: 'auto',
        sleepSimulationEnabled: false,
      },
    },
    enabledFeatures: ['memory-system'],
    lastMessageTime: now,
    unreadCount: 0,
  };
}

/**
 * 对已存在的 aa / 测 / oo1 预设会话做头像与 oo1 文案等归一化。
 * 不在此「补回」用户已删的预设；三条内置联系人仅在首次仓库无会话时由 loadData 植入一次。
 */
export function normalizePresetAaAvatar(conversations: Conversation[]): Conversation[] {
  const OO1_DEFAULT_PROMPT_V1 =
    '你是 oo1，一个对标 ChatGPT / Gemini 的通用智能助手。你擅长通用问答、写作、分析、规划和代码协助，回答要清晰、直接、可执行。';

  const OO1_DEFAULT_PROMPT_V2 = [
    '你是 oo1，一个对标 ChatGPT/Gemini 的通用智能助手。',
    '目标：帮助用户把事情做成。',
    '',
    '回答偏好：先给结论，再给可执行步骤；必要时给方案对比与推荐。',
    '表达：简洁、自然、不过度客套；不自我设限。',
    '',
    '文档/文件：当用户发送文档时，系统会把可读正文附在消息里（“内容：”之后）。你应直接阅读并处理；不要说“看不到附件/打不开文件/请复制粘贴”。',
  ].join('\n');

  const normalizePath = (p: string) => (p.startsWith('/') ? p.slice(1) : p).trim();

  function shouldPreserveCustomPresetAvatar(candidate: string | undefined): boolean {
    if (!candidate) return false;
    if (/^(data:|blob:)/i.test(candidate)) return true;
    const s = normalizePath(candidate.toLowerCase());
    if (/^https?:\/\//i.test(candidate)) {
      const isEmbeddedPack =
        s.includes('aa-default') ||
        s.includes('ce-default') ||
        /\boo1\.png\b/i.test(candidate);
      return !isEmbeddedPack;
    }
    const isBundledFile =
      s.includes('aa-default') ||
      s.includes('ce-default') ||
      /\bavatars\/([^/]+\/)?oo1\.png\b/i.test(s) ||
      s.endsWith('avatars/oo1.png');
    return !isBundledFile && s.length > 0;
  }

  return conversations.map((conv) => {
    const isPresetAa = conv.id.startsWith('preset-aa') || conv.name === 'aa';
    const isPresetWorker = conv.id.startsWith('preset-worker') || conv.name === '测';
    const isPresetOo1 = conv.id === 'preset-oo1' || conv.name === 'oo1';
    if (!isPresetAa && !isPresetWorker && !isPresetOo1) return conv;
    const avatarPath = isPresetAa
      ? assetUrl('avatars/aa-default.png')
      : isPresetWorker
        ? assetUrl('avatars/ce-default.png')
        : assetUrl('avatars/oo1.png');

    const currentAvatar = conv.characterSettings?.avatar || conv.avatar;
    const useBundledAvatar = !shouldPreserveCustomPresetAvatar(currentAvatar);
    const nextAvatar = useBundledAvatar ? avatarPath : (currentAvatar as string);

    const nextCharacterSettings = conv.characterSettings
      ? {
          ...conv.characterSettings,
          avatar: nextAvatar,
          ...(isPresetOo1
            ? {
                interactionMode: 'tool' as const,
                ...(conv.characterSettings.username === 'Your Personal AI'
                  ? { username: '' }
                  : {}),
                proactiveMessaging: {
                  ...(conv.characterSettings.proactiveMessaging || {}),
                  enabled: false,
                  minInterval: conv.characterSettings.proactiveMessaging?.minInterval || 30,
                  maxInterval: conv.characterSettings.proactiveMessaging?.maxInterval || 180,
                  activeHourStart: conv.characterSettings.proactiveMessaging?.activeHourStart ?? 8,
                  activeHourEnd: conv.characterSettings.proactiveMessaging?.activeHourEnd ?? 23,
                  autoIntervalByAI: conv.characterSettings.proactiveMessaging?.autoIntervalByAI ?? true,
                  relationAware: conv.characterSettings.proactiveMessaging?.relationAware ?? true,
                  wakeSensitivityMode: conv.characterSettings.proactiveMessaging?.wakeSensitivityMode || 'auto',
                  sleepSimulationEnabled: false,
                },
              }
            : {}),
          ...(isPresetOo1 && conv.characterSettings.systemPrompt === OO1_DEFAULT_PROMPT_V1
            ? {
                systemPrompt: OO1_DEFAULT_PROMPT_V2,
                personality: '',
                languageExample: '',
                languageStyle: '简洁、自然、可执行',
              }
            : {}),
        }
      : conv.characterSettings;
    return {
      ...conv,
      avatar: nextAvatar,
      characterSettings: nextCharacterSettings,
    };
  });
}

/**
 * 预设会话 UI/文案归一化：仅在「迁移版本」升级时跑一轮，避免每次 IndexedDB 读出都全表 map。
 */
export function maybeApplyConversationPresetUiMigration(conversations: Conversation[]): Conversation[] {
  if (readPresetUiMigrationVersion() >= CONVERSATION_PRESET_UI_MIGRATION_VERSION) {
    return conversations;
  }
  const out = normalizePresetAaAvatar(conversations);
  commitPresetUiMigrationVersion();
  return out;
}
