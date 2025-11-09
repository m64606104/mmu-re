/**
 * 订单历史页面
 * 显示所有对话中的订单记录
 */

import { ChevronLeft, ShoppingBag, Gift, CreditCard, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Conversation } from '../types';

interface OrderHistoryScreenProps {
  conversations: Conversation[];
  onBack: () => void;
  onNavigateToChat: (conversationId: string) => void;
}

interface OrderItem {
  messageId: string;
  conversationId: string;
  aiName: string;
  aiAvatar: string;
  order: {
    type: 'gift' | 'payRequest';
    products: Array<{
      id: string;
      name: string;
      price: number;
      quantity: number;
      image?: string;
    }>;
    totalAmount: number;
    status: 'pending' | 'accepted' | 'rejected' | 'paid';
    orderNumber?: string;
    message?: string;
    recipientId?: string;
    recipientName?: string;
  };
  timestamp: number;
  role: 'user' | 'assistant' | 'system'; // 谁发送的订单
}

const OrderHistoryScreen = ({ conversations, onBack, onNavigateToChat }: OrderHistoryScreenProps) => {
  // 提取所有订单
  const getAllOrders = (): OrderItem[] => {
    const orders: OrderItem[] = [];
    
    conversations.forEach(conv => {
      conv.messages
        .filter(msg => msg.order)
        .forEach(msg => {
          if (msg.order) {
            orders.push({
              messageId: msg.id,
              conversationId: conv.id,
              aiName: conv.characterSettings?.nickname || 'AI',
              aiAvatar: conv.characterSettings?.avatar || '🤖',
              order: msg.order,
              timestamp: msg.timestamp,
              role: msg.role
            });
          }
        });
    });
    
    // 按时间倒序排序
    return orders.sort((a, b) => b.timestamp - a.timestamp);
  };

  const orders = getAllOrders();

  // 状态映射
  const statusConfig = {
    pending: { text: '待处理', icon: Clock, color: 'text-gray-500', bgColor: 'bg-gray-100' },
    accepted: { text: '已接受', icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-100' },
    rejected: { text: '已拒绝', icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-100' },
    paid: { text: '已支付', icon: CheckCircle, color: 'text-blue-500', bgColor: 'bg-blue-100' }
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else if (diffDays === 1) {
      return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-6 h-6" />
            <h1 className="text-xl font-semibold">订单历史</h1>
          </div>
        </div>
        <p className="text-sm text-purple-100 mt-2 ml-11">
          共 {orders.length} 个订单
        </p>
      </div>

      {/* 订单列表 */}
      <div className="p-4 space-y-3">
        {orders.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">暂无订单记录</p>
            <p className="text-xs text-gray-400 mt-2">去商城购物或让AI送你礼物吧～</p>
          </div>
        ) : (
          orders.map((orderItem) => {
            const StatusIcon = statusConfig[orderItem.order.status].icon;
            const isFromAI = orderItem.role === 'assistant';
            
            return (
              <div
                key={orderItem.messageId}
                onClick={() => onNavigateToChat(orderItem.conversationId)}
                className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100"
              >
                {/* 订单头部 */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-xl">
                      {orderItem.aiAvatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{orderItem.aiName}</h3>
                        {isFromAI ? (
                          <Gift className="w-4 h-4 text-purple-500" />
                        ) : (
                          <CreditCard className="w-4 h-4 text-blue-500" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{formatTime(orderItem.timestamp)}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${statusConfig[orderItem.order.status].bgColor}`}>
                    <StatusIcon className={`w-3 h-3 ${statusConfig[orderItem.order.status].color}`} />
                    <span className={`text-xs ${statusConfig[orderItem.order.status].color}`}>
                      {statusConfig[orderItem.order.status].text}
                    </span>
                  </div>
                </div>

                {/* 订单类型 */}
                <div className="mb-2">
                  <span className="text-xs text-gray-600">
                    {isFromAI ? (
                      orderItem.order.type === 'gift' ? 'AI送你的礼物' : 'AI请你代付'
                    ) : (
                      orderItem.order.type === 'gift' ? '你送的礼物' : '你请AI代付'
                    )}
                  </span>
                </div>

                {/* 商品列表 */}
                <div className="space-y-2 mb-3">
                  {orderItem.order.products.map((product) => (
                    <div key={product.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-lg">
                          {product.image || '📦'}
                        </div>
                        <span className="text-sm text-gray-700">{product.name}</span>
                        <span className="text-xs text-gray-400">x{product.quantity}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">¥{product.price}</span>
                    </div>
                  ))}
                </div>

                {/* 总金额 */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-sm text-gray-600">订单号: {orderItem.order.orderNumber?.slice(-8) || 'N/A'}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">总计</span>
                    <span className="text-lg font-bold text-purple-600">¥{orderItem.order.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* 留言 */}
                {orderItem.order.message && (
                  <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded p-2">
                    💬 {orderItem.order.message}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default OrderHistoryScreen;
