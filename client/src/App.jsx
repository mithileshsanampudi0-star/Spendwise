import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import { ProtectedRoute, PublicOnlyRoute } from './components/RouteGuards';
import { NotFound } from './components/PageHeader';
import { SkeletonPage } from './components/Skeleton';
import LoadingState from './components/LoadingState';

// Each page is its own chunk, so the landing page and login do not download the charts and PDF code.
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Income = lazy(() => import('./pages/Income'));
const Recurring = lazy(() => import('./pages/Recurring'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Budgets = lazy(() => import('./pages/Budgets'));
const Categories = lazy(() => import('./pages/Categories'));
const Savings = lazy(() => import('./pages/Savings'));
const Debts = lazy(() => import('./pages/Debts'));
const Insights = lazy(() => import('./pages/Insights'));
const Reports = lazy(() => import('./pages/Reports'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Suspense fallback={<div className="fullscreen-center"><LoadingState /></div>}><Landing /></Suspense>} />

      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<Suspense fallback={<div className="fullscreen-center"><LoadingState /></div>}><Login /></Suspense>} />
        <Route path="/register" element={<Suspense fallback={<div className="fullscreen-center"><LoadingState /></div>}><Register /></Suspense>} />
        <Route path="/forgot-password" element={<Suspense fallback={<div className="fullscreen-center"><LoadingState /></div>}><ForgotPassword /></Suspense>} />
        <Route path="/reset-password" element={<Suspense fallback={<div className="fullscreen-center"><LoadingState /></div>}><ResetPassword /></Suspense>} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {[
            ['/dashboard', Dashboard], ['/expenses', Expenses], ['/income', Income], ['/recurring', Recurring],
            ['/analytics', Analytics], ['/budgets', Budgets], ['/categories', Categories], ['/savings', Savings],
            ['/debts', Debts], ['/insights', Insights], ['/reports', Reports], ['/profile', Profile], ['/settings', Settings],
          ].map(([path, Page]) => (
            <Route key={path} path={path} element={<Suspense fallback={<SkeletonPage />}><Page /></Suspense>} />
          ))}
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
