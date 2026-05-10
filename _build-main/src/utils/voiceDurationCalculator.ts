/**
 * 语音时长计算工具
 * 根据文字内容估算语音时长
 */

/**
 * 根据文字内容计算语音时长
 * @param text 文字内容
 * @returns 语音时长（秒）
 */
export function calculateVoiceDuration(text: string): number {
  if (!text || text.trim().length === 0) {
    return 3; // 最小3秒
  }

  // 清理文本：移除标点符号和空格
  const cleanText = text.replace(/[，。！？、；：""''（）《》【】\s]/g, '');
  const charCount = cleanText.length;

  // 正常语速：每秒约4-5个汉字
  // 考虑标点停顿和自然语气，使用4个字/秒
  const CHARS_PER_SECOND = 4;

  // 基础时长
  let duration = charCount / CHARS_PER_SECOND;

  // 考虑标点符号的停顿时间
  const punctuationCount = (text.match(/[，。！？；：]/g) || []).length;
  duration += punctuationCount * 0.3; // 每个标点增加0.3秒停顿

  // 考虑句子数量（每句话之间有自然停顿）
  const sentenceCount = (text.match(/[。！？]/g) || []).length;
  duration += sentenceCount * 0.5; // 每句话结束增加0.5秒停顿

  // 四舍五入到整数
  duration = Math.round(duration);

  // 限制范围：最短3秒，最长60秒
  return Math.max(3, Math.min(60, duration));
}

/**
 * 去掉模型误贴在「语音转文字」文案末尾的时长标记，例如：
 * - 「…晚安。:5」「…加油：12」（句读后的英文/中文冒号 + 秒数）
 * - 「…文案，10秒」「…文案，时长8秒」
 * 仅用于展示与 TTS 文案；若识别出秒数可作为 voiceDuration 提示。
 */
export function stripTrailingVoiceTranscriptArtifacts(raw: string): { text: string; secondsHint?: number } {
  let s = (raw || '')
    .trim()
    .replace(/[\u200B-\u200D\uFEFF\u2060]+/g, '')
    .trim();
  if (!s) return { text: s };

  const commaSec = s.match(/^(.+?)[，,]\s*(?:时长)?(\d{1,3})秒?\s*$/i);
  if (commaSec) {
    const n = Number(commaSec[2]);
    if (n >= 1 && n <= 300) {
      return { text: commaSec[1].trim(), secondsHint: n };
    }
  }

  const punctThenColon = s.match(/^(.+[。！？…」』.!?])\s*[:：]\s*(\d{1,3})\s*$/);
  if (punctThenColon) {
    const n = Number(punctThenColon[2]);
    if (n >= 1 && n <= 180) {
      return { text: punctThenColon[1].trim(), secondsHint: n };
    }
  }

  const bareColon = s.match(/^(.+?)[:：]\s*(\d{1,3})\s*$/);
  if (bareColon) {
    const body = bareColon[1];
    const n = Number(bareColon[2]);
    if (n >= 1 && n <= 180 && /[。！？…」』.!?\s，,、；\]}】]$/.test(body)) {
      return { text: body.trim(), secondsHint: n };
    }
  }

  // [语音:台词:5] 等拆条后 inner 为「台词:5」、句末无标点时仍应去掉时长尾巴
  const cjkTailColonSec = s.match(/^(.{2,})[:：](\d{1,3})$/);
  if (cjkTailColonSec) {
    const n = Number(cjkTailColonSec[2]);
    const body = cjkTailColonSec[1].trim();
    if (
      n >= 1 &&
      n <= 180 &&
      body.length >= 1 &&
      /[\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af]$/u.test(body) &&
      !/\d[:：]\d/.test(body)
    ) {
      return { text: body, secondsHint: n };
    }
  }

  return { text: s };
}

/**
 * 格式化时长显示
 * @param seconds 秒数
 * @returns 格式化的时长字符串（如 "1:23" 或 "45"）
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}"`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
