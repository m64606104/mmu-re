/**
 * 钱包系统
 * 管理用户余额和交易记录
 */

import { getCachedData, load, save, setCachedData } from './storage';

export interface WalletData {
  balance: number; // 余额
  transactions: Transaction[]; // 交易记录
}

export interface AIWalletData {
  [aiId: string]: {
    balance: number;
    transactions: Transaction[];
  };
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense'; // 收入或支出
  amount: number; // 金额
  category: 'redPacket' | 'transfer' | 'groupRedPacket' | 'shopping' | 'recharge' | 'other'; // 交易类别
  description: string; // 描述
  timestamp: number; // 时间戳
  relatedConversationId?: string; // 关联的对话ID
}

const WALLET_KEY = 'wallet_data';
const AI_WALLET_KEY = 'ai_wallet_data';

function getDefaultWallet(): WalletData {
  return { balance: 1000, transactions: [] };
}

/**
 * 获取钱包数据
 */
export const getWalletData = (): WalletData => {
  const cached = getCachedData<WalletData>(WALLET_KEY);
  if (cached && typeof cached === 'object') return cached;
  // 允许无阻塞：首次可能返回默认值，初始化由App预载或后续写入覆盖
  return getDefaultWallet();
};

/**
 * 保存钱包数据
 */
export const saveWalletData = (data: WalletData): void => {
  setCachedData(WALLET_KEY, data);
  void save(WALLET_KEY, data).catch((error) => {
    console.error('保存钱包数据失败:', error);
  });
};

/**
 * 添加交易记录
 */
export const addTransaction = (
  type: 'income' | 'expense',
  amount: number,
  category: Transaction['category'],
  description: string,
  relatedConversationId?: string
): Transaction => {
  const wallet = getWalletData();
  
  const transaction: Transaction = {
    id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    amount,
    category,
    description,
    timestamp: Date.now(),
    relatedConversationId
  };
  
  // 更新余额
  if (type === 'income') {
    wallet.balance += amount;
  } else {
    wallet.balance -= amount;
  }
  
  // 添加交易记录
  wallet.transactions.unshift(transaction);
  
  // 保留最近1000条记录
  if (wallet.transactions.length > 1000) {
    wallet.transactions = wallet.transactions.slice(0, 1000);
  }
  
  saveWalletData(wallet);
  
  console.log(`💰 交易记录已添加: ${type === 'income' ? '+' : '-'}¥${amount} ${description}`);
  
  return transaction;
};

/**
 * 充值
 */
export const recharge = (amount: number): boolean => {
  if (amount <= 0) {
    console.error('充值金额必须大于0');
    return false;
  }
  
  addTransaction('income', amount, 'recharge', `充值 ¥${amount}`);
  return true;
};

/**
 * 检查余额是否足够
 */
export const hasEnoughBalance = (amount: number): boolean => {
  const wallet = getWalletData();
  return wallet.balance >= amount;
};

/**
 * 获取余额
 */
export const getBalance = (): number => {
  const wallet = getWalletData();
  return wallet.balance;
};

/**
 * 发送红包/转账/群红包
 */
export const sendMoney = (
  amount: number,
  type: 'redPacket' | 'transfer' | 'groupRedPacket',
  conversationId: string,
  message?: string
): boolean => {
  if (!hasEnoughBalance(amount)) {
    console.error('余额不足');
    return false;
  }
  
  const description = type === 'groupRedPacket'
    ? `发出群红包${message ? `: ${message}` : ''}`
    : type === 'redPacket' 
    ? `发出红包${message ? `: ${message}` : ''}` 
    : `转账${message ? `: ${message}` : ''}`;
  
  addTransaction('expense', amount, type, description, conversationId);
  return true;
};

/**
 * 接收红包/转账/群红包
 */
export const receiveMoney = (
  amount: number,
  type: 'redPacket' | 'transfer' | 'groupRedPacket',
  conversationId: string,
  message?: string
): void => {
  const description = type === 'groupRedPacket'
    ? `领取群红包${message ? `: ${message}` : ''}`
    : type === 'redPacket' 
    ? `收到红包${message ? `: ${message}` : ''}` 
    : `收到转账${message ? `: ${message}` : ''}`;
  
  addTransaction('income', amount, type, description, conversationId);
};

/**
 * 购买商品
 */
export const purchaseProduct = (
  amount: number,
  productName: string,
  shopName: string
): boolean => {
  if (!hasEnoughBalance(amount)) {
    console.error('余额不足');
    return false;
  }
  
  addTransaction('expense', amount, 'shopping', `购买 ${productName} (${shopName})`);
  return true;
};

