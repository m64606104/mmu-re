/**
 * AI收入检测系统
 * 从AI的聊天内容中检测收入行为，自动记录到财务系统
 */

import { addTransaction } from './aiFinance';

export interface IncomeDetection {
  hasIncome: boolean;
  amount?: number;
  category?: string;
  description?: string;
  source?: string;
  type?: 'salary' | 'bonus' | 'freelance' | 'gift' | 'investment' | 'other';
}

/**
 * 从AI消息中检测收入行为
 */
export const detectIncomeFromMessage = (content: string): IncomeDetection => {
  // 直接的收入表达
  const directIncomePatterns = [
    /我?(?:收到了?|拿到了?|获得了?)(\d+(?:\.\d{1,2})?)元?(?:块钱)?(?:的)?([^，。！？]*?)(?:工资|薪水|奖金|收入|报酬|费用)/gi,
    /我?(?:赚了?|挣了?)(\d+(?:\.\d{1,2})?)元?(?:块钱)?([^，。！？]*)/gi,
    /我?的?(?:工资|薪水|奖金|收入|报酬)是?(\d+(?:\.\d{1,2})?)元?(?:块钱)?/gi,
    /(?:工资|薪水|奖金|收入|报酬)到账了?(\d+(?:\.\d{1,2})?)元?(?:块钱)?/gi,
    /我?(?:接了?|完成了?)([^，。！？]*?)(?:项目|任务|订单).*?(\d+(?:\.\d{1,2})?)元?(?:块钱)?/gi,
  ];
  
  for (const pattern of directIncomePatterns) {
    const matches = [...content.matchAll(pattern)];
    for (const match of matches) {
      let amount: number = 0;
      let source = '';
      let type: IncomeDetection['type'] = 'other';
      
      if (pattern.source.includes('收到了?|拿到了?|获得了?')) {
        amount = parseFloat(match[1]);
        source = match[2]?.trim() || '';
        type = categorizeIncomeType(content, source);
      } else if (pattern.source.includes('赚了?|挣了?')) {
        amount = parseFloat(match[1]);
        source = match[2]?.trim() || '';
        type = 'freelance';
      } else if (pattern.source.includes('工资|薪水|奖金|收入|报酬')) {
        amount = parseFloat(match[1]);
        type = content.toLowerCase().includes('奖金') ? 'bonus' : 'salary';
      } else if (pattern.source.includes('到账了?')) {
        amount = parseFloat(match[1]);
        type = 'salary';
      } else if (pattern.source.includes('接了?|完成了?')) {
        source = match[1]?.trim() || '';
        amount = parseFloat(match[2]);
        type = 'freelance';
      }
      
      if (amount > 0) {
        return {
          hasIncome: true,
          amount,
          source,
          type,
          category: categorizeIncomeCategory(type),
          description: generateIncomeDescription(type, amount, source)
        };
      }
    }
  }
  
  // 投资收益检测
  const investmentPatterns = [
    /(?:股票|基金|理财|投资).*?(?:盈利|收益|赚了?)(\d+(?:\.\d{1,2})?)元?(?:块钱)?/gi,
    /我?的?投资(?:回报|收益)是?(\d+(?:\.\d{1,2})?)元?(?:块钱)?/gi,
  ];
  
  for (const pattern of investmentPatterns) {
    const match = content.match(pattern);
    if (match) {
      const amount = parseFloat(match[1]);
      if (amount > 0) {
        return {
          hasIncome: true,
          amount,
          type: 'investment',
          category: '投资收益',
          description: `投资收益：¥${amount}`,
          source: '投资理财'
        };
      }
    }
  }
  
  return { hasIncome: false };
};

/**
 * 根据内容和来源判断收入类型
 */
const categorizeIncomeType = (content: string, source: string): IncomeDetection['type'] => {
  const contentLower = content.toLowerCase();
  const sourceLower = source.toLowerCase();
  
  if (contentLower.includes('工资') || contentLower.includes('薪水') || 
      sourceLower.includes('公司') || sourceLower.includes('工作')) {
    return 'salary';
  }
  
  if (contentLower.includes('奖金') || contentLower.includes('年终') || 
      contentLower.includes('绩效') || sourceLower.includes('奖励')) {
    return 'bonus';
  }
  
  if (contentLower.includes('项目') || contentLower.includes('接单') || 
      contentLower.includes('兼职') || sourceLower.includes('freelance')) {
    return 'freelance';
  }
  
  if (contentLower.includes('红包') || contentLower.includes('礼金') || 
      contentLower.includes('压岁钱') || sourceLower.includes('礼物')) {
    return 'gift';
  }
  
  if (contentLower.includes('投资') || contentLower.includes('股票') || 
      contentLower.includes('基金') || contentLower.includes('理财')) {
    return 'investment';
  }
  
  return 'other';
};

/**
 * 根据收入类型分类
 */
const categorizeIncomeCategory = (type: IncomeDetection['type']): string => {
  switch (type) {
    case 'salary':
      return '工资收入';
    case 'bonus':
      return '奖金收入';
    case 'freelance':
      return '兼职收入';
    case 'gift':
      return '礼金收入';
    case 'investment':
      return '投资收益';
    default:
      return '其他收入';
  }
};

/**
 * 生成收入描述
 */
const generateIncomeDescription = (
  type: IncomeDetection['type'], 
  amount: number, 
  source?: string
): string => {
  const sourceText = source ? ` (${source})` : '';
  
  switch (type) {
    case 'salary':
      return `工资收入${sourceText}：¥${amount}`;
    case 'bonus':
      return `奖金收入${sourceText}：¥${amount}`;
    case 'freelance':
      return `兼职收入${sourceText}：¥${amount}`;
    case 'gift':
      return `礼金收入${sourceText}：¥${amount}`;
    case 'investment':
      return `投资收益${sourceText}：¥${amount}`;
    default:
      return `其他收入${sourceText}：¥${amount}`;
  }
};

/**
 * 自动记录AI收入到财务系统
 */
export const recordAIIncome = async (
  aiId: string, 
  income: IncomeDetection,
  messageContent: string
): Promise<boolean> => {
  if (!income.hasIncome || !income.amount) {
    return false;
  }
  
  try {
    const success = await addTransaction(
      aiId,
      'income',
      income.amount,
      income.category || '其他收入',
      income.description || messageContent.substring(0, 50),
      'auto_detected', // 自动检测
      `income_${Date.now()}`,
      false // 不是用户主动记录
    );
    
    if (success) {
      console.log(`💰 AI收入自动记录: ${income.description} ¥${income.amount}`);
    }
    
    return success;
  } catch (error) {
    console.error('记录AI收入失败:', error);
    return false;
  }
};
