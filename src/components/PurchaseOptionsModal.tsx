import { X, User, Gift, CreditCard } from 'lucide-react';
import { Conversation } from '../types';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
}

interface PurchaseOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  conversations: Conversation[];
  onPurchaseForSelf: (product: Product) => void;
  onPurchaseForAI: (product: Product, recipientId: string, recipientName: string) => void;
  onRequestAIPay: (product: Product, aiId: string) => void;
}

export default function PurchaseOptionsModal({
  isOpen,
  onClose,
  product,
  conversations,
  onPurchaseForSelf,
  onPurchaseForAI,
  onRequestAIPay
}: PurchaseOptionsModalProps) {
  if (!isOpen || !product) return null;

  // 只显示AI角色（排除群聊）
  const aiConversations = conversations.filter(c => c.type === 'private' && c.characterSettings);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-2xl w-full max-w-md pb-safe">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">购买选项</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 商品信息 */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <img
              src={product.image}
              alt={product.name}
              className="w-16 h-16 rounded-lg object-cover"
              onError={(e) => {
                e.currentTarget.src = 'https://via.placeholder.com/100?text=商品';
              }}
            />
            <div className="flex-1">
              <div className="font-medium text-gray-800">{product.name}</div>
              <div className="text-red-600 font-bold">¥{product.price.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* 选项列表 */}
        <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
          {/* 为自己购买 */}
          <button
            onClick={() => {
              onPurchaseForSelf(product);
              onClose();
            }}
            className="w-full flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-800">为自己购买</div>
              <div className="text-sm text-gray-500">直接下单，从钱包扣款</div>
            </div>
          </button>

          {/* 为AI购买（送礼） */}
          {aiConversations.length > 0 && (
            <div className="pt-2">
              <div className="text-sm font-medium text-gray-600 mb-2 px-2">送给AI好友</div>
              <div className="space-y-2">
                {aiConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      onPurchaseForAI(product, conv.id, conv.characterSettings!.nickname);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-pink-50 hover:bg-pink-100 rounded-xl transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                      <Gift className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">
                        送给 {conv.characterSettings!.nickname}
                      </div>
                      <div className="text-sm text-gray-500">购买后发送礼物卡片</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 请AI代付 */}
          {aiConversations.length > 0 && (
            <div className="pt-2">
              <div className="text-sm font-medium text-gray-600 mb-2 px-2">请AI代付</div>
              <div className="space-y-2">
                {aiConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      onRequestAIPay(product, conv.id);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 rounded-xl transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">
                        请 {conv.characterSettings!.nickname} 代付
                      </div>
                      <div className="text-sm text-gray-500">发送代付请求</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
