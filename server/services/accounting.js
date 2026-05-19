// Double-entry accounting helper.
// Posts a balanced journal entry: equal total debits & credits.
// Lines: [{ account_code, wallet_id?, debit?, credit?, description? }]

const { query } = require('../config/database');

const SERVICE_REVENUE_ACCOUNT = {
  'work-permit': '4000',
  'air-ticket': '4100',
  visa: '4200',
};

async function postJournalEntry(opts) {
  const {
    entry_date = null,
    ref_type = 'manual',
    ref_id = null,
    description = '',
    lines = [],
    created_by = null,
  } = opts || {};

  if (!Array.isArray(lines) || lines.length < 2) {
    throw new Error('Journal entry requires at least 2 lines');
  }

  const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.009) {
    throw new Error(`Unbalanced entry: Dr ${totalDebit} vs Cr ${totalCredit}`);
  }

  // Resolve account codes -> ids
  const codes = [...new Set(lines.map((l) => l.account_code).filter(Boolean))];
  const accRes = await query(
    `SELECT id, code FROM chart_of_accounts WHERE code = ANY($1)`,
    [codes],
  );
  const codeToId = Object.fromEntries(accRes.rows.map((r) => [r.code, r.id]));
  for (const c of codes) {
    if (!codeToId[c]) throw new Error(`Unknown account code: ${c}`);
  }

  const entryRes = await query(
    `INSERT INTO journal_entries
       (entry_date, ref_type, ref_id, description, total_debit, total_credit, created_by)
     VALUES (COALESCE($1, CURRENT_DATE), $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [entry_date, ref_type, ref_id, description, totalDebit, totalCredit, created_by],
  );
  const entry = entryRes.rows[0];

  for (const l of lines) {
    await query(
      `INSERT INTO journal_lines
         (entry_id, account_id, wallet_id, debit, credit, description)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        entry.id,
        codeToId[l.account_code],
        l.wallet_id || null,
        Number(l.debit || 0),
        Number(l.credit || 0),
        l.description || null,
      ],
    );
  }
  return entry;
}

// Confirm a payment: mark paid + post Dr Wallet/Cash, Cr Revenue (by service).
async function confirmPayment(paymentId, actorId = null) {
  const p = await query(
    `SELECT p.*, a.service_code, a.tracking_id
       FROM payments p
       LEFT JOIN applications a ON a.id = p.application_id
      WHERE p.id = $1`,
    [paymentId],
  );
  const payment = p.rows[0];
  if (!payment) throw new Error('Payment not found');
  if (payment.status === 'paid') return { payment, alreadyPaid: true };

  const revenueCode = SERVICE_REVENUE_ACCOUNT[payment.service_code] || '4000';

  await query(
    `UPDATE payments SET status='paid', paid_at=now() WHERE id=$1`,
    [paymentId],
  );

  const entry = await postJournalEntry({
    ref_type: 'payment',
    ref_id: paymentId,
    description: `Payment ${payment.tracking_id || ''} (${payment.method_code || 'manual'})`,
    created_by: actorId,
    lines: [
      {
        account_code: '1000',
        wallet_id: payment.wallet_id,
        debit: payment.amount,
        description: 'Cash/Bank receipt',
      },
      {
        account_code: revenueCode,
        credit: payment.amount,
        description: `Revenue: ${payment.service_code || 'service'}`,
      },
    ],
  });

  return { payment: { ...payment, status: 'paid' }, entry };
}

// Post an expense entry: Dr Operating Expenses, Cr Wallet
async function postExpenseEntry(expense, actorId = null) {
  if (!expense.wallet_id || !expense.amount) return null;
  return postJournalEntry({
    entry_date: expense.expense_date,
    ref_type: 'expense',
    ref_id: expense.id,
    description: `Expense: ${expense.category}${expense.vendor ? ' - ' + expense.vendor : ''}`,
    created_by: actorId,
    lines: [
      { account_code: '5000', debit: expense.amount, description: expense.note || expense.category },
      { account_code: '1000', wallet_id: expense.wallet_id, credit: expense.amount },
    ],
  });
}

module.exports = {
  postJournalEntry,
  confirmPayment,
  postExpenseEntry,
  SERVICE_REVENUE_ACCOUNT,
};