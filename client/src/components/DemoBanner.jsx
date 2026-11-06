import { Link } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/** Always visible in a demo account so nobody mistakes the sample data for real records. */
export default function DemoBanner() {
  const { isDemo, user } = useAuth();
  if (!isDemo) return null;
  const hours = user?.demoExpiresAt ? Math.max(1, Math.round((new Date(user.demoExpiresAt) - Date.now()) / 3600000)) : null;
  return (
    <div className="demo-banner" role="note">
      <FlaskConical size={16} aria-hidden="true" />
      <span><strong>Demo mode.</strong> You are exploring sample data{hours ? `; it is deleted in about ${hours} hour${hours === 1 ? '' : 's'}` : ''}.</span>
      <Link to="/register" className="btn btn--primary btn--sm">Create your own account</Link>
    </div>
  );
}
