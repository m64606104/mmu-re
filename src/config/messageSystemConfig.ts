/**
 * 消息系统配置
 * 用户可以在这里选择使用本地存储还是云端存储
 */

export interface MessageSystemConfig {
  mode: 'local' | 'firebase' | 'supabase';
  description: string;
  supportsRemoteChat: boolean;
}

// 🔧 用户配置区域 - 请根据需要修改
export const MESSAGE_SYSTEM_CONFIG: MessageSystemConfig = {
  mode: 'local', // 'local' | 'firebase' | 'supabase'
  description: '本地存储模式（仅同设备聊天）',
  supportsRemoteChat: false
};

// Firebase配置（如果选择firebase模式）
export const FIREBASE_CONFIG = {
  apiKey: "", // 在Firebase控制台获取
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Supabase配置（如果选择supabase模式）
export const SUPABASE_CONFIG = {
  url: "", // 在Supabase控制台获取
  anonKey: "" // 在Supabase控制台获取
};

/**
 * 获取当前配置的描述信息
 */
export function getSystemInfo() {
  switch (MESSAGE_SYSTEM_CONFIG.mode) {
    case 'local':
      return {
        title: '💾 本地存储模式',
        description: '消息存储在浏览器中，仅支持同设备多标签页聊天',
        limitations: [
          '❌ 不支持异地用户聊天',
          '❌ 不支持不同设备聊天',
          '❌ 清除浏览器数据会丢失聊天记录'
        ],
        advantages: [
          '✅ 完全离线工作',
          '✅ 无需配置',
          '✅ 数据私密性好'
        ]
      };
      
    case 'firebase':
      return {
        title: '☁️ Firebase云端模式',
        description: '消息存储在Firebase云数据库，支持全球异地聊天',
        limitations: [
          '⚠️ 需要网络连接',
          '⚠️ 需要配置Firebase项目'
        ],
        advantages: [
          '✅ 支持异地用户聊天',
          '✅ 支持多设备同步',
          '✅ 实时消息推送',
          '✅ 数据永久保存',
          '✅ 免费额度充足'
        ]
      };
      
    case 'supabase':
      return {
        title: '🐘 Supabase云端模式',
        description: '消息存储在Supabase数据库，支持全球异地聊天',
        limitations: [
          '⚠️ 需要网络连接',
          '⚠️ 需要配置Supabase项目'
        ],
        advantages: [
          '✅ 支持异地用户聊天',
          '✅ 支持多设备同步',
          '✅ 开源替代方案',
          '✅ 数据永久保存',
          '✅ 强大的SQL查询能力'
        ]
      };
      
    default:
      return {
        title: '❓ 未知模式',
        description: '请检查配置文件',
        limitations: ['配置错误'],
        advantages: []
      };
  }
}
