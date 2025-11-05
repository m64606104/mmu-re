import { ApiConfig } from '../types';

// 热梗数据库
export interface Meme {
  id: string;
  keyword: string;
  response: string;
  category: string;
  popularity: number;
}

// 预设热梗库
export const PRESET_MEMES: Meme[] = [
  { id: '1', keyword: '栓Q', response: '哈哈哈栓Q！', category: '网络用语', popularity: 10 },
  { id: '2', keyword: '绝绝子', response: '真的是绝绝子！', category: '网络用语', popularity: 9 },
  { id: '3', keyword: 'yyds', response: '永远的神！', category: '缩写', popularity: 10 },
  { id: '4', keyword: '芭比Q', response: '完了芭比Q了！', category: '网络用语', popularity: 8 },
  { id: '5', keyword: '摆烂', response: '不想努力了，摆烂吧~', category: '心态', popularity: 9 },
  { id: '6', keyword: '破防', response: '这下真的破防了', category: '情绪', popularity: 8 },
  { id: '7', keyword: '内卷', response: '别卷了别卷了', category: '社会', popularity: 9 },
  { id: '8', keyword: '躺平', response: '躺平也是一种生活方式', category: '心态', popularity: 9 },
  { id: '9', keyword: '社死', response: '社死现场哈哈哈', category: '尴尬', popularity: 8 },
  { id: '10', keyword: '整活', response: '又在整活了是吧', category: '行为', popularity: 7 },
  { id: '11', keyword: '拿捏', response: '拿捏得死死的', category: '掌控', popularity: 8 },
  { id: '12', keyword: '纯纯', response: '纯纯的XX', category: '强调', popularity: 7 },
  { id: '13', keyword: 'i了i了', response: 'i了i了！', category: '喜欢', popularity: 8 },
  { id: '14', keyword: '爷青回', response: '爷的青春回来了！', category: '怀旧', popularity: 8 },
  { id: '15', keyword: '破案了', response: '破案了破案了', category: '恍然大悟', popularity: 7 },
];

// 检测消息中的热梗
export const detectMemes = (message: string): Meme[] => {
  const detected: Meme[] = [];
  const allMemes = [...PRESET_MEMES, ...loadCustomMemes()];
  
  for (const meme of allMemes) {
    if (message.includes(meme.keyword)) {
      detected.push(meme);
    }
  }
  
  return detected.sort((a, b) => b.popularity - a.popularity);
};

// 生成热梗回复
export const generateMemeResponse = (detectedMemes: Meme[]): string | null => {
  if (detectedMemes.length === 0) return null;
  
  // 随机选择一个检测到的梗进行回复
  const randomMeme = detectedMemes[Math.floor(Math.random() * Math.min(3, detectedMemes.length))];
  return randomMeme.response;
};

// 使用AI理解和回应热梗
export const generateAIMemeResponse = async (
  message: string,
  detectedMemes: Meme[],
  apiConfig: ApiConfig,
  characterName: string
): Promise<string> => {
  if (!apiConfig.baseUrl || !apiConfig.apiKey || !apiConfig.modelName) {
    // 如果API不可用，使用预设回复
    return generateMemeResponse(detectedMemes) || '哈哈哈';
  }

  const memesInfo = detectedMemes.map(m => `${m.keyword}(${m.category})`).join('、');
  
  const prompt = `对方说："${message}"

这句话中包含了网络热梗：${memesInfo}

请以${characterName}的身份，用幽默、自然的方式回应这些梗。要求：
1. 体现出你理解这些梗的含义
2. 回复要简短、有趣
3. 可以接梗或者调侃
4. 不要太正式，要口语化
5. 1-2句话即可`;

  try {
    const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: apiConfig.modelName,
        messages: [
          { role: 'system', content: '你是一个懂网络热梗的年轻人，善于用幽默的方式接梗。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.9,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      throw new Error('API请求失败');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || generateMemeResponse(detectedMemes) || '哈哈哈';
  } catch (error) {
    console.error('生成热梗回复失败:', error);
    return generateMemeResponse(detectedMemes) || '哈哈哈';
  }
};

// 保存自定义热梗
export const saveCustomMeme = (meme: Omit<Meme, 'id'>) => {
  const custom = loadCustomMemes();
  const newMeme: Meme = {
    ...meme,
    id: Date.now().toString(),
  };
  custom.push(newMeme);
  localStorage.setItem('customMemes', JSON.stringify(custom));
  return newMeme;
};

// 加载自定义热梗
export const loadCustomMemes = (): Meme[] => {
  const saved = localStorage.getItem('customMemes');
  return saved ? JSON.parse(saved) : [];
};

// 获取所有热梗
export const getAllMemes = (): Meme[] => {
  return [...PRESET_MEMES, ...loadCustomMemes()];
};

// 删除自定义热梗
export const deleteCustomMeme = (id: string) => {
  const custom = loadCustomMemes();
  const updated = custom.filter(m => m.id !== id);
  localStorage.setItem('customMemes', JSON.stringify(updated));
};

// 更新热梗流行度
export const updateMemePopularity = (id: string, delta: number) => {
  const custom = loadCustomMemes();
  const updated = custom.map(m => 
    m.id === id ? { ...m, popularity: Math.max(0, Math.min(10, m.popularity + delta)) } : m
  );
  localStorage.setItem('customMemes', JSON.stringify(updated));
};
