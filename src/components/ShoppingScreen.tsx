import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, MessageCircle, Search, ShoppingCart, User } from 'lucide-react';
import { smartLoad, smartSave } from '../utils/storage';

interface ShoppingScreenProps {
  shopType: 'food' | 'movie' | 'shopping';
  onBack: () => void;
  onPurchase: () => void;
}

type Channel = 'chilema' | 'gogowan';
type ProductCategory = 'food' | 'movie' | 'daily';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  tag: string;
  soldText: string;
  emoji: string;
  channel: Channel;
  category: ProductCategory;
}

interface ServiceEntry {
  id: string;
  name: string;
  emoji: string;
  target: ProductCategory | 'all';
  channel?: Channel;
}

interface OrderRecord {
  id: string;
  createdAt: number;
  items: Product[];
  totalAmount: number;
  merchantName?: string;
  source: 'single' | 'cart';
  status: 'merchant_accepted' | 'rider_picking' | 'delivering' | 'arrived';
  distanceKm: number;
  etaMinutes: number;
  addressId: string;
  deliveredAt?: number;
}

interface AddressRecord {
  id: string;
  label: string;
  contactName: string;
  contactPhone: string;
  detail: string;
}

const SERVICE_GRID: ServiceEntry[] = [
  { id: 'takeout', name: '外卖', emoji: '🥡', target: 'food', channel: 'chilema' },
  { id: 'group-buy', name: '团购', emoji: '🎫', target: 'daily', channel: 'gogowan' },
  { id: 'hotel', name: '酒店民宿', emoji: '🏨', target: 'daily', channel: 'gogowan' },
  { id: 'flash', name: '闪购', emoji: '⚡', target: 'daily', channel: 'gogowan' },
  { id: 'medicine', name: '看病买药', emoji: '💊', target: 'daily', channel: 'gogowan' },
  { id: 'market', name: '生鲜蔬菜', emoji: '🥬', target: 'food', channel: 'chilema' },
  { id: 'food', name: '美食', emoji: '🍜', target: 'food', channel: 'chilema' },
  { id: 'play', name: '休闲玩乐', emoji: '🎠', target: 'movie', channel: 'gogowan' },
  { id: 'mix-meal', name: '拼好饭', emoji: '🍱', target: 'food', channel: 'chilema' },
  { id: 'movie', name: '电影演出', emoji: '🎬', target: 'movie', channel: 'gogowan' },
  { id: 'ticket', name: '机票火车票', emoji: '✈️', target: 'daily', channel: 'gogowan' },
  { id: 'all', name: '全部服务', emoji: '🧩', target: 'all' },
];

const MIXED_PRODUCTS: Product[] = [
  { id: 'f1', name: '鳕柠菜卷 巨无霸白', price: 5.1, originalPrice: 6.8, tag: '外卖 25分钟', soldText: '已拼 3千+', emoji: '🥗', channel: 'chilema', category: 'food' },
  { id: 'f2', name: '快乐番薯M152 奶昔双皮奶', price: 1.49, originalPrice: 10, tag: '天天有低价', soldText: '17.58万观看', emoji: '🍠', channel: 'chilema', category: 'food' },
  { id: 'm1', name: '《流浪地球3》19:30 IMAX场', price: 58, originalPrice: 78, tag: '电影演出', soldText: '17.5万人想看', emoji: '🎬', channel: 'gogowan', category: 'movie' },
  { id: 's1', name: '无线蓝牙耳机 百亿补贴', price: 199, originalPrice: 299, tag: 'gogo玩 日用', soldText: '月销 2k+', emoji: '🎧', channel: 'gogowan', category: 'daily' },
  { id: 's2', name: '便携充电宝 官方自营', price: 129, originalPrice: 179, tag: '闪购', soldText: '月销 3k+', emoji: '🔋', channel: 'gogowan', category: 'daily' },
  { id: 'f3', name: '香辣鸡腿堡 套餐', price: 29.9, originalPrice: 39.9, tag: '吃了吗 热销', soldText: '已售 1k+', emoji: '🍔', channel: 'chilema', category: 'food' },
];

