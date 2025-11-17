/**
 * 信件详情视图整合组件
 * 集成卡片视图和时间轴视图
 */

import { useState } from 'react';
import { Letter } from '../types/letter';
import LetterCardsView from './LetterCardsView';
import LetterTimelineScreen from './LetterTimelineScreen';

interface LetterDetailViewProps {
  letter: Letter;
  onBack: () => void;
  userName: string;
}

export default function LetterDetailView({ letter, onBack, userName }: LetterDetailViewProps) {
  const [viewMode, setViewMode] = useState<'cards' | 'timeline'>('cards');

  if (viewMode === 'timeline') {
    return (
      <LetterTimelineScreen
        letter={letter}
        onBack={() => setViewMode('cards')}
        onViewDetail={() => setViewMode('cards')}
      />
    );
  }

  return (
    <LetterCardsView
      letter={letter}
      onBack={onBack}
      onViewTimeline={() => setViewMode('timeline')}
      userName={userName}
    />
  );
}
