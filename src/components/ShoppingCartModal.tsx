import { useState, useEffect } from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  shopType: 'food' | 'movie' | 'shopping';
  isAIGenerated?: boolean;
}

interface ShoppingCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopType: 'food' | 'movie' | 'shopping';
  onPurchase: (items: CartItem[], totalAmount: number) => void;
}

export default function ShoppingCartModal({
  isOpen,
  onClose,
  shopType,
  onPurchase
}: ShoppingCartModalProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // 加载购物车数据
  useEffect(() => {
    if (isOpen) {
      loadCartItems();
    }
  }, [isOpen, shopType]);

  const loadCartItems = () => {
    try {
      const cartKey = `shopping_cart_${shopType}`;
      const savedCart = localStorage.getItem(cartKey);
      if (savedCart) {
        setCartItems(JSON.parse(savedCart));
      } else {
        setCartItems([]);
      }
    } catch (error) {
      console.error('加载购物车失败:', error);
      setCartItems([]);
    }
  };

  const saveCartItems = (items: CartItem[]) => {
    try {
      const cartKey = `shopping_cart_${shopType}`;
      localStorage.setItem(cartKey, JSON.stringify(items));
      setCartItems(items);
    } catch (error) {
      console.error('保存购物车失败:', error);
    }
  };

  // 更新商品数量
  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(itemId);
      return;
    }

    const updatedItems = cartItems.map(item =>
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    );
    saveCartItems(updatedItems);
  };

  // 移除商品
  const removeItem = (itemId: string) => {
    const updatedItems = cartItems.filter(item => item.id !== itemId);
    saveCartItems(updatedItems);
  };

  // 清空购物车
  const clearCart = () => {
    saveCartItems([]);
  };

  // 计算总价
  const getTotalAmount = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // 获取商品总数
  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  // 商城配置
  const shopConfig = {
    food: {
      name: '😋 饿饿吗',
      color: 'from-blue-500 to-cyan-500',
      emptyIcon: '🍜',
      emptyText: '购物车空空如也\n去添加一些美食吧！'
    },
    movie: {
      name: '🎬 电影票',
      color: 'from-purple-500 to-pink-500',
      emptyIcon: '🎭',
      emptyText: '还没选择电影\n去挑选心仪的影片吧！'
    },
    shopping: {
      name: '🛍️ 淘淘宝',
      color: 'from-orange-500 to-red-500',
      emptyIcon: '🛒',
      emptyText: '购物车空空如也\n去添加一些好物吧！'
    }
  };

  const currentShop = shopConfig[shopType];

  const handlePurchase = () => {
    if (cartItems.length === 0) {
      alert('购物车为空');
      return;
    }

    const totalAmount = getTotalAmount();
    onPurchase(cartItems, totalAmount);
    clearCart();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-2xl w-full max-w-md h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className={`bg-gradient-to-r ${currentShop.color} text-white px-4 py-4 rounded-t-2xl`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-6 h-6" />
              <div>
                <h3 className="text-lg font-semibold">{currentShop.name}</h3>
                <p className="text-sm opacity-90">购物车 ({getTotalItems()}件商品)</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 flex flex-col">
          {cartItems.length === 0 ? (
            // 空购物车
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="text-6xl mb-4">{currentShop.emptyIcon}</div>
              <div className="text-center text-gray-500 whitespace-pre-line">
                {currentShop.emptyText}
              </div>
            </div>
          ) : (
            <>
              {/* 商品列表 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cartItems.map((item) => (
                  <div key={item.id} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                    {/* 商品图片 */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://via.placeholder.com/150x150?text=${encodeURIComponent(item.name.slice(0, 2))}`;
                        }}
                      />
                    </div>

                    {/* 商品信息 */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-800 truncate">{item.name}</h4>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-red-500 font-semibold">¥{item.price.toFixed(2)}</span>
                        {item.isAIGenerated && (
                          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">AI生成</span>
                        )}
                      </div>
                    </div>

                    {/* 数量控制 */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="ml-2 p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* 底部结算 */}
              <div className="border-t bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-600">总计</span>
                  <div className="text-right">
                    <div className="text-xl font-bold text-red-500">¥{getTotalAmount().toFixed(2)}</div>
                    <div className="text-sm text-gray-500">共{getTotalItems()}件商品</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={clearCart}
                    className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    清空购物车
                  </button>
                  <button
                    onClick={handlePurchase}
                    className={`flex-2 py-3 bg-gradient-to-r ${currentShop.color} text-white rounded-lg font-medium hover:opacity-90 transition-opacity`}
                  >
                    立即结算
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// 购物车工具函数
export const addToCart = (product: any, shopType: 'food' | 'movie' | 'shopping', quantity = 1) => {
  try {
    const cartKey = `shopping_cart_${shopType}`;
    const savedCart = localStorage.getItem(cartKey);
    const cartItems: CartItem[] = savedCart ? JSON.parse(savedCart) : [];

    // 检查商品是否已存在
    const existingItemIndex = cartItems.findIndex(item => item.id === product.id);
    
    if (existingItemIndex >= 0) {
      // 商品已存在，增加数量
      cartItems[existingItemIndex].quantity += quantity;
    } else {
      // 新商品，添加到购物车
      const cartItem: CartItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: quantity,
        image: product.image,
        shopType: shopType,
        isAIGenerated: product.isAIGenerated
      };
      cartItems.push(cartItem);
    }

    localStorage.setItem(cartKey, JSON.stringify(cartItems));
    return true;
  } catch (error) {
    console.error('添加到购物车失败:', error);
    return false;
  }
};

// 获取购物车商品数量
export const getCartItemCount = (shopType: 'food' | 'movie' | 'shopping'): number => {
  try {
    const cartKey = `shopping_cart_${shopType}`;
    const savedCart = localStorage.getItem(cartKey);
    if (!savedCart) return 0;

    const cartItems: CartItem[] = JSON.parse(savedCart);
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  } catch (error) {
    console.error('获取购物车数量失败:', error);
    return 0;
  }
};
