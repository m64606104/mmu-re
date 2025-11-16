import { Conversation, ApiConfig } from '../types';

// 检测是否在自然对话中提及朋友圈
export const detectMomentMention = (message: string): {
  shouldPostMoment: boolean;
  shouldSelectPhotos: boolean;
  context: string;
} => {
  // 检测提及朋友圈但没发
  const mentionPatterns = [
    '没有发朋友圈',
    '没发朋友圈',
    '怎么不发朋友圈',
    '为什么不发朋友圈',
    '朋友圈呢',
    '发朋友圈了吗',
    '发朋友圈没',
    '发动态了吗',
    '发动态没',
  ];
  
  const shouldSelectPhotos = mentionPatterns.some(pattern => 
    message.includes(pattern)
  );
  
  // 检测确认发布
  const confirmPatterns = [
    '就这几张',
    '就这些',
    '可以发了',
    '发吧',
    '去发吧',
    '快发',
    '赶紧发',
  ];
  
  const shouldPostMoment = confirmPatterns.some(pattern => 
    message.includes(pattern)
  );
  
  return {
    shouldPostMoment,
    shouldSelectPhotos,
    context: message,
  };
};

// 生成选图对话
export const generatePhotoSelectionPrompt = (
  conversation: Conversation,
  userMessage: string,
  _apiConfig: ApiConfig
): string => {
  const settings = conversation.characterSettings;
  
  let prompt = `你是${settings?.nickname || conversation.name}。`;
  
  if (settings?.personality) {
    prompt += `\n性格：${settings.personality}`;
  }
  
  if (settings?.languageStyle) {
    prompt += `\n说话风格：${settings.languageStyle}`;
  }
  
  prompt += `\n\n用户提到：${userMessage}`;
  prompt += `\n\n场景：用户问你为什么没发朋友圈，你需要：
1. 承认确实去了（演唱会/旅游/活动等）
2. 解释说一直在挑选照片
3. 请用户帮忙选照片
4. 语气要自然、俏皮、撒娇

只返回你的回复，不要其他说明。`;

  return prompt;
};

// 生成AI的图片描述
export const generateImageDescriptions = async (
  conversation: Conversation,
  context: string,
  apiConfig: ApiConfig,
  count: number = 6
): Promise<string[]> => {
  if (!apiConfig.baseUrl || !apiConfig.apiKey || !apiConfig.modelName) {
    throw new Error('API配置不完整');
  }

  const settings = conversation.characterSettings;
  
  let prompt = `你是${settings?.nickname || conversation.name}。`;
  
  if (settings?.systemPrompt) {
    prompt += `\n背景：${settings.systemPrompt}`;
  }
  
  prompt += `\n\n场景：${context}`;
  prompt += `\n\n请生成${count}张照片的文字描述。每张照片用一行描述，格式：
[图片1] 描述内容
[图片2] 描述内容
...

要求：
1. 描述要生动、具体、有画面感
2. 符合场景（演唱会/旅游/美食等）
3. 有不同的角度和内容
4. 描述长度：15-30字
5. 要让人想看、有选择的余地
6. 🔥 **如果是截图类型的图片，必须在描述中包含截图的文字内容**
   - 例如："手机截屏：顶部显示'微信'，聊天内容写着'明天见'，底部有发送按钮"
   - 例如："微博截图：用户'科技前沿'发布内容'AI技术突破'，转发142次，点赞169次"
   - 例如："朋友圈截图：某人分享了一篇文章'如何提升工作效率'，配文'很实用'"
7. 不要只说"这是一张截图"或"手机截屏"，要描述截图中的具体文字和内容

只返回图片描述，每行一张。`;

  try {
    const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: apiConfig.modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      throw new Error('API请求失败');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    // 解析图片描述
    const descriptions = content
      .split('\n')
      .filter((line: string) => line.trim().startsWith('[图片'))
      .map((line: string) => line.trim());
    
    return descriptions.slice(0, count);
  } catch (error) {
    console.error('生成图片描述失败:', error);
    throw error;
  }
};

// 生成确认发布的回复
export const generateConfirmPostPrompt = (
  conversation: Conversation,
  _selectedPhotos: string[],
  _apiConfig: ApiConfig
): string => {
  const settings = conversation.characterSettings;
  
  let prompt = `你是${settings?.nickname || conversation.name}。`;
  
  if (settings?.personality) {
    prompt += `\n性格：${settings.personality}`;
  }
  
  if (settings?.languageStyle) {
    prompt += `\n说话风格：${settings.languageStyle}`;
  }
  
  prompt += `\n\n场景：用户帮你选好了朋友圈的照片，你要：
1. 表示满意和感谢
2. 说要去发朋友圈了
3. 语气要开心、兴奋
4. 可以用"完美"、"OK"、"嘿嘿嘿"等词

只返回你的回复，不要其他说明。`;

  return prompt;
};

// 检测用户是否在帮忙选图
export const detectPhotoSelection = (message: string): {
  isSelecting: boolean;
  selectedIndices: number[];
} => {
  // 检测选择模式
  const selectionPatterns = [
    '第', '张', '这', '那', '要', '选', '不要', '去掉', '换',
  ];
  
  const isSelecting = selectionPatterns.some(pattern => 
    message.includes(pattern)
  );
  
  // 提取数字
  const numbers = message.match(/\d+/g);
  const selectedIndices = numbers ? numbers.map(n => parseInt(n) - 1) : [];
  
  return {
    isSelecting,
    selectedIndices,
  };
};

// 生成带图片的朋友圈内容
export const generateMomentWithPhotos = async (
  conversation: Conversation,
  context: string,
  photoDescriptions: string[],
  apiConfig: ApiConfig
): Promise<string> => {
  if (!apiConfig.baseUrl || !apiConfig.apiKey || !apiConfig.modelName) {
    throw new Error('API配置不完整');
  }

  const settings = conversation.characterSettings;
  
  let prompt = `你是${settings?.nickname || conversation.name}。`;
  
  if (settings?.systemPrompt) {
    prompt += `\n背景：${settings.systemPrompt}`;
  }
  
  if (settings?.personality) {
    prompt += `\n性格：${settings.personality}`;
  }
  
  prompt += `\n\n场景：${context}`;
  prompt += `\n\n你要发朋友圈，配的照片是：\n${photoDescriptions.join('\n')}`;
  prompt += `\n\n请生成朋友圈文字内容。要求：
1. 符合场景和照片内容
2. 真实、自然、有趣
3. 长度：1-3句话，30-80字
4. 可以使用emoji
5. 要生活化，不要太正式

只返回朋友圈文字，不要其他说明。`;

  try {
    const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: apiConfig.modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error('API请求失败');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('生成朋友圈内容失败:', error);
    throw error;
  }
};

// 检测媒体类型
export const detectMediaType = (message: string): 'image' | 'video' | 'voice' | null => {
  const lowerMsg = message.toLowerCase();
  
  if (lowerMsg.includes('[图片]') || lowerMsg.includes('[照片]')) {
    return 'image';
  }
  if (lowerMsg.includes('[视频]')) {
    return 'video';
  }
  if (lowerMsg.includes('[语音]')) {
    return 'voice';
  }
  
  return null;
};

// 提取媒体描述
export const extractMediaDescription = (message: string): string => {
  // 移除媒体标记，保留描述
  return message
    .replace(/\[图片\d*\]/g, '')
    .replace(/\[照片\d*\]/g, '')
    .replace(/\[视频\]/g, '')
    .replace(/\[语音\]/g, '')
    .trim();
};
