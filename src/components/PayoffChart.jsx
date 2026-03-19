import { useEffect, useRef } from 'react';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { DEBT_COLORS, formatCurrency } from '../utils/debtCalc.js';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend
);

export function PayoffChart({ results, debts }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !results) return;

    const { months } = results;
    // Sample up to 60 data points for performance (more than enough visual detail)
    const step = Math.max(1, Math.floor(months.length / 60));
    const sampled = months.filter((_, i) => i % step === 0 || i === months.length - 1);

    const labels = sampled.map((m) => m.date);

    // Build datasets: one line per debt + total
    const debtDatasets = debts.map((debt, i) => ({
      label: debt.name,
      data: sampled.map((m) => m.balances[debt.id] ?? 0),
      borderColor: DEBT_COLORS[i % DEBT_COLORS.length],
      backgroundColor: DEBT_COLORS[i % DEBT_COLORS.length] + '18',
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      fill: false,
      tension: 0.3,
    }));

    // Total balance line
    const totalDataset = {
      label: 'Total Balance',
      data: sampled.map((m) => m.totalBalance),
      borderColor: '#1e293b',
      backgroundColor: '#1e293b10',
      borderWidth: 2.5,
      pointRadius: 0,
      pointHoverRadius: 5,
      fill: true,
      tension: 0.3,
      borderDash: [],
    };

    const datasets = [totalDataset, ...debtDatasets];

    // Destroy previous chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              boxHeight: 12,
              padding: 12,
              font: { size: 11 },
              color: '#64748b',
            },
          },
          tooltip: {
            backgroundColor: '#1e293b',
            titleFont: { size: 12 },
            bodyFont: { size: 11 },
            padding: 10,
            callbacks: {
              label: (ctx) => {
                const val = ctx.raw ?? 0;
                return ` ${ctx.dataset.label}: ${formatCurrency(val)}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              maxTicksLimit: 10,
              font: { size: 11 },
              color: '#94a3b8',
              maxRotation: 30,
            },
          },
          y: {
            grid: { color: '#f1f5f9' },
            ticks: {
              font: { size: 11 },
              color: '#94a3b8',
              callback: (v) => formatCurrency(v),
            },
            beginAtZero: true,
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [results, debts]);

  return (
    <div className="animate-fade-in">
      <div className="h-72 sm:h-80">
        <canvas ref={canvasRef} />
      </div>
      <p className="text-xs text-slate-400 text-center mt-3">
        Balance over time · Hover for details
      </p>
    </div>
  );
}
