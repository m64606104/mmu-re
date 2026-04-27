import React from 'react';
import { ChevronLeft, ShoppingBag, Clapperboard } from 'lucide-react';

interface HuaduoduoGogoScreenProps {
  onBack: () => void;
  onNavigateToMall: () => void;
  onNavigateToMovie: () => void;
}

const HuaduoduoGogoScreen: React.FC<HuaduoduoGogoScreenProps> = ({ onBack, onNavigateToMall, onNavigateToMovie }) => {
  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
      <div className="bg-white/90 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-lg font-semibold">gogo玩</h1>
          <p className="text-xs text-gray-500">综合购物和电影票</p>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4">
        <button
          onClick={onNavigateToMall}
          className="w-full text-left bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border border-orange-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xl font-semibold text-gray-900">日用商城</div>
              <div className="text-sm text-gray-500 mt-1">买各种生活用品、数码、美妆等</div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white">
              <ShoppingBag className="w-7 h-7" />
            </div>
          </div>
        </button>

        <button
          onClick={onNavigateToMovie}
          className="w-full text-left bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border border-purple-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xl font-semibold text-gray-900">电影票</div>
              <div className="text-sm text-gray-500 mt-1">选影院、选场次、在线购票</div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white">
              <Clapperboard className="w-7 h-7" />
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default HuaduoduoGogoScreen;
