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
}

export default function LetterDetailView({ letter, onBack, userName, initialRoundIndex }: LetterDetailViewProps) {
  const [viewMode, setViewMode] = useState<'cards' | 'timeline'>('cards');
  const [targetRoundIndex, setTargetRoundIndex] = useState<number | null>(initialRoundIndex || null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 滚动到指定轮次
  useEffect(() => {
    if (viewMode === 'cards' && targetRoundIndex !== null && scrollContainerRef.current) {
      // 等待DOM渲染完成
      setTimeout(() => {
        const element = document.getElementById(`round-${targetRoundIndex}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        setTargetRoundIndex(null);
      }, 100);
    }
  }, [viewMode, targetRoundIndex]);

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
    />
  );
}
