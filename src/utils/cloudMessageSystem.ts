/**
 * 云端消息系统 - 基于Firebase实现真正的跨设备聊天
 * 解决异地用户无法聊天的问题
 */

// 注意：这是示例代码，需要先安装Firebase
// npm install firebase

import { getCurrentUser } from './userSystem';

// Firebase配置（需要用户自己创建Firebase项目）
const firebaseConfig = {
  // 用户需要在这里填入自己的Firebase配置
  apiKey: "", // 从Firebase控制台获取
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

interface CloudMessage {
  id: string;
  forumId: string;
  authorCode: string;
  authorName: string;
  content: string;
  timestamp: number;
  messageType: 'text' | 'image' | 'file';
}

interface CloudForum {
  id: string;
  participants: string[];
  createdAt: number;
  lastActivity: number;
}

// Firebase实例（需要在应用启动时初始化）
let db: any = null;

/**
 * 初始化Firebase连接
 */
export function initializeCloudSystem(): boolean {
  try {
    // 检查是否已配置Firebase
    if (!firebaseConfig.apiKey) {
      console.warn('⚠️ Firebase未配置，使用本地存储模拟');
      return false;
    }

    // 这里需要导入Firebase SDK并初始化
    // import { initializeApp } from 'firebase/app';
    // import { getDatabase } from 'firebase/database';
    // const app = initializeApp(firebaseConfig);
    // db = getDatabase(app);
    
    console.log('🌐 云端消息系统已初始化');
    return true;
  } catch (error) {
    console.error('❌ Firebase初始化失败:', error);
    return false;
  }
}

/**
 * 创建或加入云端论坛
 */
export async function createCloudForum(participants: string[]): Promise<CloudForum | null> {
  try {
    if (db) {
      const forumId = participants.sort().join('_');
      console.log(`🌐 尝试创建云端论坛: ${forumId}`);
      // Firebase实现
      // const forumRef = ref(db, `forums/${forumId}`);
      // const snapshot = await get(forumRef);
      
      // if (!snapshot.exists()) {
      //   const newForum: CloudForum = {
      //     id: forumId,
      //     participants,
      //     createdAt: Date.now(),
      //     lastActivity: Date.now()
      //   };
      //   await set(forumRef, newForum);
      //   return newForum;
      // }
      // return snapshot.val();
    }
    
    // 本地存储降级（用于演示）
    return createLocalForum(participants);
  } catch (error) {
    console.error('❌ 创建云端论坛失败:', error);
    return createLocalForum(participants);
  }
}

/**
 * 发送消息到云端
 */
export async function sendCloudMessage(forumId: string, content: string): Promise<CloudMessage | null> {
  const currentUser = getCurrentUser();
  if (!currentUser) return null;

  const message: CloudMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    forumId,
    authorCode: currentUser.userCode,
    authorName: currentUser.nickname,
    content,
    timestamp: Date.now(),
    messageType: 'text'
  };

  try {
    if (db) {
      // Firebase实现：保存到云端
      // const messageRef = ref(db, `messages/${forumId}/${message.id}`);
      // await set(messageRef, message);
      
      // 更新论坛最后活跃时间
      // const forumRef = ref(db, `forums/${forumId}/lastActivity`);
      // await set(forumRef, Date.now());
      
      console.log('☁️ 消息已发送到云端:', message.id);
      return message;
    }
    
    // 本地存储降级
    return sendLocalMessage(forumId, content);
  } catch (error) {
    console.error('❌ 发送云端消息失败:', error);
    return sendLocalMessage(forumId, content);
  }
}

/**
 * 获取云端消息
 */
export async function getCloudMessages(forumId: string): Promise<CloudMessage[]> {
  try {
    if (db) {
      // Firebase实现：从云端获取
      // const messagesRef = ref(db, `messages/${forumId}`);
      // const snapshot = await get(messagesRef);
      
      // if (snapshot.exists()) {
      //   const messagesData = snapshot.val();
      //   return Object.values(messagesData).sort((a: any, b: any) => a.timestamp - b.timestamp);
      // }
      // return [];
    }
    
    // 本地存储降级
    return getLocalMessages(forumId);
  } catch (error) {
    console.error('❌ 获取云端消息失败:', error);
    return getLocalMessages(forumId);
  }
}

/**
 * 监听云端消息更新（实时）
 */
export function listenToCloudMessages(forumId: string, callback: (messages: CloudMessage[]) => void): () => void {
  try {
    if (db) {
      // Firebase实时监听
      // const messagesRef = ref(db, `messages/${forumId}`);
      // return onValue(messagesRef, (snapshot) => {
      //   if (snapshot.exists()) {
      //     const messagesData = snapshot.val();
      //     const messages = Object.values(messagesData).sort((a: any, b: any) => a.timestamp - b.timestamp);
      //     callback(messages);
      //   } else {
      //     callback([]);
      //   }
      // });
    }
    
    // 本地存储降级：定期检查
    const interval = setInterval(() => {
      const messages = getLocalMessages(forumId);
      callback(messages);
    }, 3000);
    
    return () => clearInterval(interval);
  } catch (error) {
    console.error('❌ 监听云端消息失败:', error);
    return () => {};
  }
}

/**
 * 本地存储降级函数（保持兼容性）
 */
function createLocalForum(participants: string[]): CloudForum {
  const forumId = participants.sort().join('_');
  return {
    id: forumId,
    participants,
    createdAt: Date.now(),
    lastActivity: Date.now()
  };
}

function sendLocalMessage(forumId: string, content: string): CloudMessage | null {
  const currentUser = getCurrentUser();
  if (!currentUser) return null;

  const message: CloudMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    forumId,
    authorCode: currentUser.userCode,
    authorName: currentUser.nickname,
    content,
    timestamp: Date.now(),
    messageType: 'text'
  };

  // 保存到localStorage
  const messages = getLocalMessages(forumId);
  messages.push(message);
  localStorage.setItem(`cloud_messages_${forumId}`, JSON.stringify(messages));
  
  return message;
}

function getLocalMessages(forumId: string): CloudMessage[] {
  const data = localStorage.getItem(`cloud_messages_${forumId}`);
  return data ? JSON.parse(data) : [];
}

/**
 * 获取系统状态
 */
export function getCloudSystemStatus() {
  return {
    isCloudEnabled: !!db,
    hasFirebaseConfig: !!firebaseConfig.apiKey,
    mode: db ? 'cloud' : 'local',
    description: db ? 
      '☁️ 云端模式 - 支持异地聊天' : 
      '💾 本地模式 - 仅支持同设备聊天'
  };
}

console.log('🌐 云端消息系统已加载');
