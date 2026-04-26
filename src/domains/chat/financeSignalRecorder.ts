import type { Message } from '../../types';
import { detectExpenseFromMessage, recordAIExpense } from '../../utils/aiExpenseDetector';
import { detectIncomeFromMessage, recordAIIncome } from '../../utils/aiIncomeDetector';

type FinanceSignalLoggers = {
  info?: (line: string) => void;
  error?: (line: string, error?: unknown) => void;
};

export function recordAssistantFinanceSignals(
  messages: Message[],
  conversationId: string,
  loggers?: FinanceSignalLoggers
): void {
  if (messages.length === 0) return;
  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role !== 'assistant') return;

  const content = lastMessage.content || '';
  const expense = detectExpenseFromMessage(content);
  if (expense.hasExpense) {
    loggers?.info?.(`💰 检测到AI消费行为: ${expense.description}`);
    recordAIExpense(conversationId, expense, content).catch((error) => {
      loggers?.error?.('❌ 记录AI消费失败:', error);
    });
  }

  const income = detectIncomeFromMessage(content);
  if (income.hasIncome) {
    loggers?.info?.(`💰 检测到AI收入行为: ${income.description}`);
    recordAIIncome(conversationId, income, content).catch((error) => {
      loggers?.error?.('❌ 记录AI收入失败:', error);
    });
  }
}
