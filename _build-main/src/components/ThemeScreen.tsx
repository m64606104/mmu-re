import { ChevronLeft, Check, Upload } from 'lucide-react';
import { ThemeSettings } from '../types';

interface ThemeScreenProps {
  onBack: () => void;
  theme: ThemeSettings;
  onThemeChange: (theme: ThemeSettings) => void;
  onResetLayout?: () => void;
}

export default function ThemeScreen({ onBack, theme, onThemeChange, onResetLayout }: ThemeScreenProps) {
  const wallpapers = [
    { id: 'gradient-1', name: '梦幻紫', preview: 'bg-gradient-to-br from-rose-300 via-purple-300 to-indigo-400' },
    { id: 'gradient-2', name: '清新蓝', preview: 'bg-gradient-to-br from-cyan-300 via-blue-300 to-indigo-400' },
    { id: 'gradient-3', name: '热情橙', preview: 'bg-gradient-to-br from-amber-300 via-orange-300 to-rose-400' },
    { id: 'gradient-4', name: '翡翠绿', preview: 'bg-gradient-to-br from-emerald-300 via-teal-300 to-cyan-400' },
    { id: 'gradient-5', name: '粉紫色', preview: 'bg-gradient-to-br from-pink-300 via-purple-300 to-blue-300' },
    { id: 'dark', name: '暗黑模式', preview: 'bg-gradient-to-br from-slate-800 via-slate-900 to-black' },
  ];

  const handleWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      onThemeChange({ ...theme, wallpaper: 'custom', customWallpaper: imageUrl });
      localStorage.setItem('theme', JSON.stringify({ ...theme, wallpaper: 'custom', customWallpaper: imageUrl }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full h-full bg-gray-50 flex flex-col">
      {/* 顶部导航栏 - 统一设计 */}
      <div className="flex items-center gap-2 h-14 px-4 bg-white border-b border-gray-200">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">主题设置</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* 壁纸选择区块 */}
        <div className="bg-white mb-2">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-900">壁纸主题</h3>
            <p className="text-xs text-gray-500 mt-0.5">选择您喜欢的主屏幕背景</p>
          </div>
          <div className="px-4 py-4">
            <div className="grid grid-cols-3 gap-3">
              {wallpapers.map((wallpaper) => (
                <button
                  key={wallpaper.id}
                  onClick={() => {
                    onThemeChange({ ...theme, wallpaper: wallpaper.id });
                    localStorage.setItem('theme', JSON.stringify({ ...theme, wallpaper: wallpaper.id }));
                  }}
                  className="relative group"
                >
                  <div className={`w-full aspect-[9/19.5] ${wallpaper.preview} rounded-lg shadow-sm group-active:scale-95 transition-transform overflow-hidden`}>
                    {theme.wallpaper === wallpaper.id && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md">
                          <Check className="w-4 h-4 text-blue-500" strokeWidth={3} />
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-center mt-1.5 text-gray-700 truncate">{wallpaper.name}</p>
                </button>
              ))}

              {/* 自定义壁纸 */}
              <label className="relative group cursor-pointer">
                <div className="w-full aspect-[9/19.5] rounded-lg shadow-sm group-active:scale-95 transition-transform overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center"
                  style={theme.customWallpaper ? { backgroundImage: `url(${theme.customWallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                >
                  {theme.wallpaper === 'custom' && theme.customWallpaper && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md">
                        <Check className="w-4 h-4 text-blue-500" strokeWidth={3} />
                      </div>
                    </div>
                  )}
                  {!theme.customWallpaper && (
                    <Upload className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <p className="text-xs text-center mt-1.5 text-gray-700">自定义</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleWallpaperUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* 桌面布局区块 */}
        {onResetLayout && (
          <div className="bg-white">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-900">桌面布局</h3>
              <p className="text-xs text-gray-500 mt-0.5">管理主屏幕应用图标排列</p>
            </div>
            <div className="px-4 py-4">
              <button
                onClick={() => {
                  if (confirm('确定要恢复到默认桌面布局吗？这将重置所有应用图标的位置。')) {
                    onResetLayout();
                    alert('桌面布局已恢复到初始状态');
                  }
                }}
                className="w-full px-4 py-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-lg font-medium text-white transition-colors text-sm"
              >
                恢复默认布局
              </button>
              <p className="text-xs text-gray-500 mt-2.5 text-center leading-relaxed">
                将快捷应用、第二页应用和 Dock 栏恢复到默认状态
              </p>
            </div>
          </div>
        )}

        {/* 提示区块 */}
        <div className="px-4 py-3">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
            <p className="text-xs text-blue-700 leading-relaxed">
              💡 提示：返回主屏幕即可查看主题效果
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
