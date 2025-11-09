/**
 * 钱包系统
 * 管理用户余额和交易记录
 */

export interface WalletData {
  balance: number; // 余额
  transactions: Transaction[]; // 交易记录
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense'; // 收入或支出
  amount: number; // 金额
  category: 'redPacket' | 'transfer' | 'shopping' | 'recharge' | 'other'; // 交易类别
  description: string; // 描述
  timestamp: number; // 时间戳
  relatedConversationId?: string; // 关联的对话ID
}

/**
 * 获取钱包数据
 */
export const getWalletData = (): WalletData => {
  try {
    const data = localStorage.getItem('wallet_data');
    if (data) {
      return JSON.parse(data);
    }
    // 默认初始余额1000元
    return {
      balance: 1000,
      transactions: []
    };
  } catch (error) {
    console.error('获取钱包数据失败:', error);
    return {
      balance: 1000,
      transactions: []
    };
  }
};

/**
 * 保存钱包数据
 */
export const saveWalletData = (data: WalletData): void => {
  try {
    localStorage.setItem('wallet_data', JSON.stringify(data));
  } catch (error) {
    console.error('保存钱包数据失败:', error);
  }
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
 * 发送红包/转账
 */
export const sendMoney = (
  amount: number,
  type: 'redPacket' | 'transfer',
  conversationId: string,
  message?: string
): boolean => {
  if (!hasEnoughBalance(amount)) {
    console.error('余额不足');
    return false;
  }
  
  const description = type === 'redPacket' 
    ? `发出红包${message ? `: ${message}` : ''}` 
    : `转账${message ? `: ${message}` : ''}`;
  
  addTransaction('expense', amount, type, description, conversationId);
  return true;
};

/**
 * 接收红包/转账
 */
export const receiveMoney = (
  amount: number,
  type: 'redPacket' | 'transfer',
  conversationId: string,
  message?: string
): void => {
  const description = type === 'redPacket' 
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
  
  addTransaction('expense', amount, 'shopping', `${shopName} - ${productName}`);
  return true;
};
