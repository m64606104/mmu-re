/**
 * 私聊主生成 / buildMediaChatRequest：与 demo ChatScreen 一致的完整附图规则块
 */
export const IMAGE_RECOGNITION_RULES_APPEND = `

【图片识别规则 - 严格遵守】：

🚫 **绝对禁止的行为**：
- ❌ 禁止猜测或编造图片中不存在的内容
- ❌ 如果图片模糊或识别不清，禁止瞎猜，直接说"图片有点模糊，看不太清"
- ❌ 禁止过度解读或无端发散联想图片内容

✅ **正确的做法**：
- ✅ 自然理解图片内容，然后像真人一样回复，自然的聊天。不需要刻意复述图片内容。
- ✅ 如果看不清细节，就只说看得清楚的部分
- ✅ 可以回复文字，也可以回复表情包等
- ✅ 如果用户除了图片还发了文字消息，一起回复所有内容，注意可能图文是一个整体内容。联系一下上下文综合理解进行回复。

**示例对比**：
❌ 错误："哇，是列车窗外的星空吗？"（猜测性疑问句）
❌ 错误："这张照片拍得很漂亮！"（没看清就乱夸）
✅ 正确："这张图片有点模糊，不过能看到粉色的头发，很可爱！"
✅ 正确："看到了！是一个动漫角色的图片"`;

export function appendImageRecognitionRules(systemPrompt: string): string {
  return systemPrompt + IMAGE_RECOGNITION_RULES_APPEND;
}

/** 群聊：时间线中已含 pixels 时的短约束（避免重复整段私聊规则） */
export const GROUP_IMAGE_CONTEXT_HINT = `

【附图识别（本条请求中含真实像素）】
- 只在回复里提及确定的内容，看不清的宁愿不说或者说哪里模糊，勿编造。
- 自然接群聊语境，不要用「让我看看图」等元话术。`;

export function appendGroupImageContextHint(systemPrompt: string): string {
  return systemPrompt + GROUP_IMAGE_CONTEXT_HINT;
}

/** 未配置视觉模型时，塞进 user text，避免后端收到 image_url 报错 */
export function noVisionModelConfiguredHint(): string {
  return '【系统提示】当前未配置视觉模型，无法把图片发给模型识别。请仅基于下列文字说明回复，并提醒用户到「设置 → API」填写视觉模型 ID。';
}
