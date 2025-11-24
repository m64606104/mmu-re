/**
 * AI消费检测系统
 * 从AI的聊天内容中检测消费行为，自动记录到财务系统
 */

import { addTransaction } from './aiFinance';

export interface ExpenseDetection {
  hasExpense: boolean;
  amount?: number;
  category?: string;
  description?: string;
  item?: string;
  location?: string;
}

/**
 * 从AI消息中检测消费行为
 */
export const detectExpenseFromMessage = (content: string): ExpenseDetection => {
  // 直接的消费表达
  const directExpensePatterns = [
    /我?花了?(\d+(?:\.\d{1,2})?)元?(?:块钱)?买?([^，。！？]*)/gi,
    /我?消费了?(\d+(?:\.\d{1,2})?)元?(?:块钱)?在?([^，。！？]*)/gi,
    /我?买了?([^，。！？]*?)(?:花费?)?(\d+(?:\.\d{1,2})?)元?(?:块钱)?/gi,
    /我?在([^，。！？]*?)消费了?(\d+(?:\.\d{1,2})?)元?(?:块钱)?/gi,
    /我?购买了?([^，。！？]*?)(?:价格|费用|花费)?是?(\d+(?:\.\d{1,2})?)元?(?:块钱)?/gi,
  ];
  
  for (const pattern of directExpensePatterns) {
    const matches = [...content.matchAll(pattern)];
    for (const match of matches) {
      let amount: number = 0;
      let item = '';
      
      if (pattern.source.includes('我?花了')) {
        amount = parseFloat(match[1]);
        item = match[2]?.trim() || '';
      } else if (pattern.source.includes('我?买了')) {
        item = match[1]?.trim() || '';
        amount = parseFloat(match[2]);
      } else if (pattern.source.includes('我?在.*消费')) {
        item = match[1]?.trim() || '';
        amount = parseFloat(match[2]);
      } else if (pattern.source.includes('我?购买了')) {
        item = match[1]?.trim() || '';
        amount = parseFloat(match[2]);
      } else if (pattern.source.includes('我?消费了')) {
        amount = parseFloat(match[1]);
        item = match[2]?.trim() || '';
      }
      
      if (amount > 0) {
        return {
          hasExpense: true,
          amount,
          item,
          category: categorizeExpense(item),
          description: `${item || '消费'}：¥${amount}`,
          location: extractLocation(content)
        };
      }
    }
  }
  
  // 隐式消费表达（活动+金额）
  const implicitPatterns = [
    /(?:吃了?|喝了?|买了?)([^，。！？]*?).*?(\d+(?:\.\d{1,2})?)元?(?:块钱)?/gi,
    /去了?([^，。！？]*?).*?(?:花费?|消费|价格|费用).*?(\d+(?:\.\d{1,2})?)元?(?:块钱)?/gi,
    /在([^，。！？]*?).*?(\d+(?:\.\d{1,2})?)元?(?:块钱)?/gi,
  ];
  
  for (const pattern of implicitPatterns) {
    const matches = [...content.matchAll(pattern)];
    for (const match of matches) {
      const item = match[1]?.trim() || '';
      const amount = parseFloat(match[2]);
      
      // 过滤掉不相关的内容（如时间、日期等）
      if (amount > 0 && amount < 100000 && !isTimeOrDate(item)) {
        return {
          hasExpense: true,
          amount,
          item,
          category: categorizeExpense(item),
          description: `${item}消费：¥${amount}`,
          location: extractLocation(content)
        };
      }
    }
  }
  
  return { hasExpense: false };
};

/**
 * 根据消费项目分类
 */
const categorizeExpense = (item: string): string => {
  const itemLower = item.toLowerCase();
  
  // 食物饮品
  if (itemLower.includes('吃') || itemLower.includes('喝') || 
      itemLower.includes('餐') || itemLower.includes('饭') ||
      itemLower.includes('咖啡') || itemLower.includes('茶') ||
      itemLower.includes('奶茶') || itemLower.includes('火锅') ||
      itemLower.includes('菜') || itemLower.includes('面') ||
      itemLower.includes('饺子') || itemLower.includes('汉堡')) {
    return '餐饮美食';
  }
  
  // 购物
  if (itemLower.includes('买') || itemLower.includes('购') ||
      itemLower.includes('衣') || itemLower.includes('鞋') ||
      itemLower.includes('包') || itemLower.includes('化妆品') ||
      itemLower.includes('护肤') || itemLower.includes('商品')) {
    return '购物消费';
  }
  
  // 交通
  if (itemLower.includes('车') || itemLower.includes('地铁') ||
      itemLower.includes('公交') || itemLower.includes('打车') ||
      itemLower.includes('滴滴') || itemLower.includes('出租') ||
      itemLower.includes('票')) {
    return '交通出行';
  }
  
  // 娱乐
  if (itemLower.includes('电影') || itemLower.includes('ktv') ||
      itemLower.includes('游戏') || itemLower.includes('娱乐') ||
      itemLower.includes('唱歌') || itemLower.includes('玩')) {
    return '娱乐休闲';
  }
  
  // 医疗
  if (itemLower.includes('医') || itemLower.includes('药') ||
      itemLower.includes('病') || itemLower.includes('治疗') ||
      itemLower.includes('检查') || itemLower.includes('体检')) {
    return '医疗健康';
  }
  
  return '日常消费';
};

/**
 * 提取消费地点
 */
const extractLocation = (content: string): string => {
  const locationPatterns = [
    /在([^，。！？]*?[店馆厅场所院])/gi,
    /去了?([^，。！？]*?[店馆厅场所院])/gi,
    /到([^，。！？]*?[店馆厅场所院])/gi,
  ];
  
  for (const pattern of locationPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return '';
};

/**
 * 判断是否为时间或日期相关内容
 */
const isTimeOrDate = (text: string): boolean => {
  const timeWords = ['点', '分', '秒', '时', '月', '日', '年', '天', '周', '小时'];
  return timeWords.some(word => text.includes(word));
};

/**
 * 自动记录AI消费到财务系统
 */
export const recordAIExpense = async (
  aiId: string, 
  expense: ExpenseDetection,
  messageContent: string
): Promise<boolean> => {
  if (!expense.hasExpense || !expense.amount) {
    return false;
  }
  
  try {
    const success = await addTransaction(
      aiId,
      'expense',
      expense.amount,
      expense.category || '日常消费',
      expense.description || messageContent.substring(0, 50),
      'auto_detected', // 自动检测
      `expense_${Date.now()}`,
      false // 不是用户主动记录
    );
    
    if (success) {
      console.log(`💰 AI消费自动记录: ${expense.description} ¥${expense.amount}`);
    }
    
    return success;
  } catch (error) {
    console.error('记录AI消费失败:', error);
    return false;
  }
};
