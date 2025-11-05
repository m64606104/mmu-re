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
    <div className="w-full h-full bg-slate-50 flex flex-col">
      {/* 顶部导航栏 */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors active:scale-95"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-medium">主题设置</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* 壁纸选择 */}
        <div>
          <h3 className="mb-3 text-slate-700 font-medium">选择壁纸</h3>
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
                <div className={`w-full aspect-[9/19.5] ${wallpaper.preview} rounded-xl shadow-md group-active:scale-95 transition-transform overflow-hidden`}>
                  {theme.wallpaper === wallpaper.id && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                        <Check className="w-5 h-5 text-green-500" />
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-center mt-1.5 text-slate-600">{wallpaper.name}</p>
              </button>
            ))}

            {/* 自定义壁纸 */}
            <label className="relative group cursor-pointer">
              <div className="w-full aspect-[9/19.5] rounded-xl shadow-md group-active:scale-95 transition-transform overflow-hidden border-2 border-dashed border-slate-300 flex items-center justify-center"
                style={theme.customWallpaper ? { backgroundImage: `url(${theme.customWallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
              >
                {theme.wallpaper === 'custom' && theme.customWallpaper && (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                      <Check className="w-5 h-5 text-green-500" />
                    </div>
                  </div>
                )}
                {!theme.customWallpaper && (
                  <Upload className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <p className="text-xs text-center mt-1.5 text-slate-600">上传壁纸</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleWallpaperUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* 预览提示 */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-700">
            💡 返回主屏幕查看主题效果
          </p>
        </div>

        {/* 恢复初始布局按钮 */}
        {onResetLayout && (
          <div>
            <h3 className="mb-3 text-slate-700 font-medium">桌面布局</h3>
            <button
              onClick={() => {
                if (confirm('确定要恢复到默认桌面布局吗？这将重置所有应用图标的位置。')) {
                  onResetLayout();
                  alert('桌面布局已恢复到初始状态');
                }
              }}
              className="w-full px-4 py-3 bg-orange-500 hover:bg-orange-600 rounded-xl font-medium text-white transition active:scale-95 shadow-md"
            >
              🔄 恢复初始桌面布局
            </button>
            <p className="text-xs text-slate-500 mt-2 text-center">
              恢复快捷应用、第二页应用和Dock栏到默认状态
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
