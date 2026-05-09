import { useState, useEffect } from 'react';
import Toast, { ToastProps } from './Toast';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastProps['type'];
  duration?: number;
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleShowToast = (event: CustomEvent) => {
      const { message, type, duration } = event.detail;
      const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      setToasts(prev => [...prev, { id, message, type, duration }]);
    };

    window.addEventListener('show-toast', handleShowToast as EventListener);

    return () => {
      window.removeEventListener('show-toast', handleShowToast as EventListener);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <>
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{ top: `${16 + index * 72}px` }}
          className="fixed left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300"
        >
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </>
  );
}
