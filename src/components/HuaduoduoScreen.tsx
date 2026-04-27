import React from 'react';
import { ChevronLeft, UtensilsCrossed, ShoppingBag, Popcorn } from 'lucide-react';

interface HuaduoduoScreenProps {
  onBack: () => void;
  onNavigateToFood: () => void;
  onNavigateToGogo: () => void;
}

const HuaduoduoScreen: React.FC<HuaduoduoScreenProps> = ({ onBack, onNavigateToFood, onNavigateToGogo }) => {
  return (
    <div className="h-screen bg-gradient-to-br from-pink-50 via-orange-50 to-yellow-50 flex flex-col">
      <div className="bg-white/90 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-lg font-semibold">花多多</h1>
          <p className="text-xs text-gray-500">生活购物平台</p>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4">
        <button
          onClick={onNavigateToFood}
          className="w-full text-left bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border border-orange-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xl font-semibold text-gray-900">吃了吗</div>
              <div className="text-sm text-gray-500 mt-1">像美团/饿了吗一样点吃的</div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white">
              <UtensilsCrossed className="w-7 h-7" />
            </div>
          </div>
        </button>

        <button
          onClick={onNavigateToGogo}
          className="w-full text-left bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border border-blue-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xl font-semibold text-gray-900">gogo玩</div>
              <div className="text-sm text-gray-500 mt-1">淘宝+拼多多风格，买日用品和电影票</div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white">
              <ShoppingBag className="w-7 h-7" />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600">日用百货</span>
            <span className="text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-600 inline-flex items-center gap-1">
              <Popcorn className="w-3 h-3" />
              电影票
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default HuaduoduoScreen;