// ==================== AI钱包系统 ====================

/**
 * 获取AI钱包数据
 */
export const getAIWalletData = (): AIWalletData => {
  const cached = getCachedData<AIWalletData>(AI_WALLET_KEY);
  if (cached && typeof cached === 'object') return cached;
  return {};
};

/**
 * 保存AI钱包数据
 */
export const saveAIWalletData = (data: AIWalletData): void => {
  setCachedData(AI_WALLET_KEY, data);
  void save(AI_WALLET_KEY, data).catch((error) => {
    console.error('保存AI钱包数据失败:', error);
  });
};

export async function initializeWalletStorage(): Promise<void> {
  try {
    const [wallet, aiWallet] = await Promise.all([
      load(WALLET_KEY),
      load(AI_WALLET_KEY),
    ]);
    setCachedData(WALLET_KEY, wallet && typeof wallet === 'object' ? wallet : getDefaultWallet());
    setCachedData(AI_WALLET_KEY, aiWallet && typeof aiWallet === 'object' ? aiWallet : {});
  } catch (error) {
    console.error('初始化钱包存储失败:', error);
    setCachedData(WALLET_KEY, getDefaultWallet());
    setCachedData(AI_WALLET_KEY, {});
  }
}

/**
 * 获取指定AI的余额
 */
export const getAIBalance = (aiId: string): number => {
  const aiWallets = getAIWalletData();
  if (!aiWallets[aiId]) {
    // 默认每个AI初始有500元
    return 500;
  }
  return aiWallets[aiId].balance;
};

/**
 * 初始化AI钱包（如果不存在）
 */
const initAIWallet = (aiId: string): void => {
  const aiWallets = getAIWalletData();
  if (!aiWallets[aiId]) {
    aiWallets[aiId] = {
      balance: 500, // 默认初始余额500元
      transactions: []
    };
    saveAIWalletData(aiWallets);
  }
};

/**
 * AI添加交易记录
 */
export const addAITransaction = (
  aiId: string,
  type: 'income' | 'expense',
  amount: number,
  category: Transaction['category'],
  description: string,
  relatedConversationId?: string
): Transaction => {
  initAIWallet(aiId);
  
  const aiWallets = getAIWalletData();
  const aiWallet = aiWallets[aiId];
  
  const transaction: Transaction = {
    id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    amount,
    category,
    description,
    timestamp: Date.now(),
    relatedConversationId
  };
  
  // 更新AI余额
  if (type === 'income') {
    aiWallet.balance += amount;
  } else {
    aiWallet.balance -= amount;
  }
  
  // 添加交易记录
  aiWallet.transactions.unshift(transaction);
  
  // 保留最近1000条记录
  if (aiWallet.transactions.length > 1000) {
    aiWallet.transactions = aiWallet.transactions.slice(0, 1000);
  }
  
  saveAIWalletData(aiWallets);
  
  console.log(`🤖💰 AI交易记录已添加: ${type === 'income' ? '+' : '-'}¥${amount} ${description}`);
  
  return transaction;
};

/**
 * 检查AI余额是否足够
 */
export const aiHasEnoughBalance = (aiId: string, amount: number): boolean => {
  const balance = getAIBalance(aiId);
  return balance >= amount;
};

/**
 * AI代付（从AI余额扣款，用户余额增加）
 */
export const aiPayForUser = (
  aiId: string,
  amount: number,
  productName: string,
  conversationId: string
): boolean => {
  if (!aiHasEnoughBalance(aiId, amount)) {
    console.error('AI余额不足');
    return false;
  }
  
  // AI余额扣款
  addAITransaction(
    aiId,
    'expense',
    amount,
    'shopping',
    `帮用户代付: ${productName}`,
    conversationId
  );
  
  // 用户余额增加（相当于收到了商品价值）
  // 注意：这里不增加用户余额，因为代付是AI帮用户买单，用户得到的是商品而不是钱
  
  return true;
};

/**
 * 退回礼物
 * 注意：礼物不涉及用户的真实钱包，因为：
 * - AI送礼物是用AI的虚拟货币（智能财务系统）
 * - 用户接受礼物不会收到钱，只是收礼物
 * - 用户退回礼物也不应该有账单记录
 */
export const refundGift = (
  amount: number,
  productName: string,
  _conversationId: string // 保留参数签名以兼容现有调用，但不使用
): boolean => {
  // ✅ 修复：礼物退回不应该给用户增加收入
  // AI送礼物是送礼物，不是送钱
  // 退回礼物也不涉及用户钱包
  console.log(`🎁 退回礼物: ${productName} (¥${amount})，不计入用户账单`);
  return true;
};
