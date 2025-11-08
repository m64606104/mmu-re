import { Conversation, Message, ApiConfig } from '../types';

/**
 * AI生成任务
 */
interface AIGenerationTask {
  id: string;
  conversationId: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  startTime: number;
  messages?: Message[];
  error?: string;
}

/**
 * 消息通知回调
 */
type MessageNotificationCallback = (conversationId: string, messages: Message[]) => void;

/**
 * 后台任务管理器
 */
class BackgroundTaskManager {
  private tasks: Map<string, AIGenerationTask> = new Map();
  private notificationCallbacks: MessageNotificationCallback[] = [];

  /**
   * 注册消息通知回调
   */
  onMessageReceived(callback: MessageNotificationCallback) {
    this.notificationCallbacks.push(callback);
  }

  /**
   * 触发消息通知
   */
  private notifyMessage(conversationId: string, messages: Message[]) {
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(conversationId, messages);
      } catch (error) {
        console.error('消息通知回调失败:', error);
      }
    });
  }

  /**
   * 创建AI生成任务
   */
  async createGenerationTask(
    conversation: Conversation,
    apiConfig: ApiConfig,
    requestBody: any,
    onUpdate: (messages: Message[], conversationId: string, error?: string) => void
  ): Promise<string> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const task: AIGenerationTask = {
      id: taskId,
      conversationId: conversation.id,
      status: 'pending',
      startTime: Date.now(),
    };
    
    this.tasks.set(taskId, task);
    
    // 异步执行生成
    this.executeGeneration(taskId, conversation, apiConfig, requestBody, onUpdate);
    
    return taskId;
  }

  /**
   * 执行AI生成
   */
  private async executeGeneration(
    taskId: string,
    conversation: Conversation,
    apiConfig: ApiConfig,
    requestBody: any,
    onUpdate: (messages: Message[], conversationId: string, error?: string) => void
  ) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    try {
      task.status = 'generating';
      
      // 🔥 添加60秒超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      
      const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiConfig.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API请求失败: HTTP ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage = data.choices[0]?.message?.content;

      if (!assistantMessage || assistantMessage.trim() === '') {
        throw new Error('AI返回空内容');
      }

      // 检查是否选择不回复
      if (assistantMessage.trim() === '[不回复]' || assistantMessage.includes('[不回复]')) {
        task.status = 'completed';
        task.messages = [];
        // ✅ 通知ChatScreen（传递空数组表示不回复）
        onUpdate([], conversation.id);
        return;
      }

      // 解析和分割消息
      const splitMsgs = this.splitMessages(assistantMessage);
      const messages = this.convertToMessages(splitMsgs);

      task.status = 'completed';
      task.messages = messages;

      // 更新回调
      onUpdate(messages, conversation.id);
      
      // 触发通知
      this.notifyMessage(conversation.id, messages);
      
      console.log(`✅ 后台任务完成: ${taskId}`);
    } catch (error) {
      task.status = 'failed';
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      task.error = errorMessage;
      console.error(`❌ 后台任务失败: ${taskId}`, error);
      
      // 🔥 关键修复：失败时通知ChatScreen，并传递错误信息
      // 空数组 + error = API调用失败
      // 空数组 + 无error = AI选择不回复
      console.log(`通知ChatScreen任务失败: ${errorMessage}`);
      onUpdate([], conversation.id, errorMessage);
    }
  }

  /**
   * 分割消息
   */
  private splitMessages(content: string): string[] {
    const messages: string[] = [];
    const lines = content.split('\n');
    let currentMessage = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        if (currentMessage) {
          messages.push(currentMessage.trim());
          currentMessage = '';
        }
        continue;
      }

      if (trimmedLine.match(/^("|"|「|『)/)) {
        if (currentMessage) {
          messages.push(currentMessage.trim());
        }
        currentMessage = trimmedLine;
      } else if (currentMessage && trimmedLine.match(/("|"|」|』)$/)) {
        currentMessage += '\n' + trimmedLine;
        messages.push(currentMessage.trim());
        currentMessage = '';
      } else if (currentMessage) {
        currentMessage += '\n' + trimmedLine;
      } else {
        currentMessage = trimmedLine;
      }
    }

    if (currentMessage) {
      messages.push(currentMessage.trim());
    }

    return messages.length > 0 ? messages : [content.trim()];
  }

  /**
   * 转换为Message对象
   */
  private convertToMessages(contents: string[]): Message[] {
    return contents.slice(0, 23).map((content, i) => {
      // 清理可能泄漏的角色前缀
      let cleanedContent = content
        .replace(/^(User|用户|AI|Assistant|助手|System|系统)[:：\s]/i, '')
        .trim();
      
      // 检测媒体类型
      const imageMatch = cleanedContent.match(/\[图片[:：]([^\]]+)\]/);
      const videoMatch = cleanedContent.match(/\[视频[:：]([^\]]+)\]/);
      // 修改语音正则：更宽松地匹配语音内容，支持包含标点符号的内容
      const voiceMatch = cleanedContent.match(/\[语音[:：](.+?)(?:[，,]\s*(?:时长)?(\d+)秒?)?\]/);
      const stickerMatch = cleanedContent.match(/\[表情包[:：]([^\]]+)\]/);

      let message: Message;
      const baseId = Date.now().toString() + '_ai_' + i + Math.random();

      if (imageMatch) {
        const cleanContent = cleanedContent.replace(/\[图片[:：][^\]]+\]/, '').trim();
        message = {
          id: baseId,
          role: 'assistant',
          content: cleanContent || '[图片]',
          timestamp: Date.now(),
          mediaType: 'image',
          mediaDescription: imageMatch[1],
          isMediaDescriptionOnly: true
        };
      } else if (videoMatch) {
        const cleanContent = cleanedContent.replace(/\[视频[:：][^\]]+\]/, '').trim();
        message = {
          id: baseId,
          role: 'assistant',
          content: cleanContent || '[视频]',
          timestamp: Date.now(),
          mediaType: 'video',
          mediaDescription: videoMatch[1],
          isMediaDescriptionOnly: true
        };
      } else if (voiceMatch) {
        const cleanContent = cleanedContent.replace(/\[语音[:：].+?\]/, '').trim();
        message = {
          id: baseId,
          role: 'assistant',
          content: cleanContent || '[语音]',
          timestamp: Date.now(),
          mediaType: 'voice',
          mediaDescription: voiceMatch[1].trim(), // 语音内容（去掉时长部分）
          voiceDuration: parseInt(voiceMatch[2]) || 3, // 时长（秒）
          isMediaDescriptionOnly: true
        };
      } else if (stickerMatch) {
        const cleanContent = cleanedContent.replace(/\[表情包[:：][^\]]+\]/, '').trim();
        message = {
          id: baseId,
          role: 'assistant',
          content: cleanContent || '[表情包]',
          timestamp: Date.now(),
          mediaType: 'sticker',
          mediaDescription: stickerMatch[1],
          isMediaDescriptionOnly: true
        };
      } else {
        message = {
          id: baseId,
          role: 'assistant',
          content: cleanedContent,
          timestamp: Date.now(),
        };
      }

      return message;
    });
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId: string): AIGenerationTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 清理完成的任务
   */
  cleanupCompletedTasks() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    for (const [taskId, task] of this.tasks.entries()) {
      if (task.status === 'completed' || task.status === 'failed') {
        if (now - task.startTime > oneHour) {
          this.tasks.delete(taskId);
        }
      }
    }
  }
}

// 导出单例
export const backgroundTaskManager = new BackgroundTaskManager();

// 定期清理任务
setInterval(() => {
  backgroundTaskManager.cleanupCompletedTasks();
}, 5 * 60 * 1000); // 每5分钟清理一次
