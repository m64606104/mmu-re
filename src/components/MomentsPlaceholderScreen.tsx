import { ChevronLeft, Wrench } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export default function MomentsPlaceholderScreen({ onBack }: Props) {
  return (
    <div className="h-[100dvh] md:h-full min-h-0 bg-[#f3f4f6] flex flex-col">
      <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center gap-2">
        <button onClick={onBack} className="p-2 -ml-2">
          <ChevronLeft className="w-6 h-6 text-gray-900" />
        </button>
        <div className="text-lg font-semibold text-gray-900">朋友圈</div>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl bg-white border border-gray-200 shadow-sm p-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Wrench className="w-6 h-6 text-gray-600" />
          </div>
          <div className="mt-4 text-base font-semibold text-gray-900">朋友圈正在重构</div>
          <div className="mt-2 text-sm text-gray-600 leading-relaxed">
            旧版自动生成与互动逻辑已关闭，避免后台持续调用接口。
            <br />
            入口与页面接口保留，后续会按新方案重做。
          </div>
        </div>
      </div>
    </div>
  );
}

