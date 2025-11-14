/**
 * 用户系统管理
 * 支持用户注册、登录、用户码生成等功能
 */

export interface User {
  id: string;
  userCode: string;     // 6位用户码
  nickname: string;
  avatar: string;
  lastOnline: number;
  createdAt: number;
}

export interface Friend {
  userId: string;
  userCode: string;
  nickname: string;
  avatar: string;
  addedAt: number;
  status: 'pending' | 'accepted' | 'blocked';
}

export interface UserMessage {
  id: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'redPacket';
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
  metadata?: any; // 额外数据（红包金额等）
}

/**
 * 生成6位用户码
 */
function generateUserCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 获取当前用户信息
 */
export function getCurrentUser(): User | null {
  const userData = localStorage.getItem('current_user');
  return userData ? JSON.parse(userData) : null;
}

/**
 * 创建新用户
 */
export function createUser(nickname: string, avatar: string): User {
  const user: User = {
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userCode: generateUserCode(),
    nickname,
    avatar,
    lastOnline: Date.now(),
    createdAt: Date.now()
  };
  
  // 保存到本地存储
  localStorage.setItem('current_user', JSON.stringify(user));
  
  console.log(`✅ 用户创建成功: ${nickname} (${user.userCode})`);
  return user;
}

/**
 * 更新用户最后在线时间
 */
export function updateLastOnline(): void {
  const user = getCurrentUser();
  if (user) {
    user.lastOnline = Date.now();
    localStorage.setItem('current_user', JSON.stringify(user));
  }
}

/**
 * 获取用户好友列表
 */
export function getFriendsList(): Friend[] {
  const friendsData = localStorage.getItem('friends_list');
  return friendsData ? JSON.parse(friendsData) : [];
}

/**
 * 添加好友
 */
export function addFriend(userCode: string, nickname: string, avatar: string): boolean {
  const friends = getFriendsList();
  const currentUser = getCurrentUser();
  
  if (!currentUser) return false;
  
  // 检查是否已经是好友
  const existingFriend = friends.find(f => f.userCode === userCode);
  if (existingFriend) return false;
  
  // 不能添加自己为好友
  if (userCode === currentUser.userCode) return false;
  
  const newFriend: Friend = {
    userId: `user_${userCode}`, // 简化的用户ID生成
    userCode,
    nickname,
    avatar,
    addedAt: Date.now(),
    status: 'accepted' // 简化流程，直接接受
  };
  
  friends.push(newFriend);
  localStorage.setItem('friends_list', JSON.stringify(friends));
  
  console.log(`✅ 添加好友成功: ${nickname} (${userCode})`);
  return true;
}

/**
 * 删除好友
 */
export function removeFriend(userCode: string): boolean {
  const friends = getFriendsList();
  const updatedFriends = friends.filter(f => f.userCode !== userCode);
  
  if (updatedFriends.length < friends.length) {
    localStorage.setItem('friends_list', JSON.stringify(updatedFriends));
    console.log(`✅ 删除好友成功: ${userCode}`);
    return true;
  }
  
  return false;
}

/**
 * 根据用户码查找好友
 */
export function findFriendByCode(userCode: string): Friend | null {
  const friends = getFriendsList();
  return friends.find(f => f.userCode === userCode) || null;
}

/**
 * 检查是否首次使用（需要注册）
 */
export function isFirstTimeUser(): boolean {
  return getCurrentUser() === null;
}