const PRODUCTS_BY_SERVICE: Record<string, Product[]> = {
  takeout: [
    { id: 'to1', name: '番茄肥牛米线', price: 22.8, originalPrice: 29.8, tag: '外卖 28分钟', soldText: '月售 4k+', emoji: '🍜', channel: 'chilema', category: 'food' },
    { id: 'to2', name: '招牌鸡腿饭', price: 18.8, originalPrice: 24.8, tag: '满减', soldText: '月售 9k+', emoji: '🍛', channel: 'chilema', category: 'food' },
    { id: 'to3', name: '双层牛肉堡套餐', price: 27.9, originalPrice: 35.9, tag: '人气', soldText: '月售 3k+', emoji: '🍔', channel: 'chilema', category: 'food' },
    { id: 'to4', name: '香辣炸鸡桶', price: 39.9, originalPrice: 49.9, tag: '爆款', soldText: '月售 2k+', emoji: '🍗', channel: 'chilema', category: 'food' },
    { id: 'to5', name: '手工鲜肉馄饨', price: 16.5, originalPrice: 20.5, tag: '新店', soldText: '月售 1k+', emoji: '🥟', channel: 'chilema', category: 'food' },
    { id: 'to6', name: '烤鱼双人餐', price: 68, originalPrice: 88, tag: '限时折扣', soldText: '月售 600+', emoji: '🐟', channel: 'chilema', category: 'food' },
  ],
  'group-buy': [
    { id: 'gb1', name: '家居收纳六件套', price: 29.9, originalPrice: 59.9, tag: '团购特价', soldText: '已团 1.2w+', emoji: '🧺', channel: 'gogowan', category: 'daily' },
    { id: 'gb2', name: '品牌纸巾24包', price: 19.9, originalPrice: 32, tag: '多人拼团', soldText: '已团 8k+', emoji: '🧻', channel: 'gogowan', category: 'daily' },
    { id: 'gb3', name: '洗护套装', price: 39.9, originalPrice: 69.9, tag: '限量团', soldText: '已团 4k+', emoji: '🧴', channel: 'gogowan', category: 'daily' },
    { id: 'gb4', name: '厨房清洁礼包', price: 15.9, originalPrice: 28, tag: '拼单更低', soldText: '已团 6k+', emoji: '🧽', channel: 'gogowan', category: 'daily' },
    { id: 'gb5', name: '保温杯情侣款', price: 49.9, originalPrice: 89.9, tag: '品牌直降', soldText: '已团 2k+', emoji: '🥤', channel: 'gogowan', category: 'daily' },
    { id: 'gb6', name: '家用拖把套装', price: 35.9, originalPrice: 59, tag: '今日团', soldText: '已团 3k+', emoji: '🧹', channel: 'gogowan', category: 'daily' },
  ],
  hotel: [
    { id: 'h1', name: '市中心商务酒店双床房', price: 238, originalPrice: 328, tag: '酒店民宿', soldText: '已订 700+', emoji: '🏨', channel: 'gogowan', category: 'daily' },
    { id: 'h2', name: '轻奢江景大床房', price: 358, originalPrice: 499, tag: '周末特惠', soldText: '已订 300+', emoji: '🌃', channel: 'gogowan', category: 'daily' },
    { id: 'h3', name: '精品民宿整租', price: 428, originalPrice: 598, tag: '民宿优选', soldText: '已订 180+', emoji: '🏡', channel: 'gogowan', category: 'daily' },
    { id: 'h4', name: '地铁口快捷酒店', price: 168, originalPrice: 229, tag: '交通便利', soldText: '已订 1k+', emoji: '🚇', channel: 'gogowan', category: 'daily' },
    { id: 'h5', name: '温泉度假酒店', price: 499, originalPrice: 688, tag: '含双早', soldText: '已订 120+', emoji: '♨️', channel: 'gogowan', category: 'daily' },
    { id: 'h6', name: '亲子主题酒店', price: 389, originalPrice: 529, tag: '家庭出游', soldText: '已订 210+', emoji: '👨‍👩‍👧', channel: 'gogowan', category: 'daily' },
  ],
  flash: [
    { id: 'fl1', name: '20分钟达 纯牛奶', price: 9.9, originalPrice: 14.9, tag: '闪购', soldText: '月售 6k+', emoji: '🥛', channel: 'gogowan', category: 'daily' },
    { id: 'fl2', name: '应急充电线', price: 12.9, originalPrice: 19.9, tag: '闪购', soldText: '月售 3k+', emoji: '🔌', channel: 'gogowan', category: 'daily' },
    { id: 'fl3', name: '办公室零食包', price: 16.9, originalPrice: 25.9, tag: '闪购', soldText: '月售 4k+', emoji: '🍪', channel: 'gogowan', category: 'daily' },
    { id: 'fl4', name: '便携雨伞', price: 18.8, originalPrice: 29.9, tag: '闪购', soldText: '月售 2k+', emoji: '☔', channel: 'gogowan', category: 'daily' },
    { id: 'fl5', name: '速食火锅', price: 22.5, originalPrice: 32.5, tag: '闪购', soldText: '月售 1k+', emoji: '🍲', channel: 'gogowan', category: 'daily' },
    { id: 'fl6', name: '洗衣凝珠', price: 27.9, originalPrice: 39.9, tag: '闪购', soldText: '月售 1.5k+', emoji: '🫧', channel: 'gogowan', category: 'daily' },
  ],
  medicine: [
    { id: 'md1', name: '感冒灵颗粒 10袋', price: 19.9, originalPrice: 28, tag: '看病买药', soldText: '月售 2k+', emoji: '💊', channel: 'gogowan', category: 'daily' },
    { id: 'md2', name: '医用口罩 50只', price: 16.9, originalPrice: 24.9, tag: '药房直发', soldText: '月售 5k+', emoji: '😷', channel: 'gogowan', category: 'daily' },
    { id: 'md3', name: '维生素C泡腾片', price: 24.5, originalPrice: 35, tag: '健康', soldText: '月售 1.8k+', emoji: '🍊', channel: 'gogowan', category: 'daily' },
    { id: 'md4', name: '创可贴家庭装', price: 9.9, originalPrice: 14, tag: '常备药', soldText: '月售 3k+', emoji: '🩹', channel: 'gogowan', category: 'daily' },
    { id: 'md5', name: '电子体温计', price: 29.9, originalPrice: 49.9, tag: '家用', soldText: '月售 1.2k+', emoji: '🌡️', channel: 'gogowan', category: 'daily' },
    { id: 'md6', name: '咽喉喷雾', price: 21.8, originalPrice: 33, tag: '药房特惠', soldText: '月售 900+', emoji: '🧴', channel: 'gogowan', category: 'daily' },
  ],
  market: [
    { id: 'mk1', name: '山东黄瓜 500g', price: 4.9, originalPrice: 7.9, tag: '生鲜蔬菜', soldText: '月售 8k+', emoji: '🥒', channel: 'chilema', category: 'food' },
    { id: 'mk2', name: '新鲜西红柿 500g', price: 5.2, originalPrice: 8, tag: '产地直采', soldText: '月售 7k+', emoji: '🍅', channel: 'chilema', category: 'food' },
    { id: 'mk3', name: '有机菠菜 300g', price: 6.8, originalPrice: 10.5, tag: '当季', soldText: '月售 3k+', emoji: '🥬', channel: 'chilema', category: 'food' },
    { id: 'mk4', name: '土豆 1kg', price: 7.9, originalPrice: 12, tag: '蔬菜促销', soldText: '月售 4k+', emoji: '🥔', channel: 'chilema', category: 'food' },
    { id: 'mk5', name: '胡萝卜 500g', price: 3.9, originalPrice: 6.2, tag: '新鲜', soldText: '月售 2k+', emoji: '🥕', channel: 'chilema', category: 'food' },
    { id: 'mk6', name: '甜玉米 3根装', price: 8.9, originalPrice: 13.9, tag: '限时', soldText: '月售 1.6k+', emoji: '🌽', channel: 'chilema', category: 'food' },
  ],
  food: [
    { id: 'fd1', name: '麻辣香锅单人餐', price: 24.9, originalPrice: 33.9, tag: '美食', soldText: '月售 5k+', emoji: '🌶️', channel: 'chilema', category: 'food' },
    { id: 'fd2', name: '番茄鸡蛋盖饭', price: 15.8, originalPrice: 21.8, tag: '美食', soldText: '月售 6k+', emoji: '🍳', channel: 'chilema', category: 'food' },
    { id: 'fd3', name: '藤椒鸡排饭', price: 19.8, originalPrice: 27.8, tag: '美食', soldText: '月售 2.8k+', emoji: '🍗', channel: 'chilema', category: 'food' },
    { id: 'fd4', name: '老坛酸菜鱼粉', price: 18.5, originalPrice: 25.5, tag: '美食', soldText: '月售 4k+', emoji: '🍜', channel: 'chilema', category: 'food' },
    { id: 'fd5', name: '锅包肉套餐', price: 28.8, originalPrice: 39.8, tag: '美食', soldText: '月售 1.9k+', emoji: '🍖', channel: 'chilema', category: 'food' },
    { id: 'fd6', name: '爆浆鸡蛋仔', price: 12.8, originalPrice: 18.8, tag: '美食', soldText: '月售 2.2k+', emoji: '🧇', channel: 'chilema', category: 'food' },
  ],
  play: [
    { id: 'pl1', name: '密室逃脱双人票', price: 99, originalPrice: 158, tag: '休闲玩乐', soldText: '已售 900+', emoji: '🕵️', channel: 'gogowan', category: 'movie' },
    { id: 'pl2', name: 'KTV欢唱3小时', price: 88, originalPrice: 139, tag: '休闲玩乐', soldText: '已售 1.3k+', emoji: '🎤', channel: 'gogowan', category: 'movie' },
    { id: 'pl3', name: '电玩体验券', price: 49, originalPrice: 79, tag: '休闲玩乐', soldText: '已售 2k+', emoji: '🎮', channel: 'gogowan', category: 'movie' },
    { id: 'pl4', name: '桌游馆双人套餐', price: 69, originalPrice: 109, tag: '休闲玩乐', soldText: '已售 700+', emoji: '♟️', channel: 'gogowan', category: 'movie' },
    { id: 'pl5', name: '保龄球双人票', price: 79, originalPrice: 119, tag: '休闲玩乐', soldText: '已售 500+', emoji: '🎳', channel: 'gogowan', category: 'movie' },
    { id: 'pl6', name: '剧本杀体验', price: 109, originalPrice: 168, tag: '休闲玩乐', soldText: '已售 600+', emoji: '🎭', channel: 'gogowan', category: 'movie' },
  ],
  'mix-meal': [
    { id: 'pm1', name: '拼好饭双拼套餐', price: 9.9, originalPrice: 16.9, tag: '拼好饭', soldText: '已拼 2万+', emoji: '🍱', channel: 'chilema', category: 'food' },
    { id: 'pm2', name: '香辣鸡腿拼饭', price: 11.8, originalPrice: 18.8, tag: '拼好饭', soldText: '已拼 1.5万+', emoji: '🍗', channel: 'chilema', category: 'food' },
    { id: 'pm3', name: '牛肉土豆拼饭', price: 12.5, originalPrice: 19.5, tag: '拼好饭', soldText: '已拼 1.1万+', emoji: '🥔', channel: 'chilema', category: 'food' },
    { id: 'pm4', name: '酸菜肥牛拼饭', price: 13.2, originalPrice: 21.2, tag: '拼好饭', soldText: '已拼 9000+', emoji: '🥬', channel: 'chilema', category: 'food' },
    { id: 'pm5', name: '番茄鸡蛋拼饭', price: 8.9, originalPrice: 14.9, tag: '拼好饭', soldText: '已拼 1.8万+', emoji: '🍅', channel: 'chilema', category: 'food' },
    { id: 'pm6', name: '小炒肉拼饭', price: 12.9, originalPrice: 20.9, tag: '拼好饭', soldText: '已拼 7000+', emoji: '🥩', channel: 'chilema', category: 'food' },
  ],
  movie: [
    { id: 'mv1', name: '《流浪地球3》19:30 IMAX场', price: 58, originalPrice: 78, tag: '电影演出', soldText: '17.5万人想看', emoji: '🎬', channel: 'gogowan', category: 'movie' },
    { id: 'mv2', name: '《满江红》20:20 杜比厅', price: 49, originalPrice: 65, tag: '电影演出', soldText: '8.2万人想看', emoji: '🍿', channel: 'gogowan', category: 'movie' },
    { id: 'mv3', name: '《熊出没》14:00 亲子场', price: 35, originalPrice: 49, tag: '电影演出', soldText: '3.1万人想看', emoji: '🐻', channel: 'gogowan', category: 'movie' },
    { id: 'mv4', name: '《龙马精神》21:10 特惠场', price: 45, originalPrice: 58, tag: '电影演出', soldText: '5.6万人想看', emoji: '🎟️', channel: 'gogowan', category: 'movie' },
    { id: 'mv5', name: '《热辣滚烫》18:40 黄金场', price: 52, originalPrice: 72, tag: '电影演出', soldText: '9.4万人想看', emoji: '🔥', channel: 'gogowan', category: 'movie' },
    { id: 'mv6', name: '《年会不能停》16:30 欢乐场', price: 39, originalPrice: 55, tag: '电影演出', soldText: '6.3万人想看', emoji: '😄', channel: 'gogowan', category: 'movie' },
  ],
  ticket: [
    { id: 'tk1', name: '高铁票 广州南→深圳北', price: 79.5, originalPrice: 79.5, tag: '机票火车票', soldText: '今日 2k+ 预订', emoji: '🚄', channel: 'gogowan', category: 'daily' },
    { id: 'tk2', name: '机票 广州→上海', price: 489, originalPrice: 699, tag: '机票火车票', soldText: '今日 900+ 预订', emoji: '✈️', channel: 'gogowan', category: 'daily' },
    { id: 'tk3', name: '高铁票 北京南→天津', price: 58, originalPrice: 58, tag: '机票火车票', soldText: '今日 1.6k+ 预订', emoji: '🚆', channel: 'gogowan', category: 'daily' },
    { id: 'tk4', name: '机票 成都→三亚', price: 699, originalPrice: 999, tag: '机票火车票', soldText: '今日 500+ 预订', emoji: '🏝️', channel: 'gogowan', category: 'daily' },
    { id: 'tk5', name: '动车票 杭州东→南京南', price: 117, originalPrice: 117, tag: '机票火车票', soldText: '今日 1.1k+ 预订', emoji: '🎫', channel: 'gogowan', category: 'daily' },
    { id: 'tk6', name: '机票 西安→重庆', price: 399, originalPrice: 569, tag: '机票火车票', soldText: '今日 700+ 预订', emoji: '🧳', channel: 'gogowan', category: 'daily' },
  ],
};

