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
