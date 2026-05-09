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
  initialRoundNumber?: number;
  onContinueReply?: () => void;
}

export default function LetterDetailView({ letter, onBack, userName, initialRoundNumber, onContinueReply }: LetterDetailViewProps) {
  const [viewMode, setViewMode] = useState<'cards' | 'timeline'>('cards');
  const [selectedRound, setSelectedRound] = useState<number | undefined>(initialRoundNumber);

  if (viewMode === 'timeline') {
    return (
      <LetterTimelineScreen
        letter={letter}
        onBack={() => setViewMode('cards')}
        onViewDetail={(roundNumber) => {
          setSelectedRound(roundNumber);
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
      scrollToRound={selectedRound}
      onRoundViewed={() => setSelectedRound(undefined)}
      onContinueReply={onContinueReply}
    />
  );
}
