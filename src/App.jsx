import { useState } from 'react';
import { FinanceProvider } from './context/FinanceContext.jsx';
import { Sidebar } from './components/Layout/Sidebar.jsx';
import { Dashboard } from './components/Dashboard/Dashboard.jsx';
import { TransactionsView } from './components/Transactions/TransactionsView.jsx';
import { BudgetView } from './components/Budget/BudgetView.jsx';
import { SavingsView } from './components/Savings/SavingsView.jsx';
import { SubscriptionsView } from './components/Subscriptions/SubscriptionsView.jsx';
import { CalendarView } from './components/Calendar/CalendarView.jsx';
import { DebtView } from './components/Debt/DebtView.jsx';

function AppShell() {
  const [page, setPage] = useState('dashboard');

  const views = {
    dashboard:     <Dashboard onNavigate={setPage} />,
    transactions:  <TransactionsView />,
    budget:        <BudgetView />,
    savings:       <SavingsView />,
    subscriptions: <SubscriptionsView />,
    calendar:      <CalendarView />,
    debt:          <DebtView />,
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar current={page} onChange={setPage} />
      <main className="flex-1 min-w-0 pb-20 lg:pb-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
          {views[page] ?? views.dashboard}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <FinanceProvider>
      <AppShell />
    </FinanceProvider>
  );
}
