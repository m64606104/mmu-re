/**
 * 音频测试服务 - 参考DLC同层听音乐实现
 * 提供音频可用性检测和播放能力测试
 */

interface AudioTestResult {
  success: boolean;
  error?: string;
  duration?: number;
  canPlay: boolean;
  format: string;
}

class AudioTestService {
  private static instance: AudioTestService;
  
  public static getInstance(): AudioTestService {
    if (!AudioTestService.instance) {
      AudioTestService.instance = new AudioTestService();
    }
    return AudioTestService.instance;
  }

  /**
   * 测试音频URL是否可播放 - 参考DLC实现
   */
  async testAudioUrl(url: string): Promise<AudioTestResult> {
    return new Promise((resolve) => {
      const audio = new Audio();
      let resolved = false;
      
      // 设置超时
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({
            success: false,
            error: '音频加载超时',
            canPlay: false,
            format: this.getAudioFormat(url)
          });
        }
      }, 10000); // 10秒超时

      audio.addEventListener('loadedmetadata', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve({
            success: true,
            duration: audio.duration,
            canPlay: true,
            format: this.getAudioFormat(url)
          });
        }
      });

      audio.addEventListener('canplay', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve({
            success: true,
            duration: audio.duration || 0,
            canPlay: true,
            format: this.getAudioFormat(url)
          });
        }
      });

      audio.addEventListener('error', (e: Event) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          const target = e.target as HTMLAudioElement;
          const errorCode = target.error?.code;
          let errorMessage = '音频加载失败';
          
          switch (errorCode) {
            case 1: // MEDIA_ERR_ABORTED
              errorMessage = '音频加载被中止';
              break;
            case 2: // MEDIA_ERR_NETWORK
              errorMessage = '网络错误，无法加载音频';
              break;
            case 3: // MEDIA_ERR_DECODE
              errorMessage = '音频格式不支持或解码失败';
              break;
            case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
              errorMessage = '音频源不支持';
              break;
          }

          resolve({
            success: false,
            error: errorMessage,
            canPlay: false,
            format: this.getAudioFormat(url)
          });
        }
      });

      // 参考DLC：直接设置src并尝试加载
      try {
        audio.src = url;
        audio.preload = 'metadata';
        audio.load();
      } catch (error: any) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve({
            success: false,
            error: `设置音频源失败: ${error.message}`,
            canPlay: false,
            format: this.getAudioFormat(url)
          });
        }
      }
    });
  }

  /**
   * 批量测试音频URL列表
   */
  async testMultipleUrls(urls: string[]): Promise<Map<string, AudioTestResult>> {
    const results = new Map<string, AudioTestResult>();
    
    // 并行测试，但限制并发数
    const batchSize = 3;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const promises = batch.map(async url => {
        const result = await this.testAudioUrl(url);
        results.set(url, result);
      });
      
      await Promise.all(promises);
    }
    
    return results;
  }

  /**
   * 测试浏览器音频播放能力
   */
  testBrowserCapability(): {
    audioContext: boolean;
    webAudio: boolean;
    formats: string[];
  } {
    const audio = new Audio();
    const formats: string[] = [];
    
    // 测试支持的格式
    if (audio.canPlayType('audio/mpeg')) formats.push('mp3');
    if (audio.canPlayType('audio/wav')) formats.push('wav');
    if (audio.canPlayType('audio/ogg')) formats.push('ogg');
    if (audio.canPlayType('audio/mp4')) formats.push('m4a');
    if (audio.canPlayType('audio/webm')) formats.push('webm');

    return {
      audioContext: !!(window.AudioContext || (window as any).webkitAudioContext),
      webAudio: !!audio,
      formats
    };
  }

  /**
   * 生成测试音频URL - 参考DLC的音频生成方式
   */
  generateTestAudio(): string {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const duration = 5; // 5秒测试音频
      const sampleRate = audioContext.sampleRate;
      const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
      
      const channelData = buffer.getChannelData(0);
      
      // 生成简单的正弦波测试音
      for (let i = 0; i < buffer.length; i++) {
        const time = i / sampleRate;
        channelData[i] = Math.sin(2 * Math.PI * 440 * time) * 0.1; // 440Hz A音
      }
      
      // 转换为Blob URL
      return this.audioBufferToBlob(buffer);
    } catch (error) {
      console.error('生成测试音频失败:', error);
      return '';
    }
  }

  /**
   * AudioBuffer转换为Blob URL - 参考DLC实现
   */
  private audioBufferToBlob(buffer: AudioBuffer): string {
    try {
      const length = buffer.length;
      const arrayBuffer = new ArrayBuffer(44 + length * 2);
      const view = new DataView(arrayBuffer);
      
      // WAV文件头
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };
      
      writeString(0, 'RIFF');
      view.setUint32(4, 36 + length * 2, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, buffer.sampleRate, true);
      view.setUint32(28, buffer.sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeString(36, 'data');
      view.setUint32(40, length * 2, true);
      
      const channelData = buffer.getChannelData(0);
      let offset = 44;
      for (let i = 0; i < length; i++) {
        const sample = Math.max(-1, Math.min(1, channelData[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
      
      const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('转换AudioBuffer失败:', error);
      return '';
    }
  }

  /**
   * 获取音频格式
   */
  private getAudioFormat(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase() || '';
    const formatMap: Record<string, string> = {
      'mp3': 'MP3',
      'wav': 'WAV', 
      'ogg': 'OGG',
      'm4a': 'M4A',
      'webm': 'WebM',
      'flac': 'FLAC'
    };
    return formatMap[extension] || 'Unknown';
  }

  /**
   * 获取详细的音频测试报告
   */
  async getAudioTestReport(urls: string[] = []): Promise<{
    browserCapability: any;
    urlTests: Map<string, AudioTestResult>;
    testAudio: string;
    summary: {
      totalUrls: number;
      successfulUrls: number;
      failedUrls: number;
      supportedFormats: string[];
    };
  }> {
    console.log('🎵 开始音频兼容性测试...');
    
    const browserCapability = this.testBrowserCapability();
    const urlTests = urls.length > 0 ? await this.testMultipleUrls(urls) : new Map();
    const testAudio = this.generateTestAudio();
    
    const successfulUrls = Array.from(urlTests.values()).filter(r => r.success).length;
    const failedUrls = urls.length - successfulUrls;
    
    const report = {
      browserCapability,
      urlTests,
      testAudio,
      summary: {
        totalUrls: urls.length,
        successfulUrls,
        failedUrls,
        supportedFormats: browserCapability.formats
      }
    };
    
    console.log('🎵 音频测试报告:', report);
    return report;
  }
}

// 导出单例
export default AudioTestService.getInstance();

// 导出类型
export type { AudioTestResult };
