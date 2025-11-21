/**
 * 角色名字管理器
 * 允许用户修改AI角色的显示名字
 */

interface CharacterNameRecord {
  characterId: string;
  customName: string;
  originalName: string;
  updatedAt: number;
}

const CHARACTER_NAME_STORAGE_KEY = 'character_names';

/**
 * 获取所有角色名字记录
 */
function getCharacterNameRecords(): CharacterNameRecord[] {
  const saved = localStorage.getItem(CHARACTER_NAME_STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
}

/**
 * 保存角色名字记录
 */
function saveCharacterNameRecords(records: CharacterNameRecord[]): void {
  localStorage.setItem(CHARACTER_NAME_STORAGE_KEY, JSON.stringify(records));
}

/**
 * 设置角色自定义名字
 */
export function setCharacterName(
  characterId: string, 
  customName: string, 
  originalName: string
): boolean {
  try {
    const records = getCharacterNameRecords();
    const existingIndex = records.findIndex(r => r.characterId === characterId);
    
    const newRecord: CharacterNameRecord = {
      characterId,
      customName: customName.trim(),
      originalName,
      updatedAt: Date.now()
    };
    
    if (existingIndex >= 0) {
      records[existingIndex] = newRecord;
    } else {
      records.push(newRecord);
    }
    
    saveCharacterNameRecords(records);
    return true;
  } catch (error) {
    console.error('设置角色名字失败:', error);
    return false;
  }
}

/**
 * 获取角色的自定义名字
 */
export function getCharacterName(characterId: string): string | null {
  const records = getCharacterNameRecords();
  const record = records.find(r => r.characterId === characterId);
  return record ? record.customName : null;
}

/**
 * 删除角色自定义名字
 */
export function removeCharacterName(characterId: string): boolean {
  try {
    const records = getCharacterNameRecords();
    const filteredRecords = records.filter(r => r.characterId !== characterId);
    saveCharacterNameRecords(filteredRecords);
    return true;
  } catch (error) {
    console.error('删除角色名字失败:', error);
    return false;
  }
}

/**
 * 获取角色显示名称（自定义名 > 原名）
 */
export function getCharacterDisplayName(characterId: string, originalName: string): string {
  const customName = getCharacterName(characterId);
  return customName || originalName;
}

/**
 * 检查是否为预设角色
 */
export function isPresetCharacter(characterId: string): boolean {
  return characterId.startsWith('preset_ai_');
}

/**
 * 获取所有已自定义名字的角色列表
 */
export function getAllCustomNamedCharacters(): Array<{
  characterId: string;
  customName: string;
  originalName: string;
  updatedAt: number;
}> {
  return getCharacterNameRecords().sort((a, b) => b.updatedAt - a.updatedAt);
}
