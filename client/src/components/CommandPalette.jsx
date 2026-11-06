import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, FileUp, LogOut, Moon, Plus, Search, Sparkles, TrendingUp } from 'lucide-react';
import { NAV_ITEMS } from './Sidebar';
import QuickAdd from './QuickAdd';
import Modal from './Modal';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useActions } from '../context/ActionsContext';

/** Ctrl/Cmd+K: jump to any page or run an action from the keyboard. */
export default function CommandPalette() {
  const { paletteOpen, setPaletteOpen, quickOpen, setQuickOpen, toggleTheme } = useApp();
  const { logout } = useAuth();
  const { addExpense, addIncome } = useActions();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);

  const commands = useMemo(
    () => [
      { id: 'add-expense', label: 'Add expense', hint: 'Action', icon: Plus, run: () => addExpense() },
      { id: 'add-income', label: 'Add income', hint: 'Action', icon: TrendingUp, run: () => addIncome() },
      { id: 'quick', label: 'Quick add (type a sentence)', hint: 'Action', icon: Sparkles, run: () => setQuickOpen(true) },
      { id: 'import', label: 'Import bank statement (CSV)', hint: 'Action', icon: FileUp, run: () => navigate('/expenses?import=1') },
      ...NAV_ITEMS.map((n) => ({ id: n.to, label: `Go to ${n.label}`, hint: 'Page', icon: n.icon, run: () => navigate(n.to) })),
      { id: 'theme', label: 'Switch light / dark theme', hint: 'Action', icon: Moon, run: toggleTheme },
      { id: 'logout', label: 'Log out', hint: 'Action', icon: LogOut, run: logout },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, toggleTheme, logout, addExpense, addIncome]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? commands.filter((c) => c.label.toLowerCase().includes(q)) : commands;
  }, [commands, query]);

  useEffect(() => setIndex(0), [query, paletteOpen]);
  useEffect(() => { if (!paletteOpen) setQuery(''); }, [paletteOpen]);

  // Global shortcuts. Ignored while typing in a field (except Ctrl/Cmd+K itself).
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      const tag = (e.target.tagName || '').toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag) || e.target.isContentEditable || e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.querySelector('[role="dialog"]')) return;
      if (e.key === 'n') { e.preventDefault(); addExpense(); }
      else if (e.key === 'i') { e.preventDefault(); addIncome(); }
      else if (e.key === 'q') { e.preventDefault(); setQuickOpen(true); }
      else if (e.key === '/') { e.preventDefault(); document.getElementById('global-search')?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [setPaletteOpen, setQuickOpen, addExpense, addIncome]);

  const run = (cmd) => {
    setPaletteOpen(false);
    // Let the palette close (and give focus back) before opening another dialog.
    setTimeout(() => cmd.run(), 0);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && results[index]) { e.preventDefault(); run(results[index]); }
  };

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  return (
    <>
      <Modal open={paletteOpen} title="Command palette" onClose={() => setPaletteOpen(false)} size="sm">
        <div className="palette">
          <div className="palette__input">
            <Search size={16} aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type a command or page..."
              role="combobox"
              aria-expanded="true"
              aria-controls="palette-list"
              aria-activedescendant={results[index] ? `cmd-${results[index].id}` : undefined}
              aria-label="Search commands"
            />
          </div>
          <ul id="palette-list" role="listbox" className="palette__list" ref={listRef}>
            {results.length === 0 && <li className="palette__empty">No matching command</li>}
            {results.map((c, i) => (
              <li
                key={c.id}
                id={`cmd-${c.id}`}
                role="option"
                aria-selected={i === index}
                className={i === index ? 'is-active' : ''}
                onMouseEnter={() => setIndex(i)}
                onClick={() => run(c)}
              >
                <c.icon size={16} aria-hidden="true" />
                <span>{c.label}</span>
                <small>{c.hint}</small>
                {i === index && <CornerDownLeft size={13} aria-hidden="true" />}
              </li>
            ))}
          </ul>
          <p className="palette__foot">
            <kbd>↑</kbd> <kbd>↓</kbd> to move · <kbd>Enter</kbd> to run · shortcuts: <kbd>N</kbd> expense <kbd>I</kbd> income <kbd>Q</kbd> quick add <kbd>/</kbd> search
          </p>
        </div>
      </Modal>

      <Modal open={quickOpen} title="Quick add" onClose={() => setQuickOpen(false)} size="sm">
        <p className="muted">Describe it in plain words. You will confirm the details before anything is saved.</p>
        <QuickAdd autoFocus onDone={() => setQuickOpen(false)} className="quickadd--modal" />
      </Modal>
    </>
  );
}
