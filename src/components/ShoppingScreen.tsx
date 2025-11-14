import React, { useState } from 'react';
import { ChevronLeft, Search, ShoppingCart, Settings } from 'lucide-react';
import { purchaseProduct, getBalance } from '../utils/wallet';
import ImageGenConfigModal from './ImageGenConfigModal';
import PurchaseOptionsModal from './PurchaseOptionsModal';
import { Conversation } from '../types';

interface ShoppingScreenProps {
  shopType: 'food' | 'movie' | 'shopping';
  onBack: () => void;
  onPurchase: () => void; // 购买成功后刷新钱包
  conversations: Conversation[]; // AI角色列表
  onSendGiftToAI: (product: Product, recipientId: string, recipientName: string, shopType: 'food' | 'movie' | 'shopping', message?: string) => void;
  onRequestAIPay: (product: Product, aiId: string, shopType: 'food' | 'movie' | 'shopping') => void;
}

interface Product {
  id: string;
  name: string;
  price: number;
  image: string; // 图片URL或AI生成的描述
  isAIGenerated?: boolean; // 是否是AI生成的图片
}

const ShoppingScreen: React.FC<ShoppingScreenProps> = ({ 
  shopType, 
  onBack, 
  onPurchase,
  conversations,
  onSendGiftToAI,
  onRequestAIPay
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showPurchaseOptions, setShowPurchaseOptions] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [imageGenConfig, setImageGenConfig] = useState({
    apiUrl: localStorage.getItem('image_gen_api_url') || '',
    apiKey: localStorage.getItem('image_gen_api_key') || '',
    model: localStorage.getItem('image_gen_model') || ''
  });
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set());

  // 商店配置
  const shopConfig = {
    food: {
      name: '😋 饿饿吗',
      color: 'from-blue-500 to-cyan-500',
      products: [
        { id: '1', name: '锅贴超级肥牛饭', price: 28.80, image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400' },
        { id: '2', name: '金汤酸菜鱼鱼线', price: 35.00, image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400' },
        { id: '3', name: '黄金酥皮虾仁排', price: 18.00, image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400' },
        { id: '4', name: '招牌麻酱汁花肉串', price: 15.00, image: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400' },
        { id: '5', name: '云朵牛乳芝士蛋筒', price: 32.00, image: 'https://images.unsplash.com/photo-1488900128323-21503983a07d?w=400' },
        { id: '6', name: '杨枝甘露蜜蛋糕', price: 45.00, image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400' },
      ]
    },
    movie: {
      name: '🎬 电影票',
      color: 'from-purple-500 to-pink-500',
      products: [
        { id: '1', name: '《流浪地球3》', price: 58.00, image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400' },
        { id: '2', name: '《龙马精神》', price: 48.00, image: 'https://images.unsplash.com/photo-1594908900066-3f47337549d8?w=400' },
        { id: '3', name: '《满江红》', price: 52.00, image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=400' },
        { id: '4', name: '《熊出没》', price: 38.00, image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400' },
      ]
    },
    shopping: {
      name: '🛍️ 淘淘宝',
      color: 'from-orange-500 to-red-500',
      products: [
        { id: '1', name: '无线蓝牙耳机', price: 199.00, image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400' },
        { id: '2', name: '智能手环', price: 299.00, image: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=400' },
        { id: '3', name: '保温杯', price: 89.00, image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400' },
        { id: '4', name: '便携充电宝', price: 128.00, image: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400' },
      ]
    }
  };

  const currentShop = shopConfig[shopType];
  const [products, setProducts] = useState<Product[]>(currentShop.products);

  // 保存AI生图配置
  const saveImageGenConfig = (config: { apiUrl: string; apiKey: string; model: string }) => {
    localStorage.setItem('image_gen_api_url', config.apiUrl);
    localStorage.setItem('image_gen_api_key', config.apiKey);
    localStorage.setItem('image_gen_model', config.model);
    setImageGenConfig(config);
    alert('配置已保存');
  };

  // AI生成商品图片
  const generateProductImage = async (searchTerm: string) => {
    if (!imageGenConfig.apiUrl || !imageGenConfig.apiKey) {
      alert('请先在设置中配置AI生图API');
      setShowSettings(true);
      return;
    }

    if (!imageGenConfig.model) {
      alert('请先选择生图模型');
      setShowSettings(true);
      return;
    }

    const productId = `ai_${Date.now()}`;
    setGeneratingImages(new Set([...generatingImages, productId]));

    try {
      // 🔥 构造正确的API地址
      let apiUrl = imageGenConfig.apiUrl.trim();
      // 移除末尾斜杠
      if (apiUrl.endsWith('/')) {
        apiUrl = apiUrl.slice(0, -1);
      }
      
      // 🔥 根据不同的API提供商构造正确的endpoint
      let endpoint;
      if (apiUrl.includes('openai.com') || apiUrl.includes('api.openai.com')) {
        // OpenAI官方API
        endpoint = `${apiUrl}/v1/images/generations`;
      } else {
        // 第三方API提供商，尝试常见的endpoint
        if (!apiUrl.includes('/v1/')) {
          endpoint = `${apiUrl}/v1/images/generations`;
        } else {
          endpoint = apiUrl.endsWith('/images/generations') ? apiUrl : `${apiUrl}/images/generations`;
        }
      }

      console.log('🎨 调用生图API:', endpoint);
      console.log('🎨 使用模型:', imageGenConfig.model);

      // 🔥 构造请求体，适配不同模型
      const requestBody: any = {
        prompt: `${searchTerm}, product photography, high quality, professional lighting, commercial product shot`,
        model: imageGenConfig.model,
        n: 1
      };

      // 🔥 根据模型类型设置不同参数
      if (imageGenConfig.model.includes('dall-e')) {
        // DALL-E系列参数
        requestBody.size = '1024x1024';
        requestBody.quality = 'standard';
      } else if (imageGenConfig.model.includes('stable-diffusion') || imageGenConfig.model.includes('sd')) {
        // Stable Diffusion参数
        requestBody.width = 1024;
        requestBody.height = 1024;
        requestBody.steps = 20;
        requestBody.cfg_scale = 7;
      } else {
        // 通用参数
        requestBody.size = '1024x1024';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${imageGenConfig.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log('🎨 API响应状态:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🎨 API错误响应:', errorText);
        throw new Error(`生图失败 (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log('🎨 API响应数据:', data);

      // 🔥 更强大的响应解析，适配不同API格式
      let imageUrl = '';
      
      if (data.data && data.data.length > 0) {
        // OpenAI格式: { data: [{ url: "..." }] }
        imageUrl = data.data[0].url || data.data[0].b64_json;
      } else if (data.url) {
        // 直接URL格式: { url: "..." }
        imageUrl = data.url;
      } else if (data.images && data.images.length > 0) {
        // 某些API格式: { images: ["url1", "url2"] }
        imageUrl = data.images[0];
      } else if (data.image) {
        // 某些API格式: { image: "url" }
        imageUrl = data.image;
      } else if (data.output && data.output.length > 0) {
        // 某些API格式: { output: ["url1"] }
        imageUrl = data.output[0];
      }

      if (!imageUrl) {
        console.error('🎨 无法从响应中解析图片URL:', data);
        throw new Error('API返回格式异常，无法获取图片URL');
      }

      // 如果是base64格式，需要转换
      if (imageUrl.startsWith('data:image/')) {
        // base64图片可以直接使用
      } else if (!imageUrl.startsWith('http')) {
        // 如果不是完整URL，尝试拼接
        imageUrl = imageUrl.startsWith('/') ? `${apiUrl}${imageUrl}` : imageUrl;
      }

      console.log('🎨 获取到图片URL:', imageUrl.substring(0, 100) + '...');

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
      
      alert(`✅ 成功生成商品图片: ${searchTerm}`);
    } catch (error) {
      console.error('🎨 AI生图失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      alert(`❌ AI生图失败: ${errorMessage}\n\n请检查:\n1. API地址是否正确\n2. API Key是否有效\n3. 模型是否支持生图\n4. 网络连接是否正常`);
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

  // 点击购买，打开购买选项
  const handleClickPurchase = (product: Product) => {
    setSelectedProduct(product);
    setShowPurchaseOptions(true);
  };

  // 为自己购买
  const handlePurchaseForSelf = (product: Product) => {
    const balance = getBalance();
    
    if (balance < product.price) {
      alert('余额不足，请充值');
      return;
    }

    const success = purchaseProduct(product.price, product.name, currentShop.name);
    if (success) {
      alert('购买成功！');
      onPurchase();
    }
  };

  // 为AI购买（送礼）
  const handlePurchaseForAI = (product: Product, recipientId: string, recipientName: string, message?: string) => {
    const balance = getBalance();
    
    if (balance < product.price) {
      alert('余额不足，请充值');
      return;
    }

    const success = purchaseProduct(product.price, `送给${recipientName}的礼物：${product.name}`, currentShop.name);
    if (success) {
      onSendGiftToAI(product, recipientId, recipientName, shopType, message);
      onPurchase();
      alert(`礼物已送给${recipientName}`);
    }
  };

  // 请AI代付
  const handleRequestAIPay = (product: Product, aiId: string) => {
    const aiConv = conversations.find(c => c.id === aiId);
    const aiName = aiConv?.characterSettings?.nickname || 'AI';
    onRequestAIPay(product, aiId, shopType);
    alert(`已向${aiName}发送代付请求`);
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
                    onClick={() => handleClickPurchase(product)}
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
      <ImageGenConfigModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={saveImageGenConfig}
        initialConfig={imageGenConfig}
      />

      {/* 购买选项弹窗 */}
      <PurchaseOptionsModal
        isOpen={showPurchaseOptions}
        onClose={() => setShowPurchaseOptions(false)}
        product={selectedProduct}
        conversations={conversations}
        onPurchaseForSelf={handlePurchaseForSelf}
        onPurchaseForAI={handlePurchaseForAI}
        onRequestAIPay={handleRequestAIPay}
      />
    </div>
  );
};

export default ShoppingScreen;
