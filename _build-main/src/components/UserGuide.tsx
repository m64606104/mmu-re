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
    { id: 'quick-start', name: '快速上手' },
    { id: 'chat-features', name: '聊天功能' },
    { id: 'character-settings', name: '角色设置' },
    { id: 'group-chat', name: '群聊功能' },
    { id: 'advanced-settings', name: '高级设置' },
    { id: 'settings-app', name: '设置App' },
    { id: 'chat-app', name: '聊天App' },
    { id: 'theme-app', name: '主题App' },
    { id: 'desktop', name: '桌面编辑' },
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
        
        {/* 快速上手 */}
        <div id="quick-start" className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">🚀</span>
            快速上手
          </h2>
          <p className="text-sm text-slate-600 mb-4">让我们快速开始使用吧！只需要四步就能开始聊天。</p>
          
          <div className="space-y-5">
            <div className="bg-blue-50 rounded-xl p-4">
              <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                配置API
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 ml-2">
                <li>在桌面点击<span className="font-semibold text-slate-800">「设置」</span>应用</li>
                <li>填写<span className="font-semibold">Base URL</span>（例：https://api520.pro）</li>
                <li>填写你的<span className="font-semibold">API Key</span></li>
                <li>点击<span className="font-semibold">「调用」</span>按钮测试连接</li>
                <li>点击<span className="font-semibold">「保持」</span>保存配置</li>
              </ol>
            </div>

            <div className="bg-purple-50 rounded-xl p-4">
              <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                <span className="bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                进入聊天
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 ml-2">
                <li>点击桌面的<span className="font-semibold text-slate-800">「聊天」</span>应用</li>
                <li>选择一个<span className="font-semibold">预设角色</span>（比如“林半夜”）</li>
                <li>或者点击右上角<span className="font-semibold">「+」</span>新建角色</li>
              </ol>
            </div>

            <div className="bg-green-50 rounded-xl p-4">
              <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                <span className="bg-green-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
                发送消息
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 ml-2">
                <li>在底部输入框<span className="font-semibold">输入文字</span></li>
                <li>按<span className="font-semibold">回车键</span>或点击<span className="font-semibold">发送按钮</span></li>
                <li>点击<span className="font-semibold text-blue-600">「发送消息」</span>按钮</li>
              </ol>
            </div>

            <div className="bg-orange-50 rounded-xl p-4">
              <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                <span className="bg-orange-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">4</span>
                生成回复
              </h3>
              <p className="text-sm text-slate-600 ml-2">
                发送后，点击<span className="font-semibold text-orange-600">「生成」</span>按钮，AI就会回复你了！
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-4">
              <p className="text-sm text-yellow-800">
                <span className="font-semibold">💡 小提示：</span>发送后点击“生成”按钮才会有回复哦！
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">👤 个性化设置：</span>你可以在<span className="font-semibold">「聊天」→「我」</span>里设置你的用户信息，包括名字、头像、个性签名等，让AI更了解你！
              </p>
            </div>
          </div>
        </div>

        {/* 角色高级设置 */}
        <div id="advanced-settings" className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">⚙️</span>
            角色高级设置详解
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            这些设置在<strong>聊天界面右上角头像 → 角色设置</strong>中，直接影响AI的行为和聊天体验。建议新手了解！
          </p>
          
          <div className="space-y-4">
            {/* AI主动发消息 */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
              <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                <span className="text-lg">📬</span>
                AI主动发消息功能
              </h3>
              <div className="space-y-2 text-sm text-slate-600 ml-2">
                <p><strong>功能说明：</strong>AI会像真实朋友一样，主动找你聊天！</p>
                <div>
                  <p className="font-semibold text-slate-700 mt-2">设置项：</p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li><strong>开启/关闭：</strong>控制AI是否会主动发消息</li>
                    <li><strong>最短间隔：</strong>AI主动发消息的最短等待时间（分钟）</li>
                    <li><strong>最长间隔：</strong>AI主动发消息的最长等待时间（分钟）</li>
                    <li><strong>活跃时段：</strong>AI会在这个时间段内主动发消息（如9:00-23:00）</li>
                  </ul>
                </div>
                <div className="bg-white/60 rounded-lg p-3 mt-2">
                  <p className="text-xs text-purple-800">
                    <strong>💡 使用建议：</strong>间隔设置30-180分钟比较合理，太短会频繁打扰，太长则失去真实感。活跃时段建议设置为你常用手机的时间。
                  </p>
                </div>
              </div>
            </div>

            {/* 记忆系统 */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
              <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                <span className="text-lg">🧠</span>
                完整记忆系统
              </h3>
              <div className="space-y-2 text-sm text-slate-600 ml-2">
                <p><strong>功能说明：</strong>AI会自动提取和记住对话中的重要信息！</p>
                <div>
                  <p className="font-semibold text-slate-700 mt-2">工作原理：</p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>每25条消息自动触发一次记忆总结</li>
                    <li>AI会提取重要信息（如你的喜好、约定、重要事件）</li>
                    <li>记忆会在后续对话中被引用</li>
                    <li>支持手动查看和管理记忆库</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-slate-700 mt-2">查看记忆：</p>
                  <p className="ml-2">角色设置 → 记忆管理 → 查看所有提取的记忆</p>
                </div>
                <div className="bg-white/60 rounded-lg p-3 mt-2">
                  <p className="text-xs text-blue-800">
                    <strong>💡 使用建议：</strong>建议开启！让AI记住你们的对话，形成长期关系。你可以告诉AI重要的事情，它会记住并在合适时提起。
                  </p>
                </div>
              </div>
            </div>

            {/* 朋友圈记忆 */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
              <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                <span className="text-lg">📱</span>
                朋友圈记忆功能
              </h3>
              <div className="space-y-2 text-sm text-slate-600 ml-2">
                <p><strong>功能说明：</strong>AI会记住在朋友圈看到的内容，并在聊天中提及！</p>
                <div>
                  <p className="font-semibold text-slate-700 mt-2">效果：</p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>AI会记住你发的朋友圈</li>
                    <li>AI会记住其他AI的朋友圈</li>
                    <li>在聊天时可能提到朋友圈内容</li>
                    <li>"我看到你发的朋友圈..."</li>
                  </ul>
                </div>
                <div className="bg-white/60 rounded-lg p-3 mt-2">
                  <p className="text-xs text-green-800">
                    <strong>💡 使用建议：</strong>配合完整记忆系统使用效果更好，让AI的社交体验更真实。
                  </p>
                </div>
              </div>
            </div>

            {/* 自定义上下文 */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200">
              <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                <span className="text-lg">📝</span>
                自定义上下文数量
              </h3>
              <div className="space-y-2 text-sm text-slate-600 ml-2">
                <p><strong>功能说明：</strong>控制AI回复时参考多少条历史消息。</p>
                <div>
                  <p className="font-semibold text-slate-700 mt-2">参数说明：</p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li><strong>默认：20条</strong> - 平衡性能和连贯性</li>
                    <li><strong>较少（5-10条）：</strong>回复快，费用低，但可能忘记前面说的</li>
                    <li><strong>较多（30-50条）：</strong>记忆更好，但API调用成本更高</li>
                    <li><strong>配合记忆系统：</strong>即使上下文少，AI也能记住重要信息</li>
                  </ul>
                </div>
                <div className="bg-white/60 rounded-lg p-3 mt-2">
                  <p className="text-xs text-orange-800">
                    <strong>💡 使用建议：</strong>新手保持默认20条即可。如果对话经常很长，可以增加到30-40条。开启记忆系统后，即使上下文少也能保持连贯。
                  </p>
                </div>
              </div>
            </div>

            {/* 资料库（新增） */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
              <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                <span className="text-lg">📚</span>
                知识库/资料库
              </h3>
              <div className="space-y-2 text-sm text-slate-600 ml-2">
                <p><strong>功能说明：</strong>为AI提供专属知识和背景资料！</p>
                <div>
                  <p className="font-semibold text-slate-700 mt-2">支持三种方式：</p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li><strong>手动输入：</strong>直接填写文本内容</li>
                    <li><strong>上传文档：</strong>支持PDF、Word、Excel、PPTX、TXT</li>
                    <li><strong>DOI获取：</strong>输入论文DOI自动获取摘要（适合学术AI）</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-slate-700 mt-2">使用场景：</p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>给AI提供专业知识（如医学、法律资料）</li>
                    <li>上传故事背景设定</li>
                    <li>提供角色相关的信息</li>
                    <li>学术论文助手</li>
                  </ul>
                </div>
                <div className="bg-white/60 rounded-lg p-3 mt-2">
                  <p className="text-xs text-indigo-800">
                    <strong>💡 使用建议：</strong>资料会在每次对话中被引用，让AI更专业。DOI功能适合创建学术助手角色。
                  </p>
                </div>
              </div>
            </div>

            {/* 重要提示 */}
            <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-4 border-2 border-red-200">
              <h3 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                重要提示
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-red-600 ml-2">
                <li>所有设置修改后需要点击<strong>「保存」</strong>按钮</li>
                <li>开启记忆系统和主动消息会增加API调用次数</li>
                <li>建议先配置好再开始长期使用</li>
                <li>预设角色已经配置好这些功能，可以直接使用</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 设置App */}
        <div id="settings-app" className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">⚙️</span>
            设置App
          </h2>
          <p className="text-sm text-slate-600 mb-4">管理API配置、数据和系统设置。</p>
          
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="font-semibold text-slate-800 mb-2">📡 API配置</h3>
              <div className="space-y-2 text-sm text-slate-600 ml-2">
                <p><strong>Base URL：</strong>填写API服务商地址</p>
                <p><strong>API Key：</strong>填写你的密钥</p>
                <p><strong>Model Name：</strong>选择或填写模型名称</p>
                <p className="text-xs text-slate-500 mt-2">💡 填写完成后点击「调用」测试，成功后点击「保持」保存</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="font-semibold text-slate-800 mb-2">💾 数据管理</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 ml-2">
                <li><strong>导出所有数据：</strong>下载包含对话、设置的JSON文件</li>
                <li><strong>导入数据：</strong>上传之前导出的JSON恢复数据</li>
                <li><strong>清空所有数据：</strong>删除所有内容（谨慎使用）</li>
              </ul>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="font-semibold text-slate-800 mb-2">🎨 个性化设置</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 ml-2">
                <li><strong>主题选择：</strong>切换应用主题风格</li>
                <li><strong>壁纸设置：</strong>自定义桌面背景</li>
                <li><strong>布局调整：</strong>编辑桌面图标布局</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 聊天App */}
        <div id="chat-app" className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">💬</span>
            聊天App
          </h2>
          <p className="text-sm text-slate-600 mb-4">与AI角色对话、管理联系人、查看朋友圈。</p>
          
          <div className="space-y-4">
            {/* 新建对话 */}
            <div className="bg-blue-50 rounded-xl p-4">
              <h3 className="font-semibold text-slate-800 mb-2">➕ 新建对话</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-slate-600 ml-2">
                <li>点击右上角「+」按钮</li>
                <li>选择单人对话或群聊</li>
                <li>填写名称和角色信息</li>
                <li>点击创建即可开始聊天</li>
              </ol>
            </div>

            {/* 聊天功能 */}
            <div className="bg-purple-50 rounded-xl p-4">
              <h3 className="font-semibold text-slate-800 mb-2">💭 聊天功能</h3>
              <div className="space-y-3 text-sm text-slate-600 ml-2">
                <div>
                  <p className="font-semibold">基础聊天：</p>
                  <ul className="list-disc list-inside ml-2 mt-1">
                    <li>输入文字消息</li>
                    <li>发送图片/视频/语音</li>
                    <li>引用回复消息</li>
                    <li>编辑已发送消息</li>
                    <li>多选删除消息</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold">多媒体支持：</p>
                  <ul className="list-disc list-inside ml-2 mt-1">
                    <li>📷 图片：AI会识别图片内容</li>
                    <li>🎥 视频：AI理解视频场景</li>
                    <li>🎤 语音：自动转文字理解</li>
                    <li>😊 表情包：发送和识别表情</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold">消息操作：</p>
                  <ul className="list-disc list-inside ml-2 mt-1">
                    <li>长按消息：引用、编辑、删除</li>
                    <li>多选模式：批量删除不满意的回复</li>
                    <li>引用回复：让对话更清晰</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 角色设置 */}
            <div className="bg-green-50 rounded-xl p-4">
              <h3 className="font-semibold text-slate-800 mb-2">🎭 角色设置</h3>
              <p className="text-sm text-slate-600 mb-2">点击聊天界面右上角头像进入角色设置：</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 ml-2">
                <li><strong>昵称：</strong>AI的名字</li>
                <li><strong>头像：</strong>上传自定义图片</li>
                <li><strong>系统提示：</strong>角色背景设定</li>
                <li><strong>性格特点：</strong>定义性格特征</li>
                <li><strong>说话风格：</strong>语言表达方式</li>
                <li><strong>记忆事件：</strong>重要信息记录</li>
              </ul>
              <p className="text-xs text-slate-500 mt-2">💡 只填写昵称即可使用，其他字段可选</p>
            </div>

            {/* 联系人管理 */}
            <div className="bg-orange-50 rounded-xl p-4">
              <h3 className="font-semibold text-slate-800 mb-2">👥 联系人</h3>
              <p className="text-sm text-slate-600 mb-2">底部导航切换到「联系人」：</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 ml-2">
                <li>查看所有对话列表</li>
                <li>点击进入对话</li>
                <li>长按删除对话</li>
                <li>查看未读消息数</li>
              </ul>
            </div>

            {/* 朋友圈 */}
            <div className="bg-pink-50 rounded-xl p-4">
              <h3 className="font-semibold text-slate-800 mb-2">📱 朋友圈</h3>
              <div className="space-y-2 text-sm text-slate-600 ml-2">
                <div>
                  <p className="font-semibold">查看朋友圈：</p>
                  <p className="ml-2">底部导航切换到「朋友圈」，可以看到所有动态</p>
                </div>
                <div>
                  <p className="font-semibold">发布动态：</p>
                  <ol className="list-decimal list-inside ml-2 mt-1">
                    <li>点击右上角相机图标</li>
                    <li>选择类型（文字/图片/照片墙）</li>
                    <li>输入内容</li>
                    <li>点击发布</li>
                  </ol>
                </div>
                <div>
                  <p className="font-semibold">互动操作：</p>
                  <ul className="list-disc list-inside ml-2 mt-1">
                    <li>点赞❤️</li>
                    <li>评论💬</li>
                    <li><strong>点击评论：</strong>回复或删除评论</li>
                    <li><strong>@回复：</strong>点击评论后选择回复</li>
                    <li>查看AI自动生成的朋友圈</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold">AI互动：</p>
                  <ul className="list-disc list-inside ml-2 mt-1">
                    <li>AI会根据性格和关系智能互动</li>
                    <li>你评论AI朋友圈，AI会回复你</li>
                    <li>AI之间也会互相评论形成对话</li>
                    <li>朋友圈作者会回复评论区</li>
                  </ul>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">💡 AI会自动发布朋友圈，每1-3天更新。评论区会形成真实的社交对话！</p>
            </div>

            {/* 我的资料 */}
            <div className="bg-yellow-50 rounded-xl p-4">
              <h3 className="font-semibold text-slate-800 mb-2">👤 我的资料</h3>
              <p className="text-sm text-slate-600 mb-2">底部导航切换到「我的」：</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 ml-2">
                <li><strong>个人信息：</strong>设置头像、昵称等</li>
                <li><strong>我的朋友圈：</strong>查看已发布的动态</li>
                <li><strong>设置选项：</strong>各类功能设置</li>
              </ul>
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

        {/* 主题App */}
        <div id="theme-app" className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">🎨</span>
            主题App
          </h2>
          <p className="text-sm text-slate-600 mb-4">自定义桌面外观和主题风格。</p>
          
          <div className="space-y-4">
            <div className="bg-indigo-50 rounded-xl p-4">
              <h3 className="font-semibold text-slate-800 mb-2">🖼️ 更换壁纸</h3>
              <div className="space-y-2 text-sm text-slate-600 ml-2">
                <p><strong>预设壁纸：</strong>6种精选样式</p>
                <ul className="list-disc list-inside ml-2 mt-1">
                  <li>梦幻紫</li>
                  <li>清新蓝</li>
                  <li>热情橙</li>
                  <li>翡翠绿</li>
                  <li>粉紫色</li>
                  <li>暗黑模式</li>
                </ul>
                <p className="mt-2"><strong>自定义壁纸：</strong>点击「上传壁纸」使用你自己的图片</p>
              </div>
            </div>

            <div className="bg-pink-50 rounded-xl p-4">
              <h3 className="font-semibold text-slate-800 mb-2">🖌️ 自定义横幅</h3>
              <p className="text-sm text-slate-600 ml-2">
                在第二页应用页面，点击横幅区域可上传自定义图片
              </p>
            </div>

            <div className="bg-purple-50 rounded-xl p-4">
              <h3 className="font-semibold text-slate-800 mb-2">🔄 恢复默认</h3>
              <p className="text-sm text-slate-600 ml-2">
                点击「恢复初始桌面布局」可将所有图标恢复到默认位置
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
              <h4 className="font-semibold text-slate-800 mb-1">Q: AI主动消息功能消耗API吗？</h4>
              <p className="text-slate-600">
                是的。AI主动发消息和记忆总结都会调用API。建议根据实际需求和预算合理设置间隔时间。
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 mb-1">Q: 记忆系统如何工作？</h4>
              <p className="text-slate-600">
                每25条消息自动触发一次总结。AI会提取重要信息存入记忆库，之后的对话会引用这些记忆。可在角色设置中查看和管理。
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 mb-1">Q: DOI获取论文功能如何使用？</h4>
              <p className="text-slate-600">
                在角色设置 → 资料库中，输入论文DOI（如10.1038/nature12345），系统会自动获取标题、作者、摘要等信息。适合创建学术助手。
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 mb-1">Q: 如何回复朋友圈评论？</h4>
              <p className="text-slate-600">
                点击评论即可弹出操作菜单，选择"回复"可以@该评论作者。AI作者也会自动回复评论区，形成真实对话。
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
