/**
 * 智能财务系统
 * 根据AI的角色设置和行为，自动判断收入和支出
 */

import { Conversation, CharacterSettings, ApiConfig } from '../types';
import { addTransaction, addIncomeConfig, getAIFinanceData } from './aiFinance';

// ==========================================
// 职业类型识别
// ==========================================

interface CareerProfile {
  type: 'office_worker' | 'student' | 'freelancer' | 'entrepreneur' | 'artist' | 'service' | 'other';
  salaryDay?: number; // 发薪日（1-31）
  incomeFrequency: 'daily' | 'weekly' | 'monthly' | 'random';
  baseIncome: number;
  incomeRange: [number, number];
  description: string;
  hasBonus: boolean; // 是否有奖金
  hasAllowance: boolean; // 是否有补贴/生活费
}

/**
 * 根据角色设置智能识别职业类型
 */
export const analyzeCareerFromSettings = async (
  settings: CharacterSettings,
  apiConfig: ApiConfig
): Promise<CareerProfile | null> => {
  try {
    const prompt = `分析以下AI角色的职业类型和收入情况：

【角色信息】
昵称：${settings.nickname || '未知'}
系统提示：${settings.systemPrompt || ''}
性格：${settings.personality || ''}
语言风格：${settings.languageStyle || ''}

【任务】
根据角色信息，判断这个AI的职业类型和收入情况。

【输出格式】
请以JSON格式回复（只输出JSON，不要其他内容）：
{
  "type": "office_worker"或"student"或"freelancer"或"entrepreneur"或"artist"或"service"或"other",
  "salaryDay": 15,  // 发薪日（1-31），如果是学生可能是月初发生活费
  "incomeFrequency": "monthly"或"weekly"或"daily"或"random",
  "baseIncome": 5000,  // 基础收入金额（人民币）
  "incomeRangeMin": 4500,  // 收入范围最小值
  "incomeRangeMax": 6000,  // 收入范围最大值
  "description": "月薪"或"生活费"或"稿费"等,
  "hasBonus": true/false,  // 是否有不定期奖金
  "hasAllowance": true/false  // 是否有补贴（如餐补、交通补贴等）
}

【职业类型说明】
- office_worker: 上班族（公司职员、白领等），月中发工资
- student: 学生（月初发生活费，或半工半读每周/每天挣钱）
- freelancer: 自由职业者（收入不定期，如设计师、作家）
- entrepreneur: 创业者/老板（收入较高且不定期）
- artist: 艺术家/创作者（收入来源多样，如稿费、演出费）
- service: 服务业（如服务员、快递员，可能每天或每周结算）
- other: 其他职业

【示例】
如果是一个"互联网公司程序员"，输出：
{
  "type": "office_worker",
  "salaryDay": 15,
  "incomeFrequency": "monthly",
  "baseIncome": 15000,
  "incomeRangeMin": 14000,
  "incomeRangeMax": 16000,
  "description": "月薪",
  "hasBonus": true,
  "hasAllowance": true
}

如果是一个"大学生"，输出：
{
  "type": "student",
  "salaryDay": 1,
  "incomeFrequency": "monthly",
  "baseIncome": 2000,
  "incomeRangeMin": 1800,
  "incomeRangeMax": 2200,
  "description": "生活费",
  "hasBonus": false,
  "hasAllowance": false
}`;

    const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`
      },
      body: JSON.stringify({
        model: apiConfig.modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      console.error('职业分析API调用失败');
      return null;
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    // 解析JSON
    try {
      let cleanContent = content
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('职业分析响应格式错误');
        return null;
      }

      const result = JSON.parse(jsonMatch[0]);
      
      return {
        type: result.type || 'other',
        salaryDay: result.salaryDay,
        incomeFrequency: result.incomeFrequency || 'monthly',
        baseIncome: result.baseIncome || 3000,
        incomeRange: [result.incomeRangeMin || result.baseIncome * 0.9, result.incomeRangeMax || result.baseIncome * 1.1],
        description: result.description || '收入',
        hasBonus: result.hasBonus || false,
        hasAllowance: result.hasAllowance || false
      };
    } catch (parseError) {
      console.error('解析职业分析结果失败:', parseError);
      return null;
    }
  } catch (error) {
    console.error('职业分析失败:', error);
    return null;
  }
};

/**
 * 为AI自动配置收入
 */
export const autoConfigureIncome = async (
  conversation: Conversation,
  apiConfig: ApiConfig
): Promise<boolean> => {
  try {
    const settings = conversation.characterSettings;
    if (!settings) {
      console.log(`AI ${conversation.id} 没有角色设置，跳过收入配置`);
      return false;
    }

    // 检查是否已经配置过收入
    const financeData = await getAIFinanceData(conversation.id);
    if (financeData.incomeConfigs.length > 0) {
      console.log(`AI ${conversation.id} 已有收入配置，跳过`);
      return false;
    }

    // 分析职业
    const career = await analyzeCareerFromSettings(settings, apiConfig);
    if (!career) {
      console.log(`AI ${conversation.id} 职业分析失败，使用默认配置`);
      // 使用默认配置
      await addIncomeConfig(conversation.id, {
        enabled: true,
        frequency: 'monthly',
        baseAmount: 3000,
        randomRange: [2700, 3300],
        description: '月度收入'
      });
      return true;
    }

    console.log(`✅ AI ${conversation.name} 职业分析结果:`, career);

    // 添加主要收入
    await addIncomeConfig(conversation.id, {
      enabled: true,
      frequency: career.incomeFrequency,
      baseAmount: career.baseIncome,
      randomRange: career.incomeRange,
      description: career.description
    });

    // 如果有奖金，添加不定期奖金
    if (career.hasBonus) {
      await addIncomeConfig(conversation.id, {
        enabled: true,
        frequency: 'random',
        baseAmount: career.baseIncome * 0.2, // 约20%的工资作为奖金基数
        randomRange: [career.baseIncome * 0.1, career.baseIncome * 0.5],
        description: '绩效奖金'
      });
    }

    // 如果有补贴，添加每周补贴
    if (career.hasAllowance) {
      await addIncomeConfig(conversation.id, {
        enabled: true,
        frequency: 'weekly',
        baseAmount: 200,
        randomRange: [150, 300],
        description: '餐补/交通补贴'
      });
    }

    // 学生可能半工半读
    if (career.type === 'student' && Math.random() > 0.5) {
      await addIncomeConfig(conversation.id, {
        enabled: true,
        frequency: 'weekly',
        baseAmount: 300,
        randomRange: [200, 400],
        description: '兼职收入'
      });
    }

    console.log(`✅ AI ${conversation.name} 收入配置完成`);
    return true;
  } catch (error) {
    console.error(`配置AI ${conversation.id} 收入失败:`, error);
    return false;
  }
};

// ==========================================
// 智能支出分析
// ==========================================

interface ExpenseInfo {
  category: string;
  amount: number;
  description: string;
}

/**
 * 从文本中提取支出信息（用于朋友圈和聊天）
 */
export const extractExpenseFromText = async (
  text: string,
  _aiName: string,
  apiConfig: ApiConfig
): Promise<ExpenseInfo | null> => {
  try {
    const prompt = `分析以下文本，判断是否包含消费/支出信息：

【文本内容】
${text}

【任务】
判断文本中是否提到了消费、花钱、购物等支出行为。如果有，提取支出信息。

【输出格式】
如果有支出，以JSON格式回复：
{
  "hasExpense": true,
  "category": "餐饮"或"购物"或"娱乐"或"交通"或"其他",
  "amount": 50.00,  // 估算金额（人民币）
  "description": "在XX吃了XX"  // 简短描述
}

如果没有支出，回复：
{
  "hasExpense": false
}

【判断规则】
- 提到"吃了"、"喝了"、"买了"、"看了电影"、"打车"等消费行为 → hasExpense: true
- 只是说"想吃"、"计划买"等未发生的事 → hasExpense: false
- 提到具体商品/服务，合理估算金额

【示例】
输入："今天去星巴克喝了杯咖啡☕"
输出：
{
  "hasExpense": true,
  "category": "餐饮",
  "amount": 35,
  "description": "在星巴克喝咖啡"
}

输入："刚买了双新鞋！好喜欢😍"
输出：
{
  "hasExpense": true,
  "category": "购物",
  "amount": 300,
  "description": "购买新鞋"
}

输入："想去吃火锅"
输出：
{
  "hasExpense": false
}`;

    const response = await fetch(`${apiConfig.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.apiKey}`
      },
      body: JSON.stringify({
        model: apiConfig.modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 300
      })
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    // 解析JSON
    try {
      let cleanContent = content
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      const result = JSON.parse(jsonMatch[0]);
      
      if (!result.hasExpense) {
        return null;
      }

      return {
        category: result.category || '其他',
        amount: result.amount || 50,
        description: result.description || '消费支出'
      };
    } catch (parseError) {
      console.error('解析支出分析结果失败:', parseError);
      return null;
    }
  } catch (error) {
    console.error('支出分析失败:', error);
    return null;
  }
};

/**
 * 处理朋友圈发布后的自动支出
 */
export const processPostExpense = async (
  aiId: string,
  postContent: string,
  aiName: string,
  apiConfig: ApiConfig
): Promise<boolean> => {
  try {
    const expense = await extractExpenseFromText(postContent, aiName, apiConfig);
    
    if (!expense) {
      return false;
    }

    // 记录支出
    const success = await addTransaction(
      aiId,
      'expense',
      expense.amount,
      expense.category,
      `${expense.description}（朋友圈记录）`,
      undefined,
      undefined,
      true // 自动生成
    );

    if (success) {
      console.log(`✅ AI ${aiName} 朋友圈支出: ¥${expense.amount} - ${expense.description}`);
    }

    return success;
  } catch (error) {
    console.error('处理朋友圈支出失败:', error);
    return false;
  }
};

/**
 * 处理聊天消息的自动支出
 */
export const processChatExpense = async (
  aiId: string,
  messageContent: string,
  aiName: string,
  apiConfig: ApiConfig
): Promise<boolean> => {
  try {
    const expense = await extractExpenseFromText(messageContent, aiName, apiConfig);
    
    if (!expense) {
      return false;
    }

    // 记录支出
    const success = await addTransaction(
      aiId,
      'expense',
      expense.amount,
      expense.category,
      `${expense.description}（聊天记录）`,
      'user',
      undefined,
      true // 自动生成
    );

    if (success) {
      console.log(`✅ AI ${aiName} 聊天支出: ¥${expense.amount} - ${expense.description}`);
    }

    return success;
  } catch (error) {
    console.error('处理聊天支出失败:', error);
    return false;
  }
};

/**
 * 批量为所有AI配置收入
 */
export const autoConfigureAllIncome = async (
  conversations: Conversation[],
  apiConfig: ApiConfig
): Promise<void> => {
  console.log('🚀 开始为所有AI配置收入...');
  
  for (const conv of conversations) {
    if (conv.characterSettings) {
      await autoConfigureIncome(conv, apiConfig);
      // 避免API调用过快
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('✅ 所有AI收入配置完成');
};
