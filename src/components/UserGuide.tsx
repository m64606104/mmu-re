import { ChevronLeft, BookOpen } from 'lucide-react';
import { useState, useRef } from 'react';

interface UserGuideProps {
  onBack: () => void;
}

export default function UserGuide({ onBack }: UserGuideProps) {
  const [activeSection, setActiveSection] = useState('start');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const elementTop = element.offsetTop - container.offsetTop - 80; // 减去顶部栏高度
      container.scrollTo({ top: elementTop, behavior: 'smooth' });
    }
  };

  const sections = [
    { id: 'start', name: '快速开始' },
    { id: 'chat', name: '聊天相关' },
    { id: 'moments', name: '朋友圈' },
    { id: 'desktop', name: '桌面编辑' },
    { id: 'theme', name: '主题相关' },
    { id: 'data', name: '数据管理' },
    { id: 'faq', name: '常见问题' },
  ];

  return (
    <div className="w-full h-full bg-slate-50 flex flex-col overflow-hidden">
      {/* 顶部导航栏 */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors active:scale-95"
        >
          <ChevronLeft className="w-5 h-5 text-slate-700" />
        </button>
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-slate-700" />
          <span className="font-semibold text-slate-900">使用说明</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* 内容区域 */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-5 space-y-6">
        
        {/* 快速开始 */}
        <div id="start" className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4">快速开始</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-slate-800 mb-2">1. 配置 API</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-slate-600 ml-2">
                <li>在主屏幕点击"设置"应用</li>
                <li>填写 Base URL（如：https://api520.pro）</li>
                <li>填写 API Key</li>
                <li>点击"测试连接"自动获取可用模型</li>
                <li>选择模型后点击"保存配置"</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold text-slate-800 mb-2">2. 创建对话</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-slate-600 ml-2">
                <li>在主屏幕点击"聊天"应用</li>
                <li>点击右上角"+"按钮</li>
                <li>选择对话类型（单人/群聊）</li>
                <li>输入名称并创建</li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold text-slate-800 mb-2">3. 发送消息</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-slate-600 ml-2">
                <li>在底部输入框输入文本</li>
                <li>按回车或点击发送按钮添加到待发送列表</li>
                <li>点击"发送消息"按钮发送所有消息</li>
                <li>点击"生成回复"让 AI 回复</li>
              </ol>
            </div>
          </div>
        </div>

        {/* AI 对话功能 */}
        <div id="chat" className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4">AI 对话功能</h2>
          
          <div className="space-y-3 text-sm">
            <div>
              <h4 className="font-semibold text-slate-800 mb-1">角色定制（单人对话）</h4>
              <p className="text-slate-600">
                点击聊天界面右上角的 AI 头像，可以自定义：
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600 ml-2 mt-1">
                <li>角色头像：上传自定义图片</li>
                <li>备注名：修改显示名称</li>
                <li>人物设定：描述角色背景、身份</li>
                <li>性格特征：定义角色性格</li>
                <li>语言风格：设置说话方式</li>
                <li>记忆事件：记录重要事件</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 mb-1">多媒体消息</h4>
              <p className="text-slate-600">
                在输入框左侧点击"+"按钮，可发送：
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600 ml-2 mt-1">
                <li>图片消息：AI 会识别图片内容</li>
                <li>视频消息：AI 会理解视频内容</li>
                <li>语音消息：AI 会转文字理解</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 mb-1">长期记忆</h4>
              <p className="text-slate-600">
                AI 会自动记住重要的对话内容和你的喜好，提供更个性化的体验。可在角色设置中查看和编辑记忆事件。
              </p>
            </div>
          </div>
        </div>

        {/* 朋友圈功能 */}
        <div id="moments" className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4">朋友圈功能</h2>
          
          <div className="space-y-3 text-sm">
            <div>
              <h4 className="font-semibold text-slate-800 mb-1">发布动态</h4>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 ml-2">
                <li>点击"聊天"应用进入社交页面</li>
                <li>点击顶部相机图标</li>
                <li>选择动态类型（图文/纯文字/照片墙）</li>
                <li>输入内容和图片</li>
                <li>点击"发布"</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 mb-1">查看与互动</h4>
              <ul className="list-disc list-inside space-y-1 text-slate-600 ml-2">
                <li>在朋友圈列表滚动查看所有动态</li>
                <li>点击❤️图标给动态点赞</li>
                <li>点击评论图标添加评论</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 mb-1">AI 自动生成</h4>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 ml-2">
                <li>进入"设置"应用</li>
                <li>找到"AI 自动生成朋友圈"选项</li>
                <li>打开开关，设置生成频率</li>
                <li>AI 会定期自动发布精美动态</li>
              </ol>
            </div>
          </div>
        </div>

        {/* 桌面编辑功能 */}
        <div id="desktop" className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4">桌面编辑功能</h2>
          
          <div className="space-y-3 text-sm">
            <div>
              <h4 className="font-semibold text-slate-800 mb-1">进入编辑模式</h4>
              <p className="text-slate-600">
                长按任意图标 0.5 秒即可进入编辑模式。进入后：
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600 ml-2 mt-1">
                <li>所有图标开始抖动</li>
                <li>图标右上角出现红色 ❌ 删除按钮</li>
                <li>右上角出现"完成"和"撤回"按钮</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 mb-1">拖拽排序</h4>
              <p className="text-slate-600">
                编辑模式下，在第二页应用页面：
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600 ml-2 mt-1">
                <li>按住图标不放，拖动到目标位置</li>
                <li>释放完成排序</li>
                <li>位置会自动保存</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 mb-1">删除图标</h4>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 ml-2">
                <li>进入编辑模式</li>
                <li>点击图标右上角的红色 ❌ 按钮</li>
                <li>在确认对话框中点击"删除"</li>
              </ol>
              <p className="text-slate-600 mt-1">
                支持删除第一页快捷应用、第二页应用和底部 Dock 栏图标。
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 mb-1">添加快捷应用</h4>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 ml-2">
                <li>进入编辑模式</li>
                <li>第一页快捷应用区域会出现 "+" 按钮（当少于 4 个时）</li>
                <li>点击 "+" 打开应用选择器</li>
                <li>选择想要添加的应用</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 mb-1">撤回操作</h4>
              <p className="text-slate-600">
                误操作时点击右上角"撤回"按钮，可以：
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600 ml-2 mt-1">
                <li>撤回删除操作</li>
                <li>撤回拖拽排序</li>
                <li>最多支持撤回 10 步操作</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 mb-1">恢复初始布局</h4>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 ml-2">
                <li>点击"主题"应用</li>
                <li>滚动到底部</li>
                <li>点击"恢复初始桌面布局"按钮</li>
                <li>确认后所有图标恢复到默认位置</li>
              </ol>
            </div>
          </div>
        </div>

        {/* 主题定制 */}
        <div id="theme" className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4">主题定制</h2>
          
          <div className="space-y-3 text-sm">
            <div>
              <h4 className="font-semibold text-slate-800 mb-1">更换壁纸</h4>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 ml-2">
                <li>在主屏幕点击"主题"应用</li>
                <li>在预设壁纸中选择喜欢的样式</li>
                <li>或点击"上传壁纸"使用自定义图片</li>
              </ol>
              <p className="text-slate-600 mt-1">
                提供梦幻紫、清新蓝、热情橙、翡翠绿、粉紫色、暗黑模式 6 种预设壁纸。
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 mb-1">自定义横幅</h4>
              <p className="text-slate-600">
                在第二页应用页面，点击横幅图片区域可上传自定义图片。
              </p>
            </div>
          </div>
        </div>

        {/* 数据管理 */}
        <div id="data" className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4">数据管理</h2>
          
          <div className="space-y-3 text-sm">
            <div>
              <h4 className="font-semibold text-slate-800 mb-1">导出数据</h4>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 ml-2">
                <li>进入"设置"应用</li>
                <li>向下滚动找到"数据管理"区域</li>
                <li>点击"导出所有数据"</li>
                <li>JSON 文件将自动下载</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 mb-1">导入数据</h4>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 ml-2">
                <li>进入"设置"应用</li>
                <li>点击"导入数据"</li>
                <li>选择之前导出的 JSON 文件</li>
                <li>确认导入后数据将恢复</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 mb-1">清空数据</h4>
              <p className="text-slate-600">
                在数据管理区域点击"清空所有数据"可以删除所有对话记录和设置。此操作不可撤销，请谨慎使用。
              </p>
            </div>
          </div>
        </div>

        {/* 常见问题 */}
        <div id="faq" className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4">常见问题</h2>
          
          <div className="space-y-3 text-sm">
            <div>
              <h4 className="font-semibold text-slate-800 mb-1">Q: AI 不回复消息？</h4>
              <p className="text-slate-600">
                请检查：1) API 配置是否正确 2) API Key 是否有效 3) 网络连接是否正常。
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 mb-1">Q: 数据会丢失吗？</h4>
              <p className="text-slate-600">
                所有数据保存在浏览器本地存储，清除浏览器缓存会导致数据丢失。建议定期导出备份。
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 mb-1">Q: 如何使用群聊功能？</h4>
              <p className="text-slate-600">
                创建对话时选择"创建群聊"，可添加多个成员。群聊中的 AI 会根据各自的角色设定回复。
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 mb-1">Q: 桌面布局保存在哪里？</h4>
              <p className="text-slate-600">
                桌面布局自动保存在浏览器本地存储，刷新页面后会保持你的自定义配置。
              </p>
            </div>
          </div>
        </div>

        {/* 底部信息 */}
        <div className="text-center text-slate-400 text-xs space-y-1 py-4">
          <p className="font-medium">momoyu小手机</p>
          <p>Made with ❤️ by AI & 林半夜</p>
        </div>
        </div>

        {/* 侧边导航栏 */}
        <div className="w-28 bg-white border-l border-slate-200 p-3 overflow-y-auto">
          <div className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  activeSection === section.id
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {section.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
