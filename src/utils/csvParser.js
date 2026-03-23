/**
 * Smart CSV parser — handles any bank or custom CSV format.
 * Auto-detects date, amount, description, and debit/credit columns.
 */

// ─── Raw CSV → rows ────────────────────────────────────────────────────────────

export function parseCSV(text) {
  // Strip BOM (Excel/Windows UTF-8)
  const clean = text.replace(/^\uFEFF/, '').trim();
  const lines = clean.split(/\r?\n/);

  const parse = (line) => {
    const cols = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cols.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());
    return cols;
  };

  const headers = parse(lines[0]).map((h) => h.replace(/^"|"$/g, ''));
  const rows = lines.slice(1)
    .filter((l) => l.trim())
    .map((l) => {
      const vals = parse(l);
      const obj = {};
      headers.forEach((h, i) => { obj[h] = (vals[i] ?? '').replace(/^"|"$/g, ''); });
      return obj;
    });

  return { headers, rows };
}

// ─── Column detection ──────────────────────────────────────────────────────────

const HINTS = {
  date:   ['date', 'posted', 'transaction date', 'trans date', 'value date', 'posting date', 'settled', 'time'],
  desc:   ['description', 'desc', 'memo', 'name', 'payee', 'merchant', 'details', 'narrative', 'particulars', 'reference', 'remarks', 'transaction'],
  amount: ['amount', 'sum', 'total', 'value'],
  debit:  ['debit', 'withdrawal', 'withdrawals', 'out', 'dr'],
  credit: ['credit', 'deposit', 'deposits', 'in', 'cr'],
  category: ['category', 'cat', 'type', 'tag', 'label'],
};

function scoreHeader(header, hints) {
  const h = header.toLowerCase().trim();
  for (const hint of hints) {
    if (h === hint) return 10;
    if (h.startsWith(hint) || h.endsWith(hint)) return 7;
    if (h.includes(hint)) return 4;
  }
  return 0;
}

export function detectMapping(headers) {
  const best = (type) => {
    let top = null, topScore = 0;
    for (const h of headers) {
      const s = scoreHeader(h, HINTS[type]);
      if (s > topScore) { topScore = s; top = h; }
    }
    return topScore > 0 ? top : null;
  };

  const debit = best('debit');
  const credit = best('credit');
  const amount = best('amount');

  // Prefer separate debit/credit if both found
  const amountMode = (debit && credit) ? 'split' : 'single';

  return {
    date: best('date'),
    desc: best('desc'),
    amountMode,
    amount: amountMode === 'single' ? amount : null,
    debit: amountMode === 'split' ? debit : null,
    credit: amountMode === 'split' ? credit : null,
    category: best('category'),
  };
}

// ─── Date parsing ──────────────────────────────────────────────────────────────

const MONTHS = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };

export function parseDate(str) {
  if (!str) return null;
  const s = str.trim();

  // ISO: 2024-01-15
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  // MM/DD/YYYY or M/D/YYYY or MM/DD/YY
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (mdy) {
    let [, m, d, y] = mdy;
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }

  // DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }

  // Month DD, YYYY or DD Month YYYY
  const words = s.match(/^(\w+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (words) {
    const mo = MONTHS[words[1].toLowerCase().slice(0,3)];
    if (mo !== undefined) {
      return `${words[3]}-${String(mo+1).padStart(2,'0')}-${words[2].padStart(2,'0')}`;
    }
  }
  const wordsRev = s.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/);
  if (wordsRev) {
    const mo = MONTHS[wordsRev[2].toLowerCase().slice(0,3)];
    if (mo !== undefined) {
      return `${wordsRev[3]}-${String(mo+1).padStart(2,'0')}-${wordsRev[1].padStart(2,'0')}`;
    }
  }

  return null;
}

// ─── Amount parsing ────────────────────────────────────────────────────────────

export function parseAmount(str) {
  if (!str && str !== 0) return null;
  // Remove currency symbols, spaces, commas, parentheses (accounting negatives)
  const neg = /^\(/.test(str.trim());
  const cleaned = String(str).replace(/[^0-9.\-]/g, '');
  const val = parseFloat(cleaned);
  if (isNaN(val)) return null;
  return neg ? -Math.abs(val) : val;
}

// ─── Rows → preview transactions ──────────────────────────────────────────────

export function rowsToPreview(rows, mapping, defaultType = 'auto') {
  return rows.map((row) => {
    const date = parseDate(row[mapping.date]) ?? '';
    const name = (row[mapping.desc] ?? '').trim() || 'Imported';

    let amount = 0;
    let type = 'expense';

    if (mapping.amountMode === 'split') {
      const debitVal = parseAmount(row[mapping.debit]) ?? 0;
      const creditVal = parseAmount(row[mapping.credit]) ?? 0;
      if (creditVal > 0) {
        amount = creditVal;
        type = 'income';
      } else {
        amount = Math.abs(debitVal);
        type = 'expense';
      }
    } else {
      const raw = parseAmount(row[mapping.amount]);
      if (raw === null) return null;
      amount = Math.abs(raw);
      if (defaultType === 'auto') {
        type = raw < 0 ? 'expense' : 'income';
      } else {
        type = defaultType;
      }
    }

    if (amount <= 0) return null;

    return {
      name,
      date,
      amount,
      type,
      category: mapping.category ? (row[mapping.category] || '') : '',
      notes: '',
      _raw: row, // keep for display
    };
  }).filter(Boolean);
}
