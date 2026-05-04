/**
 * API错误处理工具
 * 提供详细的错误提示和解决方案
 */

export interface ApiErrorInfo {
  title: string;
  message: string;
  suggestion: string;
  icon: string;
}

function classifyServer500Error(errorMessageRaw?: string): ApiErrorInfo | null {
  const text = (errorMessageRaw || '').toLowerCase();
  if (!text) return null;

  // key/token/auth issues occasionally come back as 500 via proxy layers
  if (
    text.includes('invalid_api_key') ||
    text.includes('invalid api key') ||
    text.includes('api key invalid') ||
    text.includes('authentication') ||
    text.includes('unauthorized') ||
    text.includes('token')
  ) {
    return {
      title: '密钥可能失效',
      message: '上游返回了认证相关错误（被网关包装为500）',
      suggestion: '请检查设置中的API Key是否正确、是否过期，必要时重新生成后替换。',
      icon: '🔑',
    };
  }

  if (
    text.includes('model_not_found') ||
    text.includes('model not found') ||
    text.includes('unsupported model') ||
    text.includes('invalid model') ||
    text.includes('model is not available') ||
    text.includes('does not exist') ||
    text.includes('rejected') ||
    text.includes('safety')
  ) {
    return {
      title: '模型拒绝或不可用',
      message: '当前模型不可用、被拒绝，或名称不被服务端接受',
      suggestion: '请切换到可用模型，或检查模型名与渠道是否匹配。',
      icon: '🤖',
    };
  }

  if (
    text.includes('timeout') ||
    text.includes('timed out') ||
    text.includes('request time-out') ||
    text.includes('upstream request timeout') ||
    text.includes('gateway timeout')
  ) {
    return {
      title: '请求超时',
      message: '后端处理超时（被网关包装为500）',
      suggestion: '请稍后重试，或缩短上下文/减少单次请求内容。',
      icon: '⏳',
    };
  }

  if (
    text.includes('bad gateway') ||
    text.includes('service unavailable') ||
    text.includes('upstream') ||
    text.includes('econnrefused') ||
    text.includes('connection refused') ||
    text.includes('temporarily unavailable') ||
    text.includes('server overloaded')
  ) {
    return {
      title: '后端暂不可用',
      message: '网关无法稳定连接上游服务',
      suggestion: '这是服务端链路问题，建议稍后重试或切换可用渠道。',
      icon: '🛠️',
    };
  }

  return null;
}

/**
 * 解析HTTP错误状态码，返回详细的错误信息
 */
export const getApiErrorInfo = (statusCode: number, errorMessage?: string): ApiErrorInfo => {
  switch (statusCode) {
    case 400:
      return {
        title: '请求格式错误',
        message: '发送给API的请求格式不正确',
        suggestion: '这通常是程序问题。如果持续出现，请联系开发者。',
        icon: '⚠️'
      };
    
    case 401:
      return {
        title: 'API密钥无效',
        message: '您的API密钥不正确或已过期',
        suggestion: '请前往"设置 → API配置"检查并更新您的API密钥。',
        icon: '🔑'
      };
    
    case 403:
      return {
        title: '访问被拒绝',
        message: '您的API密钥没有权限访问此服务',
        suggestion: '请检查API密钥是否有正确的权限，或联系API服务商。',
        icon: '🚫'
      };
    
    case 404:
      return {
        title: 'API地址错误',
        message: '无法找到指定的API服务',
        suggestion: '请检查"设置 → API配置"中的API地址是否正确。',
        icon: '🔍'
      };
    
    case 429:
      return {
        title: '请求过于频繁',
        message: '您在短时间内发送了太多请求，触发了API的速率限制',
        suggestion: '请稍等片刻（建议等待1-3分钟）后再试。如果频繁出现此问题，请考虑：\n• 升级到更高配额的API套餐\n• 减少同时发送的消息数量\n• 开启"自定义上下文数量"限制消息长度',
        icon: '⏱️'
      };
    
    case 500:
      {
        const classified = classifyServer500Error(errorMessage);
        if (classified) return classified;
      }
      return {
        title: 'API服务器错误',
        message: 'API服务器遇到了内部错误',
        suggestion: '这是API服务商的问题，不是您的问题。请稍后重试，或联系API服务商。',
        icon: '💥'
      };
    
    case 502:
      return {
        title: '网关错误',
        message: 'API网关无法连接到后端服务器',
        suggestion: '这通常是临时性问题，请稍后重试（建议等待5-10分钟）。',
        icon: '🌐'
      };
    
    case 503:
      return {
        title: 'API服务暂时不可用',
        message: 'API服务正在维护或负载过高',
        suggestion: '请稍后重试（建议等待5-10分钟）。如果长时间无法访问，请访问API服务商的状态页面查看是否在维护。',
        icon: '🔧'
      };
    
    case 504:
      return {
        title: 'API响应超时',
        message: 'API服务器响应时间过长，请求超时',
        suggestion: '可能是网络问题或API服务器负载过高。建议：\n• 检查您的网络连接\n• 稍后重试\n• 开启"自定义上下文数量"减少请求大小',
        icon: '⏳'
      };
    
    default:
      // 通用错误
      if (statusCode >= 500) {
        return {
          title: 'API服务器错误',
          message: `API服务器返回错误（状态码：${statusCode}）`,
          suggestion: '这是API服务商的问题，请稍后重试或联系API服务商。',
          icon: '💥'
        };
      } else if (statusCode >= 400) {
        return {
          title: '请求错误',
          message: `请求失败（状态码：${statusCode}）${errorMessage ? `\n${errorMessage}` : ''}`,
          suggestion: '请检查您的API配置或联系开发者。',
          icon: '⚠️'
        };
      } else {
        return {
          title: '未知错误',
          message: `发生了未知错误（状态码：${statusCode}）`,
          suggestion: '请稍后重试或联系开发者。',
          icon: '❓'
        };
      }
  }
};

