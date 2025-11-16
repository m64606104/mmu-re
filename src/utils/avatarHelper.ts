/**
 * Avatar 辅助函数
 * 处理avatar显示，确保不会泄露base64或URL
 */

/**
 * 获取安全的avatar显示
 * 确保返回的是emoji或单字符，过滤掉base64/URL
 * 
 * @param avatar - 原始avatar字符串
 * @param defaultAvatar - 默认avatar（可选）
 * @returns 安全的avatar字符串
 */
export function getSafeAvatar(avatar: string | undefined, defaultAvatar: string = '👤'): string {
  if (!avatar) {
    return defaultAvatar;
  }

  // 如果是base64或data URL，返回默认avatar
  if (avatar.startsWith('data:') || avatar.startsWith('blob:')) {
    return defaultAvatar;
  }

  // 如果是HTTP URL，返回默认avatar
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return defaultAvatar;
  }

  // 如果是file URL，返回默认avatar
  if (avatar.startsWith('file://')) {
    return defaultAvatar;
  }

  // 如果长度超过10个字符，很可能不是emoji
  if (avatar.length > 10) {
    return defaultAvatar;
  }

  // 返回原始avatar（应该是emoji）
  return avatar;
}

/**
 * 检查是否为有效的emoji avatar
 */
export function isValidEmojiAvatar(avatar: string | undefined): boolean {
  if (!avatar) return false;
  
  // 不是URL或base64
  if (avatar.startsWith('data:') || 
      avatar.startsWith('blob:') || 
      avatar.startsWith('http://') || 
      avatar.startsWith('https://') ||
      avatar.startsWith('file://')) {
    return false;
  }

  // 长度合理（emoji通常1-4个字符）
  if (avatar.length > 10) {
    return false;
  }

  return true;
}

/**
 * 从conversation中获取安全的avatar
 */
export function getSafeConversationAvatar(conversation: any): string {
  const avatar = conversation?.avatar;
  const characterAvatar = conversation?.characterSettings?.avatar;
  
  // 优先使用characterSettings中的avatar
  if (characterAvatar && isValidEmojiAvatar(characterAvatar)) {
    return characterAvatar;
  }
  
  // 然后使用conversation的avatar
  if (avatar && isValidEmojiAvatar(avatar)) {
    return avatar;
  }
  
  // 根据类型返回默认avatar
  if (conversation?.type === 'group') {
    return '👥';
  }
  
  return '👤';
}

/**
 * 批量处理avatar列表
 */
export function sanitizeAvatarList<T extends { avatar?: string }>(
  items: T[],
  defaultAvatar: string = '👤'
): T[] {
  return items.map(item => ({
    ...item,
    avatar: getSafeAvatar(item.avatar, defaultAvatar)
  }));
}
