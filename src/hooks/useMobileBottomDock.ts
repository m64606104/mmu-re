import { useEffect, useState } from 'react';

/**
 * Returns the bottom area (px) that is obscured by mobile browser UI
 * (e.g. iOS Safari/Chrome bottom address bar). Use it to lift fixed
 * bottom UI (nav bars, input toolbars) above the browser bar.
 */
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
      // Use layout viewport height instead of innerHeight (more stable on iOS).
      const layoutHeight = document.documentElement.clientHeight || window.innerHeight;
      const obscured = Math.max(0, layoutHeight - vv.height - vv.offsetTop);

      // Keep browser behavior unchanged when there is a real obstruction.
      // If there is little/no obstruction (standalone or tall unobscured viewport),
      // synthesize a larger dock so layout matches the browser-with-toolbar proportion.
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));

      // "p4-like" target visible height. Larger viewports get lifted more.
      const TARGET_VISIBLE_HEIGHT = 720;
      const syntheticDock = Math.max(52, Math.round(vv.height - TARGET_VISIBLE_HEIGHT - 4));
      const shouldUseSyntheticDock = isStandalone || vv.height >= 760;

      if (obscured > 1) {
        setDock(obscured);
      } else if (shouldUseSyntheticDock) {
        setDock(syntheticDock);
      } else {
        setDock(0);
      }
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

