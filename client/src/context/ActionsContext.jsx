import { createContext, useContext } from 'react';
import useExpenseActions from '../hooks/useExpenseActions';

const ActionsContext = createContext(null);

/**
 * App-wide "add something" actions, so the top bar, command palette, quick-add bar and keyboard
 * shortcuts all open the same forms. Mounted once inside the app layout.
 */
export function ActionsProvider({ children }) {
  const expense = useExpenseActions(undefined, 'expense');
  const income = useExpenseActions(undefined, 'income');

  const latest = { editExpense: expense.openEdit, deleteExpense: expense.askDelete, viewExpense: expense.openView, addExpense: (d) => expense.openAdd(d), addIncome: (d) => income.openAdd(d), addDraft: (d) => (d.kind === 'income' ? income.openAdd(d) : expense.openAdd(d)) };

  return (
    <ActionsContext.Provider value={latest}>
      {children}
      {expense.modals}
      {income.modals}
    </ActionsContext.Provider>
  );
}

export const useActions = () => useContext(ActionsContext);
