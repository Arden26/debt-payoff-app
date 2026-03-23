import { formatCurrency, DEBT_COLORS } from '../utils/debtCalc.js';

export function DebtList({ debts, onEdit, onDelete, onPay }) {
  if (debts.length === 0) return null;

  const totalBalance = debts.reduce((s, d) => s + parseFloat(d.balance || 0), 0);

  return (
    <div className="space-y-2">
      {debts.map((debt, i) => {
        const balance = parseFloat(debt.balance || 0);
        const original = parseFloat(debt.originalBalance || debt.balance || balance);
        const paid = Math.max(0, original - balance);
        const paidPct = original > 0 ? Math.min(100, (paid / original) * 100) : 0;
        const color = DEBT_COLORS[i % DEBT_COLORS.length];
        const isFullyPaid = balance === 0;

        return (
          <div key={debt.id} className="debt-item group">
            {/* Color dot */}
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-800 truncate">{debt.name}</span>
                {isFullyPaid
                  ? <span className="text-xs text-emerald-600 font-semibold flex-shrink-0">Paid off!</span>
                  : <span className="text-xs text-red-500 font-medium flex-shrink-0">{debt.apr}%</span>
                }
              </div>

              {/* Progress bar — paid vs original */}
              <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${paidPct}%`,
                    backgroundColor: isFullyPaid ? '#10b981' : color,
                  }}
                />
              </div>

              <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                <span>
                  {isFullyPaid
                    ? <span className="text-emerald-600 font-medium">Fully paid!</span>
                    : <>{formatCurrency(balance)} remaining</>
                  }
                </span>
                <span>
                  {paidPct > 0 && !isFullyPaid && `${paidPct.toFixed(0)}% paid · `}
                  {!isFullyPaid && `min ${formatCurrency(debt.minPayment)}/mo`}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              {!isFullyPaid && (
                <button
                  onClick={() => onPay(debt)}
                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  title="Make a payment"
                >
                  <PayIcon />
                </button>
              )}
              <button
                onClick={() => onEdit(debt)}
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Edit"
              >
                <PencilIcon />
              </button>
              <button
                onClick={() => onDelete(debt.id)}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete"
              >
                <TrashIcon />
              </button>
            </div>
          </div>
        );
      })}

      {/* Total */}
      <div className="flex justify-between text-xs font-medium text-slate-500 px-1 pt-1 border-t border-slate-100">
        <span>{debts.length} debt{debts.length !== 1 ? 's' : ''}</span>
        <span>Remaining: {formatCurrency(totalBalance)}</span>
      </div>
    </div>
  );
}

function PayIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
