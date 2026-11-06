import { AlertCircle } from 'lucide-react';
import { SkeletonRows } from './Skeleton';

export default function LoadingState({ label = 'Loading...', error, onRetry, compact }) {
  if (error) {
    return (
      <div className={`loading-state loading-state--error ${compact ? 'loading-state--compact' : ''}`}>
        <AlertCircle size={22} />
        <p>{error}</p>
        {onRetry && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    );
  }
  if (compact) return <SkeletonRows n={3} />;
  return (
    <div className={`loading-state ${compact ? 'loading-state--compact' : ''}`} role="status">
      <span className="spinner" />
      <p>{label}</p>
    </div>
  );
}
