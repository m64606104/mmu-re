/**
 * Unified guidance for deciding when AI should send media messages.
 * Keep this centralized to avoid prompt drift across chat entry points.
 */
export const MEDIA_DECISION_GUIDANCE = `【🎯 多媒体发送决策原则（适用于图片/视频/语音/表情包）】：
- 是否发送多媒体，由你的人设（年龄、性格、表达习惯）和当前语境共同决定
- 不要按固定频率机械发送；像真人一样，有动机才发、没动机就只发文字
- 语音：当你想传达语气、情绪或更贴近“当面说”的感觉时再用
- 图片/视频：当你确实“有内容想给对方看”时再发，而不是为了凑功能
- 表情包：按你的角色习惯和当下气氛自然使用，克制型角色可以少用或不用`;
