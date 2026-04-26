import type { Screen } from '../types';
import type { Letter } from '../types/letter';

type BackNavigationContext = {
  goBack: () => void;
  setReplyToLetter: (letter: Letter | null) => void;
};

const BACK_BEFORE_ACTIONS: Partial<Record<Screen, (ctx: BackNavigationContext) => void>> = {
  'letter-writing': ({ setReplyToLetter }) => {
    setReplyToLetter(null);
  },
};

export function createBackHandler(
  screen: Screen,
  context: BackNavigationContext
): () => void {
  return () => {
    const beforeAction = BACK_BEFORE_ACTIONS[screen];
    if (beforeAction) {
      beforeAction(context);
    }
    context.goBack();
  };
}

