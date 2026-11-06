import { getIcon } from '../utils/icons';

export default function CategoryIcon({ name, color = '#94A3B8', size = 18 }) {
  const Icon = getIcon(name);
  return (
    <span className="cat-icon" style={{ background: `${color}22`, color }}>
      <Icon size={size} />
    </span>
  );
}
