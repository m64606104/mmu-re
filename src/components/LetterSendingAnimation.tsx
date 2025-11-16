/**
 * 邮件送达动画组件
 * 发信时显示飞鸽传书/信封飞行动画
 */

import React, { useState, useEffect } from 'react';
import { Send, Mail } from 'lucide-react';

interface LetterSendingAnimationProps {
  isVisible: boolean;
  onComplete: () => void;
  receiverName: string;
}

const LetterSendingAnimation: React.FC<LetterSendingAnimationProps> = ({
  isVisible,
  onComplete,
  receiverName
}) => {
  const [stage, setStage] = useState<'sending' | 'flying' | 'delivered'>('sending');

  useEffect(() => {
    if (!isVisible) return;

    // 阶段1: 发送中 (1秒)
    setStage('sending');
    
    const timer1 = setTimeout(() => {
      // 阶段2: 飞行中 (2秒)
      setStage('flying');
      
      const timer2 = setTimeout(() => {
        // 阶段3: 送达 (1秒)
        setStage('delivered');
        
        const timer3 = setTimeout(() => {
          onComplete();
        }, 1000);
        
        return () => clearTimeout(timer3);
      }, 2000);
      
      return () => clearTimeout(timer2);
    }, 1000);
    
    return () => clearTimeout(timer1);
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md px-8">
        {/* 背景装饰 */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <div className="w-96 h-96 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full blur-3xl animate-pulse" />
        </div>

        {/* 主要动画区域 */}
        <div className="relative bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
          {stage === 'sending' && (
            <div className="flex flex-col items-center space-y-6">
              {/* 信封准备 */}
              <div className="relative">
                <div className="w-32 h-32 bg-gradient-to-br from-amber-200 to-orange-300 rounded-2xl shadow-2xl transform rotate-6 animate-bounce">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Mail size={64} className="text-orange-600" />
                  </div>
                  {/* 邮票 */}
                  <div className="absolute top-2 right-2 w-8 h-10 bg-red-500 rounded border-2 border-white border-dashed flex items-center justify-center text-white text-xs">
                    ✉️
                  </div>
                </div>
                {/* 光晕效果 */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-400 rounded-2xl blur-xl opacity-50 animate-pulse" />
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-white">正在寄出</h3>
                <p className="text-blue-200">装进信封中...</p>
              </div>
              
              {/* 装载动画 */}
              <div className="flex space-x-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-3 h-3 bg-blue-300 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {stage === 'flying' && (
            <div className="flex flex-col items-center space-y-6">
              {/* 飞行的信封 */}
              <div className="relative w-full h-48 overflow-hidden">
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 animate-fly-across">
                  <div className="relative">
                    <div className="w-24 h-24 bg-gradient-to-br from-amber-200 to-orange-300 rounded-xl shadow-2xl">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Send size={40} className="text-orange-600 transform rotate-45" />
                      </div>
                    </div>
                    {/* 飞行轨迹 */}
                    <div className="absolute -right-8 top-1/2 transform -translate-y-1/2">
                      <div className="flex space-x-1">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="w-2 h-2 bg-blue-300 rounded-full opacity-40"
                            style={{ 
                              animationDelay: `${i * 0.1}s`,
                              transform: `scale(${1 - i * 0.2})`
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 云朵装饰 */}
                <div className="absolute top-4 left-1/4 text-4xl opacity-30 animate-float">☁️</div>
                <div className="absolute bottom-8 right-1/4 text-3xl opacity-20 animate-float" style={{ animationDelay: '1s' }}>☁️</div>
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-white">飞向远方</h3>
                <p className="text-blue-200">正在送往 {receiverName} 手中...</p>
              </div>
            </div>
          )}

          {stage === 'delivered' && (
            <div className="flex flex-col items-center space-y-6">
              {/* 送达成功 */}
              <div className="relative">
                <div className="w-32 h-32 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full shadow-2xl flex items-center justify-center animate-scale-in">
                  <div className="text-6xl">✅</div>
                </div>
                {/* 烟花效果 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <div
                      key={i}
                      className="absolute w-3 h-3 bg-yellow-400 rounded-full animate-firework"
                      style={{
                        transform: `rotate(${i * 45}deg) translateX(50px)`,
                        animationDelay: `${i * 0.05}s`
                      }}
                    />
                  ))}
                </div>
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-white">送达成功！</h3>
                <p className="text-green-200">{receiverName} 将会收到你的信</p>
                <p className="text-sm text-blue-200 mt-4">
                  {Math.floor(Math.random() * 3) + 1}-{Math.floor(Math.random() * 3) + 3}天后回信
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CSS动画 */}
      <style>{`
        @keyframes fly-across {
          0% {
            transform: translateX(-100px) translateY(0) rotate(0deg);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          50% {
            transform: translateX(50vw) translateY(-20px) rotate(10deg);
          }
          100% {
            transform: translateX(calc(100vw + 100px)) translateY(0) rotate(0deg);
            opacity: 0;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes scale-in {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes firework {
          0% {
            opacity: 1;
            transform: rotate(var(--rotation)) translateX(0);
          }
          100% {
            opacity: 0;
            transform: rotate(var(--rotation)) translateX(80px);
          }
        }

        .animate-fly-across {
          animation: fly-across 2s ease-in-out forwards;
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-scale-in {
          animation: scale-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        .animate-firework {
          animation: firework 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default LetterSendingAnimation;
