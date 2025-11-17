/**
 * 信件详情视图整合组件
 * 集成卡片视图和时间轴视图
 * 支持滚动到指定轮次
 */

import { useState, useRef, useEffect } from 'react';
import { Letter } from '../types/letter';
import LetterCardsView from './LetterCardsView';
import LetterTimelineScreen from './LetterTimelineScreen';

interface LetterDetailViewProps {
  letter: Letter;
  onBack: () => void;
  userName: string;
  initialRoundIndex?: number;
  onReply?: () => void;
}

export default function LetterDetailView({ letter, onBack, userName, initialRoundIndex, onReply }: LetterDetailViewProps) {
  const [viewMode, setViewMode] = useState<'cards' | 'timeline'>('cards');
  const [targetRoundIndex, setTargetRoundIndex] = useState<number | null>(initialRoundIndex || null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);

  // 当切换回卡片视图并且有目标轮次时，标记需要滚动
  useEffect(() => {
    if (viewMode === 'cards' && targetRoundIndex !== null) {
      setShouldScroll(true);
    }
  }, [viewMode, targetRoundIndex]);

  // 滚动到指定轮次
  useEffect(() => {
    if (shouldScroll && viewMode === 'cards' && targetRoundIndex !== null) {
      // 等待DOM渲染完成后再滚动
      const timer = setTimeout(() => {
        const element = document.getElementById(`round-${targetRoundIndex}`);
        console.log('尝试滚动到轮次:', targetRoundIndex, '元素:', element);
        if (element && scrollContainerRef.current) {
          // 使用scrollIntoView滚动
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          console.log('滚动执行成功');
        } else {
          console.log('未找到目标元素或滚动容器');
        }
        setShouldScroll(false);
        // 不立即重置targetRoundIndex，让用户能看到滚动效果
        setTimeout(() => {
          setTargetRoundIndex(null);
        }, 500);
      }, 300); // 增加延迟确保DOM完全渲染

      return () => clearTimeout(timer);
    }
  }, [shouldScroll, viewMode, targetRoundIndex]);

  if (viewMode === 'timeline') {
    return (
      <LetterTimelineScreen
        letter={letter}
        onBack={() => setViewMode('cards')}
        onViewDetail={(roundIndex) => {
          setTargetRoundIndex(roundIndex);
          setViewMode('cards');
        }}
      />
    );
  }

  return (
    <LetterCardsView
      letter={letter}
      onBack={onBack}
      onViewTimeline={() => setViewMode('timeline')}
      userName={userName}
      scrollContainerRef={scrollContainerRef}
      onReply={onReply}
    />
  );
}
