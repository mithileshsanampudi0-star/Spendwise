import { useEffect, useRef, useState } from 'react';
import useCountUp from '../hooks/useCountUp';

/** Counts up to `to` the first time it becomes visible. */
export default function CountUp({ to, suffix = '', prefix = '' }) {
  const ref = useRef(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) {
      setStarted(true);
      return undefined;
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setStarted(true);
        io.disconnect();
      }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const value = useCountUp(started ? to : 0, 1100);
  return <span ref={ref}>{prefix}{Math.round(value)}{suffix}</span>;
}
