/**
 * 音乐搜索测试服务
 * 用于验证和调试音乐搜索功能
 */

import { realMusicService, RealMusicInfo } from './realMusicService';

export class MusicTestService {
  
  /**
   * 测试音乐搜索功能
   */
  static async testMusicSearch(): Promise<void> {
    console.log('🧪 开始测试音乐搜索功能...');
    
    const testQueries = [
      'Beatles',
      'Taylor Swift',
      'happy',
      'calm',
      '周杰伦'
    ];
    
    for (const query of testQueries) {
      console.log(`\n🔍 测试搜索: "${query}"`);
      
      try {
        const startTime = Date.now();
        const results = await realMusicService.searchPlayableMusic(query);
        const duration = Date.now() - startTime;
        
        console.log(`⏱️  搜索耗时: ${duration}ms`);
        console.log(`📊 搜索结果: ${results.length} 条`);
        
        if (results.length > 0) {
          console.log('✅ 搜索成功！前3个结果:');
          results.slice(0, 3).forEach((music, index) => {
            console.log(`  ${index + 1}. ${music.title} - ${music.artist} [${music.source}]`);
            console.log(`     可播放: ${music.playable ? '是' : '否'}`);
            if (music.audioUrl) {
              console.log(`     音频URL: ${music.audioUrl.substring(0, 50)}...`);
            }
          });
        } else {
          console.log('⚠️  没有找到结果');
        }
        
        // 测试第一个结果的播放能力
        if (results.length > 0 && results[0].audioUrl) {
          console.log(`🎵 测试播放第一个结果: ${results[0].title}`);
          const isValid = await this.testAudioPlayback(results[0].audioUrl);
          console.log(`   播放测试: ${isValid ? '✅ 成功' : '❌ 失败'}`);
        }
        
      } catch (error) {
        console.error(`❌ 搜索 "${query}" 时出错:`, error);
      }
      
      // 等待一秒再测试下一个，避免API限制
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🏁 音乐搜索功能测试完成');
  }
  
  /**
   * 测试音频播放能力
   */
  private static async testAudioPlayback(audioUrl: string): Promise<boolean> {
    return new Promise((resolve) => {
      const audio = new Audio();
      
      const timeout = setTimeout(() => {
        resolve(false);
      }, 5000); // 5秒超时
      
      audio.oncanplay = () => {
        clearTimeout(timeout);
        resolve(true);
      };
      
      audio.onerror = () => {
        clearTimeout(timeout);
        resolve(false);
      };
      
      audio.src = audioUrl;
    });
  }
  
  /**
   * 测试特定API
   */
  static async testSpecificAPI(apiName: string, query: string): Promise<RealMusicInfo[]> {
    console.log(`🧪 测试 ${apiName} API...`);
    
    try {
      // 这里需要根据具体的API来调用
      // 由于私有方法无法直接调用，我们通过主搜索方法来测试
      const results = await realMusicService.searchPlayableMusic(query);
      
      // 筛选特定来源的结果
      const apiResults = results.filter(music => {
        switch (apiName.toLowerCase()) {
          case 'jamendo':
            return music.source === 'jamendo';
          case 'itunes':
            return music.source === 'youtube'; // iTunes结果标记为youtube源
          case 'local':
            return music.source === 'local';
          default:
            return true;
        }
      });
      
      console.log(`📊 ${apiName} API 返回 ${apiResults.length} 个结果`);
      return apiResults;
      
    } catch (error) {
      console.error(`❌ ${apiName} API 测试失败:`, error);
      return [];
    }
  }
  
  /**
   * 获取音乐搜索统计信息
   */
  static async getMusicSearchStats(): Promise<{
    totalAPIs: number;
    workingAPIs: string[];
    failedAPIs: string[];
    avgResponseTime: number;
  }> {
    const testQuery = 'test';
    const apis = ['Jamendo', 'iTunes', 'Local'];
    const workingAPIs: string[] = [];
    const failedAPIs: string[] = [];
    let totalTime = 0;
    
    for (const api of apis) {
      const startTime = Date.now();
      try {
        const results = await this.testSpecificAPI(api, testQuery);
        const responseTime = Date.now() - startTime;
        totalTime += responseTime;
        
        if (results.length > 0) {
          workingAPIs.push(api);
          console.log(`✅ ${api}: ${results.length} 结果 (${responseTime}ms)`);
        } else {
          failedAPIs.push(api);
          console.log(`⚠️  ${api}: 无结果 (${responseTime}ms)`);
        }
      } catch (error) {
        failedAPIs.push(api);
        console.log(`❌ ${api}: 错误`, error);
      }
    }
    
    return {
      totalAPIs: apis.length,
      workingAPIs,
      failedAPIs,
      avgResponseTime: Math.round(totalTime / apis.length)
    };
  }
  
  /**
   * 在控制台运行快速测试
   */
  static runQuickTest(): void {
    console.log('🚀 运行音乐搜索快速测试...');
    
    // 测试本地演示音乐
    realMusicService.searchPlayableMusic('happy').then(results => {
      console.log('📱 本地演示音乐测试结果:', results.length > 0 ? '✅ 成功' : '❌ 失败');
    });
    
    // 测试在线搜索
    realMusicService.searchPlayableMusic('Beatles').then(results => {
      console.log('🌐 在线音乐搜索测试结果:', results.length > 0 ? '✅ 成功' : '❌ 失败');
      if (results.length > 0) {
        console.log('   首个结果:', results[0].title, '-', results[0].artist);
      }
    });
  }
}

// 导出便捷函数供控制台调用
export const testMusicSearch = () => MusicTestService.testMusicSearch();
export const runQuickTest = () => MusicTestService.runQuickTest();
export const getMusicStats = () => MusicTestService.getMusicSearchStats();

// 自动运行快速测试（仅在开发环境）
if (process.env.NODE_ENV === 'development') {
  console.log('🎵 音乐搜索服务已加载，可使用以下命令测试:');
  console.log('   runQuickTest() - 快速测试');
  console.log('   testMusicSearch() - 完整测试');
  console.log('   getMusicStats() - 获取统计信息');
}
