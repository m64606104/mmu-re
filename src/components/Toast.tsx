import { useEffect } from 'react';
import { CheckCircle, XCircle, Info, AlertCircle } from 'lucide-react';

export interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onClose: () => void;
}

export default function Toast({ message, type, duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] animate-fade-in-down">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${getColors()} min-w-[280px] max-w-[90vw]`}
        onClick={onClose}
      >
        {getIcon()}
        <p className="text-sm font-medium flex-1">{message}</p>
      </div>
    </div>
  );
}

// Toast管理器 Hook
export function useToast() {
  const showToast = (message: string, type: ToastProps['type'] = 'info', duration?: number) => {
    // 触发自定义事件
    const event = new CustomEvent('show-toast', {
      detail: { message, type, duration }
    });
    window.dispatchEvent(event);
  };

  return { showToast };
}
