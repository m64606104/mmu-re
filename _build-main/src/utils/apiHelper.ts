import { ApiConfig } from '../types';
import { resolveTextChatModelAvoidingVisionOnlyModelClash } from './textChatModelGuard';

/** 合并路径里多余的连续 `/`（不破坏 `https://` 协议部分） */
export function normalizeOpenAiCompatibleBaseUrl(url: string): string {
  const t = url.trim();
  if (!t) return t;
  return t.replace(/([^:]\/)\/+/g, '$1');
}

/**
 * 智能构建API完整URL
 * 处理各种API配置情况，自动添加正确的路径
 */
export function buildApiUrl(apiConfig: ApiConfig): string {
  let baseUrl = apiConfig.baseUrl?.trim() || '';
  
  // 如果没有配置baseUrl，返回空（会在调用时报错）
  if (!baseUrl) {
    console.error('❌ API baseUrl未配置');
    return '';
  }

  baseUrl = normalizeOpenAiCompatibleBaseUrl(baseUrl);
  
  // 如果已经包含完整的 /chat/completions 路径，直接返回
  if (baseUrl.includes('/chat/completions')) {
    console.log('✅ 使用完整API路径:', baseUrl);
    return baseUrl;
  }
  
  // 移除末尾的斜杠
  baseUrl = baseUrl.replace(/\/+$/, '');
  
  // 智能添加路径
  let apiUrl: string;
  if (baseUrl.includes('/v1')) {
    // 已经包含 /v1，只需要添加 /chat/completions
    apiUrl = `${baseUrl}/chat/completions`;
  } else {
    // 没有 /v1，添加标准路径
    apiUrl = `${baseUrl}/v1/chat/completions`;
  }
  
  console.log('🌐 构建API URL:', apiUrl);
  return apiUrl;
}

/**
 * 统一的API调用函数
 * 自动处理URL、Headers、错误等
 */
export async function callChatCompletionApi(
  apiConfig: ApiConfig,
  messages: Array<{ role: string; content: string }>,
  options?: {
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
  }
): Promise<any> {
  const apiUrl = buildApiUrl(apiConfig);
  
  if (!apiUrl) {
    throw new Error('API URL配置错误，请检查设置');
  }
  
  if (!apiConfig.apiKey?.trim()) {
    throw new Error('API Key未配置，请先在设置中配置');
  }
  
  const model = resolveTextChatModelAvoidingVisionOnlyModelClash(
    apiConfig,
    String(apiConfig.modelName || '').trim()
  );
  const requestBody = {
    model: model || 'gpt-3.5-turbo',
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.max_tokens ?? 2000,
    stream: options?.stream ?? false,
  };
  
  console.log('📡 API请求:', {
    url: apiUrl,
    model: requestBody.model,
    messageCount: messages.length,
  });
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API错误响应:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // 验证响应格式
    if (!data.choices || data.choices.length === 0) {
      console.error('❌ API返回格式错误:', data);
      throw new Error('API返回数据格式错误：choices为空');
    }
    
    const content = data.choices[0]?.message?.content;
    if (!content) {
      console.error('❌ API返回内容为空:', data.choices[0]);
      throw new Error('API返回内容为空');
    }
    
    console.log('✅ API调用成功');
    return data;
    
  } catch (error) {
    console.error('❌ API调用异常:', error);
    throw error;
  }
}

/**
 * 快速调用API并获取文本回复
 */
export async function getAIResponse(
  apiConfig: ApiConfig,
  messages: Array<{ role: string; content: string }>,
  options?: {
    temperature?: number;
    max_tokens?: number;
  }
): Promise<string> {
  const data = await callChatCompletionApi(apiConfig, messages, options);
  return data.choices[0]?.message?.content || '';
}
