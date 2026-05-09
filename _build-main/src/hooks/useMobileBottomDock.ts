import { useEffect, useState } from 'react';

/**
 * Returns extra bottom offset (px) for fixed bottom UI, beyond `env(safe-area-inset-bottom)`.
 * Uses VisualViewport when the browser chrome actually obscures content.
 *
 * Note: Do NOT derive this from `visualViewport.height - constant` on tall viewports — that
 * produced huge values in Edge/mobile and pushed `position:fixed; bottom:…` bars to mid-screen.
 */
const MAX_DOCK = 120;

export function useMobileBottomDock(): number {
  const [dock, setDock] = useState(0);

  useEffect(() => {
    const updateDock = () => {
      const isMobileViewport = window.innerWidth < 768;
      if (!isMobileViewport) {
        setDock(0);
        return;
      }

      const vv = window.visualViewport;
      if (!vv) {
        setDock(0);
        return;
      }

      const layoutHeight = document.documentElement.clientHeight || window.innerHeight;
      const obscured = Math.max(0, layoutHeight - vv.height - vv.offsetTop);

      if (obscured > 1) {
        setDock(Math.min(obscured, MAX_DOCK));
        return;
      }

      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));

      // PWA：没有可测量的浏览器底栏时，给一点与刘海 home 条无关的留白（safe-area 仍由 CSS 处理）
      if (isStandalone) {
        setDock(12);
        return;
      }

      setDock(0);
    };

    updateDock();
    window.visualViewport?.addEventListener('resize', updateDock);
    window.visualViewport?.addEventListener('scroll', updateDock);
    window.addEventListener('orientationchange', updateDock);
    return () => {
      window.visualViewport?.removeEventListener('resize', updateDock);
      window.visualViewport?.removeEventListener('scroll', updateDock);
      window.removeEventListener('orientationchange', updateDock);
    };
  }, []);

  return dock;
}
