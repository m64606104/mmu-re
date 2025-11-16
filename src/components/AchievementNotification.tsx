/**
 * 成就解锁通知组件
 * 显示成就解锁的动画和提示
 */

import React, { useState, useEffect } from 'react';
import { Trophy, X } from 'lucide-react';
import { Achievement } from '../utils/achievementSystem';

interface AchievementUnlockEvent extends CustomEvent {
  detail: Achievement;
}

const AchievementNotification: React.FC = () => {
  const [notification, setNotification] = useState<Achievement | null>(null);

  useEffect(() => {
    const handleAchievementUnlock = (event: Event) => {
      const unlockEvent = event as AchievementUnlockEvent;
      const achievement = unlockEvent.detail;

      setNotification(achievement);

      // 5秒后自动消失
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    };

    window.addEventListener('achievement-unlocked', handleAchievementUnlock);

    return () => {
      window.removeEventListener('achievement-unlocked', handleAchievementUnlock);
    };
  }, []);

  if (!notification) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto">
        {/* 背景光晕效果 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-96 h-96 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full blur-3xl opacity-30 animate-pulse-slow" />
        </div>

        {/* 主卡片 */}
        <div className="relative bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl shadow-2xl border-4 border-yellow-400 p-8 min-w-[380px] max-w-[450px] animate-achievement-unlock">
          {/* 关闭按钮 */}
          <button
            onClick={() => setNotification(null)}
            className="absolute top-4 right-4 p-2 hover:bg-yellow-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>

          {/* 标题 */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-6 py-2 rounded-full font-bold text-lg shadow-lg">
              <Trophy size={24} className="animate-bounce" />
              <span>成就解锁！</span>
              <Trophy size={24} className="animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
          </div>

          {/* 成就图标 */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-32 h-32 bg-gradient-to-br from-yellow-300 to-orange-300 rounded-full flex items-center justify-center shadow-2xl animate-scale-bounce">
                <div className="text-7xl">{notification.icon}</div>
              </div>
              {/* 星星装饰 */}
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div
                  key={i}
                  className="absolute w-4 h-4 text-yellow-400 animate-star-burst"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: `rotate(${i * 45}deg) translateX(60px)`,
                    animationDelay: `${i * 0.1}s`
                  }}
                >
                  ⭐
                </div>
              ))}
            </div>
          </div>

          {/* 成就信息 */}
          <div className="text-center space-y-3">
            <h3 className="text-2xl font-bold text-gray-800">
              {notification.title}
            </h3>
            <p className="text-gray-600">
              {notification.description}
            </p>
            
            {/* 奖励 */}
            {notification.reward && (
              <div className="mt-4 pt-4 border-t-2 border-yellow-300">
                <div className="inline-flex items-center gap-2 bg-yellow-100 px-4 py-2 rounded-full">
                  <span className="text-sm font-medium text-yellow-800">
                    🎁 奖励：{notification.reward.value}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 闪光效果 */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-3xl pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shine" />
          </div>
        </div>

        {/* 烟花效果 */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-firework-burst"
              style={{
                top: '50%',
                left: '50%',
                animationDelay: `${i * 0.08}s`,
                transform: `rotate(${i * 30}deg)`
              }}
            />
          ))}
        </div>
      </div>

      {/* CSS动画 */}
      <style>{`
        @keyframes achievement-unlock {
          0% {
            transform: scale(0) rotate(-180deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.1) rotate(10deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }

        @keyframes scale-bounce {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        @keyframes star-burst {
          0% {
            opacity: 0;
            transform: rotate(var(--rotation)) translateX(0) scale(0);
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: rotate(var(--rotation)) translateX(80px) scale(1);
          }
        }

        @keyframes firework-burst {
          0% {
            opacity: 1;
            transform: rotate(var(--rotation)) translateY(0);
          }
          100% {
            opacity: 0;
            transform: rotate(var(--rotation)) translateY(-200px);
          }
        }

        @keyframes shine {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.5;
          }
        }

        .animate-achievement-unlock {
          animation: achievement-unlock 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .animate-scale-bounce {
          animation: scale-bounce 2s ease-in-out infinite;
        }

        .animate-star-burst {
          animation: star-burst 1.5s ease-out forwards;
        }

        .animate-firework-burst {
          animation: firework-burst 1s ease-out forwards;
        }

        .animate-shine {
          animation: shine 2s ease-in-out infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AchievementNotification;
