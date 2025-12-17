/**
 * 笔友分享模态框
 * 用于生成笔友分享码
 */

import { useState } from 'react';
import { X, Copy, Check, Share2 } from 'lucide-react';
import { Letter } from '../types/letter';
import { createPenPalShareCode, PenPalShareCode } from '../utils/penPalShareSystem';

interface PenPalShareModalProps {
  letter: Letter;
  userName: string;
  onClose: () => void;
}

export default function PenPalShareModal({ letter, userName, onClose }: PenPalShareModalProps) {
  const [reason, setReason] = useState('');
  const [shareCode, setShareCode] = useState<PenPalShareCode | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    if (!reason.trim()) {
      alert('请输入分享原因');
      return;
    }

    const code = createPenPalShareCode(
      letter.receiverId,
      userName,
      reason.trim()
    );

    if (code) {
      setShareCode(code);
    } else {
      alert('生成笔友码失败');
    }
  };

  const handleCopy = () => {
    if (shareCode) {
      navigator.clipboard.writeText(shareCode.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">分享笔友</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-4">
          {!shareCode ? (
            <>
              {/* 笔友信息 */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-3xl">{letter.receiverAvatar}</div>
                  <div>
                    <div className="font-bold text-gray-800">{letter.receiverName}</div>
                    <div className="text-sm text-gray-600">
                      {letter.conversationRounds?.length || 0} 轮交流
                    </div>
                  </div>
                </div>
              </div>

              {/* 说明 */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="text-sm text-blue-800 leading-relaxed">
                  <p className="font-semibold mb-2">📮 什么是笔友分享？</p>
                  <p className="mb-2">
                    你可以将你的笔友介绍给朋友。你的朋友使用笔友码添加后：
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>笔友会记得你们的交流历史</li>
                    <li>笔友会知道你朋友想认识她的原因</li>
                    <li>人设、性格等完全一致</li>
                  </ul>
                </div>
              </div>

              {/* 分享原因 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  告诉笔友，你的朋友为什么想认识她 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="例如：我的朋友小明也很喜欢海边散步，他看到我们的聊天后很想认识你..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  这段话会告诉笔友，让她了解新朋友的背景
                </p>
              </div>

              {/* 生成按钮 */}
              <button
                onClick={handleGenerate}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2"
              >
                <Share2 size={20} />
                生成笔友码
              </button>
            </>
          ) : (
            <>
              {/* 成功提示 */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <div className="text-4xl mb-2">✅</div>
                <div className="font-bold text-green-800 mb-1">笔友码生成成功！</div>
                <div className="text-sm text-green-700">
                  将笔友码分享给你的朋友吧
                </div>
              </div>

              {/* 笔友码 */}
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-4 border-2 border-purple-300">
                <div className="text-xs text-purple-700 mb-2 font-medium">笔友码</div>
                <div className="font-mono text-lg font-bold text-purple-900 mb-3 break-all">
                  {shareCode.code}
                </div>
                <button
                  onClick={handleCopy}
                  className={`w-full py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                    copied
                      ? 'bg-green-500 text-white'
                      : 'bg-white text-purple-700 border-2 border-purple-300 hover:bg-purple-50'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check size={18} />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy size={18} />
                      复制笔友码
                    </>
                  )}
                </button>
              </div>

              {/* 使用说明 */}
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-2">
                <p className="font-semibold">📱 使用方法：</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>将笔友码发送给你的朋友</li>
                  <li>朋友在慢邮件app中打开"写信"</li>
                  <li>选择"通过笔友码添加"</li>
                  <li>输入笔友码即可添加</li>
                </ol>
              </div>

              {/* 关闭按钮 */}
              <button
                onClick={onClose}
                className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                关闭
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
