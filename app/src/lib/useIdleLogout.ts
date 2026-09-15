import { useEffect, useRef } from 'react';

/**
 * Loggar brukaren ut automatisk etter ei viss tid utan aktivitet.
 * Aktivitet = mus, tastatur, scroll eller berøring. Timeren startar på nytt
 * ved kvar handling; når `minutes` går utan noko, blir `onIdle` kalla.
 */
export function useIdleLogout(active: boolean, onIdle: () => void, minutes = 5) {
  const onIdleRef = useRef(onIdle);
  useEffect(() => { onIdleRef.current = onIdle; }, [onIdle]);

  useEffect(() => {
    if (!active) return;
    const ms = minutes * 60 * 1000;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => onIdleRef.current(), ms);
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [active, minutes]);
}
