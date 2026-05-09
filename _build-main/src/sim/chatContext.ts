import type { Conversation, Message } from '../types';
import { isToolInteractionCharacter } from '../utils/characterInteractionMode';
import { smartLoad } from '../utils/storage';

function isLifeStatusQuery(text: string): boolean {
  const t = (text || '').trim().toLowerCase();
  if (!t) return false;
  return /最近|近况|今天怎么样|在干嘛|忙什么|最近在忙|状态|目标|进展|你怎么样|今天过得|最近过得/.test(t);
}

function isImaginativeQuery(text: string): boolean {
  const t = (text || '').trim().toLowerCase();
  if (!t) return false;
  return /如果|假如|要是|设想|想象|平行世界|穿越|超能力|瞬间移动|梦里|幻想|脑洞/.test(t);
}

export async function buildLifeChatContextSnippet(params: {
  conversation: Conversation;
  lastUserMessage?: Message;
}): Promise<string> {
  const { conversation, lastUserMessage } = params;
  if (!conversation?.id || conversation.type !== 'private') return '';
  if (isToolInteractionCharacter(conversation.characterSettings)) return '';

  const all = (await smartLoad('ai_life_sim_states')) as Record<string, any> | null;
  const state = all?.[conversation.id];
  if (!state) return '';

  const logs = Array.isArray(state.lifeLogs) ? state.lifeLogs : [];
  const latest = logs[0];
  const goals = Array.isArray(state.goals) ? state.goals.filter((g: any) => g?.active).slice(0, 3) : [];
  const goalsText = goals.length
    ? goals.map((g: any) => `${g.title}(进度${g.progress ?? 0})`).join('、')
    : '（暂无）';

  const asksLife = isLifeStatusQuery(lastUserMessage?.content || '');
  const asksImagination = isImaginativeQuery(lastUserMessage?.content || '');

  return (
    `\n【AI后台生活状态（内部）】\n` +
    `- 最近生活片段：${latest ? `${latest.day} ${latest.actionCategory} ${latest.actionLabel}；${latest.detail}` : '暂无'}\n` +
    `- 当前指标：精力${state.energy ?? '—'} 心情${state.mood ?? '—'} 压力${state.stress ?? '—'} 社交欲${state.socialNeed ?? '—'}\n` +
    `- 长期目标：${goalsText}\n` +
    `- 使用原则：这些是“底层事实参考”，不是逐字复述模板。请优先做“个性化解读”（情绪、语气、联想、小幽默），避免机械报数。\n` +
    `- 回答时不要直接说“我的精力是xx/社交需求是xx”。要转成自然口语感受。\n` +
    (asksLife
      ? `- 用户正在询问你的近况/状态。请基于以上信息做真实且连贯的回答，不要空泛。\n`
      : `- 如果当前话题自然相关，你可以偶尔（一句）带出近况；若不相关则不要硬提。\n`) +
    (asksImagination
      ? `- 用户在问开放式/假设式问题：请切换到“想象模式”。允许天马行空，但要与角色性格保持一致；后台状态仅作轻参考，不要束缚发挥。\n`
      : '')
  );
}

