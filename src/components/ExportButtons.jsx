import { useState } from 'react';
import { formatCurrency, STRATEGY_LABELS } from '../utils/debtCalc.js';

export function ExportButtons({ results, debts, income, strategy }) {
  const [exporting, setExporting] = useState(null);

  const handleCSV = () => {
    setExporting('csv');
    try {
      const csv = buildCSV(results, debts);
      downloadFile(csv, 'text/csv', 'debt-payoff-plan.csv');
    } finally {
      setExporting(null);
    }
  };

  const handlePDF = async () => {
    setExporting('pdf');
    try {
      // Dynamic import to keep bundle lean
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      buildPDF(jsPDF, autoTable, results, debts, income, strategy);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('PDF export failed. Try CSV instead.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleCSV}
        disabled={exporting === 'csv'}
        className="btn-secondary text-xs px-2.5 py-1.5 disabled:opacity-50"
        title="Export as spreadsheet"
      >
        {exporting === 'csv' ? '…' : '↓ CSV'}
      </button>
      <button
        onClick={handlePDF}
        disabled={exporting === 'pdf'}
        className="btn-secondary text-xs px-2.5 py-1.5 disabled:opacity-50"
        title="Export as PDF report"
      >
        {exporting === 'pdf' ? '…' : '↓ PDF'}
      </button>
    </div>
  );
}

// ── CSV Builder ──────────────────────────────────────────────────────────────

function buildCSV(results, debts) {
  const lines = [];

  // Summary
  lines.push('DEBT PAYOFF PLAN SUMMARY');
  lines.push(`"Strategy","${results.strategy}"`);
  lines.push(`"Payoff Date","${results.payoffDate}"`);
  lines.push(`"Payoff Months","${results.payoffMonths}"`);
  lines.push(`"Total Interest","${results.totalInterest}"`);
  lines.push(`"Interest Saved vs Minimums","${results.interestSaved}"`);
  lines.push(`"Months Saved vs Minimums","${results.monthsSaved}"`);
  lines.push('');

  // Debt list
  lines.push('DEBTS');
  lines.push('"Name","Balance","APR (%)","Min Payment"');
  debts.forEach((d) =>
    lines.push(`"${d.name}","${d.balance}","${d.apr}","${d.minPayment}"`)
  );
  lines.push('');

  // Month-by-month
  lines.push('MONTHLY BREAKDOWN');
  const headers = ['Month', 'Date', ...debts.map((d) => d.name), 'Total Balance'];
  lines.push(headers.map((h) => `"${h}"`).join(','));

  results.months.forEach((row) => {
    const rowData = [
      row.month,
      row.date,
      ...debts.map((d) => (row.balances[d.id] ?? 0).toFixed(2)),
      row.totalBalance.toFixed(2),
    ];
    lines.push(rowData.map((v) => `"${v}"`).join(','));
  });

  return lines.join('\n');
}

// ── PDF Builder ──────────────────────────────────────────────────────────────

function buildPDF(jsPDF, autoTable, results, debts, income, strategy) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 40;

  // Title
  doc.setFontSize(20);
  doc.setTextColor(30, 58, 138);
  doc.text('DebtFree — Payoff Plan', 40, y);
  y += 10;

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })} · debtfree.app`, 40, y + 10);
  y += 30;

  // Summary boxes
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  const summaryItems = [
    ['Strategy', STRATEGY_LABELS[strategy]],
    ['Payoff Date', results.payoffDate],
    ['Months to Payoff', String(results.payoffMonths)],
    ['Total Interest', formatCurrency(results.totalInterest)],
    ['Interest Saved', formatCurrency(results.interestSaved)],
    ['Months Saved', String(results.monthsSaved)],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Summary', '']],
    body: summaryItems,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 10 },
    bodyStyles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 160 } },
    margin: { left: 40, right: 40 },
  });

  y = doc.lastAutoTable.finalY + 20;

  // Debts table
  autoTable(doc, {
    startY: y,
    head: [['Debt', 'Balance', 'APR', 'Min Payment']],
    body: debts.map((d) => [
      d.name,
      formatCurrency(d.balance),
      `${d.apr}%`,
      formatCurrency(d.minPayment),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 10 },
    bodyStyles: { fontSize: 10 },
    margin: { left: 40, right: 40 },
  });

  y = doc.lastAutoTable.finalY + 20;

  // Payoff order
  if (results.debtPayoffOrder.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['#', 'Debt', 'Paid Off', 'Interest Paid']],
      body: results.debtPayoffOrder.map((item, i) => [
        i + 1,
        item.name,
        item.date,
        formatCurrency(item.totalInterest),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [5, 150, 105], textColor: 255, fontSize: 10 },
      bodyStyles: { fontSize: 10 },
      margin: { left: 40, right: 40 },
    });

    y = doc.lastAutoTable.finalY + 20;
  }

  // Monthly timeline (first 36 months or all if fewer)
  const timelineRows = results.months
    .slice(0, 36)
    .map((row) => [
      row.month,
      row.date,
      ...debts.map((d) => {
        const b = row.balances[d.id] ?? 0;
        return b === 0 ? '—' : formatCurrency(b);
      }),
      formatCurrency(row.totalBalance),
    ]);

  autoTable(doc, {
    startY: y,
    head: [['Mo.', 'Date', ...debts.map((d) => d.name), 'Total']],
    body: timelineRows,
    theme: 'striped',
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 40, right: 40 },
    didParseCell: (data) => {
      if (data.cell.raw === '—') {
        data.cell.styles.textColor = [16, 185, 129];
      }
    },
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `DebtFree Payoff Planner · Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: 'center' }
    );
  }

  doc.save('debt-payoff-plan.pdf');
}

// ── Util ─────────────────────────────────────────────────────────────────────

function downloadFile(content, mimeType, filename) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