/**
 * 解析网络错误，返回详细的错误信息
 */
export const getNetworkErrorInfo = (error: Error): ApiErrorInfo => {
  const errorMessage = error.message.toLowerCase();
  
  // 网络连接问题
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return {
      title: '网络连接失败',
      message: '无法连接到API服务器',
      suggestion: '请检查：\n• 您的网络连接是否正常\n• API地址是否正确\n• 是否需要使用VPN或代理\n• 防火墙是否阻止了连接',
      icon: '📡'
    };
  }
  
  // 超时问题
  if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
    return {
      title: '请求超时',
      message: '连接API服务器超时',
      suggestion: '可能的原因：\n• 网络速度较慢\n• API服务器响应慢\n• 请求内容过大\n\n建议开启"自定义上下文数量"限制消息数量。',
      icon: '⏱️'
    };
  }
  
  // CORS问题
  if (errorMessage.includes('cors')) {
    return {
      title: '跨域访问被阻止',
      message: 'API服务器不允许从浏览器直接访问',
      suggestion: '这通常需要API服务商配置CORS。请联系API服务商或使用支持的API地址。',
      icon: '🚧'
    };
  }
  
  // SSL/证书问题
  if (errorMessage.includes('ssl') || errorMessage.includes('certificate')) {
    return {
      title: 'SSL证书错误',
      message: 'API服务器的SSL证书有问题',
      suggestion: '请检查API地址是否正确（应使用https://）。如果问题持续，请联系API服务商。',
      icon: '🔒'
    };
  }
  
  // 通用网络错误
  return {
    title: '连接失败',
    message: error.message || '无法连接到API服务器',
    suggestion: '请检查您的网络连接和API配置，然后重试。',
    icon: '❌'
  };
};

/**
 * 格式化错误信息为可显示的字符串
 */
export const formatErrorMessage = (errorInfo: ApiErrorInfo): string => {
  return `${errorInfo.icon} ${errorInfo.title}\n\n${errorInfo.message}\n\n💡 建议：\n${errorInfo.suggestion}`;
};

/**
 * 从Response对象获取详细错误信息
 */
export const getErrorFromResponse = async (response: Response): Promise<ApiErrorInfo> => {
  let errorMessage = '';
  try {
    // 尝试解析JSON错误信息
    const data = await response.json();
    errorMessage = data.error?.message || data.message || '';
    return getApiErrorInfo(response.status, errorMessage);
  } catch {
    // ignore and fallback to text parse below
  }

  try {
    const text = await response.text();
    const compactText = text.replace(/\s+/g, ' ').trim();
    errorMessage = compactText.slice(0, 300);
  } catch {
    // ignore
  }

  return getApiErrorInfo(response.status, errorMessage);
};

/**
 * 判断错误是否可以重试
 */
export const isRetryableError = (statusCode: number): boolean => {
  // 以下错误可以重试
  return [408, 429, 500, 502, 503, 504].includes(statusCode);
};

/**
 * 获取建议的重试延迟时间（毫秒）
 */
export const getRetryDelay = (statusCode: number, retryCount: number = 0): number => {
  switch (statusCode) {
    case 429: // 速率限制
      return Math.min(60000 * Math.pow(2, retryCount), 300000); // 1分钟到5分钟，指数退避
    case 503: // 服务不可用
      return Math.min(30000 * Math.pow(2, retryCount), 180000); // 30秒到3分钟
    case 500:
    case 502:
    case 504:
      return Math.min(10000 * Math.pow(2, retryCount), 60000); // 10秒到1分钟
    default:
      return Math.min(5000 * Math.pow(2, retryCount), 30000); // 5秒到30秒
  }
};
