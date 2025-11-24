/**
 * AI智能财务系统激活器
 * 自动为AI配置职业和收入，激活完整的财务生态
 */

import { Conversation, ApiConfig } from '../types';
import { getAIFinanceData, addIncomeConfig, addTransaction } from './aiFinance';
import { analyzeCareerFromSettings } from './smartFinanceSystem';

/**
 * 激活AI的智能财务系统
 */
export const activateAIFinanceSystem = async (
  conversation: Conversation,
  apiConfig: ApiConfig
): Promise<boolean> => {
  try {
    console.log(`🚀 激活AI财务系统: ${conversation.name || conversation.id}`);
    
    // 1. 检查是否已经激活
    const financeData = await getAIFinanceData(conversation.id);
    const hasIncomeConfig = financeData.incomeConfigs && financeData.incomeConfigs.length > 0;
    
    if (hasIncomeConfig) {
      console.log(`✅ AI财务系统已激活: ${conversation.name}`);
      return true;
    }
    
    // 2. 分析AI角色职业类型
    let careerProfile = null;
    
    if (conversation.characterSettings) {
      try {
        careerProfile = await analyzeCareerFromSettings(conversation.characterSettings, apiConfig);
      } catch (error) {
        console.warn('职业分析失败，使用默认配置:', error);
      }
    }
    
    // 3. 使用默认职业配置（如果分析失败）
    if (!careerProfile) {
      careerProfile = getDefaultCareerProfile(conversation);
    }
    
    console.log(`📊 AI职业类型: ${careerProfile.type} - ${careerProfile.description}`);
    
    // 4. 配置收入来源
    try {
      await addIncomeConfig(conversation.id, {
        enabled: true,
        frequency: careerProfile.incomeFrequency,
        baseAmount: careerProfile.baseIncome,
        randomRange: [careerProfile.incomeRange[0], careerProfile.incomeRange[1]],
        description: careerProfile.description
      });
      console.log(`✅ 收入配置成功`);
    } catch (error) {
      console.error('❌ 配置收入来源失败:', error);
      return false;
    }
    
    // 5. 初始资金发放
    const initialFundingSuccess = await provideInitialFunding(conversation, careerProfile);
    if (!initialFundingSuccess) {
      console.warn('⚠️ 初始资金发放失败');
    }
    
    console.log(`✅ AI智能财务系统激活成功: ${conversation.name}`);
    console.log(`   职业类型: ${careerProfile.type}`);
    console.log(`   基础收入: ¥${careerProfile.baseIncome}`);
    console.log(`   发放频率: ${careerProfile.incomeFrequency}`);
    console.log(`   当前余额: ¥${financeData.balance || 0}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ 激活AI财务系统失败:', error);
    return false;
  }
};

/**
 * 获取默认职业配置
 */
const getDefaultCareerProfile = (conversation: Conversation) => {
  const personality = conversation.characterSettings?.personality?.toLowerCase() || '';
  const systemPrompt = conversation.characterSettings?.systemPrompt?.toLowerCase() || '';
  const combined = `${personality} ${systemPrompt}`.toLowerCase();
  
  // 学生类型
  if (combined.includes('学生') || combined.includes('学习') || 
      combined.includes('大学') || combined.includes('高中') ||
      combined.includes('student')) {
    return {
      type: 'student' as const,
      salaryDay: 1, // 月初发生活费
      incomeFrequency: 'monthly' as const,
      baseIncome: 2000,
      incomeRange: [1800, 2500] as [number, number],
      description: '学生生活费',
      hasBonus: false,
      hasAllowance: true
    };
  }
  
  // 创业者类型
  if (combined.includes('创业') || combined.includes('老板') || 
      combined.includes('ceo') || combined.includes('总裁') ||
      combined.includes('entrepreneur')) {
    return {
      type: 'entrepreneur' as const,
      salaryDay: undefined,
      incomeFrequency: 'random' as const,
      baseIncome: 15000,
      incomeRange: [10000, 30000] as [number, number],
      description: '创业收入',
      hasBonus: true,
      hasAllowance: false
    };
  }
  
  // 艺术家类型
  if (combined.includes('艺术') || combined.includes('画家') || 
      combined.includes('音乐') || combined.includes('作家') ||
      combined.includes('创作') || combined.includes('artist')) {
    return {
      type: 'artist' as const,
      salaryDay: undefined,
      incomeFrequency: 'random' as const,
      baseIncome: 6000,
      incomeRange: [3000, 12000] as [number, number],
      description: '艺术创作收入',
      hasBonus: false,
      hasAllowance: false
    };
  }
  
  // 自由职业者
  if (combined.includes('自由') || combined.includes('兼职') || 
      combined.includes('freelance') || combined.includes('远程')) {
    return {
      type: 'freelancer' as const,
      salaryDay: undefined,
      incomeFrequency: 'weekly' as const,
      baseIncome: 8000,
      incomeRange: [5000, 15000] as [number, number],
      description: '自由职业收入',
      hasBonus: false,
      hasAllowance: false
    };
  }
  
  // 默认上班族
  return {
    type: 'office_worker' as const,
    salaryDay: 15, // 每月15号发工资
    incomeFrequency: 'monthly' as const,
    baseIncome: 8000,
    incomeRange: [6000, 12000] as [number, number],
    description: '工作收入',
    hasBonus: true,
    hasAllowance: false
  };
};

/**
 * 提供初始资金
 */
const provideInitialFunding = async (conversation: Conversation, careerProfile: any): Promise<boolean> => {
  try {
    // 发放首月收入
    const firstSalary = careerProfile.baseIncome;
    
    const success = await addTransaction(
      conversation.id,
      'income',
      firstSalary,
      careerProfile.type === 'student' ? '生活费' : '工资收入',
      `系统激活 - 首次${careerProfile.type === 'student' ? '生活费' : '工资'}发放`,
      'system_activation',
      `activation_${Date.now()}`,
      false
    );
    
    if (success) {
      console.log(`💰 初始资金发放成功: ¥${firstSalary}`);
    }
    
    return success;
  } catch (error) {
    console.error('初始资金发放失败:', error);
    return false;
  }
};

/**
 * 批量激活所有AI的财务系统
 */
export const batchActivateAIFinanceSystems = async (
  conversations: Conversation[],
  apiConfig: ApiConfig
): Promise<{ success: number; failed: number; details: Array<{id: string; name: string; success: boolean}> }> => {
  const results = {
    success: 0,
    failed: 0,
    details: [] as Array<{id: string; name: string; success: boolean}>
  };
  
  console.log(`🚀 批量激活${conversations.length}个AI的财务系统...`);
  
  for (const conversation of conversations) {
    // AI对话（非群聊和私聊）
    if (conversation.type !== 'group' && conversation.type !== 'private' && conversation.id !== 'user') {
      try {
        const success = await activateAIFinanceSystem(conversation, apiConfig);
        results.details.push({
          id: conversation.id,
          name: conversation.name || conversation.id,
          success
        });
        
        if (success) {
          results.success++;
        } else {
          results.failed++;
        }
        
        // 避免API调用过快，延迟500ms
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`激活${conversation.name}财务系统失败:`, error);
        results.failed++;
        results.details.push({
          id: conversation.id,
          name: conversation.name || conversation.id,
          success: false
        });
      }
    }
  }
  
  console.log(`✅ 批量激活完成: 成功${results.success}个, 失败${results.failed}个`);
  return results;
};
