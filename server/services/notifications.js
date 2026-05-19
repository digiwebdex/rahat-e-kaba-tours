// Lightweight SMS/notification service for the recruiting app.
// Uses Bulk SMS BD (BULKSMSBD_API_KEY / BULKSMSBD_SENDER_ID env vars).
// Falls back gracefully if env vars are missing — just logs the would-be SMS.

const { query } = require('../config/database');

const COMPANY_NAME = process.env.COMPANY_NAME || 'Al Rawsha';

// Normalize BD phone numbers to the format Bulk SMS BD expects (e.g. 8801XXXXXXXXX).
function normalizeBdPhone(raw) {
  if (!raw) return null;
  let p = String(raw).trim().replace(/[^\d]/g, '');
  if (!p) return null;
  if (p.startsWith('00')) p = p.slice(2);
  if (p.startsWith('880')) return p;
  if (p.startsWith('0')) return '880' + p.slice(1);
  if (p.startsWith('1') && p.length === 10) return '880' + p;
  return p;
}

function isSmsAccepted(text = '') {
  // Bulk SMS BD returns JSON like {"response_code":202,...} or 1001..
  if (!text) return false;
  const lower = String(text).toLowerCase();
  if (lower.includes('"response_code":202')) return true;
  if (lower.includes('success')) return true;
  // numeric-only response of 202/1001 is also success
  return /\b(202|1001)\b/.test(lower);
}

async function isEventEnabled(eventKey) {
  try {
    const r = await query(
      `SELECT enabled, sms_enabled FROM notification_settings WHERE event_key = $1 LIMIT 1`,
      [eventKey],
    );
    const row = r.rows[0];
    if (!row) return true; // default-on if not configured
    return row.enabled !== false && row.sms_enabled !== false;
  } catch {
    return true;
  }
}

async function logNotification({ userId, eventType, channel, recipient, message, status, error }) {
  try {
    await query(
      `INSERT INTO notification_logs
         (user_id, event_type, channel, recipient, message, status, error_detail)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [userId || null, eventType, channel, recipient, message, status, error || null],
    );
  } catch (e) {
    console.error('notification_logs insert failed:', e.message);
  }
}

async function sendSms({ phone, message, eventType = 'manual', userId = null }) {
  const number = normalizeBdPhone(phone);
  if (!number) {
    return { ok: false, reason: 'no_phone' };
  }

  const apiKey = process.env.BULKSMSBD_API_KEY || process.env.BULKSMS_API_KEY;
  const senderId = process.env.BULKSMSBD_SENDER_ID || process.env.BULKSMS_SENDER_ID || '8809617618686';

  if (!apiKey) {
    console.warn(`[sms] skipped (${eventType}) — BULKSMSBD_API_KEY not set. To: ${number}`);
    await logNotification({
      userId, eventType, channel: 'sms', recipient: number,
      message, status: 'skipped', error: 'no_api_key',
    });
    return { ok: false, reason: 'no_api_key' };
  }

  const url = `https://bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(apiKey)}&type=text&number=${encodeURIComponent(number)}&senderid=${encodeURIComponent(senderId)}&message=${encodeURIComponent(message)}`;

  try {
    const res = await fetch(url);
    const text = await res.text();
    const accepted = res.ok && isSmsAccepted(text);
    await logNotification({
      userId, eventType, channel: 'sms', recipient: number,
      message, status: accepted ? 'sent' : 'failed',
      error: accepted ? null : `HTTP ${res.status}: ${text}`,
    });
    return { ok: accepted, response: text };
  } catch (e) {
    await logNotification({
      userId, eventType, channel: 'sms', recipient: number,
      message, status: 'failed', error: e.message,
    });
    return { ok: false, reason: e.message };
  }
}

// Predefined message templates keyed by event_key.
const templates = {
  application_submitted: ({ name, tracking, service }) =>
    `${COMPANY_NAME}: Hi ${name || ''}, your ${service || 'service'} application has been received. Tracking ID: ${tracking}. We will contact you soon.`,

  payment_submitted: ({ name, tracking, amount }) =>
    `${COMPANY_NAME}: Hi ${name || ''}, we received your payment submission of BDT ${amount} for ${tracking}. It is pending verification.`,

  payment_received: ({ name, tracking, amount, due }) =>
    `${COMPANY_NAME}: Payment of BDT ${amount} confirmed for ${tracking}.${due > 0 ? ` Remaining due: BDT ${due}.` : ' Fully paid. Thank you!'}`,

  application_status_changed: ({ name, tracking, status }) =>
    `${COMPANY_NAME}: Application ${tracking} status updated to: ${status}. Login to view details.`,

  commission_paid: ({ agent, amount }) =>
    `${COMPANY_NAME}: Commission payout of BDT ${amount} has been processed${agent ? ' to ' + agent : ''}.`,
};

// Fire-and-forget event sender — never throws to caller.
async function notify(eventKey, { phone, userId = null, data = {} } = {}) {
  try {
    if (!(await isEventEnabled(eventKey))) return { ok: false, reason: 'disabled' };
    const tpl = templates[eventKey];
    if (!tpl) return { ok: false, reason: 'no_template' };
    const message = tpl(data || {});
    return await sendSms({ phone, message, eventType: eventKey, userId });
  } catch (e) {
    console.error(`[notify ${eventKey}] error:`, e.message);
    return { ok: false, reason: e.message };
  }
}

module.exports = { sendSms, notify, normalizeBdPhone };