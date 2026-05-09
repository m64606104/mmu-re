/**
 * 真实音乐API集成
 * 支持多个音乐平台的搜索
 */

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  previewUrl?: string; // 试听链接
  duration?: number; // 时长（秒）
  source: 'itunes' | 'jamendo' | 'local'; // 来源
}

/**
 * iTunes Search API（免费，无需API Key）
 * https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/
 */
export async function searchITunesMusic(query: string, limit: number = 10): Promise<MusicTrack[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://itunes.apple.com/search?term=${encodedQuery}&media=music&entity=song&limit=${limit}&country=cn`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('iTunes API请求失败');
    }
    
    const data = await response.json();
    
    return data.results.map((item: any) => ({
      id: `itunes_${item.trackId}`,
      title: item.trackName,
      artist: item.artistName,
      album: item.collectionName,
      coverUrl: item.artworkUrl100.replace('100x100', '300x300'), // 使用更高清的封面
      previewUrl: item.previewUrl, // 30秒试听
      duration: Math.floor(item.trackTimeMillis / 1000),
      source: 'itunes' as const
    }));
  } catch (error) {
    console.error('iTunes搜索失败:', error);
    return [];
  }
}

/**
 * Jamendo API（免费音乐平台，需要API Key）
 * https://developer.jamendo.com/
 */
