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
    `SELECT p.*, a.id AS app_id, a.service_code, a.tracking_id,
            a.referral_agent_id, a.total_amount AS app_total
       FROM payments p
       LEFT JOIN applications a ON a.id = p.application_id
      WHERE p.id = $1`,
    [paymentId],
  );
  const payment = p.rows[0];
  if (!payment) throw new Error('Payment not found');
  if (payment.status === 'verified') return { payment, alreadyPaid: true };

  const revenueCode = SERVICE_REVENUE_ACCOUNT[payment.service_code] || '4000';

  await query(
    `UPDATE payments SET status='verified', verified_by=$2, verified_at=now(), paid_at=now() WHERE id=$1`,
    [paymentId, actorId],
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

  // Accrue agent commission once per application
  let commission = null;
  if (payment.referral_agent_id && payment.app_id) {
    const existing = await query(
      `SELECT id FROM agent_commissions WHERE application_id = $1`,
      [payment.app_id],
    );
    if (!existing.rows[0]) {
      const agent = await query(
        `SELECT commission_type, commission_value FROM agents WHERE id = $1`,
        [payment.referral_agent_id],
      );
      const a = agent.rows[0];
      if (a && Number(a.commission_value) > 0) {
        const amount = a.commission_type === 'percent'
          ? Number(payment.app_total || 0) * Number(a.commission_value) / 100
          : Number(a.commission_value);
        if (amount > 0) {
          const cm = await query(
            `INSERT INTO agent_commissions (agent_id, application_id, amount, status)
             VALUES ($1,$2,$3,'accrued') RETURNING *`,
            [payment.referral_agent_id, payment.app_id, amount],
          );
          commission = cm.rows[0];
          // Dr Commission Expense, Cr Commission Payable
          await postJournalEntry({
            ref_type: 'commission',
            ref_id: commission.id,
            description: `Commission accrued — application ${payment.tracking_id || ''}`,
            created_by: actorId,
            lines: [
              { account_code: '5100', debit: amount, description: 'Agent commission expense' },
              { account_code: '2100', credit: amount, description: 'Commission payable' },
            ],
          });
        }
      }
    }
  }

  return { payment: { ...payment, status: 'verified' }, entry, commission };
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

// Pay out agent commissions: marks commissions paid, posts Dr 2100 / Cr Wallet (1000).
async function payoutAgentCommissions({ agentId, commissionIds = [], walletId, notes = '', actorId = null }) {
  if (!agentId || !walletId || !Array.isArray(commissionIds) || commissionIds.length === 0) {
    throw new Error('agentId, walletId and commissionIds[] required');
  }

  const r = await query(
    `SELECT id, amount, status FROM agent_commissions
      WHERE id = ANY($1) AND agent_id = $2 AND status = 'accrued'`,
    [commissionIds, agentId],
  );
  if (r.rows.length === 0) throw new Error('No payable commissions found');

  const total = r.rows.reduce((s, c) => s + Number(c.amount), 0);
  if (total <= 0) throw new Error('Total payout amount is zero');

  const agentRow = await query(`SELECT name FROM agents WHERE id = $1`, [agentId]);
  const agentName = agentRow.rows[0]?.name || 'Agent';

  const entry = await postJournalEntry({
    ref_type: 'commission_payout',
    ref_id: agentId,
    description: `Commission payout — ${agentName}${notes ? ' — ' + notes : ''}`,
    created_by: actorId,
    lines: [
      { account_code: '2100', debit: total, description: 'Settle commission payable' },
      { account_code: '1000', wallet_id: walletId, credit: total, description: `Payout to ${agentName}` },
    ],
  });

  await query(
    `UPDATE agent_commissions
        SET status = 'paid', paid_at = now(), payment_id = $1,
            notes = COALESCE(notes, '') || CASE WHEN $2::text <> '' THEN E'\n' || $2 ELSE '' END
      WHERE id = ANY($3)`,
    [entry.id, notes || '', r.rows.map((c) => c.id)],
  );

  return { entry, total, count: r.rows.length };
}

module.exports = {
  postJournalEntry,
  confirmPayment,
  postExpenseEntry,
  payoutAgentCommissions,
  postRefundEntry,
  SERVICE_REVENUE_ACCOUNT,
};