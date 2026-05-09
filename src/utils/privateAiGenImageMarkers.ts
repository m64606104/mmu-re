/**
 * 从模型正文中提取「私聊真实生图」指令并剥除标记，避免原样显示在气泡里。
 * 与 [IMG:]/[图片:]（描述型配图）区分：仅 [生图:] / [AI图:] / [AI配图:] 走生图链路。
 */
export function extractPrivateAiGenImageDirectives(raw: string): { text: string; prompts: string[] } {
  if (!raw || typeof raw !== 'string') return { text: '', prompts: [] };
  const prompts: string[] = [];
  const re = /\[(?:生图|AI图|AI配图)[:：]\s*([^\]]+?)\s*\]/gi;
  const text = raw.replace(re, (_m, g1: string) => {
    const p = String(g1 || '').trim();
    if (p) prompts.push(p);
    return ' ';
  });
  return {
    text: text.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim(),
    prompts,
  };
}
