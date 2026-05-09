/**
 * 🎯 修正版理解力系统
 * 保持原有其他能力设计，只修复字面理解升级过快问题
 */

import { AIChildData } from '../types';

/**
 * 更新单项能力（保持原逻辑）
 */
const updateAbility = (
  ability: { level: number; progress: number },
  effectiveWords: number,
  wordsPerLevel: number,
  minLevel: number
): void => {
  if (effectiveWords <= 0) {
    ability.level = minLevel;
    ability.progress = 0;
    return;
  }
  
  const progressPerWord = 100 / wordsPerLevel;
  const totalProgress = effectiveWords * progressPerWord;
  const level = Math.floor(totalProgress / 100) + minLevel;
  const progress = totalProgress % 100;
  
  ability.level = Math.min(20, level); // 提高上限到20级
  ability.progress = ability.level >= 20 ? 100 : progress;
};

/**
 * 修正版字面理解升级（解决过快问题）
 */
const updateLiteralComprehension = (
  ability: { level: number; progress: number },
  wordCount: number
): void => {
  // 🔧 修正：使用递增难度而不是固定每5词升级
  
  // 计算当前应该是什么等级
  let currentLevel = 1;
  let wordsUsed = 0;
  
  // 递增难度：Lv1需要8词，Lv2需要10词，Lv3需要12词...
  while (currentLevel < 20 && wordsUsed < wordCount) {
    const wordsNeededThisLevel = 6 + (currentLevel * 2); // 8, 10, 12, 14, 16...
    
    if (wordsUsed + wordsNeededThisLevel > wordCount) {
      // 在当前等级内
      const progressInLevel = wordCount - wordsUsed;
      const progress = Math.floor((progressInLevel / wordsNeededThisLevel) * 100);
      
      ability.level = currentLevel;
      ability.progress = Math.min(progress, 100);
      return;
    }
    
    wordsUsed += wordsNeededThisLevel;
    currentLevel++;
  }
  
  // 达到最高等级
  ability.level = Math.min(currentLevel, 20);
  ability.progress = ability.level >= 20 ? 100 : 0;
};

/**
 * 修正版理解力更新系统
 * 保持原有其他能力的设计，只修复字面理解
 */
export const updateFixedComprehension = (childData: AIChildData): void => {
  const wordCount = childData.vocabulary.length;
  
  // === 总理解力等级（保持原逻辑）===
  const totalProgress = (wordCount * 10) % 100;
  const totalLevel = Math.floor(wordCount / 10) + 1;
  childData.comprehension.level = Math.min(50, totalLevel);
  childData.comprehension.progress = totalProgress;
  
  // === 各项细分能力 ===
  
  // 1️⃣ 字面理解：🔧 使用新的递增难度升级
  updateLiteralComprehension(childData.comprehension.abilities.literal, wordCount);
  
  // 2️⃣ 上下文理解：保持原设计（每15词升1级，50词后开始）
  updateAbility(childData.comprehension.abilities.context, Math.max(0, wordCount - 50), 15, 1);
  
  // 3️⃣ 抽象理解：保持原设计（每20词升1级，100词后开始）
  updateAbility(childData.comprehension.abilities.abstract, Math.max(0, wordCount - 100), 20, 1);
  
  // 4️⃣ 情感理解：保持原设计（每25词升1级，200词后开始）
  updateAbility(childData.comprehension.abilities.emotion, Math.max(0, wordCount - 200), 25, 1);
  
  // 5️⃣ 逻辑推理：保持原设计（每30词升1级，500词后开始）
  updateAbility(childData.comprehension.abilities.logic, Math.max(0, wordCount - 500), 30, 1);
};

/**
 * 字面理解新升级路径预览
 */
export const getLiteralProgressPreview = (): string => {
  let preview = '\n📝 修正后的字面理解升级路径：\n\n';
  
  let totalWords = 0;
  for (let level = 1; level <= 10; level++) {
    const wordsNeeded = 6 + (level * 2);
    totalWords += wordsNeeded;
    preview += `Lv.${level}: ${totalWords}词 (本级需要${wordsNeeded}词)\n`;
  }
  
  preview += '\n🎯 修正要点：';
  preview += '\n- 字面理解升级变慢，有更好的成长感';
  preview += '\n- 其他能力保持原有合理的门槛设计';
  preview += '\n- 所有能力上限提升到20级，有长期目标';
  
  return preview;
};

/**
 * 对比修正前后的字面理解升级
 */
export const compareOldVsFixed = (): string => {
  let comparison = '\n📊 字面理解升级对比：\n\n';
  comparison += '词汇量  │ 修正前      │ 修正后      │ 说明\n';
  comparison += '───────┼──────────┼──────────┼─────\n';
  
  const testWords = [10, 20, 30, 45, 60, 100, 150];
  
  for (const words of testWords) {
    // 旧系统：每5词升1级
    const oldLevel = Math.min(10, Math.floor(words / 5) + 1);
    
    // 新系统：递增难度
    let newLevel = 1;
    let wordsUsed = 0;
    while (newLevel < 20 && wordsUsed < words) {
      const wordsNeeded = 6 + (newLevel * 2);
      if (wordsUsed + wordsNeeded > words) break;
      wordsUsed += wordsNeeded;
      newLevel++;
    }
    
    const status = oldLevel >= 10 ? '⚠️满级' : '正常';
    comparison += `${words}词    │ Lv.${oldLevel}/10${oldLevel>=10?' ⚠️':''} │ Lv.${newLevel}/20   │ ${status}\n`;
  }
  
  comparison += '\n✅ 修正效果：字面理解不再过早满级，但其他能力保持原有平衡';
  
  return comparison;
};
