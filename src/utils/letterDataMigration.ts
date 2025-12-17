/**
 * 信件数据迁移和导出工具
 * 支持整体数据迁移、单个/多个信件导出
 */

import { Letter } from '../types/letter';
import { BottleAI } from '../types/letter';
import { getLettersFromStorage, updateLetterInStorage } from './letterService';
import { getCachedData, setCachedData, save } from './storage';

// 数据迁移格式
export interface LetterMigrationData {
  version: string;
  exportDate: number;
  letters: Letter[];
  customFriends: BottleAI[];
  statistics: {
    totalLetters: number;
    sentLetters: number;
    repliedLetters: number;
    customFriendsCount: number;
  };
}

/**
 * 导出所有信件数据
 */
export function exportAllLetterData(): LetterMigrationData {
  // 从 IndexedDB/内存缓存获取所有信件
  const letters: Letter[] = getLettersFromStorage();
  console.log(`📤 [导出] 从 IndexedDB 读取到 ${letters.length} 封信件`);
  
  if (letters.length > 0) {
    console.log(`📤 [导出] 第一封信件示例:`, {
      id: letters[0].id,
      receiverName: letters[0].receiverName,
      status: letters[0].status,
      sentAt: letters[0].sentAt
    });
  }
  
  // 获取自定义笔友
  const customFriendsJson = localStorage.getItem('custom_pen_pals');
  const customFriends: BottleAI[] = customFriendsJson ? JSON.parse(customFriendsJson) : [];
  console.log(`📤 [导出] 读取到 ${customFriends.length} 个自定义笔友`);
  
  // 统计数据
  const statistics = {
    totalLetters: letters.length,
    sentLetters: letters.filter(l => l.status === 'sent').length,
    repliedLetters: letters.filter(l => l.status === 'replied').length,
    customFriendsCount: customFriends.length
  };
  
  const exportData = {
    version: '1.0.0',
    exportDate: Date.now(),
    letters,
    customFriends,
    statistics
  };
  
  console.log(`📤 [导出] 导出数据结构:`, {
    version: exportData.version,
    exportDate: new Date(exportData.exportDate).toISOString(),
    lettersCount: exportData.letters.length,
    customFriendsCount: exportData.customFriends.length,
    statistics: exportData.statistics
  });
  
  return exportData;
}

/**
 * 导出单个信件
 */
export function exportSingleLetter(letterId: string): Letter | null {
  const lettersJson = localStorage.getItem('slow_letters');
  if (!lettersJson) return null;
  
  const letters: Letter[] = JSON.parse(lettersJson);
  const letter = letters.find(l => l.id === letterId);
  
  return letter || null;
}

/**
 * 导出多个信件
 */
export function exportMultipleLetters(letterIds: string[], sourceLetters?: Letter[]): Letter[] {
  let letters: Letter[] = [];
  
  if (sourceLetters) {
    letters = sourceLetters;
  } else {
    const lettersJson = localStorage.getItem('slow_letters');
    if (!lettersJson) return [];
    letters = JSON.parse(lettersJson);
  }
  
  return letters.filter(l => letterIds.includes(l.id));
}

/**
 * 导入全部数据
 * @param data - 迁移数据
 * @param mode - 导入模式：'merge'(合并) 或 'replace'(替换)
 */
