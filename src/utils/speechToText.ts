// 语音转文字工具函数
// 使用智谱清言API进行语音识别

export interface SpeechToTextConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
}

/**
 * 将音频Blob转换为Base64
 */
async function audioToBase64(audioBlob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(audioBlob);
  });
}

/**
 * 调用智谱清言API进行语音识别
 */
export async function transcribeAudio(
  audioBlob: Blob,
  config: SpeechToTextConfig
): Promise<string> {
  try {
    console.log('🎤 开始语音识别...');
    console.log('音频信息:', { 
      size: audioBlob.size, 
      type: audioBlob.type 
    });
    console.log('API配置:', {
      url: config.apiUrl,
      model: config.model,
      hasKey: !!config.apiKey
    });

    // 检查音频大小
    if (audioBlob.size === 0) {
      throw new Error('音频文件为空');
    }

    // 将音频转换为Base64
    const audioBase64 = await audioToBase64(audioBlob);
    console.log('音频Base64长度:', audioBase64.length);
    
    // 构建API URL（移除可能重复的/v1）
    let apiUrl = config.apiUrl.replace(/\/+$/, ''); // 移除末尾的斜杠
    if (!apiUrl.includes('/v1/chat/completions')) {
      if (!apiUrl.endsWith('/v1')) {
        apiUrl += '/v1';
      }
      apiUrl += '/chat/completions';
    }
    
    console.log('调用API:', apiUrl);
    
    // 调用智谱清言API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'audio',
                audio: audioBase64,
              },
              {
                type: 'text',
                text: '请将这段语音转换为文字。只输出识别的文字内容，不要添加任何额外的解释或标点符号修正。',
              },
            ],
          },
        ],
      }),
    });

    console.log('API响应状态:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API错误响应:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = {};
      }
      
      throw new Error(
        errorData.error?.message || `API请求失败 (${response.status}): ${errorText.substring(0, 200)}`
      );
    }

    const data = await response.json();
    console.log('API响应数据:', data);
    
    const transcript = data.choices?.[0]?.message?.content?.trim();

    if (!transcript) {
      throw new Error('API未返回识别结果');
    }

    console.log('✅ 语音识别成功:', transcript);
    return transcript;
  } catch (error) {
    console.error('❌ 语音识别失败:', error);
    throw error;
  }
}

/**
 * 检查语音识别配置是否有效
 */
export function isValidSpeechConfig(config?: {
  enabled?: boolean;
  apiUrl?: string;
  apiKey?: string;
  model?: string;
}): boolean {
  return !!(
    config?.enabled &&
    config?.apiUrl &&
    config?.apiKey &&
    config?.model
  );
}
