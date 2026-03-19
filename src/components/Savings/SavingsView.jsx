import { useState } from 'react';
import { useFinance } from '../../context/FinanceContext.jsx';
import { Modal } from '../Shared/Modal.jsx';
import { SavingsGoalForm } from '../Shared/SavingsGoalForm.jsx';
import { EmptyState } from '../Shared/EmptyState.jsx';
import { fmt, daysUntil } from '../../utils/formatters.js';

export function SavingsView() {
  const { state, dispatch } = useFinance();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [contributing, setContributing] = useState(null); // goal id
  const [contribution, setContribution] = useState('');

  const handleSave = (data) => {
    if (data.id) {
      dispatch({ type: 'UPDATE_SAVINGS_GOAL', payload: data });
    } else {
      dispatch({ type: 'ADD_SAVINGS_GOAL', payload: data });
    }
    setShowForm(false);
    setEditing(null);
  };

  const handleContribute = (goal) => {
    const amount = parseFloat(contribution);
    if (!amount || amount <= 0) return;
    dispatch({ type: 'CONTRIBUTE_SAVINGS', goalId: goal.id, goalName: goal.name, amount });
    setContributing(null);
    setContribution('');
  };

  const totalSaved = state.savingsGoals.reduce((s, g) => s + (g.currentAmount || 0), 0);
  const totalTarget = state.savingsGoals.reduce((s, g) => s + g.targetAmount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Savings Goals</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary text-xs">+ Add Goal</button>
      </div>

      {/* Summary */}
      {state.savingsGoals.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-3 text-center">
            <div className="text-xs text-slate-400 mb-1">Total Saved</div>
            <div className="font-bold text-emerald-600">{fmt.currency(totalSaved)}</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-xs text-slate-400 mb-1">Total Target</div>
            <div className="font-bold text-slate-800">{fmt.currency(totalTarget)}</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-xs text-slate-400 mb-1">Overall</div>
            <div className="font-bold text-blue-600">
              {totalTarget > 0 ? fmt.percent((totalSaved / totalTarget) * 100) : '—'}
            </div>
          </div>
        </div>
      )}

      {/* Goals grid */}
      {state.savingsGoals.length === 0 ? (
        <EmptyState
          icon="🏦"
          title="No savings goals yet"
          description="Set a goal for an emergency fund, vacation, car, or anything you're saving toward."
          action={<button onClick={() => setShowForm(true)} className="btn-primary">+ Add Goal</button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {state.savingsGoals.map((goal) => {
            const current = goal.currentAmount || 0;
            const pct = Math.min(100, (current / goal.targetAmount) * 100);
            const remaining = goal.targetAmount - current;
            const days = daysUntil(goal.deadline);
            const isComplete = current >= goal.targetAmount;

            return (
              <div key={goal.id} className="card p-5 group">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl" style={{ backgroundColor: goal.color + '20' }}>
                      {goal.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">{goal.name}</div>
                      <div className="text-xs text-slate-400">
                        {isComplete ? '🎉 Goal reached!' : days < 0 ? 'Overdue' : `${days} days left`}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditing(goal)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">✏️</button>
                    <button onClick={() => { if (window.confirm('Delete this goal?')) dispatch({ type: 'DELETE_SAVINGS_GOAL', id: goal.id }); }} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">🗑️</button>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-bold text-slate-800">{fmt.currency(current)}</span>
                    <span className="text-slate-400">of {fmt.currency(goal.targetAmount)}</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: isComplete ? '#10b981' : goal.color }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span style={{ color: isComplete ? '#10b981' : goal.color }} className="font-semibold">{fmt.percent(pct)}</span>
                    <span>{isComplete ? 'Complete!' : `${fmt.currency(remaining)} to go`}</span>
                  </div>
                </div>

                {/* Deadline */}
                <div className="text-xs text-slate-400 mb-3">
                  Target: {fmt.date(goal.deadline)}
                  {!isComplete && remaining > 0 && days > 0 && (
                    <span className="ml-1 text-slate-500">
                      · {fmt.currency(remaining / (days / 30))}/mo needed
                    </span>
                  )}
                </div>

                {/* Contribute */}
                {!isComplete && (
                  contributing === goal.id ? (
                    <div className="flex gap-2">
                      <input
                        className="input flex-1 py-1.5 text-sm"
                        type="number"
                        min="0"
                        step="10"
                        placeholder="Amount"
                        value={contribution}
                        onChange={(e) => setContribution(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') handleContribute(goal); if (e.key === 'Escape') { setContributing(null); setContribution(''); } }}
                      />
                      <button onClick={() => handleContribute(goal)} className="btn-primary text-xs px-3">Add</button>
                      <button onClick={() => { setContributing(null); setContribution(''); }} className="btn-secondary text-xs px-2">✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setContributing(goal.id)}
                      className="w-full py-2 text-xs font-medium rounded-xl border-2 border-dashed transition-all hover:border-solid"
                      style={{ borderColor: goal.color, color: goal.color }}
                    >
                      + Add Funds
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {(showForm || editing) && (
        <Modal title={editing ? 'Edit Goal' : 'New Savings Goal'} onClose={() => { setShowForm(false); setEditing(null); }}>
          <SavingsGoalForm initialValues={editing} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} />
        </Modal>
      )}
    </div>
  );
}
