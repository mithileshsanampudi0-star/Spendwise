import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, BarChart3, Check, ChevronDown, FileText, Fingerprint, Lightbulb, LockKeyhole, Menu, Moon, PiggyBank,
  ShieldCheck, Sparkles, Sun, Tags, Target, X,
} from 'lucide-react';
import Logo from '../components/Logo';
import Reveal from '../components/Reveal';
import CountUp from '../components/CountUp';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

const NAV = [
  ['Features', '#features'],
  ['How it works', '#how'],
  ['Preview', '#preview'],
  ['Security', '#security'],
  ['FAQ', '#faq'],
];

const FEATURES = [
  { icon: BarChart3, title: 'Interactive analytics', text: 'Daily, weekly and monthly trends, category comparisons and period-over-period changes, all computed from your own records.' },
  { icon: Target, title: 'Smart budgets', text: 'Set a limit per category. Get a warning at 80% and a critical alert at 100%, updated the moment you add an expense.' },
  { icon: Tags, title: 'Category control', text: 'Eight protected defaults plus your own categories with custom colours and icons. Totals follow every change.' },
  { icon: PiggyBank, title: 'Savings goals', text: 'Track progress toward what matters. Saved amounts change only when you say so, never by guesswork.' },
  { icon: Lightbulb, title: 'Rule-based insights', text: 'Plain observations such as your biggest category or a spending spike, shown only when there is enough real data.' },
  { icon: FileText, title: 'PDF and CSV reports', text: 'Export a clean report for any month or custom date range, with the reporting period printed on it.' },
];

const STEPS = [
  { n: '01', title: 'Create your account', text: 'Sign up in seconds. Eight default categories are ready and your currency is one dropdown away.' },
  { n: '02', title: 'Log your expenses', text: 'Add a title, amount, category, date and payment method. Search, filter and sort them whenever you need.' },
  { n: '03', title: 'Understand and act', text: 'Dashboards, budgets and insights refresh instantly so you can adjust before the month gets away.' },
];

const SECURITY = [
  { icon: LockKeyhole, title: 'Hashed passwords', text: 'Passwords are hashed with bcrypt. Plain text is never stored.' },
  { icon: Fingerprint, title: 'Token sessions', text: 'JWT authentication protects every API route and every page behind login.' },
  { icon: ShieldCheck, title: 'Per-user isolation', text: 'Every record belongs to you. Ownership is checked on each read, update and delete.' },
  { icon: Check, title: 'Validated input', text: 'Server-side validation and consistent error handling on every request.' },
];

const FAQ = [
  ['Is my financial data private?', 'Yes. Your records are tied to your account and every request is checked for ownership, so no other user can read or change them. Passwords are hashed and sessions use signed tokens.'],
  ['Can I use my own currency?', 'Yes. Pick from INR, USD, EUR, GBP and more in Settings. Amounts are displayed in that currency; existing records are not converted.'],
  ['How are insights generated?', 'By fixed rules written in JavaScript, applied to your own expenses: highest category, month comparison, category increases, budget use and unusual days. Nothing is invented, and nothing shows until there is enough data.'],
  ['Do savings goals update by themselves?', 'No. Spending less is not treated as saving. You update the saved amount yourself, so the number always reflects reality.'],
  ['Can I export my data?', 'Yes. The Reports page produces a PDF or a CSV for a month or any custom date range.'],
];

const FACTS = [
  { to: 8, suffix: '', label: 'Default categories' },
  { to: 5, suffix: '', label: 'Analytics charts' },
  { to: 2, suffix: '', label: 'Export formats' },
  { to: 80, suffix: '%', label: 'Budget warning level' },
];

