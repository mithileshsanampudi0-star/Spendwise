/** Shimmering placeholders that match the layout, so pages do not jump when data arrives. */
export const Skeleton = ({ h = 16, w = '100%', r = 8, style }) => (
  <span className="skeleton" style={{ height: h, width: w, borderRadius: r, ...style }} aria-hidden="true" />
);

export const SkeletonCards = ({ n = 4 }) => (
  <div className="grid grid--4" aria-busy="true">
    {Array.from({ length: n }, (_, i) => (
      <div key={i} className="card skeleton-card"><Skeleton w="40%" h={12} /><Skeleton w="70%" h={28} /><Skeleton w="55%" h={12} /></div>
    ))}
  </div>
);

export const SkeletonRows = ({ n = 6 }) => (
  <div className="stack" aria-busy="true"><span className="sr-only" role="status">Loading</span>
    {Array.from({ length: n }, (_, i) => <Skeleton key={i} h={44} r={10} />)}
  </div>
);

export const SkeletonPage = () => (
  <div className="stack" aria-busy="true"><span className="sr-only" role="status">Loading page</span>
    <Skeleton w="30%" h={30} />
    <SkeletonCards />
    <div className="grid grid--2-1">
      <div className="card"><Skeleton h={260} r={12} /></div>
      <div className="card"><Skeleton h={260} r={12} /></div>
    </div>
  </div>
);
