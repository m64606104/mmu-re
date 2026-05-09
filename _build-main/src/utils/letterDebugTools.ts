/**
 * 信件系统调试工具
 * 在浏览器控制台中使用，用于调试信件回复问题
 */

import { getLettersFromStorage, updateLetterInStorage } from './letterService';

// 暴露到全局
declare global {
  interface Window {
    letterDebug: {
      listLetters: () => void;
      checkLetter: (letterId: string) => void;
      forceGenerateReply: (letterId: string, roundNumber: number) => void;
      checkTimers: () => void;
      resetLetterStatus: (letterId: string) => void;
    };
  }
}

/**
 * 列出所有信件
 */
function listLetters() {
  const letters = getLettersFromStorage();
  console.group('📬 所有信件列表');
  letters.forEach((letter, index) => {
    console.log(`${index + 1}. ${letter.receiverName} (ID: ${letter.id})`);
    console.log(`   状态: ${letter.status}`);
    console.log(`   当前轮次: ${letter.currentRound}`);
    console.log(`   总轮次: ${letter.conversationRounds.length}`);
    
    // 检查每一轮的状态
    letter.conversationRounds.forEach(round => {
      const hasReply = round.aiReply ? '✅ 已回复' : '❌ 未回复';
      const isUrged = round.userLetter.hasUrged ? '💨 已催促' : '';
      console.log(`   - 第${round.roundNumber}轮: ${hasReply} ${isUrged}`);
      if (round.userLetter.willReplyAt) {
        const date = new Date(round.userLetter.willReplyAt);
        const isPast = Date.now() > round.userLetter.willReplyAt;
        console.log(`     预计回复时间: ${date.toLocaleString()} ${isPast ? '(已过期)' : '(未到)'}`);
      }
    });
    console.log('---');
  });
  console.groupEnd();
}

/**
 * 检查特定信件的详细信息
 */
function checkLetter(letterId: string) {
  const letters = getLettersFromStorage();
  const letter = letters.find(l => l.id === letterId);
  
  if (!letter) {
    console.error(`❌ 找不到信件: ${letterId}`);
    return;
  }
  
  console.group(`🔍 信件详情: ${letter.receiverName}`);
  console.log('基本信息:', {
    id: letter.id,
    status: letter.status,
    currentRound: letter.currentRound,
    totalRounds: letter.conversationRounds.length
  });
  
  console.log('\n轮次详情:');
  letter.conversationRounds.forEach(round => {
    console.group(`第 ${round.roundNumber} 轮`);
    console.log('用户信件:', {
      content: round.userLetter.content.substring(0, 50) + '...',
      sentAt: new Date(round.userLetter.sentAt).toLocaleString(),
      hasUrged: round.userLetter.hasUrged,
      willReplyAt: round.userLetter.willReplyAt ? new Date(round.userLetter.willReplyAt).toLocaleString() : 'N/A'
    });
    
    if (round.aiReply) {
      console.log('AI回复:', {
        content: round.aiReply.content.substring(0, 50) + '...',
        repliedAt: new Date(round.aiReply.repliedAt).toLocaleString()
      });
    } else {
      console.log('AI回复: ❌ 未回复');
      
      // 检查是否应该已经回复了
      if (round.userLetter.willReplyAt && Date.now() > round.userLetter.willReplyAt) {
        console.warn('⚠️ 预计回复时间已过，但AI还未回复！');
      }
    }
    console.groupEnd();
  });
  
  console.groupEnd();
}

/**
 * 强制生成AI回复
 */
async function forceGenerateReply(letterId: string, roundNumber: number) {
  console.log(`🚀 强制生成回复: ${letterId} 第${roundNumber}轮`);
  
  try {
    const letterService = await import('./letterService');
    await letterService.generateReply(letterId, 0, roundNumber);
    console.log('✅ 回复生成成功！刷新页面查看结果。');
  } catch (error) {
    console.error('❌ 回复生成失败:', error);
  }
}

/**
 * 检查活动定时器
 */
function checkTimers() {
  console.group('⏰ 活动定时器检查');
  console.log('定时器存储在 activeTimers Map 中');
  console.log('格式: letterId-roundNumber -> Timeout');
  console.log('注意: 由于浏览器限制，无法直接查看 setTimeout 的内部状态');
  console.log('建议: 检查 localStorage 中的信件数据，查看 willReplyAt 字段');
  console.groupEnd();
}

/**
 * 重置信件状态（危险操作）
 */
function resetLetterStatus(letterId: string) {
  const letters = getLettersFromStorage();
  const letter = letters.find(l => l.id === letterId);
  
  if (!letter) {
    console.error(`❌ 找不到信件: ${letterId}`);
    return;
  }
  
  console.warn('⚠️ 重置信件状态');
  
  // 找到最后一轮
  const lastRound = letter.conversationRounds[letter.conversationRounds.length - 1];
  
  if (lastRound.aiReply) {
    letter.status = 'replied';
  } else {
    letter.status = 'sent';
  }
  
  updateLetterInStorage(letter);
  console.log('✅ 状态已重置为:', letter.status);
}

// 初始化调试工具
export function initLetterDebugTools() {
  window.letterDebug = {
    listLetters,
    checkLetter,
    forceGenerateReply,
    checkTimers,
    resetLetterStatus
  };
  
  console.log('%c📬 信件调试工具已加载！', 'color: #ff6b35; font-size: 16px; font-weight: bold;');
  console.log('%c使用方法:', 'color: #4a90e2; font-weight: bold;');
  console.log('%cletterDebug.listLetters()         %c- 列出所有信件', 'color: #4ecdc4', 'color: #95a5a6');
  console.log('%cletterDebug.checkLetter(id)       %c- 检查特定信件详情', 'color: #4ecdc4', 'color: #95a5a6');
  console.log('%cletterDebug.forceGenerateReply(id, round) %c- 强制生成回复', 'color: #4ecdc4', 'color: #95a5a6');
  console.log('%cletterDebug.checkTimers()         %c- 检查定时器状态', 'color: #4ecdc4', 'color: #95a5a6');
  console.log('%cletterDebug.resetLetterStatus(id) %c- 重置信件状态', 'color: #4ecdc4', 'color: #95a5a6');
}