function HeroPreview() {
  return (
    <div className="mock" aria-hidden="true">
      <div className="mock__bar">
        <i /><i /><i />
        <span>spendwise.app / dashboard</span>
      </div>
      <div className="mock__body">
        <div className="mock__side">
          {[0, 1, 2, 3, 4].map((i) => <span key={i} className={i === 0 ? 'on' : ''} />)}
        </div>
        <div className="mock__main">
          <div className="mock__stats">
            <div><small>Total expenses</small><strong>48,250</strong></div>
            <div><small>Daily average</small><strong>1,608</strong></div>
            <div><small>Top category</small><strong>Food</strong></div>
          </div>
          <div className="mock__panels">
            <div className="mock__chart">
              <small>Spending trend</small>
              <svg viewBox="0 0 400 150" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="var(--chart-a)" stopOpacity="0.55" />
                    <stop offset="1" stopColor="var(--chart-a)" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="hl" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="var(--chart-a)" />
                    <stop offset="1" stopColor="var(--chart-c)" />
                  </linearGradient>
                </defs>
                <path className="mock__area" d="M0 110 C40 90 60 120 100 96 S170 60 210 78 S280 40 320 56 S375 20 400 30 L400 150 L0 150 Z" fill="url(#hg)" />
                <path className="mock__line" pathLength="1" d="M0 110 C40 90 60 120 100 96 S170 60 210 78 S280 40 320 56 S375 20 400 30" fill="none" stroke="url(#hl)" strokeWidth="3" strokeLinecap="round" />
                <circle className="mock__dot" cx="400" cy="30" r="5" fill="var(--chart-c)" />
              </svg>
            </div>
            <div className="mock__donut">
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="34" fill="none" strokeWidth="13" className="d0" />
                <circle cx="50" cy="50" r="34" fill="none" strokeWidth="13" pathLength="100" strokeDasharray="38 62" className="d1" />
                <circle cx="50" cy="50" r="34" fill="none" strokeWidth="13" pathLength="100" strokeDasharray="24 76" strokeDashoffset="-40" className="d2" />
                <circle cx="50" cy="50" r="34" fill="none" strokeWidth="13" pathLength="100" strokeDasharray="16 84" strokeDashoffset="-66" className="d3" />
              </svg>
              <small>Categories</small>
            </div>
          </div>
          <div className="mock__bars">
            {[44, 70, 38, 82, 58, 92, 64].map((h, i) => <span key={i} style={{ '--h': `${h}%`, '--i': i }} />)}
          </div>
        </div>
      </div>
      <div className="float-chip float-chip--a"><Target size={14} /> Food budget 82%</div>
      <div className="float-chip float-chip--b"><Sparkles size={14} /> Travel up 18%</div>
    </div>
  );
}

