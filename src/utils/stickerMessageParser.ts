// 表情包消息解析工具

import { searchStickers } from './stickerStorage';

/**
 * 解析消息内容，提取表情包标记
 * 格式: [表情包:描述]
 */
export const parseStickerMarkers = (content: string): { description: string; marker: string }[] => {
  const regex = /\[表情包[:：]([^\]]+)\]/g;
  const markers: { description: string; marker: string }[] = [];
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    markers.push({
      description: match[1].trim(),
      marker: match[0],
    });
  }
  
  return markers;
};

/**
 * 根据描述查找匹配的表情包
 */
export const findStickerByDescription = async (
  description: string,
  characterId?: string
): Promise<string | null> => {
  try {
    // 搜索表情包
    const stickers = await searchStickers(description, characterId);
    
    if (stickers.length === 0) {
      return null;
    }
    
    // 优先匹配完全相同的描述
    const exactMatch = stickers.find(s => s.description === description);
    if (exactMatch) {
      return exactMatch.imageUrl;
    }
    
    // 如果没有完全匹配，返回第一个（相似度最高）
    return stickers[0].imageUrl;
  } catch (error) {
    console.error('Failed to find sticker:', error);
    return null;
  }
};

/**
 * 替换消息中的表情包标记为图片元素
 * 返回包含React元素的数组
 */
export const replaceStickerMarkersWithImages = async (
  content: string,
  characterId?: string
): Promise<Array<{ type: 'text' | 'sticker'; content: string; imageUrl?: string }>> => {
  const markers = parseStickerMarkers(content);
  
  if (markers.length === 0) {
    return [{ type: 'text', content }];
  }
  
  const result: Array<{ type: 'text' | 'sticker'; content: string; imageUrl?: string }> = [];
  let lastIndex = 0;
  
  for (const marker of markers) {
    const markerIndex = content.indexOf(marker.marker, lastIndex);
    
    // 添加标记之前的文本
    if (markerIndex > lastIndex) {
      const textBefore = content.substring(lastIndex, markerIndex);
      if (textBefore.trim()) {
        result.push({ type: 'text', content: textBefore });
      }
    }
    
    // 查找表情包图片
    const imageUrl = await findStickerByDescription(marker.description, characterId);
    
    if (imageUrl) {
      result.push({
        type: 'sticker',
        content: marker.description,
        imageUrl,
      });
    } else {
      // 如果找不到图片，保留原始标记
      result.push({ type: 'text', content: marker.marker });
    }
    
    lastIndex = markerIndex + marker.marker.length;
  }
  
  // 添加最后剩余的文本
  if (lastIndex < content.length) {
    const textAfter = content.substring(lastIndex);
    if (textAfter.trim()) {
      result.push({ type: 'text', content: textAfter });
    }
  }
  
  return result;
};
