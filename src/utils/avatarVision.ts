import type { ApiConfig, CharacterSettings } from '../types';
import { resolveVisionImageChatEndpoint } from '../domains/vision/completionRouting';

export interface AvatarVisionProfile {
  summary: string;
  appearanceTags: string[];
  styleTags: string[];
  detectedNameText?: string;
  avatarSource?: string;
  analyzedAt: number;
  sourceModel?: string;
}

function normalizeArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 12);
}

function tryParseJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function buildAvatarIdentityPrompt(settings?: CharacterSettings): string {
  const profile = settings?.avatarVisionProfile;
  if (!profile) return '';
  const appearance = profile.appearanceTags?.length ? profile.appearanceTags.join('、') : '未标注';
  const style = profile.styleTags?.length ? profile.styleTags.join('、') : '未标注';
  return `\n【你的当前头像信息（系统识别）】\n头像总结：${profile.summary}\n外观标签：${appearance}\n风格标签：${style}${profile.detectedNameText ? `\n头像可见文字：${profile.detectedNameText}` : ''}\n请把这视为你当前的“自我形象”并保持一致。`;
}

export async function analyzeAvatarWithVisionModel(
  avatarUrl: string,
  apiConfig: ApiConfig
): Promise<AvatarVisionProfile | null> {
  if (!avatarUrl) return null;
  const routing = resolveVisionImageChatEndpoint(apiConfig);
  if (!routing?.apiUrl) return null;

  const prompt =
    '你是头像视觉解析器。请识别这张头像并输出JSON，不要输出其他文字。' +
    '字段: summary(简体中文一句话,<=40字), appearanceTags(数组), styleTags(数组), detectedNameText(可空字符串)。';

  try {
    const resp = await fetch(routing.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${routing.bearerToken}`,
        'X-Momoyu-Source': 'avatarVision:auto',
      },
      body: JSON.stringify({
        model: routing.model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: avatarUrl } },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: 240,
      }),
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = tryParseJson(String(content));
    if (!parsed) return null;

    const summary = String(parsed.summary || '').trim();
    if (!summary) return null;

    return {
      summary,
      appearanceTags: normalizeArray(parsed.appearanceTags),
      styleTags: normalizeArray(parsed.styleTags),
      detectedNameText: String(parsed.detectedNameText || '').trim() || undefined,
      avatarSource: avatarUrl,
      analyzedAt: Date.now(),
      sourceModel: routing.model,
    };
  } catch {
    return null;
  }
}

export function shouldReanalyzeAvatar(
  avatarUrl: string | undefined,
  settings?: CharacterSettings
): boolean {
  if (!avatarUrl) return false;
  const profile = settings?.avatarVisionProfile;
  if (!profile?.summary) return true;
  return profile.avatarSource !== avatarUrl;
}
