import React, { useState, useEffect } from 'react';
import { ChevronLeft, Search, ShoppingCart, Settings } from 'lucide-react';
import { purchaseProduct, getBalance } from '../utils/wallet';
import ImageGenConfigModal from './ImageGenConfigModal';
import PurchaseOptionsModal from './PurchaseOptionsModal';
import ShoppingCartModal, { addToCart, getCartItemCount, CartItem } from './ShoppingCartModal';
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
  const [showProductModal, setShowProductModal] = useState(false);
  const [generatedProduct, setGeneratedProduct] = useState<Product | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editPrice, setEditPrice] = useState('');
  const [editDescription, setEditDescription] = useState('');
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

  // 更新购物车数量
  useEffect(() => {
    updateCartCount();
  }, [shopType]);

  const updateCartCount = () => {
    const count = getCartItemCount(shopType);
    setCartItemCount(count);
  };

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

      // 🎯 智能价格生成（根据商品类型和商城）
      const price = generateSmartPrice(searchTerm, shopType);

      const newProduct: Product = {
        id: productId,
        name: searchTerm,
        price,
        image: imageUrl,
        isAIGenerated: true
      };

      setGeneratingImages(new Set([...generatingImages].filter(id => id !== productId)));
      setIsSearching(false);
      
      // 显示商品详情弹窗
      setGeneratedProduct(newProduct);
      setShowProductModal(true);
    } catch (error) {
      console.log('🎨 AI生图失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      alert(`❌ AI生图失败: ${errorMessage}\n\n请检查:\n1. API地址是否正确\n2. API Key是否有效\n3. 模型是否支持生图\n4. 网络连接是否正常`);
      setGeneratingImages(new Set([...generatingImages].filter(id => id !== productId)));
      setIsSearching(false);
    }
  };

  // 搜索
  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    
    // 如果配置了AI生图，使用AI生成
    if (imageGenConfig.apiUrl && imageGenConfig.apiKey) {
      generateProductImage(searchQuery);
    } else {
      // 否则创建占位商品并显示弹窗
      setTimeout(() => {
        const newProduct: Product = {
          id: `search_${Date.now()}`,
          name: searchQuery,
          price: generateSmartPrice(searchQuery, shopType),
          image: `https://via.placeholder.com/300x300?text=${encodeURIComponent(searchQuery)}`
        };
        setGeneratedProduct(newProduct);
        setShowProductModal(true);
        setIsSearching(false);
      }, 1500); // 模拟搜索时间
    }
    
    setSearchQuery('');
  };

  // 点击购买，打开购买选项
  const handleClickPurchase = (product: Product) => {
    setSelectedProduct(product);
    setShowPurchaseOptions(true);
  };

  // 自己购买
  const handlePurchaseForSelf = (product: Product) => {
    const balance = getBalance();
    
    if (balance < product.price) {
      alert('余额不足，请充值');
      return;
    }

    const success = purchaseProduct(product.price, product.name, currentShop.name);
    if (success) {
      // 如果是购物车套餐，清空购物车
      if ((product as any).isCartBundle) {
        clearCartForShop(shopType);
        updateCartCount();
      }
      
      onPurchase(); // 刷新钱包
      alert(`购买成功！您已购买 ${product.name}`);
    } else {
      alert('购买失败，请重试');
    }
  };

  // 清空指定商城的购物车
  const clearCartForShop = (shopType: 'food' | 'movie' | 'shopping') => {
    try {
      const cartKey = `shopping_cart_${shopType}`;
      localStorage.removeItem(cartKey);
    } catch (error) {
      console.error('清空购物车失败:', error);
    }
  };

  // 为AI购买（送礼）
  const handlePurchaseForAI = (product: Product, recipientId: string, recipientName: string, message?: string) => {
    const balance = getBalance();
    
    if (balance < product.price) {
      alert('余额不足，请充值');
      return;
    }

    const success = purchaseProduct(product.price, product.name, currentShop.name);
    if (success) {
      // 如果是购物车套餐，清空购物车
      if ((product as any).isCartBundle) {
        clearCartForShop(shopType);
        updateCartCount();
      }
      
      onSendGiftToAI(product, recipientId, recipientName, shopType, message);
      onPurchase();
      alert(`已成功送给${recipientName}！`);
    } else {
      alert('购买失败，请重试');
    }
  };

  // 请AI代付
  const handleRequestAIPay = (product: Product, aiId: string) => {
    const aiConv = conversations.find(c => c.id === aiId);
    const aiName = aiConv?.characterSettings?.nickname || 'AI';
    onRequestAIPay(product, aiId, shopType);
    
    // 如果是购物车套餐，清空购物车（因为已经发送代付请求）
    if ((product as any).isCartBundle) {
      clearCartForShop(shopType);
      updateCartCount();
    }
    
    alert(`已向${aiName}发送代付请求`);
  };

  // 加入商城
  const handleAddToMall = (product: Product) => {
    setProducts([product, ...products]);
    setShowProductModal(false);
    alert('商品已添加到商城！');
  };

  // 加入购物车
  const handleAddToCart = (product: Product) => {
    const success = addToCart(product, shopType);
    if (success) {
      updateCartCount();
      alert('已添加到购物车！');
    } else {
      alert('添加失败，请重试');
    }
  };

  // 购物车结算
  const handleCartPurchase = (_items: CartItem[], totalAmount: number) => {
    const balance = getBalance();
    
    if (balance < totalAmount) {
      alert('余额不足，请充值');
      return;
    }

    // 批量购买商品
    const success = purchaseProduct(totalAmount, `${currentShop.name}购物车结算`, currentShop.name);
    if (success) {
      updateCartCount();
      onPurchase();
      alert(`购买成功！总计 ¥${totalAmount.toFixed(2)}`);
    } else {
      alert('购买失败，请重试');
    }
  };

  // 打开购物车购买选项
  const handleCartPurchaseOptions = (cartBundle: any) => {
    setSelectedProduct(cartBundle);
    setShowPurchaseOptions(true);
  };

  // 直接购买
  const handleDirectPurchase = (product: Product) => {
    setShowProductModal(false);
    setSelectedProduct(product);
    setShowPurchaseOptions(true);
  };

  // 开始编辑商品
  const handleStartEdit = () => {
    if (generatedProduct) {
      setEditPrice(generatedProduct.price.toString());
      setEditDescription(generateProductDescription(generatedProduct.name));
      setIsEditingProduct(true);
    }
  };

  // 保存编辑
  const handleSaveEdit = () => {
    if (generatedProduct && editPrice && editDescription) {
      const price = parseFloat(editPrice);
      if (isNaN(price) || price <= 0) {
        alert('请输入有效的价格');
        return;
      }
      
      const updatedProduct = {
        ...generatedProduct,
        price: price,
        description: editDescription
      };
      
      setGeneratedProduct(updatedProduct);
      setIsEditingProduct(false);
      alert('商品信息已更新！');
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setIsEditingProduct(false);
    setEditPrice('');
    setEditDescription('');
  };

  // 🎯 智能价格生成
  const generateSmartPrice = (productName: string, shopType: 'food' | 'movie' | 'shopping'): number => {
    const product = productName.toLowerCase();
    
    // 根据商城类型设定价格区间
    const priceRanges = {
      food: {
        '咖啡': [15, 35], '奶茶': [12, 25], '饮料': [3, 8], '汽水': [3, 6],
        '汉堡': [18, 35], '披萨': [25, 65], '炸鸡': [20, 45], '薯条': [8, 18],
        '沙拉': [15, 28], '寿司': [20, 50], '拉面': [18, 35], '米饭': [10, 25],
        '蛋糕': [25, 80], '甜品': [15, 45], '冰淇淋': [8, 25],
        '早餐': [10, 25], '午餐': [15, 35], '晚餐': [20, 50]
      },
      movie: {
        '电影': [35, 80], '3d': [45, 90], 'imax': [55, 120], 'vip': [80, 200],
        '学生': [20, 40], '儿童': [20, 35], '成人': [35, 80],
        '爆米花': [15, 35], '饮料': [8, 20], '套餐': [25, 50]
      },
      shopping: {
        '手机': [800, 6000], '电脑': [2000, 12000], '平板': [1500, 5000],
        '耳机': [50, 2000], '音响': [100, 3000], '充电': [20, 200],
        '衣服': [50, 500], '鞋子': [80, 800], '包包': [100, 2000],
        '化妆': [30, 300], '护肤': [50, 500], '香水': [100, 1000],
        '书籍': [15, 80], '文具': [5, 50], '玩具': [20, 300],
        '手表': [100, 5000], '首饰': [50, 2000], '眼镜': [100, 1500]
      }
    };

    const ranges = priceRanges[shopType];
    
    // 查找匹配的关键词
    for (const [keyword, [min, max]] of Object.entries(ranges)) {
      if (product.includes(keyword)) {
        // 在合理区间内随机
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }
    }
    
    // 默认价格区间
    const defaultRanges = {
      food: [10, 50],
      movie: [35, 80], 
      shopping: [20, 200]
    };
    
    const [min, max] = defaultRanges[shopType];
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  // 🎯 改进的商品描述生成
  const generateProductDescription = (productName: string): string => {
    const product = productName.toLowerCase();
    
    // 🍽️ 美食类描述
    const foodDescriptions = {
      '奶茶': `香浓${productName}，精选优质茶叶配制，奶香浓郁，口感丝滑。每一口都是对味蕾的极致呵护，温暖您的午后时光。`,
      '咖啡': `醇香${productName}，采用精品咖啡豆现磨现煮，香气浓郁，口感层次丰富。唤醒您的每一个清晨，为忙碌的一天注入活力。`,
      '汉堡': `美味${productName}，新鲜面包配新鲜食材，层次丰富，营养均衡。每一口都是满满的幸福感，让您大饱口福。`,
      '披萨': `正宗${productName}，意式薄底配丰富配菜，芝士拉丝，香气四溢。与朋友分享的美好时光，从这一片开始。`,
      '寿司': `新鲜${productName}，当日采购的优质食材，师傅精心制作，口感Q弹。体验正宗的日式美食文化。`,
      '沙拉': `健康${productName}，新鲜蔬菜搭配特制酱汁，营养丰富，清爽可口。为您的健康生活增添美味选择。`
    };

    // 🎬 电影类描述
    const movieDescriptions = {
      '电影': `精彩${productName}，震撼视听体验，舒适观影环境。让您沉浸在光影魅力中，享受电影带来的精神盛宴。`,
      '3d': `立体${productName}体验，先进的3D技术带来沉浸式观影。仿佛置身电影世界，感受前所未有的视觉冲击。`,
      'imax': `IMAX巨幕${productName}，超大屏幕配震撼音效，给您带来最极致的观影享受。每一个细节都清晰可见。`
    };

    // 🛍️ 购物类描述
    const shoppingDescriptions = {
      '手机': `智能${productName}，性能强劲，功能全面。集通讯、娱乐、办公于一体，助力您的数字生活更加精彩。`,
      '电脑': `高性能${productName}，处理速度快，运行稳定。无论工作学习还是娱乐，都能为您提供出色的使用体验。`,
      '耳机': `优质${productName}，音质清晰，佩戴舒适。让您在音乐的世界中畅游，享受纯净的听觉盛宴。`,
      '衣服': `时尚${productName}，款式新颖，面料舒适。展现您的个人魅力，让您在人群中脱颖而出。`,
      '鞋子': `舒适${productName}，设计精美，质量上乘。每一步都走得稳健自信，为您的出行增添风采。`,
      '书籍': `精选${productName}，内容丰富，装帧精美。在知识的海洋中遨游，丰富您的精神世界。`
    };

    // 根据商城类型选择描述库
    let descriptions: Record<string, string>;
    if (shopType === 'food') {
      descriptions = foodDescriptions;
    } else if (shopType === 'movie') {
      descriptions = movieDescriptions;
    } else {
      descriptions = shoppingDescriptions;
    }

    // 查找匹配的关键词
    for (const [keyword, desc] of Object.entries(descriptions)) {
      if (product.includes(keyword)) {
        return desc;
      }
    }
    
    // 根据商城类型生成默认描述
    const defaultDescriptions = {
      food: `美味的${productName}，新鲜制作，口感绝佳。精心挑选的优质食材，为您带来难忘的味蕾体验。`,
      movie: `精彩的${productName}，为您提供优质的观影体验。舒适的环境，震撼的视听效果，让您尽享光影魅力。`,
      shopping: `优质的${productName}，品质保证，性价比超高。精工制作，设计精美，满足您对品质生活的追求。`
    };
    
    return defaultDescriptions[shopType];
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* 头部 */}
      <div className="bg-white border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold ml-2">{currentShop.name}</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {/* 购物车按钮 */}
            <button
              onClick={() => setShowCart(true)}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ShoppingCart className="w-6 h-6" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </button>
            
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>
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
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      title="加入购物车"
                    >
                      <ShoppingCart className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleClickPurchase(product)}
                      className="p-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:opacity-90 transition-opacity"
                      title="立即购买"
                    >
                      <span className="text-xs font-medium">买</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 搜索中loading */}
      {isSearching && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">搜索中...</p>
          </div>
        </div>
      )}

      {/* 商品详情弹窗 */}
      {showProductModal && generatedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm mx-4 overflow-hidden">
            {/* 头部 */}
            <div className="bg-gray-100 px-4 py-3 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-800">
                {isEditingProduct ? '编辑商品' : '商品搜索'}
              </h3>
              <div className="flex items-center gap-2">
                {!isEditingProduct && (
                  <button
                    onClick={handleStartEdit}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors"
                  >
                    编辑
                  </button>
                )}
                <button
                  onClick={() => setShowProductModal(false)}
                  className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <span className="text-gray-600 text-xl">×</span>
                </button>
              </div>
            </div>

            {/* 商品信息 */}
            <div className="p-6">
              {/* 商品图片 */}
              <div className="w-24 h-24 mx-auto mb-4 rounded-lg overflow-hidden bg-gray-100">
                <img 
                  src={generatedProduct.image} 
                  alt={generatedProduct.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://via.placeholder.com/300x300?text=${encodeURIComponent(generatedProduct.name)}`;
                  }}
                />
              </div>

              {/* 商品标题 */}
              <h4 className="text-center text-lg font-medium text-gray-800 mb-2">
                {generatedProduct.name}
              </h4>

              {/* 价格 */}
              {isEditingProduct ? (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">价格</label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="请输入价格"
                    step="0.01"
                    min="0"
                  />
                </div>
              ) : (
                <div className="text-center text-2xl font-bold text-red-500 mb-4">
                  ¥{generatedProduct.price.toFixed(2)}
                </div>
              )}

              {/* 商品描述 */}
              {isEditingProduct ? (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">商品描述</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    placeholder="请输入商品描述"
                  />
                </div>
              ) : (
                <div className="text-sm text-gray-600 leading-relaxed mb-6">
                  {generateProductDescription(generatedProduct.name)}
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="px-4 pb-4">
              {isEditingProduct ? (
                /* 编辑模式按钮 */
                <div className="flex gap-3">
                  <button
                    onClick={handleCancelEdit}
                    className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                  >
                    保存
                  </button>
                </div>
              ) : (
                /* 正常模式按钮 */
                <>
                  {/* 添加到商城按钮 */}
                  <button
                    onClick={() => handleAddToMall(generatedProduct)}
                    className="w-full py-3 bg-green-500 text-white rounded-lg font-medium mb-3 hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <span>✓</span>
                    添加到商城
                  </button>

                  {/* 加入购物车按钮 */}
                  <button
                    onClick={() => {
                      handleAddToCart(generatedProduct);
                      setShowProductModal(false);
                    }}
                    className="w-full py-3 bg-orange-500 text-white rounded-lg font-medium mb-3 hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    加入购物车
                  </button>

                  {/* 底部按钮组 */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowProductModal(false)}
                      className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => handleDirectPurchase(generatedProduct)}
                      className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-1"
                    >
                      <span>🔍</span>
                      立即购买
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI生图配置弹窗 */}
      <ImageGenConfigModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={saveImageGenConfig}
        initialConfig={imageGenConfig}
      />

      {/* 购买选项弹窗 */}
      {showPurchaseOptions && selectedProduct && (
        <PurchaseOptionsModal
          isOpen={showPurchaseOptions}
          onClose={() => setShowPurchaseOptions(false)}
          product={selectedProduct}
          conversations={conversations}
          onPurchaseForSelf={handlePurchaseForSelf}
          onPurchaseForAI={handlePurchaseForAI}
          onRequestAIPay={handleRequestAIPay}
        />
      )}

      {/* 购物车弹窗 */}
      <ShoppingCartModal
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        shopType={shopType}
        onPurchase={handleCartPurchase}
        onOpenPurchaseOptions={handleCartPurchaseOptions}
      />
    </div>
  );
};

export default ShoppingScreen;