const CART_KEY = 'huaduoduo_super_cart';
const ORDER_KEY = 'huaduoduo_orders';
const ADDRESS_KEY = 'huaduoduo_addresses';
const PROFILE_KEY = 'userProfile';

async function loadCart(): Promise<Product[]> {
  const parsed = await smartLoad(CART_KEY);
  return Array.isArray(parsed) ? parsed : [];
}

function saveCart(cart: Product[]) {
  void smartSave(CART_KEY, cart);
}

async function loadOrders(): Promise<OrderRecord[]> {
  const parsed = await smartLoad(ORDER_KEY);
  return Array.isArray(parsed) ? parsed : [];
}

function saveOrders(orders: OrderRecord[]) {
  void smartSave(ORDER_KEY, orders);
}

async function loadAddresses(): Promise<AddressRecord[]> {
  const parsed = await smartLoad(ADDRESS_KEY);
  return Array.isArray(parsed) ? parsed : [];
}

function saveAddresses(addresses: AddressRecord[]) {
  void smartSave(ADDRESS_KEY, addresses);
}

function loadUserName(): string {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return '用户';
    const parsed = JSON.parse(raw);
    return typeof parsed?.username === 'string' && parsed.username.trim() ? parsed.username : '用户';
  } catch {
    return '用户';
  }
}