export async function searchJamendoMusic(query: string, limit: number = 10): Promise<MusicTrack[]> {
  // Jamendo的客户端ID（公开的，用于开发）
  const CLIENT_ID = '56d30c95'; // 这是Jamendo的公开测试ID
  
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${CLIENT_ID}&format=json&limit=${limit}&search=${encodedQuery}&include=musicinfo`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Jamendo API请求失败');
    }
    
    const data = await response.json();
    
    return data.results.map((item: any) => ({
      id: `jamendo_${item.id}`,
      title: item.name,
      artist: item.artist_name,
      album: item.album_name,
      coverUrl: item.album_image || item.image,
      previewUrl: item.audio, // 完整音频（免费）
      duration: item.duration,
      source: 'jamendo' as const
    }));
  } catch (error) {
    console.error('Jamendo搜索失败:', error);
    return [];
  }
}

/**
 * 本地音乐库（降级方案）
 */
const LOCAL_MUSIC_LIBRARY: MusicTrack[] = [
  {
    id: 'local_1',
    title: '晴天',
    artist: '周杰伦',
    album: '叶惠美',
    coverUrl: 'https://picsum.photos/300/300?random=1',
    source: 'local'
  },
  {
    id: 'local_2',
    title: '青花瓷',
    artist: '周杰伦',
    album: '我很忙',
    coverUrl: 'https://picsum.photos/300/300?random=2',
    source: 'local'
  },
  {
    id: 'local_3',
    title: '红豆',
    artist: '王菲',
    album: '唱游',
    coverUrl: 'https://picsum.photos/300/300?random=3',
    source: 'local'
  },
  {
    id: 'local_4',
    title: '匆匆那年',
    artist: '王菲',
    album: '匆匆那年 电影原声带',
    coverUrl: 'https://picsum.photos/300/300?random=4',
    source: 'local'
  },
  {
    id: 'local_5',
    title: '演员',
    artist: '薛之谦',
    album: '绅士',
    coverUrl: 'https://picsum.photos/300/300?random=5',
    source: 'local'
  },
  {
    id: 'local_6',
    title: '说好不哭',
    artist: '周杰伦',
    album: '说好不哭',
    coverUrl: 'https://picsum.photos/300/300?random=6',
    source: 'local'
  },
  {
    id: 'local_7',
    title: '年轮',
    artist: '张碧晨',
    album: '年轮',
    coverUrl: 'https://picsum.photos/300/300?random=7',
    source: 'local'
  },
  {
    id: 'local_8',
    title: '光年之外',
    artist: 'G.E.M.邓紫棋',
    album: '光年之外',
    coverUrl: 'https://picsum.photos/300/300?random=8',
    source: 'local'
  },
  {
    id: 'local_9',
    title: '稻香',
    artist: '周杰伦',
    album: '魔杰座',
    coverUrl: 'https://picsum.photos/300/300?random=9',
    source: 'local'
  },
  {
    id: 'local_10',
    title: '七里香',
    artist: '周杰伦',
    album: '七里香',
    coverUrl: 'https://picsum.photos/300/300?random=10',
    source: 'local'
  },
  {
    id: 'local_11',
    title: '夜曲',
    artist: '周杰伦',
    album: '11月的萧邦',
    coverUrl: 'https://picsum.photos/300/300?random=11',
    source: 'local'
  },
  {
    id: 'local_12',
    title: '告白气球',
    artist: '周杰伦',
    album: '周杰伦的床边故事',
    coverUrl: 'https://picsum.photos/300/300?random=12',
    source: 'local'
  }
];

/**
 * 从本地库搜索音乐
 */
function searchLocalMusic(query: string): MusicTrack[] {
  const lowerQuery = query.toLowerCase();
  return LOCAL_MUSIC_LIBRARY.filter(track => 
    track.title.toLowerCase().includes(lowerQuery) ||
    track.artist.toLowerCase().includes(lowerQuery) ||
    (track.album && track.album.toLowerCase().includes(lowerQuery))
  );
}

/**
 * 综合搜索音乐（优先使用真实API）
 */
export async function searchMusic(query: string, limit: number = 10): Promise<MusicTrack[]> {
  // 策略：先尝试iTunes，失败则用Jamendo，都失败则用本地库
  
  try {
    // 1. 尝试iTunes（最可靠）
    console.log('🎵 尝试iTunes搜索:', query);
    const itunesResults = await searchITunesMusic(query, limit);
    if (itunesResults.length > 0) {
      console.log(`✅ iTunes找到${itunesResults.length}首歌曲`);
      return itunesResults;
    }
    
    // 2. 尝试Jamendo
    console.log('🎵 尝试Jamendo搜索:', query);
    const jamendoResults = await searchJamendoMusic(query, limit);
    if (jamendoResults.length > 0) {
      console.log(`✅ Jamendo找到${jamendoResults.length}首歌曲`);
      return jamendoResults;
    }
    
    // 3. 降级到本地库
    console.log('🎵 使用本地音乐库:', query);
    const localResults = searchLocalMusic(query);
    console.log(`✅ 本地库找到${localResults.length}首歌曲`);
    return localResults;
    
  } catch (error) {
    console.error('音乐搜索失败:', error);
    // 最终降级
    return searchLocalMusic(query);
  }
}

/**
 * 获取随机音乐推荐
 */
export async function getRandomMusic(count: number = 1): Promise<MusicTrack[]> {
  // 先尝试从热门关键词搜索
  const popularKeywords = [
    '周杰伦', '王菲', '邓紫棋', '薛之谦', '张碧晨',
    '流行', '华语', 'pop', 'chinese music'
  ];
  
  const randomKeyword = popularKeywords[Math.floor(Math.random() * popularKeywords.length)];
  
  try {
    const results = await searchMusic(randomKeyword, count * 2);
    // 随机抽取
    const shuffled = results.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  } catch (error) {
    // 降级：从本地库随机抽取
    const shuffled = [...LOCAL_MUSIC_LIBRARY].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
}

/**
 * 根据AI性格推荐音乐
 */
export async function getMusicByPersonality(personality: string): Promise<MusicTrack> {
  let keywords: string[] = [];
  
  if (personality.includes('活泼') || personality.includes('外向')) {
    keywords = ['pop', 'dance', '流行'];
  } else if (personality.includes('文艺') || personality.includes('安静')) {
    keywords = ['acoustic', 'folk', '民谣'];
  } else if (personality.includes('理性') || personality.includes('严谨')) {
    keywords = ['classical', 'jazz', '古典'];
  } else {
    keywords = ['pop', '流行', 'chinese'];
  }
  
  const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
  const results = await searchMusic(randomKeyword, 5);
  
  if (results.length > 0) {
    return results[Math.floor(Math.random() * results.length)];
  }
  
  // 降级：返回本地库随机一首
  return LOCAL_MUSIC_LIBRARY[Math.floor(Math.random() * LOCAL_MUSIC_LIBRARY.length)];
}