export function importAllLetterData(
  data: LetterMigrationData,
  mode: 'merge' | 'replace' = 'merge'
): { success: boolean; message: string } {
  try {
    console.log(`📥 [导入] 开始导入，模式: ${mode}`);
    console.log(`📥 [导入] 导入文件包含: ${data.letters?.length || 0} 封信件, ${data.customFriends?.length || 0} 个笔友`);
    
    // 验证数据格式
    if (!data.version || !data.letters || !Array.isArray(data.letters)) {
      console.error('❌ [导入] 数据格式不正确');
      return {
        success: false,
        message: '数据格式不正确'
      };
    }
    
    if (mode === 'merge') {
      // 从 IndexedDB/内存缓存获取现有信件
      const existingLetters: Letter[] = getLettersFromStorage();
      console.log(`📥 [导入] 从 IndexedDB 读取到现有 ${existingLetters.length} 封信件`);
      
      // 创建一个 Map 用于快速查找和合并
      const letterMap = new Map<string, Letter>();
      
      // 1. 先把所有现有信件放入 Map
      existingLetters.forEach(letter => {
        letterMap.set(letter.id, letter);
      });
      
      // 2. 用导入的信件更新或添加
      data.letters.forEach(newLetter => {
        const existing = letterMap.get(newLetter.id);
        if (existing) {
          // 如果已存在，合并数据（导入的数据优先）
          letterMap.set(newLetter.id, { ...existing, ...newLetter });
        } else {
          // 如果不存在，添加新信件
          letterMap.set(newLetter.id, newLetter);
        }
      });
      
      // 3. 转换回数组并排序
      const finalLetters = Array.from(letterMap.values());
      const sortedLetters = finalLetters.sort((a, b) => b.sentAt - a.sentAt);
      console.log(`✅ [导入] 合并后共有 ${sortedLetters.length} 封信件`);
      
      // 保存到 IndexedDB
      setCachedData('slow_letters', sortedLetters);
      save('slow_letters', sortedLetters).catch(err => {
        console.error('❌ [导入] 保存到 IndexedDB 失败:', err);
      });
      
      // 同样的逻辑处理自定义笔友
      const existingFriendsJson = localStorage.getItem('custom_pen_pals');
      const existingFriends: BottleAI[] = existingFriendsJson ? JSON.parse(existingFriendsJson) : [];
      
      const friendMap = new Map<string, BottleAI>();
      
      // 1. 先把所有现有笔友放入 Map
      existingFriends.forEach(friend => {
        friendMap.set(friend.id, friend);
      });
      
      // 2. 用导入的笔友更新或添加
      (data.customFriends || []).forEach(newFriend => {
        const existing = friendMap.get(newFriend.id);
        if (existing) {
          friendMap.set(newFriend.id, { ...existing, ...newFriend });
        } else {
          friendMap.set(newFriend.id, newFriend);
        }
      });
      
      const finalFriends = Array.from(friendMap.values());
      console.log(`✅ [导入] 合并后共有 ${finalFriends.length} 个笔友`);
      localStorage.setItem('custom_pen_pals', JSON.stringify(finalFriends));
    } else {
      // 替换模式：直接覆盖
      console.log(`⚠️ [导入] 替换模式，将覆盖所有现有数据`);
      const sortedLetters = data.letters.sort((a, b) => b.sentAt - a.sentAt);
      
      // 保存到 IndexedDB
      setCachedData('slow_letters', sortedLetters);
      save('slow_letters', sortedLetters).catch(err => {
        console.error('❌ [导入] 保存到 IndexedDB 失败:', err);
      });
      
      localStorage.setItem('custom_pen_pals', JSON.stringify(data.customFriends || []));
      console.log(`✅ [导入] 替换完成：${sortedLetters.length} 封信件, ${data.customFriends?.length || 0} 个笔友`);
    }
    
    // 获取最终的数据统计
    const finalLetters: Letter[] = getLettersFromStorage();
    const finalFriendsJson = localStorage.getItem('custom_pen_pals');
    const finalFriends: BottleAI[] = finalFriendsJson ? JSON.parse(finalFriendsJson) : [];
    
    return {
      success: true,
      message: mode === 'replace' 
        ? `成功导入 ${data.letters.length} 封信件和 ${data.customFriends?.length || 0} 个自定义笔友`
        : `成功合并数据，当前共有 ${finalLetters.length} 封信件和 ${finalFriends.length} 个自定义笔友`
    };
  } catch (error) {
    console.error('导入数据失败:', error);
    return {
      success: false,
      message: '导入失败：' + (error instanceof Error ? error.message : String(error))
    };
  }
}

/**
 * 下载数据为JSON文件
 */
export function downloadAsJson(data: any, filename: string) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * 导出所有数据并下载
 */
export function exportAndDownloadAll() {
  console.log(`🚀 [导出] 开始导出所有数据...`);
  const data = exportAllLetterData();
  const filename = `慢邮件数据_${new Date().toISOString().split('T')[0]}.json`;
  
  console.log(`💾 [导出] 准备下载文件: ${filename}`);
  console.log(`💾 [导出] 文件大小: ${JSON.stringify(data).length} 字符`);
  
  downloadAsJson(data, filename);
  
  console.log(`✅ [导出] 导出完成!`);
  
  return {
    success: true,
    message: `已导出 ${data.statistics.totalLetters} 封信件`,
    data
  };
}

/**
 * 导出单个信件并下载
 */
export function exportAndDownloadSingle(letterId: string) {
  const letter = exportSingleLetter(letterId);
  if (!letter) {
    return {
      success: false,
      message: '信件不存在'
    };
  }
  
  const filename = `信件_${letter.receiverName}_${new Date().toISOString().split('T')[0]}.json`;
  downloadAsJson(letter, filename);
  
  return {
    success: true,
    message: '导出成功',
    letter
  };
}

/**
 * 导出多个信件并下载
 */
export function exportAndDownloadMultiple(letterIds: string[], sourceLetters?: Letter[]) {
  const letters = exportMultipleLetters(letterIds, sourceLetters);
  if (letters.length === 0) {
    return {
      success: false,
      message: '没有找到要导出的信件'
    };
  }
  
  const filename = `信件集合_${letters.length}封_${new Date().toISOString().split('T')[0]}.json`;
  downloadAsJson(letters, filename);
  
  return {
    success: true,
    message: `已导出 ${letters.length} 封信件`,
    letters
  };
}

/**
 * 从文件读取数据
 */
export function readJsonFile(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        resolve(data);
      } catch (error) {
        reject(new Error('JSON解析失败'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * 清空所有信件数据（谨慎使用）
 */
export function clearAllLetterData(): { success: boolean; message: string } {
  try {
    const lettersJson = localStorage.getItem('slow_letters');
    const letters: Letter[] = lettersJson ? JSON.parse(lettersJson) : [];
    const count = letters.length;
    
    localStorage.removeItem('slow_letters');
    localStorage.removeItem('custom_pen_pals');
    
    return {
      success: true,
      message: `已清空 ${count} 封信件和所有自定义笔友`
    };
  } catch (error) {
    return {
      success: false,
      message: '清空失败'
    };
  }
}