export default function Landing() {
  const { user, startDemo } = useAuth();
  const navigate = useNavigate();
  const [demoBusy, setDemoBusy] = useState(false);
  const { theme, toggleTheme } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [faq, setFaq] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const tryDemo = async () => {
    setDemoBusy(true);
    try {
      await startDemo();
      navigate('/dashboard');
    } catch {
      setDemoBusy(false);
      navigate('/login');
    }
  };

  const cta = user ? { to: '/dashboard', label: 'Open dashboard' } : { to: '/register', label: 'Get started free' };
  const year = new Date().getFullYear();

  return (
    <div className="landing" id="top">
      <header className={`lnav ${scrolled ? 'is-scrolled' : ''} ${menu ? 'is-open' : ''}`}>
        <div className="lnav__inner">
          <a href="#top" className="lnav__logo" onClick={() => setMenu(false)}><Logo /></a>
          <nav className="lnav__links" aria-label="Sections">
            {NAV.map(([label, href]) => <a key={href} href={href} onClick={() => setMenu(false)}>{label}</a>)}
          </nav>
          <div className="lnav__actions">
            <button type="button" className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {!user && <Link to="/login" className="btn btn--ghost lnav__login">Log in</Link>}
            <Link to={cta.to} className="btn btn--primary lnav__cta">{cta.label}</Link>
            <button type="button" className="icon-btn lnav__burger" onClick={() => setMenu((m) => !m)} aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu}>
              {menu ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        <div className="lnav__drawer">
          {NAV.map(([label, href]) => <a key={href} href={href} onClick={() => setMenu(false)}>{label}</a>)}
          {!user && <Link to="/login" onClick={() => setMenu(false)}>Log in</Link>}
        </div>
      </header>

      <section className="hero">
        <div className="blob blob--1" aria-hidden="true" />
        <div className="blob blob--2" aria-hidden="true" />
        <div className="hero__copy">
          <span className="hero__badge anim-rise" style={{ '--d': '0ms' }}><Sparkles size={14} /> Personal finance analytics</span>
          <h1 className="anim-rise" style={{ '--d': '90ms' }}>
            Understand Your Spending.
            <span className="gradient-text"> Take Control of Your Money.</span>
          </h1>
          <p className="anim-rise" style={{ '--d': '180ms' }}>
            SpendWise turns everyday expenses into clear dashboards, budgets and honest insights, so you always know where your money goes and where it should go next.
          </p>
          <div className="hero__cta anim-rise" style={{ '--d': '270ms' }}>
            <Link to={cta.to} className="btn btn--primary btn--lg">{cta.label} <ArrowRight size={18} /></Link>
            {user ? (
              <a href="#features" className="btn btn--ghost btn--lg">Explore features</a>
            ) : (
              <button type="button" className="btn btn--ghost btn--lg" onClick={tryDemo} disabled={demoBusy}>{demoBusy ? 'Preparing demo...' : 'Try the live demo'}</button>
            )}
          </div>
          <ul className="hero__points anim-rise" style={{ '--d': '360ms' }}>
            <li><Check size={15} /> Real-time budgets</li>
            <li><Check size={15} /> PDF and CSV reports</li>
            <li><Check size={15} /> Dark and light themes</li>
          </ul>
        </div>
        <div className="hero__visual anim-rise" style={{ '--d': '300ms' }}>
          <HeroPreview />
          <p className="caption">Illustration with sample numbers. Your dashboard shows only your own data.</p>
        </div>
      </section>

      <section className="facts">
        {FACTS.map((f, i) => (
          <Reveal key={f.label} delay={i * 80} className="fact">
            <strong className="gradient-text"><CountUp to={f.to} suffix={f.suffix} /></strong>
            <span>{f.label}</span>
          </Reveal>
        ))}
      </section>

      <section className="lsection" id="features">
        <Reveal className="lsection__head">
          <span className="eyebrow">Features</span>
          <h2>Everything you need to manage money with clarity</h2>
          <p>Built around the questions people actually ask: where did it go, am I on budget, and what should I change?</p>
        </Reveal>
        <div className="features">
          {FEATURES.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={(i % 3) * 90} className="card feature">
              <span className="feature__icon"><Icon size={22} /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="lsection" id="how">
        <Reveal className="lsection__head">
          <span className="eyebrow">How it works</span>
          <h2>From first expense to full picture in three steps</h2>
        </Reveal>
        <div className="steps">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 120} className="card step">
              <span className="step__n">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="lsection split" id="preview">
        <Reveal className="split__copy">
          <span className="eyebrow">Budgets and insights</span>
          <h2>Know where you stand before the month ends</h2>
          <ul className="checks">
            <li><Check size={16} /> Budget versus actual per category, live</li>
            <li><Check size={16} /> Warning at 80% and critical alert at 100%</li>
            <li><Check size={16} /> Month-over-month and category comparisons</li>
            <li><Check size={16} /> Insights that appear only when the data supports them</li>
          </ul>
          <Link to={cta.to} className="btn btn--primary">{cta.label} <ArrowRight size={16} /></Link>
        </Reveal>
        <Reveal delay={120} className="split__visual">
          <div className="card showcase" aria-hidden="true">
            <p className="showcase__title">Budget overview <small>sample</small></p>
            {[['Food', 82, 'warning'], ['Travel', 46, 'ok'], ['Shopping', 108, 'critical']].map(([name, pct, status]) => (
              <div key={name} className="showcase__row">
                <div><strong>{name}</strong><span className={`status-pill status-pill--${status}`}>{pct}%</span></div>
                <div className="progress progress--lg"><div className={`progress__bar progress__bar--${status}`} style={{ width: `${Math.min(100, pct)}%` }} /></div>
              </div>
            ))}
            <div className="insight insight--warning">
              <span className="insight__icon"><Lightbulb size={18} /></span>
              <div><h4>Shopping budget exceeded</h4><p>You have used 108% of your Shopping budget this month.</p></div>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="lsection" id="security">
        <Reveal className="lsection__head">
          <span className="eyebrow">Security</span>
          <h2>Your money data stays yours</h2>
          <p>Privacy is part of the architecture, not an add-on.</p>
        </Reveal>
        <div className="sec-grid">
          {SECURITY.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={i * 80} className="card sec">
              <span className="feature__icon"><Icon size={20} /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="lsection lsection--narrow" id="faq">
        <Reveal className="lsection__head">
          <span className="eyebrow">FAQ</span>
          <h2>Questions, answered</h2>
        </Reveal>
        <div className="faq">
          {FAQ.map(([q, a], i) => (
            <Reveal key={q} delay={i * 60} className={`faq__item ${faq === i ? 'is-open' : ''}`}>
              <button type="button" onClick={() => setFaq(faq === i ? -1 : i)} aria-expanded={faq === i}>
                {q}<ChevronDown size={18} />
              </button>
              <div className="faq__body"><p>{a}</p></div>
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal as="section" className="cta-band">
        <div className="cta-band__inner">
          <h2>Ready to take control of your money?</h2>
          <p>Create your account and add your first expense in under a minute.</p>
          <Link to={cta.to} className="btn btn--light btn--lg">{cta.label} <ArrowRight size={18} /></Link>
        </div>
      </Reveal>

      <footer className="lfoot">
        <div className="lfoot__grid">
          <div className="lfoot__brand">
            <Logo />
            <p>Understand Your Spending. Take Control of Your Money.</p>
          </div>
          <div>
            <h4>Product</h4>
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#preview">Preview</a>
          </div>
          <div>
            <h4>Trust</h4>
            <a href="#security">Security</a>
            <a href="#faq">FAQ</a>
          </div>
          <div>
            <h4>Account</h4>
            {user ? <Link to="/dashboard">Dashboard</Link> : (
              <>
                <Link to="/register">Create account</Link>
                <Link to="/login">Log in</Link>
              </>
            )}
          </div>
        </div>
        <div className="lfoot__bar">
          <span>© {year} SpendWise. All rights reserved.</span>
          <a href="#top" className="lfoot__top">Back to top ↑</a>
        </div>
      </footer>
    </div>
  );
}
