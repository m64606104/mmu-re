import React, { useState } from 'react';
import { ChevronLeft, Search, Settings, ShoppingCart } from 'lucide-react';
import { purchaseProduct, getBalance } from '../utils/wallet';

interface ShoppingScreenProps {
  shopType: 'food' | 'movie' | 'shopping';
  onBack: () => void;
  onPurchase: () => void; // 购买成功后刷新钱包
}

interface Product {
  id: string;
  name: string;
  price: number;
  image: string; // 图片URL或AI生成的描述
  isAIGenerated?: boolean; // 是否是AI生成的图片
}

const ShoppingScreen: React.FC<ShoppingScreenProps> = ({ shopType, onBack, onPurchase }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [imageGenConfig, setImageGenConfig] = useState({
    apiUrl: localStorage.getItem('image_gen_api_url') || '',
    apiKey: localStorage.getItem('image_gen_api_key') || ''
  });
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set());

  // 商店配置
  const shopConfig = {
    food: {
      name: '😋 饿饿吗',
      color: 'from-blue-500 to-cyan-500',
      products: [
        { id: '1', name: '锅贴超级肥牛饭', price: 28.80, image: 'https://via.placeholder.com/300x200?text=肥牛饭' },
        { id: '2', name: '金汤酸菜鱼鱼线', price: 35.00, image: 'https://via.placeholder.com/300x200?text=酸菜鱼' },
        { id: '3', name: '黄金酥皮虾仁排', price: 18.00, image: 'https://via.placeholder.com/300x200?text=虾仁排' },
        { id: '4', name: '招牌麻酱汁花肉串', price: 15.00, image: 'https://via.placeholder.com/300x200?text=肉串' },
        { id: '5', name: '云朵牛乳芝士蛋筒', price: 32.00, image: 'https://via.placeholder.com/300x200?text=蛋筒' },
        { id: '6', name: '杨枝甘露蜜蛋糕', price: 45.00, image: 'https://via.placeholder.com/300x200?text=蛋糕' },
      ]
    },
    movie: {
      name: '🎬 电影票',
      color: 'from-purple-500 to-pink-500',
      products: [
        { id: '1', name: '《流浪地球3》', price: 58.00, image: 'https://via.placeholder.com/300x400?text=电影海报' },
        { id: '2', name: '《龙马精神》', price: 48.00, image: 'https://via.placeholder.com/300x400?text=电影海报' },
        { id: '3', name: '《满江红》', price: 52.00, image: 'https://via.placeholder.com/300x400?text=电影海报' },
        { id: '4', name: '《熊出没》', price: 38.00, image: 'https://via.placeholder.com/300x400?text=电影海报' },
      ]
    },
    shopping: {
      name: '🛍️ 淘淘宝',
      color: 'from-orange-500 to-red-500',
      products: [
        { id: '1', name: '无线蓝牙耳机', price: 199.00, image: 'https://via.placeholder.com/300x300?text=耳机' },
        { id: '2', name: '智能手环', price: 299.00, image: 'https://via.placeholder.com/300x300?text=手环' },
        { id: '3', name: '保温杯', price: 89.00, image: 'https://via.placeholder.com/300x300?text=保温杯' },
        { id: '4', name: '便携充电宝', price: 128.00, image: 'https://via.placeholder.com/300x300?text=充电宝' },
      ]
    }
  };

  const currentShop = shopConfig[shopType];
  const [products, setProducts] = useState<Product[]>(currentShop.products);

  // 保存AI生图配置
  const saveImageGenConfig = () => {
    localStorage.setItem('image_gen_api_url', imageGenConfig.apiUrl);
    localStorage.setItem('image_gen_api_key', imageGenConfig.apiKey);
    setShowSettings(false);
    alert('配置已保存');
  };

  // AI生成商品图片
  const generateProductImage = async (searchTerm: string) => {
    if (!imageGenConfig.apiUrl || !imageGenConfig.apiKey) {
      alert('请先在设置中配置AI生图API');
      setShowSettings(true);
      return;
    }

    const productId = `ai_${Date.now()}`;
    setGeneratingImages(new Set([...generatingImages, productId]));

    try {
      // 这里调用AI生图API
      // 示例：使用文生图API
      const response = await fetch(imageGenConfig.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${imageGenConfig.apiKey}`
        },
        body: JSON.stringify({
          prompt: `${searchTerm}, product photography, high quality, professional lighting`,
          model: 'dall-e-3', // 或其他模型
          size: '1024x1024',
          n: 1
        })
      });

      if (!response.ok) {
        throw new Error('生图失败');
      }

      const data = await response.json();
      const imageUrl = data.data?.[0]?.url || data.url || 'https://via.placeholder.com/300x300?text=AI生成';

      // 随机价格
      const price = Math.floor(Math.random() * 200) + 10;

      const newProduct: Product = {
        id: productId,
        name: searchTerm,
        price,
        image: imageUrl,
        isAIGenerated: true
      };

      setProducts([newProduct, ...products]);
      setGeneratingImages(new Set([...generatingImages].filter(id => id !== productId)));
    } catch (error) {
      console.error('AI生图失败:', error);
      alert('AI生图失败，请检查配置');
      setGeneratingImages(new Set([...generatingImages].filter(id => id !== productId)));
    }
  };

  // 搜索
  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    // 如果配置了AI生图，使用AI生成
    if (imageGenConfig.apiUrl && imageGenConfig.apiKey) {
      generateProductImage(searchQuery);
    } else {
      // 否则添加占位商品
      const newProduct: Product = {
        id: `search_${Date.now()}`,
        name: searchQuery,
        price: Math.floor(Math.random() * 100) + 10,
        image: `https://via.placeholder.com/300x300?text=${encodeURIComponent(searchQuery)}`
      };
      setProducts([newProduct, ...products]);
    }
    
    setSearchQuery('');
  };

  // 购买商品
  const handlePurchase = (product: Product) => {
    const balance = getBalance();
    
    if (balance < product.price) {
      alert('余额不足，请充值');
      return;
    }

    if (confirm(`确认购买 ${product.name}，金额 ¥${product.price}？`)) {
      const success = purchaseProduct(product.price, product.name, currentShop.name);
      if (success) {
        alert('购买成功！');
        onPurchase(); // 刷新钱包
      }
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* 头部 */}
      <div className="bg-white border-b">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold ml-2">{currentShop.name}</h1>
          <button
            onClick={() => setShowSettings(true)}
            className="ml-auto p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* 搜索栏 */}
        <div className="px-4 pb-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="想吃点什么？让AI帮你找"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              onClick={handleSearch}
              className={`px-4 py-2 bg-gradient-to-r ${currentShop.color} text-white rounded-lg font-medium hover:opacity-90 transition-opacity`}
            >
              搜索
            </button>
          </div>
        </div>
      </div>

      {/* 商品列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="relative">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-40 object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/300x300?text=加载失败';
                  }}
                />
                {product.isAIGenerated && (
                  <div className="absolute top-2 right-2 bg-purple-500 text-white text-xs px-2 py-1 rounded">
                    AI生成
                  </div>
                )}
                {generatingImages.has(product.id) && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-white text-sm">生成中...</div>
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="text-sm font-medium text-gray-800 mb-1 line-clamp-2">
                  {product.name}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-red-600 font-bold">
                    ¥{product.price.toFixed(2)}
                  </div>
                  <button
                    onClick={() => handlePurchase(product)}
                    className="p-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:opacity-90 transition-opacity"
                  >
                    <ShoppingCart className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI生图设置弹窗 */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">AI生图设置</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API地址
                </label>
                <input
                  type="text"
                  value={imageGenConfig.apiUrl}
                  onChange={(e) => setImageGenConfig({ ...imageGenConfig, apiUrl: e.target.value })}
                  placeholder="https://api.openai.com/v1/images/generations"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  value={imageGenConfig.apiKey}
                  onChange={(e) => setImageGenConfig({ ...imageGenConfig, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  💡 配置AI生图API后，搜索商品时将自动生成商品图片
                </p>
              </div>

              <button
                onClick={saveImageGenConfig}
                className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                保存配置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShoppingScreen;
