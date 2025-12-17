/**
 * 信件数据迁移和导出工具
 * 支持整体数据迁移、单个/多个信件导出
 */

import { Letter } from '../types/letter';
import { BottleAI } from '../types/letter';

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
  // 获取所有信件
  const lettersJson = localStorage.getItem('slow_letters');
  const letters: Letter[] = lettersJson ? JSON.parse(lettersJson) : [];
  
  // 获取自定义笔友
  const customFriendsJson = localStorage.getItem('custom_pen_pals');
  const customFriends: BottleAI[] = customFriendsJson ? JSON.parse(customFriendsJson) : [];
  
  // 统计数据
  const statistics = {
    totalLetters: letters.length,
    sentLetters: letters.filter(l => l.status === 'sent').length,
    repliedLetters: letters.filter(l => l.status === 'replied').length,
    customFriendsCount: customFriends.length
  };
  
  return {
    version: '1.0.0',
    exportDate: Date.now(),
    letters,
    customFriends,
    statistics
  };
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
    // 验证数据格式
    if (!data.version || !data.letters || !Array.isArray(data.letters)) {
      return {
        success: false,
        message: '数据格式不正确'
      };
    }
    
    if (mode === 'replace') {
      // 替换模式：直接覆盖
      localStorage.setItem('slow_letters', JSON.stringify(data.letters));
      localStorage.setItem('custom_pen_pals', JSON.stringify(data.customFriends || []));
    } else {
      // 合并模式：合并现有数据
      const existingLettersJson = localStorage.getItem('slow_letters');
      const existingLetters: Letter[] = existingLettersJson ? JSON.parse(existingLettersJson) : [];
      
      // 合并信件（去重）
      const existingIds = new Set(existingLetters.map(l => l.id));
      const newLetters = data.letters.filter(l => !existingIds.has(l.id));
      const mergedLetters = [...existingLetters, ...newLetters];
      
      localStorage.setItem('slow_letters', JSON.stringify(mergedLetters));
      
      // 合并自定义笔友
      const existingFriendsJson = localStorage.getItem('custom_pen_pals');
      const existingFriends: BottleAI[] = existingFriendsJson ? JSON.parse(existingFriendsJson) : [];
      
      const existingFriendIds = new Set(existingFriends.map(p => p.id));
      const newFriends = (data.customFriends || []).filter(p => !existingFriendIds.has(p.id));
      const mergedFriends = [...existingFriends, ...newFriends];
      
      localStorage.setItem('custom_pen_pals', JSON.stringify(mergedFriends));
    }
    
    return {
      success: true,
      message: mode === 'replace' 
        ? `成功导入 ${data.letters.length} 封信件和 ${data.customFriends?.length || 0} 个自定义笔友`
        : `成功合并数据，共 ${data.letters.length} 封信件和 ${data.customFriends?.length || 0} 个自定义笔友`
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
  const data = exportAllLetterData();
  const filename = `慢邮件数据_${new Date().toISOString().split('T')[0]}.json`;
  downloadAsJson(data, filename);
  
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
export function exportAndDownloadMultiple(letterIds: string[]) {
  const letters = exportMultipleLetters(letterIds);
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
