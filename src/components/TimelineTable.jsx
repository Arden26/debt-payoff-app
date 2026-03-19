import { useState } from 'react';
import { formatCurrency } from '../utils/debtCalc.js';

const PAGE_SIZE = 24; // 2 years per page

export function TimelineTable({ results, debts }) {
  const [page, setPage] = useState(0);

  const { months } = results;
  const totalPages = Math.ceil(months.length / PAGE_SIZE);
  const pageData = months.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="animate-fade-in space-y-3">
      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="btn-secondary text-xs disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-slate-500 text-xs">
            Months {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, months.length)} of {months.length}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="btn-secondary text-xs disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wide">
              <th className="text-left px-3 py-2.5 sticky left-0 bg-slate-50">Month</th>
              {debts.map((d) => (
                <th key={d.id} className="text-right px-3 py-2.5 whitespace-nowrap">
                  {d.name}
                </th>
              ))}
              <th className="text-right px-3 py-2.5">Total</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, i) => {
              const isPaidOffMonth = results.debtPayoffOrder.some(
                (d) => d.month === row.month
              );
              return (
                <tr
                  key={row.month}
                  className={`border-t border-slate-50 ${
                    isPaidOffMonth
                      ? 'bg-emerald-50 font-medium'
                      : i % 2 === 0
                      ? 'bg-white'
                      : 'bg-slate-50/50'
                  } hover:bg-blue-50/50 transition-colors`}
                >
                  <td className={`px-3 py-2 sticky left-0 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'} ${isPaidOffMonth ? 'bg-emerald-50' : ''}`}>
                    <span className="text-slate-500">{row.month}.</span>{' '}
                    <span className="text-slate-700">{row.date}</span>
                    {isPaidOffMonth && (
                      <span className="ml-1 text-emerald-600">✓</span>
                    )}
                  </td>
                  {debts.map((d) => {
                    const bal = row.balances[d.id] ?? 0;
                    const isPaidOff = bal === 0;
                    return (
                      <td
                        key={d.id}
                        className={`text-right px-3 py-2 ${
                          isPaidOff ? 'text-emerald-500' : 'text-slate-700'
                        }`}
                      >
                        {isPaidOff ? '—' : formatCurrency(bal)}
                      </td>
                    );
                  })}
                  <td
                    className={`text-right px-3 py-2 font-semibold ${
                      row.totalBalance === 0 ? 'text-emerald-600' : 'text-slate-800'
                    }`}
                  >
                    {row.totalBalance === 0 ? 'PAID!' : formatCurrency(row.totalBalance)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        ✓ marks months when a debt is fully paid off
      </p>
    </div>
  );
}
