import { useState, useCallback } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

interface ConfirmOptions {
  title: string;
  message: string;
  type?: 'warning' | 'info' | 'success';
  confirmText?: string;
  cancelText?: string;
}

export const useConfirm = () => {
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    onConfirm: () => void;
  } | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        options,
        onConfirm: () => {
          resolve(true);
          setConfirmState(null);
        }
      });

      // 如果用户点击取消或关闭，resolve false
      setTimeout(() => {
        if (confirmState?.isOpen) {
          resolve(false);
        }
      }, 0);
    });
  }, [confirmState]);

  const ConfirmComponent = confirmState?.isOpen ? (
    <ConfirmDialog
      title={confirmState.options.title}
      message={confirmState.options.message}
      type={confirmState.options.type}
      confirmText={confirmState.options.confirmText}
      cancelText={confirmState.options.cancelText}
      onConfirm={confirmState.onConfirm}
      onCancel={() => setConfirmState(null)}
    />
  ) : null;

  return { confirm, ConfirmComponent };
};
