/**
 * 音频生成工具 - 为音乐卡片生成示例音频
 */

export interface AudioSettings {
  frequency: number;
  duration: number;
  waveType: OscillatorType;
  volume: number;
}

/**
 * 根据音乐情绪生成示例音频
 */
export function generateAudioForMood(mood: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // 检查浏览器支持
      if (!window.AudioContext && !(window as any).webkitAudioContext) {
        reject(new Error('当前浏览器不支持音频生成'));
        return;
      }

      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();

      // 根据心情设置音频参数
      const moodSettings: Record<string, AudioSettings> = {
        happy: { frequency: 440, duration: 3, waveType: 'sine', volume: 0.3 },
        sad: { frequency: 220, duration: 4, waveType: 'sine', volume: 0.2 },
        energetic: { frequency: 660, duration: 2, waveType: 'square', volume: 0.4 },
        calm: { frequency: 330, duration: 5, waveType: 'sine', volume: 0.15 },
        romantic: { frequency: 523, duration: 4, waveType: 'triangle', volume: 0.25 },
        mysterious: { frequency: 110, duration: 6, waveType: 'sawtooth', volume: 0.2 }
      };

      const settings = moodSettings[mood] || moodSettings.happy;
      
      // 创建音频缓冲区
      const sampleRate = audioContext.sampleRate;
      const numSamples = Math.floor(sampleRate * settings.duration);
      const buffer = audioContext.createBuffer(2, numSamples, sampleRate);
      
      // 生成左右声道数据
      for (let channel = 0; channel < 2; channel++) {
        const channelData = buffer.getChannelData(channel);
        
        for (let i = 0; i < numSamples; i++) {
          const t = i / sampleRate;
          
          // 基础波形
          let sample = 0;
          
          // 主频率
          sample += Math.sin(2 * Math.PI * settings.frequency * t);
          
          // 根据心情添加谐波
          if (mood === 'happy') {
            sample += 0.3 * Math.sin(2 * Math.PI * settings.frequency * 2 * t);
            sample += 0.1 * Math.sin(2 * Math.PI * settings.frequency * 3 * t);
          } else if (mood === 'energetic') {
            sample += 0.5 * Math.sin(2 * Math.PI * settings.frequency * 1.5 * t);
            sample += 0.2 * Math.sin(2 * Math.PI * settings.frequency * 4 * t);
          } else if (mood === 'romantic') {
            sample += 0.4 * Math.sin(2 * Math.PI * settings.frequency * 0.5 * t);
            sample += 0.2 * Math.sin(2 * Math.PI * settings.frequency * 1.5 * t);
          }
          
          // 应用包络线（淡入淡出）
          const fadeInTime = 0.1;
          const fadeOutTime = 0.5;
          let envelope = 1;
          
          if (t < fadeInTime) {
            envelope = t / fadeInTime;
          } else if (t > settings.duration - fadeOutTime) {
            envelope = (settings.duration - t) / fadeOutTime;
          }
          
          // 应用音量和包络线
          channelData[i] = sample * settings.volume * envelope;
        }
      }
      
      // 将缓冲区转换为WAV格式的DataURL
      const wavArrayBuffer = bufferToWav(buffer);
      const blob = new Blob([wavArrayBuffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      
      resolve(url);
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 将AudioBuffer转换为WAV格式
 */
function bufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const samples = new Float32Array(buffer.length * numChannels);
  let offset = 0;
  
  // 交错音频数据
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      samples[offset++] = buffer.getChannelData(channel)[i];
    }
  }
  
  const dataLength = samples.length * bytesPerSample;
  const headerLength = 44;
  const totalLength = headerLength + dataLength;
  
  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);
  
  // WAV头部
  let pos = 0;
  
  // RIFF chunk
  writeString(view, pos, 'RIFF'); pos += 4;
  view.setUint32(pos, totalLength - 8, true); pos += 4;
  writeString(view, pos, 'WAVE'); pos += 4;
  
  // fmt chunk
  writeString(view, pos, 'fmt '); pos += 4;
  view.setUint32(pos, 16, true); pos += 4; // chunk size
  view.setUint16(pos, format, true); pos += 2;
  view.setUint16(pos, numChannels, true); pos += 2;
  view.setUint32(pos, sampleRate, true); pos += 4;
  view.setUint32(pos, sampleRate * blockAlign, true); pos += 4; // byte rate
  view.setUint16(pos, blockAlign, true); pos += 2;
  view.setUint16(pos, bitDepth, true); pos += 2;
  
  // data chunk
  writeString(view, pos, 'data'); pos += 4;
  view.setUint32(pos, dataLength, true); pos += 4;
  
  // 写入音频数据
  const volume = 0.8;
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(pos, sample * 0x7FFF * volume, true);
    pos += 2;
  }
  
  return arrayBuffer;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * 清理生成的音频URL
 */
export function cleanupAudioUrl(url: string) {
  try {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.warn('清理音频URL失败:', error);
  }
}
