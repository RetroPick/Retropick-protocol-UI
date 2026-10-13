import { useEffect, useState, type ImgHTMLAttributes, type ReactNode } from 'react';
import { ipfsGatewayCandidates } from '@/lib/media/resolve';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError' | 'onLoad'> & { src: string | null | undefined; fallback: ReactNode };

/** Reset retries when the URI changes; never leave an unresponsive gateway loading forever. */
export function TokenImage({ src, fallback, ...props }: Props) {
  return src ? <LoadingImage key={src} src={src} fallback={fallback} {...props}/> : <>{fallback}</>;
}

function LoadingImage({ src, fallback, ...props }: Props & { src: string }) {
  const candidates = ipfsGatewayCandidates(src);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<string | null>(null);
  const current = candidates[attempt];
  const retry = () => setAttempt(previous => previous === attempt ? previous + 1 : previous);
  useEffect(() => {
    if (loaded === current || !current || candidates.length < 2) return;
    const timer = window.setTimeout(() => setAttempt(previous => previous === attempt ? previous + 1 : previous), 8000);
    return () => window.clearTimeout(timer);
  }, [attempt, current, loaded, candidates.length]);
  return current ? <img key={current} {...props} src={current} onLoad={() => setLoaded(current)} onError={retry}/> : <>{fallback}</>;
}