const ShoppingScreen: React.FC<ShoppingScreenProps> = ({ shopType, onBack, onPurchase }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<Product[]>([]);
  const [activeService, setActiveService] = useState('all');
  const [activeBottomTab, setActiveBottomTab] = useState<'home' | 'cart' | 'me'>('home');
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [addresses, setAddresses] = useState<AddressRecord[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [userName] = useState<string>(() => loadUserName());
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AddressRecord | null>(null);
  const [showAllOrdersModal, setShowAllOrdersModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'in_progress' | 'arrived'>('all');
  const [orderSort, setOrderSort] = useState<'latest' | 'earliest'>('latest');
  const [addressForm, setAddressForm] = useState({
    label: '',
    contactName: '',
    contactPhone: '',
    detail: '',
  });

  void shopType;

  const serviceFilter = useMemo(() => SERVICE_GRID.find((s) => s.id === activeService), [activeService]);

  const pickRandomProducts = (source: Product[], count: number): Product[] => {
    if (source.length <= count) return [...source].sort(() => Math.random() - 0.5);
    const shuffled = [...source].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  };

  const refreshProductsByService = (serviceId: string) => {
    if (serviceId === 'all') {
      setDisplayedProducts(pickRandomProducts(MIXED_PRODUCTS, 6));
      return;
    }
    const pool = PRODUCTS_BY_SERVICE[serviceId] || MIXED_PRODUCTS;
    setDisplayedProducts(pickRandomProducts(pool, 6));
  };

  useEffect(() => {
    const bootstrap = async () => {
      const [savedCart, savedOrders, savedAddresses] = await Promise.all([
        loadCart(),
        loadOrders(),
        loadAddresses(),
      ]);
      setCart(savedCart);
      setOrders(savedOrders);
      setAddresses(savedAddresses);
    };
    void bootstrap();
  }, []);

  useEffect(() => {
    refreshProductsByService(activeService);
  }, [activeService]);

  useEffect(() => {
    if (!selectedAddressId && addresses.length > 0) {
      setSelectedAddressId(addresses[0].id);
    }
  }, [addresses, selectedAddressId]);

  useEffect(() => {
    if (addresses.length === 0) {
      setShowAddressModal(true);
      setEditingAddress(null);
      setAddressForm({ label: '家', contactName: userName, contactPhone: '', detail: '' });
    }
  }, [addresses.length, userName]);

  useEffect(() => {
    const timer = setInterval(() => {
      setOrders((prev) => {
        const now = Date.now();
        let changed = false;
        const next = prev.map((order) => {
          if (order.status === 'arrived') return order;
          const elapsedMin = (now - order.createdAt) / 60000;
          const p = Math.min(elapsedMin / Math.max(order.etaMinutes, 1), 1);
          const status: OrderRecord['status'] =
            p < 0.2 ? 'merchant_accepted' : p < 0.45 ? 'rider_picking' : p < 0.85 ? 'delivering' : 'arrived';
          if (status !== order.status) {
            changed = true;
            return {
              ...order,
              status,
              deliveredAt: status === 'arrived' ? now : order.deliveredAt,
            };
          }
          return order;
        });
        if (changed) saveOrders(next);
        return next;
      });
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const filteredProducts = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return displayedProducts;
    return displayedProducts.filter((p) => p.name.toLowerCase().includes(keyword) || p.tag.toLowerCase().includes(keyword));
  }, [displayedProducts, searchQuery]);

  const getMerchantNameForItems = (items: Product[]) => {
    const first = items[0];
    if (!first) return '花多多商家';
    if (first.channel === 'chilema') return `吃了吗·${first.tag.replace(/\s\d+分钟$/, '')}店`;
    if (first.category === 'movie') return 'gogo玩·影娱旗舰店';
    return 'gogo玩·生活馆';
  };

  const formatDateTime = (time: number) =>
    new Date(time).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

  const fullOrderList = useMemo(() => {
    const filtered = orders.filter((order) => {
      if (orderStatusFilter === 'all') return true;
      if (orderStatusFilter === 'arrived') return order.status === 'arrived';
      return order.status !== 'arrived';
    });
    return filtered.sort((a, b) => (orderSort === 'latest' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt));
  }, [orders, orderStatusFilter, orderSort]);

  const groupedOrderList = useMemo(() => {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startYesterday = startToday - 24 * 60 * 60 * 1000;

    const groups: Array<{ title: '今天' | '昨天' | '更早'; orders: OrderRecord[] }> = [
      { title: '今天', orders: [] },
      { title: '昨天', orders: [] },
      { title: '更早', orders: [] },
    ];

    fullOrderList.forEach((order) => {
      if (order.createdAt >= startToday) {
        groups[0].orders.push(order);
      } else if (order.createdAt >= startYesterday) {
        groups[1].orders.push(order);
    } else {
        groups[2].orders.push(order);
      }
    });

    return groups.filter((group) => group.orders.length > 0);
  }, [fullOrderList]);

  const addToCart = (product: Product) => {
    const next = [...cart, product];
    setCart(next);
    saveCart(next);
    alert(`已加入购物车：${product.name}`);
    setActiveBottomTab('cart');
  };

  const createOrder = (items: Product[], source: 'single' | 'cart') => {
    if (!selectedAddressId) return null;
    const total = items.reduce((sum, item) => sum + item.price, 0);
    const distanceKm = Number((Math.random() * 6 + 1.2).toFixed(1));
    const etaMinutes = Math.round(distanceKm * 7 + (source === 'cart' ? 18 : 12));
    const newOrder: OrderRecord = {
      id: `hd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
      items,
      totalAmount: total,
      merchantName: getMerchantNameForItems(items),
      source,
      status: 'merchant_accepted',
      distanceKm,
      etaMinutes,
      addressId: selectedAddressId,
    };
    const nextOrders = [newOrder, ...orders].slice(0, 100);
    setOrders(nextOrders);
    saveOrders(nextOrders);
    return newOrder;
  };

  const checkoutNow = (product: Product) => {
    if (addresses.length === 0 || !selectedAddressId) {
      alert('请先新增收货地址，再进行下单');
      setActiveBottomTab('me');
      setShowAddressModal(true);
      return;
    }
    const order = createOrder([product], 'single');
    if (!order) return;
      onPurchase();
    alert(`下单成功\n订单号：${order.id}\n商品：${product.name}\n金额：¥${product.price.toFixed(2)}`);
    setActiveBottomTab('me');
  };

  const checkoutCart = () => {
    if (cart.length === 0) {
      alert('购物车还是空的');
      return;
    }
    if (addresses.length === 0 || !selectedAddressId) {
      alert('请先新增收货地址，再进行下单');
      setActiveBottomTab('me');
      setShowAddressModal(true);
      return;
    }
    const order = createOrder(cart, 'cart');
    if (!order) return;
      onPurchase();
    alert(`购物车下单成功\n订单号：${order.id}\n共${cart.length}件\n总额：¥${order.totalAmount.toFixed(2)}`);
    setCart([]);
    saveCart([]);
    setActiveBottomTab('me');
  };

  const openCreateAddress = () => {
    setEditingAddress(null);
    setAddressForm({ label: '', contactName: userName, contactPhone: '', detail: '' });
    setShowAddressModal(true);
  };

  const openEditAddress = (address: AddressRecord) => {
    setEditingAddress(address);
    setAddressForm({
      label: address.label,
      contactName: address.contactName,
      contactPhone: address.contactPhone,
      detail: address.detail,
    });
    setShowAddressModal(true);
  };

  const submitAddress = () => {
    if (!addressForm.label.trim() || !addressForm.contactName.trim() || !addressForm.contactPhone.trim() || !addressForm.detail.trim()) {
      alert('请填写完整地址信息');
        return;
      }
      
    if (editingAddress) {
      const next = addresses.map((a) =>
        a.id === editingAddress.id
          ? { ...a, label: addressForm.label.trim(), contactName: addressForm.contactName.trim(), contactPhone: addressForm.contactPhone.trim(), detail: addressForm.detail.trim() }
          : a
      );
      setAddresses(next);
      saveAddresses(next);
    } else {
      const newAddress: AddressRecord = {
        id: `addr_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        label: addressForm.label.trim(),
        contactName: addressForm.contactName.trim(),
        contactPhone: addressForm.contactPhone.trim(),
        detail: addressForm.detail.trim(),
      };
      const next = [newAddress, ...addresses];
      setAddresses(next);
      saveAddresses(next);
      setSelectedAddressId(newAddress.id);
    }
    setShowAddressModal(false);
  };

  const getStatusText = (status: OrderRecord['status']) => {
    if (status === 'merchant_accepted') return '商家已接单';
    if (status === 'rider_picking') return '骑手取货中';
    if (status === 'delivering') return '商品配送中';
    return '商品已到达';
  };

  const getStatusStep = (status: OrderRecord['status']) => {
    if (status === 'merchant_accepted') return 1;
    if (status === 'rider_picking') return 2;
    if (status === 'delivering') return 3;
    return 4;
  };

  const getOrderProgress = (order: OrderRecord) => {
    const elapsedMin = (Date.now() - order.createdAt) / 60000;
    const p = Math.min(elapsedMin / Math.max(order.etaMinutes, 1), 1);
    return Math.round(p * 100);
  };

  const handleTopBack = () => {
    // 顶部返回键：优先回到花多多首页tab，再退出到主页面
    if (activeBottomTab !== 'home') {
      setActiveBottomTab('home');
      return;
    }
    onBack();
  };

  const renderCartPanel = () => (
    <section className="px-3 mt-3">
      <div className="bg-white rounded-2xl border border-slate-200 p-3">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">购物车商品</h2>
        {cart.length === 0 ? (
          <p className="text-xs text-slate-500">购物车暂无商品，去首页加购吧</p>
        ) : (
          <div className="space-y-2">
            {cart.map((item, idx) => (
              <div key={`${item.id}_${idx}`} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{item.emoji}</span>
                  <span className="text-slate-700">{item.name}</span>
              </div>
                <span className="font-medium">¥{item.price.toFixed(2)}</span>
            </div>
            ))}
            <div className="pt-2 border-t flex items-center justify-between">
              <span className="text-sm text-slate-600">合计</span>
              <span className="text-base font-semibold text-red-500">
                ¥{cart.reduce((sum, i) => sum + i.price, 0).toFixed(2)}
                  </span>
            </div>
              <button
              onClick={checkoutCart}
              className="w-full mt-2 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium"
              >
              提交订单
              </button>
            </div>
        )}
          </div>
    </section>
  );

  const renderMePanel = () => {
    const recentOrders = orders.slice(0, 3);
    const activeOrders = orders.filter((o) => o.status !== 'arrived').slice(0, 3);
    const allStatus = ['商家已接单', '骑手取货中', '商品配送中', '商品已到达'];
    return (
      <section className="px-3 mt-3 space-y-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-semibold">
              {userName.slice(0, 1).toUpperCase()}
                </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">{userName}</div>
              <div className="text-xs text-slate-500">花多多会员</div>
                    </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">进行中订单动态</h3>
          {activeOrders.length === 0 ? (
            <p className="text-xs text-slate-500">当前没有进行中的订单</p>
          ) : (
            <div className="space-y-3">
              {activeOrders.map((order) => {
                const currentStep = getStatusStep(order.status);
                const progress = getOrderProgress(order);
                return (
                  <div key={`active_${order.id}`} className="border border-orange-100 bg-orange-50 rounded-xl p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-orange-700">订单 {order.id}</span>
                      <span className="text-xs text-orange-600">{getStatusText(order.status)}</span>
              </div>
                    <div className="text-xs text-slate-600 mb-2">
                      配送距离 {order.distanceKm}km · 预计 {order.etaMinutes} 分钟 · 当前进度 {progress}%
            </div>
                    <div className="flex items-center gap-1">
                      {allStatus.map((label, idx) => {
                        const step = idx + 1;
                        const done = step <= currentStep;
                        return (
                          <div key={`${order.id}_${label}`} className="flex-1">
                            <div className={`h-1.5 rounded-full ${done ? 'bg-orange-500' : 'bg-slate-200'}`} />
                            <div className={`mt-1 text-[10px] ${done ? 'text-orange-700' : 'text-slate-400'}`}>{label}</div>
          </div>
                        );
                      })}
        </div>
                  </div>
                );
              })}
            </div>
          )}
              </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">最近订单</h3>
          {recentOrders.length === 0 ? (
            <p className="text-xs text-slate-500">暂无最近订单</p>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <div key={order.id} className="text-xs text-slate-700 border border-slate-100 rounded-lg p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{order.source === 'cart' ? '购物车订单' : '单品订单'}</span>
                    <span>¥{order.totalAmount.toFixed(2)}</span>
            </div>
                  <div className="text-slate-500 mt-1">订单号：{order.id}</div>
                  <div className="text-slate-500 mt-1">{getStatusText(order.status)} · {order.distanceKm}km · 约{order.etaMinutes}分钟</div>
          </div>
            ))}
        </div>
          )}
      </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">全部订单</h3>
              <button
            onClick={() => setShowAllOrdersModal(true)}
            className="w-full text-left text-xs text-slate-600 hover:text-slate-800 transition-colors"
              >
            共 {orders.length} 笔订单（含进行中），点击查看全部
              </button>
      </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-900">地址列表</h3>
            <button onClick={openCreateAddress} className="text-xs text-orange-600 hover:text-orange-700">
              新增地址
            </button>
          </div>
          <div className="space-y-2">
            {addresses.length === 0 && <p className="text-xs text-slate-500">请先新增地址才能下单</p>}
            {addresses.map((addr) => (
              <div key={addr.id} className={`text-xs border rounded-lg p-2 ${selectedAddressId === addr.id ? 'border-orange-300 bg-orange-50' : 'border-slate-100'}`}>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSelectedAddressId(addr.id)}
                    className="text-left flex-1"
                  >
                    <div className="font-medium text-slate-800">{addr.label} · {addr.contactName}</div>
                    <div className="text-slate-500 mt-0.5">{addr.contactPhone}</div>
                    <div className="text-slate-600 mt-0.5">{addr.detail}</div>
                  </button>
                  <button onClick={() => openEditAddress(addr)} className="text-orange-600 px-2">
                    编辑
                  </button>
                  </div>
                      </div>
            ))}
                    </div>
                    </div>
      </section>
    );
  };

  return (
    <div className="h-screen bg-slate-100 flex flex-col">
      <div className="bg-[#ffd400] px-3 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <button onClick={handleTopBack} className="p-2 rounded-lg hover:bg-black/10 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-slate-900">花多多</h1>
            <p className="text-xs text-slate-700">吃了吗 × gogo玩</p>
                    </div>
          <div className="relative p-2 rounded-lg hover:bg-black/10 transition-colors">
            <MessageCircle className="w-5 h-5" />
          </div>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索外卖、商家或商品"
            className="w-full pl-9 pr-20 py-2.5 rounded-full border border-transparent focus:outline-none focus:ring-2 focus:ring-yellow-300"
          />
          <button className="absolute right-1 top-1/2 -translate-y-1/2 bg-yellow-300 hover:bg-yellow-400 text-slate-900 text-sm font-semibold px-4 py-1.5 rounded-full">
            搜索
          </button>
                    </div>
                  </div>
                  
      <div className="flex-1 overflow-y-auto pb-20">
        {activeBottomTab === 'home' && (
          <>
            <section className="bg-white rounded-b-3xl px-3 pt-3 pb-4 shadow-sm">
              <div className="grid grid-cols-4 gap-x-2 gap-y-4">
                {SERVICE_GRID.map((category) => (
                    <button
                    key={category.id}
                      onClick={() => {
                      setActiveService(category.id);
                      refreshProductsByService(category.id);
                    }}
                    className="flex flex-col items-center text-center"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-100 to-orange-100 flex items-center justify-center text-2xl">
                      {category.emoji}
                  </div>
                    <span className="mt-1 text-xs text-slate-700">{category.name}</span>
                  </button>
            ))}
          </div>
            </section>

            <section className="px-3 mt-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white rounded-2xl p-3 border border-slate-200">
                  <div className="text-xs font-semibold text-orange-500">限时秒杀</div>
                  <div className="text-sm font-medium text-slate-800 mt-1">精选低价好货</div>
                  <div className="text-xs text-slate-500 mt-1">天天有低价</div>
          </div>
                <div className="bg-white rounded-2xl p-3 border border-slate-200">
                  <div className="text-xs font-semibold text-pink-500">今日爆款</div>
                  <div className="text-sm font-medium text-slate-800 mt-1">热门店铺推荐</div>
                  <div className="text-xs text-slate-500 mt-1">实时更新</div>
        </div>
              </div>
            </section>

            <section className="px-3 mt-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-slate-900">
                  {activeService === 'all' ? '综合推荐' : `${serviceFilter?.name || ''}推荐`}
                </h2>
                  <button
                  onClick={checkoutCart}
                  className="relative text-xs px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700"
                >
                  <ShoppingCart className="w-4 h-4 inline" />
                  <span className="ml-1">结算</span>
                  {cart.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                      {cart.length > 9 ? '9+' : cart.length}
                    </span>
                  )}
                  </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="bg-white rounded-2xl border border-slate-200 p-2">
                    <div className="h-24 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-4xl">
                      {product.emoji}
            </div>
                    <div className="text-sm font-medium text-slate-900 mt-2 min-h-[38px] leading-5">{product.name}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-500">{product.tag}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${product.channel === 'chilema' ? 'bg-yellow-50 text-yellow-700' : 'bg-blue-50 text-blue-700'}`}>
                        {product.channel === 'chilema' ? '吃了吗' : 'gogo玩'}
                      </span>
                      <span className="text-[10px] text-slate-400">{product.soldText}</span>
              </div>
                    <div className="mt-1 flex items-end gap-1">
                      <span className="text-red-500 font-semibold">¥{product.price.toFixed(2)}</span>
                      {product.originalPrice && (
                        <span className="text-[11px] text-slate-400 line-through">¥{product.originalPrice.toFixed(2)}</span>
                      )}
                </div>
                    <div className="mt-2 flex gap-1.5">
                      <button onClick={() => addToCart(product)} className="flex-1 py-1.5 text-xs rounded-lg bg-slate-100 hover:bg-slate-200">
                        加购
                      </button>
                      <button onClick={() => checkoutNow(product)} className="flex-1 py-1.5 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600">
                        下单
                </button>
              </div>
            </div>
                ))}
                </div>
            </section>
          </>
              )}

        {activeBottomTab === 'cart' && renderCartPanel()}
        {activeBottomTab === 'me' && renderMePanel()}
              </div>

      <nav className="absolute bottom-0 left-0 right-0 bg-white border-t h-14 flex items-center justify-around">
        <button onClick={() => setActiveBottomTab('home')} className={`flex flex-col items-center text-[11px] ${activeBottomTab === 'home' ? 'text-orange-500' : 'text-slate-500'}`}>
          <span>🏠</span>
          <span>首页</span>
                  </button>
        <button onClick={() => setActiveBottomTab('cart')} className={`flex flex-col items-center text-[11px] ${activeBottomTab === 'cart' ? 'text-orange-500' : 'text-slate-500'}`}>
          <ShoppingCart className="w-4 h-4" />
          <span>购物车</span>
                  </button>
        <button onClick={() => setActiveBottomTab('me')} className={`flex flex-col items-center text-[11px] ${activeBottomTab === 'me' ? 'text-orange-500' : 'text-slate-500'}`}>
          <User className="w-4 h-4" />
          <span>我的</span>
                  </button>
      </nav>

      {showAddressModal && (
        <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-4 space-y-3">
            <h3 className="text-base font-semibold text-slate-900">{editingAddress ? '编辑地址' : '新增地址'}</h3>
                  <input
              value={addressForm.label}
              onChange={(e) => setAddressForm((prev) => ({ ...prev, label: e.target.value }))}
              placeholder="地址标签（家/公司）"
              className="w-full text-sm border rounded-lg px-3 py-2"
            />
            <input
              value={addressForm.contactName}
              onChange={(e) => setAddressForm((prev) => ({ ...prev, contactName: e.target.value }))}
              placeholder="收货人"
              className="w-full text-sm border rounded-lg px-3 py-2"
            />
            <input
              value={addressForm.contactPhone}
              onChange={(e) => setAddressForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
              placeholder="联系电话"
              className="w-full text-sm border rounded-lg px-3 py-2"
            />
                  <textarea
              value={addressForm.detail}
              onChange={(e) => setAddressForm((prev) => ({ ...prev, detail: e.target.value }))}
              placeholder="详细地址"
              className="w-full text-sm border rounded-lg px-3 py-2 min-h-[72px]"
            />
            <div className="flex gap-2">
                  <button
                onClick={() => {
                  if (addresses.length === 0) {
                    alert('首次使用请先填写收货地址');
                    return;
                  }
                  setShowAddressModal(false);
                }}
                className="flex-1 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm"
                  >
                    取消
                  </button>
                  <button
                onClick={submitAddress}
                className="flex-1 py-2 rounded-lg bg-orange-500 text-white text-sm"
                  >
                    保存
                  </button>
                </div>
          </div>
        </div>
      )}

      {showAllOrdersModal && (
        <div className="absolute inset-0 bg-black/45 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
          <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-slate-900">全部订单</h3>
                <button onClick={() => setShowAllOrdersModal(false)} className="text-sm text-slate-500 hover:text-slate-700">
                  关闭
                  </button>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value as 'all' | 'in_progress' | 'arrived')}
                  className="text-xs border rounded-lg px-2 py-1.5"
                >
                  <option value="all">全部状态</option>
                  <option value="in_progress">进行中</option>
                  <option value="arrived">已送达</option>
                </select>
                <select
                  value={orderSort}
                  onChange={(e) => setOrderSort(e.target.value as 'latest' | 'earliest')}
                  className="text-xs border rounded-lg px-2 py-1.5"
                >
                  <option value="latest">按日期：最新优先</option>
                  <option value="earliest">按日期：最早优先</option>
                </select>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {fullOrderList.length === 0 ? (
                <p className="text-xs text-slate-500">当前筛选下暂无订单</p>
              ) : (
                groupedOrderList.map((group) => (
                  <div key={group.title} className="space-y-2">
                    <div className="text-xs font-semibold text-slate-500 px-1">
                      {group.title} · {group.orders.length}单
                    </div>
                    {group.orders.map((order) => (
                    <button
                        key={`full_${order.id}`}
                        onClick={() => setSelectedOrder(order)}
                        className="w-full text-left border border-slate-200 rounded-xl p-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-800">{order.merchantName || getMerchantNameForItems(order.items)}</span>
                          <span className="text-slate-500">{getStatusText(order.status)}</span>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          下单时间：{formatDateTime(order.createdAt)} · ¥{order.totalAmount.toFixed(2)}
                        </div>
                        <div className="mt-1 text-[11px] text-orange-600">点击查看详情</div>
                    </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {selectedOrder && (
        <div className="absolute inset-0 bg-black/45 z-[60] flex items-end justify-center sm:items-center p-0 sm:p-4">
          <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-slate-900">订单详情</h3>
              <button onClick={() => setSelectedOrder(null)} className="text-sm text-slate-500 hover:text-slate-700">
                关闭
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-slate-800 font-medium">{selectedOrder.merchantName || getMerchantNameForItems(selectedOrder.items)}</div>
                <div className="text-slate-500 mt-1">订单号：{selectedOrder.id}</div>
                <div className="text-slate-500 mt-1">订单状态：{getStatusText(selectedOrder.status)}</div>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200">
                <div className="font-medium text-slate-800 mb-1.5">购买商品</div>
                <div className="space-y-1.5">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={`${selectedOrder.id}_${item.id}_${idx}`} className="flex items-center justify-between">
                      <span className="text-slate-700">{item.emoji} {item.name}</span>
                      <span className="text-slate-800">¥{item.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200">
                <div className="text-slate-600">下单时间：{formatDateTime(selectedOrder.createdAt)}</div>
                <div className="text-slate-600 mt-1">
                  送达时间：
                  {selectedOrder.status === 'arrived'
                    ? selectedOrder.deliveredAt
                      ? formatDateTime(selectedOrder.deliveredAt)
                      : formatDateTime(selectedOrder.createdAt + selectedOrder.etaMinutes * 60000)
                    : `预计 ${formatDateTime(selectedOrder.createdAt + selectedOrder.etaMinutes * 60000)}`}
                </div>
                <div className="text-slate-600 mt-1">配送距离：{selectedOrder.distanceKm}km（预计 {selectedOrder.etaMinutes} 分钟）</div>
                <div className="text-sm font-semibold text-red-500 mt-2">实付金额：¥{selectedOrder.totalAmount.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShoppingScreen;
