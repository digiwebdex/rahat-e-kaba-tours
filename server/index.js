require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const multer = require('multer');
const { query } = require('./config/database');
const { authenticate, requireRole, optionalAuth } = require('./middleware/auth');
const { auditMiddleware } = require('./middleware/audit');
const authRoutes = require('./routes/auth');
const accounting = require('./services/accounting');
const notifications = require('./services/notifications');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const toLocalPhone = (value = '') => {
  const digits = String(value).replace(/\D/g, '');
  if (digits.startsWith('880') && digits.length >= 12) return `0${digits.slice(2)}`;
  if (digits.startsWith('0')) return digits;
  if (digits.startsWith('1') && digits.length === 10) return `0${digits}`;
  return digits;
};

const toSmsPhone = (value = '') => {
  const digits = String(value).replace(/\D/g, '');
  if (digits.startsWith('880')) return digits;

  const local = toLocalPhone(value);
  if (local.startsWith('0')) return `88${local}`;

  return digits.startsWith('88') ? digits : `88${digits}`;
};

const isSmsAccepted = (responseText = '') => {
  const rawText = String(responseText).trim();
  if (!rawText) return false;

  try {
    const parsed = JSON.parse(rawText);
    if (parsed && typeof parsed === 'object') {
      const responseCode = Number(parsed.response_code ?? parsed.status_code ?? parsed.code);
      const successMessage = String(parsed.success_message ?? parsed.message ?? '').trim().toLowerCase();
      const errorMessage = String(parsed.error_message ?? '').trim().toLowerCase();
      const errorField = String(parsed.error ?? '').trim().toLowerCase();

      if ([200, 202].includes(responseCode)) return true;
      if (responseCode >= 200 && responseCode < 300) return true;
      // Only reject if there's a meaningful error message (not empty, not "no error")
      if (errorMessage && errorMessage !== 'no error' && errorMessage !== 'none' && errorMessage !== 'null') return false;
      if (errorField && errorField !== 'no error' && errorField !== 'none' && errorField !== 'null') return false;
      if (/(submitted successfully|sent successfully|accepted|queued|success)/i.test(successMessage)) return true;
      // If we got a parseable JSON with no clear error, assume success
      if (!errorMessage && !errorField && responseCode === 0) return true;
    }
  } catch (_error) {
    // Non-JSON response; fall back to text pattern checks.
  }

  const text = rawText.toLowerCase();
  if (/(submitted successfully|sent successfully|accepted|queued|success)/i.test(text)) return true;

  return !/(invalid|failed|error|unauthorized|denied|rejected|insufficient|balance)/i.test(text);
};

// =============================================
// AUTH ROUTES
// =============================================
// Audit logging middleware (logs all admin write operations)
app.use('/api', auditMiddleware);

app.use('/api/auth', authRoutes);

// =============================================
// GENERIC CRUD HELPER
// =============================================
const createCrudRoutes = (tableName, options = {}) => {
  const router = express.Router();
  // Use id DESC as safe default because some tables (site_content/company_settings/financial_summary/user_roles)
  // do not have created_at.
  const { readAuth = true, writeAuth = true, adminOnly = false, selectFields = '*', orderBy = 'id DESC' } = options;

  // List
  router.get('/', readAuth ? authenticate : optionalAuth, async (req, res) => {
    try {
      const { limit = 1000, offset = 0, ...filters } = req.query;
      let sql = `SELECT ${selectFields} FROM ${tableName}`;
      const params = [];
      const conditions = [];

      const validColumn = (col) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col);
      Object.entries(filters).forEach(([key, value]) => {
        if (value === undefined || value === '') return;

        const opMatch = key.match(/^(.+?)_(not_is|neq|gt|gte|lt|lte|ilike|in|is)$/);
        const column = opMatch ? opMatch[1] : key;
        const operator = opMatch ? opMatch[2] : 'eq';
        if (!validColumn(column)) return;

        if (operator === 'is') {
          if (String(value).toLowerCase() === 'null') conditions.push(`${column} IS NULL`);
          else {
            params.push(value);
            conditions.push(`${column} = $${params.length}`);
          }
          return;
        }

        if (operator === 'not_is') {
          if (String(value).toLowerCase() === 'null') conditions.push(`${column} IS NOT NULL`);
          else {
            params.push(value);
            conditions.push(`${column} <> $${params.length}`);
          }
          return;
        }

        if (operator === 'in') {
          const arr = String(value).split(',').filter(Boolean);
          if (!arr.length) return;
          params.push(arr);
          conditions.push(`${column} = ANY($${params.length})`);
          return;
        }

        const sqlOp = {
          eq: '=',
          neq: '<>',
          gt: '>',
          gte: '>=',
          lt: '<',
          lte: '<=',
          ilike: 'ILIKE',
        }[operator] || '=';

        params.push(operator === 'ilike' ? `%${String(value).replace(/%/g, '')}%` : value);
        conditions.push(`${column} ${sqlOp} $${params.length}`);
      });

      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      sql += ` ORDER BY ${orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(Number(limit) || 1000, Number(offset) || 0);

      const result = await query(sql, params);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get by ID
  router.get('/:id', readAuth ? authenticate : optionalAuth, async (req, res) => {
    try {
      const result = await query(`SELECT ${selectFields} FROM ${tableName} WHERE id = $1`, [req.params.id]);
      if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Serialize arrays/plain objects to JSON strings so Postgres receives valid JSON for jsonb columns.
  const serializeJsonValues = (value) => {
    if (value === null || value === undefined) return value;
    if (Array.isArray(value)) return JSON.stringify(value);
    if (typeof value === 'object' && !(value instanceof Date) && !Buffer.isBuffer(value)) {
      return JSON.stringify(value);
    }
    return value;
  };

  // Create (supports single object or array of objects)
  router.post('/', writeAuth ? authenticate : optionalAuth, adminOnly ? requireRole('admin') : (req, res, next) => next(), async (req, res) => {
    try {
      const validColumn = (col) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col);
      const quote = (identifier) => `"${String(identifier).replace(/"/g, '""')}"`;
      const rows = Array.isArray(req.body) ? req.body : [req.body];
      const results = [];

      for (const rawRow of rows) {
        if (!rawRow || typeof rawRow !== 'object' || Array.isArray(rawRow)) {
          return res.status(400).json({ error: 'Invalid payload format for insert' });
        }

        const entries = Object.entries(rawRow).filter(([key, value]) => validColumn(key) && value !== undefined);
        if (!entries.length) {
          return res.status(400).json({ error: 'No valid columns provided for insert' });
        }

        const keys = entries.map(([key]) => key);
        const values = entries.map(([, value]) => serializeJsonValues(value));
        const placeholders = keys.map((_, i) => `$${i + 1}`);
        const sql = `INSERT INTO "${tableName}" (${keys.map(quote).join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
        console.log(`INSERT into ${tableName}:`, { sql, values, keys });
        const result = await query(sql, values);
        results.push(result.rows[0]);
      }

      res.status(201).json(Array.isArray(req.body) ? results : results[0]);
    } catch (err) {
      console.error(`POST /${tableName} error:`, err.message, 'Body:', JSON.stringify(req.body).substring(0, 500));
      res.status(500).json({ error: err.message });
    }
  });

  // Update
  router.patch('/:id', writeAuth ? authenticate : optionalAuth, adminOnly ? requireRole('admin') : (req, res, next) => next(), async (req, res) => {
    try {
      const validColumn = (col) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col);
      const quote = (identifier) => `"${String(identifier).replace(/"/g, '""')}"`;
      const entries = Object.entries(req.body || {}).filter(([key, value]) => validColumn(key) && value !== undefined);

      if (!entries.length) {
        return res.status(400).json({ error: 'No valid columns provided for update' });
      }

      const keys = entries.map(([key]) => key);
      const values = entries.map(([, value]) => serializeJsonValues(value));
      const sets = keys.map((key, i) => `${quote(key)} = $${i + 1}`);
      values.push(req.params.id);

      const result = await query(
        `UPDATE ${tableName} SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
        values
      );
      if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Bulk delete by filter (e.g. DELETE /api/payments?booking_id=xxx)
  router.delete('/', writeAuth ? authenticate : optionalAuth, adminOnly ? requireRole('admin') : (req, res, next) => next(), async (req, res) => {
    try {
      const filters = req.query;
      const keys = Object.keys(filters);
      if (!keys.length) return res.status(400).json({ error: 'Filter required for bulk delete' });
      const validColumn = (col) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col);
      const conditions = [];
      const params = [];
      keys.forEach((col) => {
        if (!validColumn(col)) return;
        params.push(filters[col]);
        conditions.push(`${col} = $${params.length}`);
      });
      if (!conditions.length) return res.status(400).json({ error: 'Valid filter required' });
      const result = await query(`DELETE FROM ${tableName} WHERE ${conditions.join(' AND ')} RETURNING id`, params);
      res.json({ message: 'Deleted', count: result.rowCount });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete by ID
  router.delete('/:id', writeAuth ? authenticate : optionalAuth, adminOnly ? requireRole('admin') : (req, res, next) => next(), async (req, res) => {
    try {
      const result = await query(`DELETE FROM ${tableName} WHERE id = $1 RETURNING id`, [req.params.id]);
      if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
      res.json({ message: 'Deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};

// =============================================
// ENTITY ROUTES
// =============================================

// Public routes (no auth)
app.get('/api/public/payment-methods', async (_req, res) => {
  try {
    const result = await query(`
      SELECT setting_value
      FROM company_settings
      WHERE setting_key = 'payment_methods'
      LIMIT 1
    `);

    if (!result.rows[0]?.setting_value) {
      return res.json([]);
    }

    let methods = result.rows[0].setting_value;
    if (typeof methods === 'string') {
      try {
        methods = JSON.parse(methods);
      } catch {
        methods = [];
      }
    }

    if (!Array.isArray(methods)) {
      return res.json([]);
    }

    const safeMethods = methods
      .filter((method) => method && method.enabled)
      .map((method) => ({
        id: method.id,
        name: method.name,
        name_bn: method.name_bn,
        icon: method.icon,
        category: method.category,
        enabled: Boolean(method.enabled),
        account_name: method.account_name || '',
        account_number: method.account_number || '',
        instructions: method.instructions || '',
        instructions_bn: method.instructions_bn || '',
        charge_percent: Number(method.charge_percent || 0),
        min_amount: Number(method.min_amount || 0),
        max_amount: Number(method.max_amount || 0),
        is_sandbox: Boolean(method.is_sandbox),
      }));

    return res.json(safeMethods);
  } catch (err) {
    console.error('GET /api/public/payment-methods error:', err.message);
    return res.status(500).json({ error: 'Failed to load payment methods' });
  }
});

// Public: Track booking by tracking_id or phone
app.post('/api/track-booking', async (req, res) => {
  try {
    const { tracking_id, phone } = req.body;
    if (!tracking_id && !phone) return res.status(400).json({ error: 'tracking_id or phone is required' });

    let booking = null;

    if (phone) {
      const cleanPhone = phone.trim();
      if (!/^[\+]?[0-9\s\-]{7,15}$/.test(cleanPhone)) return res.status(400).json({ error: 'Invalid phone format' });
      const result = await query(
        `SELECT b.tracking_id, b.status, b.guest_name, b.num_travelers, b.due_amount, b.notes, b.created_at,
                p.name as package_name, p.type as package_type
         FROM bookings b LEFT JOIN packages p ON b.package_id = p.id
         WHERE b.guest_phone = $1 ORDER BY b.created_at DESC LIMIT 1`, [cleanPhone]
      );
      if (result.rows[0]) booking = result.rows[0];
    } else {
      const id = tracking_id.toUpperCase();
      if (!/^[A-Z0-9\-]+$/i.test(id) || id.length > 20) return res.status(400).json({ error: 'Invalid tracking ID format' });
      const result = await query(
        `SELECT b.tracking_id, b.status, b.guest_name, b.num_travelers, b.due_amount, b.notes, b.created_at,
                p.name as package_name, p.type as package_type
         FROM bookings b LEFT JOIN packages p ON b.package_id = p.id
         WHERE b.tracking_id = $1 LIMIT 1`, [id]
      );
      if (result.rows[0]) booking = result.rows[0];
    }

    if (!booking) return res.json({ booking: null });

    // Return safe fields only
    res.json({
      booking: {
        tracking_id: booking.tracking_id,
        status: booking.status,
        guest_name: booking.guest_name,
        num_travelers: booking.num_travelers,
        due_amount: booking.due_amount,
        notes: booking.notes,
        created_at: booking.created_at,
        packages: { name: booking.package_name, type: booking.package_type },
      }
    });
  } catch (err) {
    console.error('POST /api/track-booking error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================
// PUBLIC READ ROUTES (new recruiting schema)
// =============================================
app.use('/api/services', createCrudRoutes('services', { readAuth: false, writeAuth: true, adminOnly: true, orderBy: 'sort_order ASC' }));
app.use('/api/service-packages', createCrudRoutes('service_packages', { readAuth: false, writeAuth: true, adminOnly: true, orderBy: 'sort_order ASC' }));
app.use('/api/cms-sections', createCrudRoutes('cms_sections', { readAuth: false, writeAuth: true, adminOnly: true, orderBy: 'sort_order ASC' }));
app.use('/api/site-settings', createCrudRoutes('site_settings', { readAuth: false, writeAuth: true, adminOnly: true, orderBy: 'key ASC' }));
app.use('/api/menu-items', createCrudRoutes('menu_items', { readAuth: false, writeAuth: true, adminOnly: true, orderBy: 'sort_order ASC' }));
app.use('/api/blog-posts', createCrudRoutes('blog_posts', { readAuth: false, writeAuth: true, adminOnly: true }));

// =============================================
// AUTH-REQUIRED ROUTES (new recruiting schema)
// =============================================
// Custom applications GET with JOINs (must be before generic CRUD)
app.get('/api/applications', authenticate, async (req, res) => {
  try {
    const { limit = 1000, offset = 0, ...filters } = req.query;
    let conditions = [];
    let params = [];
    const validColumn = (col) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col);
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === '') return;
      const opMatch = key.match(/^(.+?)_(not_is|neq|gt|gte|lt|lte|ilike|in|is)$/);
      const column = opMatch ? opMatch[1] : key;
      const operator = opMatch ? opMatch[2] : 'eq';
      if (!validColumn(column)) return;
      const prefixedCol = `a.${column}`;
      if (operator === 'is') {
        if (String(value).toLowerCase() === 'null') conditions.push(`${prefixedCol} IS NULL`);
        else { params.push(value); conditions.push(`${prefixedCol} = $${params.length}`); }
        return;
      }
      if (operator === 'not_is') {
        if (String(value).toLowerCase() === 'null') conditions.push(`${prefixedCol} IS NOT NULL`);
        else { params.push(value); conditions.push(`${prefixedCol} <> $${params.length}`); }
        return;
      }
      if (operator === 'in') {
        const arr = String(value).split(',').filter(Boolean);
        if (!arr.length) return;
        params.push(arr);
        conditions.push(`${prefixedCol} = ANY($${params.length})`);
        return;
      }
      const sqlOp = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=', ilike: 'ILIKE' }[operator] || '=';
      params.push(operator === 'ilike' ? `%${String(value).replace(/%/g, '')}%` : value);
      conditions.push(`${prefixedCol} ${sqlOp} $${params.length}`);
    });

    let sql = `SELECT a.*,
      CASE WHEN s.code IS NOT NULL THEN json_build_object('code', s.code, 'name_en', s.name_en, 'name_bn', s.name_bn) ELSE NULL END as service,
      CASE WHEN c.id IS NOT NULL THEN json_build_object('full_name', c.full_name, 'phone', c.phone, 'email', c.email) ELSE NULL END as customer,
      CASE WHEN ra.id IS NOT NULL THEN json_build_object('name', ra.name, 'kind', ra.kind) ELSE NULL END as referral_agent,
      CASE WHEN sa.id IS NOT NULL THEN json_build_object('name', sa.name, 'kind', sa.kind, 'country', sa.country) ELSE NULL END as supplier_agent
      FROM applications a
      LEFT JOIN services s ON a.service_code = s.code
      LEFT JOIN customers c ON a.customer_id = c.id
      LEFT JOIN agents ra ON a.referral_agent_id = ra.id
      LEFT JOIN agents sa ON a.supplier_agent_id = sa.id`;
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit) || 1000, Number(offset) || 0);

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/applications error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
app.use('/api/applications', createCrudRoutes('applications', { adminOnly: true }));

// Full application data for invoice rendering (admin or owning customer)
app.get('/api/applications/:idOrTracking/invoice', authenticate, async (req, res) => {
  try {
    const { idOrTracking } = req.params;
    const isUuid = /^[0-9a-f-]{36}$/i.test(idOrTracking);
    const col = isUuid ? 'a.id' : 'a.tracking_id';
    const r = await query(`
      SELECT a.*, 
        json_build_object('code', s.code, 'name_en', s.name_en, 'name_bn', s.name_bn) AS service,
        json_build_object('id', c.id, 'user_id', c.user_id, 'full_name', c.full_name, 'phone', c.phone, 'email', c.email, 'address', c.address) AS customer
      FROM applications a
      LEFT JOIN services s ON a.service_code = s.code
      LEFT JOIN customers c ON a.customer_id = c.id
      WHERE ${col} = $1
    `, [idOrTracking]);
    const application = r.rows[0];
    if (!application) return res.status(404).json({ error: 'Not found' });

    const roleRes = await query(`SELECT role FROM user_roles WHERE user_id = $1`, [req.user.id]);
    const isAdmin = roleRes.rows.some(r => ['admin','manager','accountant','staff'].includes(r.role));
    const userRes = await query(`SELECT phone FROM users WHERE id = $1`, [req.user.id]);
    const userPhone = userRes.rows[0]?.phone || '';
    const ownsByUser = application.customer?.user_id && application.customer.user_id === req.user.id;
    const ownsByPhone = application.customer?.phone && userPhone &&
      String(application.customer.phone).replace(/\D/g, '').slice(-9) === String(userPhone).replace(/\D/g, '').slice(-9);
    if (!isAdmin && !ownsByUser && !ownsByPhone) return res.status(403).json({ error: 'Forbidden' });

    const payments = await query(
      `SELECT id, amount, method_code, status, transaction_ref, paid_at, created_at
         FROM payments WHERE application_id = $1 ORDER BY created_at ASC`,
      [application.id]
    );
    const company = await query(`SELECT setting_value FROM company_settings WHERE setting_key = 'pdf_company' LIMIT 1`);
    res.json({
      application,
      payments: payments.rows,
      company: company.rows[0]?.setting_value || null,
    });
  } catch (e) {
    console.error('GET /api/applications/:idOrTracking/invoice error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.use('/api/application-documents', createCrudRoutes('application_documents', { readAuth: true, writeAuth: false }));
app.use('/api/application-status-history', createCrudRoutes('application_status_history', { adminOnly: true, orderBy: 'created_at DESC' }));
app.use('/api/customers', createCrudRoutes('customers', { adminOnly: true }));
app.use('/api/agents', createCrudRoutes('agents', { adminOnly: true }));
app.use('/api/payments', createCrudRoutes('payments', { adminOnly: true }));
app.use('/api/payment-methods', createCrudRoutes('payment_methods', { readAuth: false, writeAuth: true, adminOnly: true, orderBy: 'sort_order ASC' }));
app.use('/api/wallets', createCrudRoutes('wallets', { adminOnly: true, orderBy: 'name ASC' }));
app.use('/api/chart-of-accounts', createCrudRoutes('chart_of_accounts', { adminOnly: true, orderBy: 'code ASC' }));
app.use('/api/journal-entries', createCrudRoutes('journal_entries', { adminOnly: true, orderBy: 'entry_date DESC' }));
app.use('/api/journal-lines', createCrudRoutes('journal_lines', { adminOnly: true }));
app.use('/api/expenses', createCrudRoutes('expenses', { adminOnly: true, orderBy: 'expense_date DESC' }));
app.use('/api/agent-commissions', createCrudRoutes('agent_commissions', { adminOnly: true }));
app.use('/api/supplier-payables', createCrudRoutes('supplier_payables', { adminOnly: true }));
app.use('/api/supplier-settlements', createCrudRoutes('supplier_settlements', { adminOnly: true }));
app.use('/api/profiles', createCrudRoutes('profiles', { adminOnly: true }));
app.use('/api/notification-logs', createCrudRoutes('notification_logs', { adminOnly: true }));
app.use('/api/notification-settings', createCrudRoutes('notification_settings', { adminOnly: true, orderBy: 'event_key ASC' }));
app.use('/api/company-settings', createCrudRoutes('company_settings', { adminOnly: true }));
app.use('/api/cms-versions', createCrudRoutes('cms_versions', { adminOnly: true }));
// SECURITY: Block admin role assignment via API (must be BEFORE CRUD routes)
app.use('/api/user-roles', (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PATCH') {
    const role = req.body?.role;
    if (role === 'admin') {
      return res.status(403).json({ error: 'Cannot assign admin role. Admin role is permanently locked.' });
    }
  }
  next();
});
app.use('/api/user-roles', createCrudRoutes('user_roles', { adminOnly: true }));

// (admin role protection middleware moved before route registration)

app.use('/api/audit-logs', createCrudRoutes('audit_logs', { adminOnly: true, orderBy: 'created_at DESC' }));

// =============================================
// AGENT PANEL ROUTES (Phase 4)
// =============================================
const resolveAgent = async (req, res, next) => {
  if (!req.user?.id) return res.status(401).json({ error: 'Not authenticated' });
  const r = await query(`SELECT * FROM agents WHERE user_id = $1 AND status = 'active'`, [req.user.id]);
  if (!r.rows[0]) return res.status(403).json({ error: 'Agent profile not found for this user' });
  req.agent = r.rows[0];
  next();
};

app.get('/api/agent/me', authenticate, resolveAgent, (req, res) => {
  res.json(req.agent);
});

app.get('/api/agent/applications', authenticate, resolveAgent, async (req, res) => {
  try {
    const col = req.agent.kind === 'supplier' ? 'supplier_agent_id' : 'referral_agent_id';
    const r = await query(`
      SELECT a.id, a.tracking_id, a.status, a.total_amount, a.paid_amount, a.due_amount,
             a.created_at, s.name_en AS service_name, c.full_name AS customer_name, c.phone AS customer_phone
        FROM applications a
        LEFT JOIN services s ON a.service_code = s.code
        LEFT JOIN customers c ON a.customer_id = c.id
       WHERE a.${col} = $1
       ORDER BY a.created_at DESC
    `, [req.agent.id]);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/agent/commissions', authenticate, resolveAgent, async (req, res) => {
  try {
    const r = await query(`
      SELECT ac.id, ac.amount, ac.status, ac.paid_at, ac.created_at,
             a.tracking_id, s.name_en AS service_name
        FROM agent_commissions ac
        LEFT JOIN applications a ON ac.application_id = a.id
        LEFT JOIN services s ON a.service_code = s.code
       WHERE ac.agent_id = $1
       ORDER BY ac.created_at DESC
    `, [req.agent.id]);
    const totals = r.rows.reduce((acc, c) => {
      acc.total += Number(c.amount);
      if (c.status === 'paid') acc.paid += Number(c.amount);
      else if (c.status === 'accrued') acc.pending += Number(c.amount);
      return acc;
    }, { total: 0, paid: 0, pending: 0 });
    res.json({ commissions: r.rows, totals });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/agent/stats', authenticate, resolveAgent, async (req, res) => {
  try {
    const col = req.agent.kind === 'supplier' ? 'supplier_agent_id' : 'referral_agent_id';
    const r = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status NOT IN ('cancelled','rejected')) AS total_apps,
        COUNT(*) FILTER (WHERE status IN ('completed','deployed')) AS completed_apps,
        COALESCE(SUM(total_amount) FILTER (WHERE status NOT IN ('cancelled','rejected')),0) AS total_value
      FROM applications WHERE ${col} = $1
    `, [req.agent.id]);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// =============================================
// ACCOUNTING ENGINE (Phase 3)
// =============================================

// Confirm payment -> mark paid + post journal entry (Dr wallet / Cr revenue)
app.post('/api/payments/:id/confirm', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const result = await accounting.confirmPayment(req.params.id, req.user?.id || null);

    // SMS the customer that their payment was confirmed
    try {
      const info = await query(
        `SELECT p.amount, a.tracking_id, a.due_amount, a.total_amount,
                c.full_name, c.phone, c.user_id
           FROM payments p
           LEFT JOIN applications a ON a.id = p.application_id
           LEFT JOIN customers c ON c.id = p.customer_id
          WHERE p.id = $1`,
        [req.params.id],
      );
      const row = info.rows[0];
      if (row?.phone) {
        notifications.notify('payment_received', {
          phone: row.phone,
          userId: row.user_id,
          data: {
            name: row.full_name,
            tracking: row.tracking_id || '',
            amount: Number(row.amount).toLocaleString(),
            due: Number(row.due_amount || 0),
          },
        }).catch(() => {});
      }
    } catch (smsErr) {
      console.error('payment_received SMS failed:', smsErr.message);
    }

    res.json({ success: true, ...result });
  } catch (e) {
    console.error('POST /api/payments/:id/confirm error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Post manual journal entry
app.post('/api/accounting/journal', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const entry = await accounting.postJournalEntry({
      ...req.body,
      created_by: req.user?.id || null,
    });
    res.json({ success: true, entry });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Trial balance: Dr/Cr per account
app.get('/api/accounting/trial-balance', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { from, to } = req.query;
    const params = [];
    let where = '';
    if (from) { params.push(from); where += ` AND je.entry_date >= $${params.length}`; }
    if (to)   { params.push(to);   where += ` AND je.entry_date <= $${params.length}`; }
    const r = await query(`
      SELECT coa.id, coa.code, coa.name, coa.type,
             COALESCE(SUM(jl.debit), 0)  AS total_debit,
             COALESCE(SUM(jl.credit), 0) AS total_credit,
             COALESCE(SUM(jl.debit - jl.credit), 0) AS balance
        FROM chart_of_accounts coa
        LEFT JOIN journal_lines jl   ON jl.account_id = coa.id
        LEFT JOIN journal_entries je ON je.id = jl.entry_id ${where ? ' AND TRUE' + where : ''}
       GROUP BY coa.id, coa.code, coa.name, coa.type
       ORDER BY coa.code ASC
    `, params);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Profit & Loss
app.get('/api/accounting/profit-loss', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { from, to } = req.query;
    const params = [];
    let where = `WHERE coa.type IN ('income','expense')`;
    if (from) { params.push(from); where += ` AND je.entry_date >= $${params.length}`; }
    if (to)   { params.push(to);   where += ` AND je.entry_date <= $${params.length}`; }
    const r = await query(`
      SELECT coa.code, coa.name, coa.type,
             COALESCE(SUM(jl.credit - jl.debit), 0) AS income_amount,
             COALESCE(SUM(jl.debit - jl.credit), 0) AS expense_amount
        FROM chart_of_accounts coa
        LEFT JOIN journal_lines jl   ON jl.account_id = coa.id
        LEFT JOIN journal_entries je ON je.id = jl.entry_id
       ${where}
       GROUP BY coa.code, coa.name, coa.type
       ORDER BY coa.type DESC, coa.code ASC
    `, params);
    const income = r.rows.filter(x => x.type === 'income').reduce((s, x) => s + Number(x.income_amount), 0);
    const expense = r.rows.filter(x => x.type === 'expense').reduce((s, x) => s + Number(x.expense_amount), 0);
    res.json({ rows: r.rows, totals: { income, expense, net_profit: income - expense } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Cashbook: ledger of a single wallet
app.get('/api/accounting/cashbook', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { wallet_id, from, to } = req.query;
    if (!wallet_id) return res.status(400).json({ error: 'wallet_id required' });
    const params = [wallet_id];
    let where = 'WHERE jl.wallet_id = $1';
    if (from) { params.push(from); where += ` AND je.entry_date >= $${params.length}`; }
    if (to)   { params.push(to);   where += ` AND je.entry_date <= $${params.length}`; }
    const r = await query(`
      SELECT je.entry_date, je.description, je.ref_type, je.ref_id,
             jl.debit, jl.credit, coa.code AS account_code, coa.name AS account_name
        FROM journal_lines jl
        JOIN journal_entries je ON je.id = jl.entry_id
        JOIN chart_of_accounts coa ON coa.id = jl.account_id
       ${where}
       ORDER BY je.entry_date DESC, je.created_at DESC
    `, params);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Auto-post journal when an expense is created
app.post('/api/expenses/with-posting', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { expense_date, category, amount, wallet_id, vendor, note, attachment_path } = req.body || {};
    if (!amount || !category || !wallet_id) {
      return res.status(400).json({ error: 'amount, category, wallet_id required' });
    }
    const ins = await query(
      `INSERT INTO expenses (expense_date, category, amount, wallet_id, vendor, note, attachment_path, created_by)
       VALUES (COALESCE($1,CURRENT_DATE),$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [expense_date || null, category, amount, wallet_id, vendor || null, note || null, attachment_path || null, req.user?.id || null],
    );
    const expense = ins.rows[0];
    const entry = await accounting.postExpenseEntry(expense, req.user?.id || null);
    res.json({ success: true, expense, entry });
  } catch (e) {
    console.error('POST /api/expenses/with-posting error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// List agent commissions for an agent (pending + paid history)
app.get('/api/agent-commissions/by-agent/:agentId', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const r = await query(
      `SELECT ac.*, a.tracking_id, a.service_code, c.full_name AS customer_name
         FROM agent_commissions ac
         LEFT JOIN applications a ON a.id = ac.application_id
         LEFT JOIN customers c ON c.id = a.customer_id
        WHERE ac.agent_id = $1
        ORDER BY ac.created_at DESC`,
      [req.params.agentId],
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Pay out selected commissions to an agent
app.post('/api/agent-commissions/payout', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const result = await accounting.payoutAgentCommissions({
      agentId: req.body?.agent_id,
      commissionIds: req.body?.commission_ids || [],
      walletId: req.body?.wallet_id,
      notes: req.body?.notes || '',
      actorId: req.user?.id || null,
    });
    res.json({ success: true, ...result });
  } catch (e) {
    console.error('POST /api/agent-commissions/payout error:', e.message);
    res.status(400).json({ error: e.message });
  }
});

// ==============================================
// BACKUP / RESTORE ROUTES
// =============================================
const BACKUP_TABLES = [
  'profiles', 'user_roles', 'company_settings', 'notification_settings',
  'services', 'service_packages', 'menu_items', 'site_settings',
  'cms_sections', 'cms_versions', 'blog_posts',
  'customers', 'agents',
  'applications', 'application_documents', 'application_status_history',
  'wallets', 'payment_methods', 'payments', 'online_payment_sessions',
  'chart_of_accounts', 'journal_entries', 'journal_lines',
  'expenses', 'agent_commissions', 'supplier_payables', 'supplier_settlements',
  'notification_logs',
];

const RESTORE_ORDER = [
  'profiles', 'user_roles', 'company_settings', 'notification_settings',
  'services', 'service_packages', 'menu_items', 'site_settings',
  'cms_sections', 'cms_versions', 'blog_posts',
  'wallets', 'payment_methods', 'chart_of_accounts',
  'customers', 'agents',
  'applications', 'application_documents', 'application_status_history',
  'payments', 'online_payment_sessions',
  'journal_entries', 'journal_lines',
  'expenses', 'agent_commissions', 'supplier_payables', 'supplier_settlements',
  'notification_logs',
];

const backupsDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

// List backups
app.get('/api/backup/list', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await fsp.mkdir(backupsDir, { recursive: true });
    const entries = await fsp.readdir(backupsDir, { withFileTypes: true });
    const files = await Promise.all(
      entries.filter(e => e.isFile() && e.name.endsWith('.json')).map(async e => {
        const stat = await fsp.stat(path.join(backupsDir, e.name));
        return { name: e.name, created_at: stat.birthtime.toISOString(), size: stat.size };
      })
    );
    res.json(files.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create backup
app.post('/api/backup/create', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const backupData = {};
    const stats = [];
    for (const table of BACKUP_TABLES) {
      try {
        const result = await query(`SELECT * FROM ${table}`);
        backupData[table] = result.rows;
        stats.push({ name: table, rows: result.rows.length });
      } catch (e) {
        stats.push({ name: table, rows: -1, error: e.message });
      }
    }
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const fileName = `backup_${timestamp}.json`;
    const jsonStr = JSON.stringify({ created_at: now.toISOString(), tables: backupData, stats }, null, 2);
    await fsp.writeFile(path.join(backupsDir, fileName), jsonStr);
    res.json({ success: true, fileName, tables: stats.length, size: jsonStr.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Restore backup
app.post('/api/backup/restore', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { fileName, mode } = req.body;
    if (!fileName) return res.status(400).json({ error: 'fileName required' });

    const restoreMode = mode === 'full' ? 'full' : 'merge';
    const filePath = path.join(backupsDir, path.basename(fileName));
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Backup not found' });

    const raw = await fsp.readFile(filePath, 'utf-8');
    const backup = JSON.parse(raw);
    const backupTables = Object.keys(backup.tables || {}).filter((table) => BACKUP_TABLES.includes(table));
    const orderedTables = [
      ...RESTORE_ORDER.filter((table) => backupTables.includes(table)),
      ...backupTables.filter((table) => !RESTORE_ORDER.includes(table)),
    ];

    if (orderedTables.length === 0) {
      return res.status(400).json({ error: 'No valid tables found in backup file' });
    }

    const results = [];
    const quote = (id) => `"${String(id).replace(/"/g, '""')}"`;

    if (restoreMode === 'full') {
      for (const table of [...orderedTables].reverse()) {
        try {
          await query(`DELETE FROM ${quote(table)}`);
        } catch (e) {
          results.push({ table, status: 'delete_error', error: e.message });
        }
      }
    }

    for (const table of orderedTables) {
      const rows = backup.tables?.[table];
      if (!Array.isArray(rows) || rows.length === 0) {
        results.push({ table, status: 'skipped', reason: 'empty' });
        continue;
      }

      try {
        const keys = Object.keys(rows[0]);
        if (!keys.length) {
          results.push({ table, status: 'skipped', reason: 'no_columns' });
          continue;
        }

        const updateCols = keys.filter((k) => k !== 'id');
        for (const row of rows) {
          const values = keys.map((k) => row[k]);
          const placeholders = keys.map((_, i) => `$${i + 1}`);

          const sql = `
            INSERT INTO ${quote(table)} (${keys.map(quote).join(', ')})
            VALUES (${placeholders.join(', ')})
            ON CONFLICT (id) DO ${updateCols.length
              ? `UPDATE SET ${updateCols.map((k) => `${quote(k)} = EXCLUDED.${quote(k)}`).join(', ')}`
              : 'NOTHING'}
          `;

          await query(sql, values);
        }

        results.push({ table, status: 'restored', rows: rows.length });
      } catch (e) {
        results.push({ table, status: 'error', error: e.message });
      }
    }

    const restored = results.filter((r) => r.status === 'restored').length;
    res.json({ success: true, restored, mode: restoreMode, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download backup
app.get('/api/backup/download', authenticate, requireRole('admin'), (req, res) => {
  const file = path.basename(req.query.file || '');
  const filePath = path.join(backupsDir, file);
  if (!file || !fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  res.download(filePath, file);
});

// Delete backup
app.post('/api/backup/delete', authenticate, requireRole('admin'), async (req, res) => {
  const file = path.basename(req.body?.fileName || '');
  const filePath = path.join(backupsDir, file);
  if (!file || !fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  await fsp.unlink(filePath);
  res.json({ message: 'Deleted' });
});

// =============================================
// SPECIAL ROUTES
// =============================================

// Bookings with joins (like supabase select with relations)
app.get('/api/bookings-full', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const result = await query(`
      SELECT b.*, p.name as package_name, p.type as package_type, p.duration_days, p.price as package_price,
             m.name as moallem_name, m.phone as moallem_phone
      FROM bookings b
      LEFT JOIN packages p ON b.package_id = p.id
      LEFT JOIN moallems m ON b.moallem_id = m.id
      ORDER BY b.created_at DESC
    `);
    // Format to match supabase nested structure
    const bookings = result.rows.map(row => ({
      ...row,
      packages: { name: row.package_name, type: row.package_type, duration_days: row.duration_days, price: row.package_price },
      moallems: row.moallem_name ? { name: row.moallem_name, phone: row.moallem_phone } : null,
    }));
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Views
app.get('/api/views/booking-profit', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const result = await query('SELECT * FROM v_booking_profit ORDER BY tracking_id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/views/customer-profit', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const result = await query('SELECT * FROM v_customer_profit');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/views/package-profit', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const result = await query('SELECT * FROM v_package_profit');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Track booking (public)
app.get('/api/track/:trackingId', async (req, res) => {
  try {
    const result = await query(`
      SELECT b.id, b.tracking_id, b.status, b.total_amount, b.paid_amount, b.due_amount,
             b.num_travelers, b.guest_name, b.created_at,
             p.name as package_name, p.type as package_type, p.duration_days
      FROM bookings b LEFT JOIN packages p ON b.package_id = p.id
      WHERE b.tracking_id = $1
    `, [req.params.trackingId.toUpperCase()]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Booking not found' });

    const payments = await query(
      'SELECT amount, status, due_date, paid_at, installment_number FROM payments WHERE booking_id = $1 ORDER BY installment_number',
      [result.rows[0].id]
    );
    res.json({ booking: result.rows[0], payments: payments.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// File + Storage helpers
const sanitizeStoragePath = (input = '') =>
  String(input)
    .replace(/\\/g, '/')
    .split('/')
    .filter((p) => p && p !== '.' && p !== '..')
    .join('/');

const uploadsRoot = path.join(__dirname, 'uploads');

// File upload
app.post('/api/upload', optionalAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const bucket = sanitizeStoragePath(req.body?.bucket || 'misc');
    const requestedPath = sanitizeStoragePath(req.body?.path || req.file.originalname);
    const finalRelative = path.join(bucket, requestedPath).replace(/\\/g, '/');
    const finalAbsolute = path.join(uploadsRoot, finalRelative);

    await fsp.mkdir(path.dirname(finalAbsolute), { recursive: true });
    await fsp.rename(req.file.path, finalAbsolute);

    res.json({
      file_path: `/uploads/${finalRelative}`,
      file_name: req.file.originalname,
      file_size: req.file.size,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Storage list
app.get('/api/storage/:bucket/list', authenticate, async (req, res) => {
  try {
    const bucket = sanitizeStoragePath(req.params.bucket);
    const prefix = sanitizeStoragePath(req.query.prefix || '');
    const dirPath = path.join(uploadsRoot, bucket, prefix);
    await fsp.mkdir(dirPath, { recursive: true });
    const entries = await fsp.readdir(dirPath, { withFileTypes: true });

    const files = await Promise.all(
      entries
        .filter((e) => e.isFile())
        .map(async (e) => {
          const full = path.join(dirPath, e.name);
          const stat = await fsp.stat(full);
          return {
            name: e.name,
            id: `${bucket}/${prefix}/${e.name}`.replace(/\/+/g, '/'),
            created_at: stat.birthtime.toISOString(),
            updated_at: stat.mtime.toISOString(),
            metadata: { size: stat.size },
          };
        })
    );

    res.json(files.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Storage download
app.get('/api/storage/:bucket/download', authenticate, async (req, res) => {
  try {
    const bucket = sanitizeStoragePath(req.params.bucket);
    const filePath = sanitizeStoragePath(req.query.path || '');
    if (!filePath) return res.status(400).json({ error: 'File path required' });

    const absolutePath = path.join(uploadsRoot, bucket, filePath);
    if (!fs.existsSync(absolutePath)) return res.status(404).json({ error: 'File not found' });

    res.download(absolutePath, path.basename(filePath));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Storage delete
app.delete('/api/storage/:bucket', authenticate, async (req, res) => {
  try {
    const bucket = sanitizeStoragePath(req.params.bucket);
    const paths = Array.isArray(req.body?.paths) ? req.body.paths : [];

    for (const p of paths) {
      const safe = sanitizeStoragePath(p);
      if (!safe) continue;
      const absolutePath = path.join(uploadsRoot, bucket, safe);
      if (fs.existsSync(absolutePath)) await fsp.unlink(absolutePath);
    }

    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================
// =============================================
// CREATE GUEST BOOKING (public)
// =============================================
app.post('/api/create-guest-booking', async (req, res) => {
  try {
    const body = req.body;
    // Support both camelCase (frontend) and snake_case field names
    const guest_name = body.guest_name || body.fullName;
    const guest_phone = body.guest_phone || body.phone;
    const guest_email = body.guest_email || body.email;
    const guest_address = body.guest_address || body.address;
    const guest_passport = body.guest_passport || body.passportNumber;
    const package_id = body.package_id || body.packageId;
    const num_travelers = body.num_travelers || body.numTravelers;
    const installment_plan_id = body.installment_plan_id || body.installmentPlanId;
    const notes = body.notes;
    const payment_method = body.payment_method || body.paymentMethod;
    if (!guest_name || !guest_phone || !package_id) {
      return res.status(400).json({ error: 'guest_name, guest_phone, and package_id are required' });
    }

    // Fetch active package
    const pkgResult = await query('SELECT * FROM packages WHERE id = $1 AND is_active = true', [package_id]);
    if (!pkgResult.rows[0]) return res.status(404).json({ error: 'Package not found or inactive' });
    const pkg = pkgResult.rows[0];

    const travelers = Math.max(1, Number(num_travelers) || 1);
    const sellingPricePerPerson = Number(pkg.price) || 0;
    const totalAmount = sellingPricePerPerson * travelers;

    // Insert booking with full financial fields
    const bookingResult = await query(
      `INSERT INTO bookings (package_id, total_amount, due_amount, num_travelers, guest_name, guest_phone, guest_email, guest_address, guest_passport, notes, status, booking_type, selling_price_per_person, paid_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', 'individual', $11, 0)
       RETURNING *`,
      [package_id, totalAmount, totalAmount, travelers, guest_name, guest_phone, guest_email || null, guest_address || null, guest_passport || null, notes ? `${notes}${payment_method ? ` | Payment Method: ${payment_method}` : ''}` : (payment_method ? `Payment Method: ${payment_method}` : null), sellingPricePerPerson]
    );

    const booking = bookingResult.rows[0];

    // Generate installment schedule if plan selected
    if (installment_plan_id) {
      const planResult = await query('SELECT * FROM installment_plans WHERE id = $1 AND is_active = true', [installment_plan_id]);
      if (planResult.rows[0]) {
        const plan = planResult.rows[0];
        const installmentAmount = Math.ceil(totalAmount / plan.num_installments);
        for (let i = 1; i <= plan.num_installments; i++) {
          const dueDate = new Date();
          dueDate.setMonth(dueDate.getMonth() + i);
          await query(
            `INSERT INTO payments (booking_id, user_id, amount, installment_number, due_date, status)
             VALUES ($1, $2, $3, $4, $5, 'pending')`,
            [booking.id, booking.user_id || '00000000-0000-0000-0000-000000000000', i === plan.num_installments ? totalAmount - installmentAmount * (plan.num_installments - 1) : installmentAmount, i, dueDate.toISOString()]
          );
        }
      }
    }

    // Send email notification if Resend is configured
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (RESEND_API_KEY && guest_email) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: process.env.NOTIFICATION_FROM_EMAIL || 'Hasan Travels <noreply@hasantravels.com.bd>',
            to: [guest_email],
            subject: `Booking Confirmed - ${booking.tracking_id}`,
            html: `<h2>Your Booking is Confirmed!</h2><p>Tracking ID: <strong>${booking.tracking_id}</strong></p><p>Package: ${pkg.name}</p><p>Total: ৳${totalAmount.toLocaleString()}</p><p>Thank you for choosing Hasan Travels.</p>`,
          }),
        });
      } catch (emailErr) {
        console.error('Booking email notification failed:', emailErr.message);
      }
    }

    res.status(201).json({ success: true, booking_id: booking.id, tracking_id: booking.tracking_id });
  } catch (err) {
    console.error('POST /api/create-guest-booking error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// =============================================
// VERIFY INVOICE (public)
// =============================================
app.post('/api/verify-invoice', async (req, res) => {
  try {
    const { tracking_id } = req.body;
    if (!tracking_id || typeof tracking_id !== 'string') {
      return res.status(400).json({ error: 'tracking_id is required' });
    }

    const result = await query(
      `SELECT b.tracking_id, b.total_amount, b.paid_amount, b.due_amount, b.status, b.created_at, b.num_travelers, b.guest_name,
              json_build_object('name', p.name, 'type', p.type) as packages
       FROM bookings b LEFT JOIN packages p ON b.package_id = p.id
       WHERE b.tracking_id = $1 LIMIT 1`,
      [tracking_id.toUpperCase()]
    );

    if (!result.rows[0]) return res.json({ booking: null });

    const data = result.rows[0];
    res.json({
      booking: {
        tracking_id: data.tracking_id,
        total_amount: data.total_amount,
        paid_amount: data.paid_amount,
        due_amount: data.due_amount,
        status: data.status,
        created_at: data.created_at,
        num_travelers: data.num_travelers,
        guest_name: data.guest_name,
        packages: data.packages,
      }
    });
  } catch (err) {
    console.error('POST /api/verify-invoice error:', err.message);
    res.status(400).json({ error: 'Invalid request' });
  }
});

// =============================================
// SEND NOTIFICATION (admin only)
// =============================================
app.post('/api/send-notification', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { type, channels, user_id, booking_id, custom_subject, custom_message, sms_message } = req.body;
    if (!type || !channels || !user_id) {
      return res.status(400).json({ error: 'type, channels, and user_id are required' });
    }

    // Fetch user profile
    const profileResult = await query('SELECT * FROM profiles WHERE user_id = $1', [user_id]);
    const profile = profileResult.rows[0];
    if (!profile) return res.status(404).json({ error: 'User profile not found' });

    // Fetch booking if provided
    let booking = null;
    if (booking_id) {
      const bResult = await query(
        `SELECT b.*, p.name as package_name, p.type as package_type FROM bookings b LEFT JOIN packages p ON b.package_id = p.id WHERE b.id = $1`,
        [booking_id]
      );
      booking = bResult.rows[0];
    }

    const results = [];
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    // Send email
    if (channels.includes('email') && profile.email && RESEND_API_KEY) {
      try {
        const subject = custom_subject || `Notification: ${type}`;
        const html = custom_message || `<p>Booking ${booking?.tracking_id || ''} - Status: ${booking?.status || 'N/A'}</p>`;
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: process.env.NOTIFICATION_FROM_EMAIL || 'Hasan Travels <noreply@hasantravels.com.bd>',
            to: [profile.email],
            subject,
            html,
          }),
        });
        const status = emailRes.ok ? 'sent' : 'failed';
        results.push({ channel: 'email', status });

        await query(
          `INSERT INTO notification_logs (user_id, booking_id, event_type, channel, recipient, subject, message, status)
           VALUES ($1, $2, $3, 'email', $4, $5, $6, $7)`,
          [user_id, booking_id || null, type, profile.email, subject, html, status]
        );
      } catch (e) {
        results.push({ channel: 'email', status: 'failed', error: e.message });
      }
    }

    // Send SMS
    if (channels.includes('sms') && profile.phone) {
      const BULKSMS_API_KEY = process.env.BULKSMS_API_KEY;
      if (BULKSMS_API_KEY) {
        try {
          const smsMessage = sms_message || custom_message || `Hasan Travels: Booking ${booking?.tracking_id || ''} - ${type}`;
          const smsRes = await fetch(`https://bulksmsbd.net/api/smsapi?api_key=${BULKSMS_API_KEY}&type=text&number=${profile.phone}&senderid=${process.env.BULKSMS_SENDER_ID || 'HASAN TRAVELS'}&message=${encodeURIComponent(smsMessage)}`);
          const status = smsRes.ok ? 'sent' : 'failed';
          results.push({ channel: 'sms', status });

          await query(
            `INSERT INTO notification_logs (user_id, booking_id, event_type, channel, recipient, message, status)
             VALUES ($1, $2, $3, 'sms', $4, $5, $6)`,
            [user_id, booking_id || null, type, profile.phone, smsMessage, status]
          );
        } catch (e) {
          results.push({ channel: 'sms', status: 'failed', error: e.message });
        }
      }
    }

    res.json({ success: true, results });
  } catch (err) {
    console.error('POST /api/send-notification error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// =============================================
// CONTACT FORM EMAIL
// =============================================
const escapeHtml = (str) => {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
};

app.post('/api/contact', async (req, res) => {
  try {
    const { name, phone, email, service, message } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const CONTACT_EMAIL = 'info@hasantravels.com.bd';

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return res.status(500).json({ error: 'Email service not configured' });
    }

    const safeName = escapeHtml(name);
    const safePhone = escapeHtml(phone);
    const safeEmail = escapeHtml(email);
    const safeService = escapeHtml(service);
    const safeMessage = escapeHtml(message);

    const htmlBody = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#b8860b;border-bottom:2px solid #b8860b;padding-bottom:10px;">📩 New Contact Form Submission</h2>
        <table style="width:100%;border-collapse:collapse;margin-top:15px;">
          <tr><td style="padding:8px;font-weight:bold;color:#555;width:120px;">Name:</td><td style="padding:8px;">${safeName}</td></tr>
          <tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:bold;color:#555;">Phone:</td><td style="padding:8px;">${safePhone}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;color:#555;">Email:</td><td style="padding:8px;">${safeEmail || 'Not provided'}</td></tr>
          <tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:bold;color:#555;">Service:</td><td style="padding:8px;">${safeService || 'Not selected'}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;color:#555;vertical-align:top;">Message:</td><td style="padding:8px;">${safeMessage || 'No message'}</td></tr>
        </table>
        <p style="color:#999;font-size:12px;margin-top:20px;">Sent from Hasan Travels website contact form</p>
      </div>
    `;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.NOTIFICATION_FROM_EMAIL || 'Hasan Travels <noreply@hasantravels.com.bd>',
        to: [CONTACT_EMAIL],
        subject: `New Contact: ${name} - ${service || 'General Inquiry'}`,
        html: htmlBody,
        reply_to: email || undefined,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      console.error('Resend error:', err);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    res.json({ success: true, message: 'Email sent successfully' });
  } catch (err) {
    console.error('Contact email error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================
// SEND OTP (public)
// =============================================
app.post('/api/send-otp', async (req, res) => {
  try {
    const { phone, action, code } = req.body;
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ error: 'Invalid phone number' });
    }
    const sanitizedPhone = toLocalPhone(phone);
    const smsNumber = toSmsPhone(phone);
    const phoneCandidates = Array.from(new Set([
      sanitizedPhone,
      smsNumber,
      String(phone).replace(/\D/g, ''),
      `+${smsNumber}`,
    ].filter(Boolean)));

    if (sanitizedPhone.length < 10 || sanitizedPhone.length > 15) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    if (action === 'send') {
      // Check if there's a profile or guest booking with this phone
      const profileCheck = await query('SELECT user_id FROM profiles WHERE phone = ANY($1::text[]) LIMIT 1', [phoneCandidates]);
      const bookingCheck = await query('SELECT id FROM bookings WHERE guest_phone = ANY($1::text[]) LIMIT 1', [phoneCandidates]);

      if (!profileCheck.rows[0] && !bookingCheck.rows[0]) {
        return res.status(404).json({ error: 'এই নম্বরে কোনো বুকিং পাওয়া যায়নি। আগে বুকিং করুন।' });
      }

      // Rate limit: max 3 OTPs per phone in last 5 minutes
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const rateCheck = await query(
        'SELECT COUNT(*) as cnt FROM otp_codes WHERE phone = $1 AND created_at >= $2',
        [sanitizedPhone, fiveMinAgo]
      );
      if (parseInt(rateCheck.rows[0]?.cnt || '0') >= 3) {
        return res.status(429).json({ error: 'অনেক বেশি OTP অনুরোধ। ৫ মিনিট অপেক্ষা করুন।' });
      }

      const otpCode = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      // Send SMS
      const smsApiKey = process.env.BULKSMSBD_API_KEY;
      const smsSenderId = process.env.BULKSMSBD_SENDER_ID || '8809617618686';
      if (!smsApiKey) {
        return res.status(500).json({ error: 'SMS service not configured' });
      }

      const message = `Hasan Travels OTP is ${otpCode}`;
      const smsUrl = `https://bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(smsApiKey)}&type=text&number=${encodeURIComponent(smsNumber)}&senderid=${encodeURIComponent(smsSenderId)}&message=${encodeURIComponent(message)}`;
      let smsText = '';
      let smsHttpStatus = 0;
      try {
        const smsRes = await fetch(smsUrl);
        smsHttpStatus = smsRes.status;
        smsText = await smsRes.text();
      } catch (fetchErr) {
        console.error('OTP SMS fetch error:', fetchErr.message);
        return res.status(502).json({ error: 'SMS service unreachable. Please try again.' });
      }
      console.log('SMS result:', { status: smsHttpStatus, body: smsText });

      if (!isSmsAccepted(smsText)) {
        console.error('OTP SMS failed:', { smsNumber, httpStatus: smsHttpStatus, smsText });
        return res.status(502).json({ error: 'SMS delivery failed. Please check SMS configuration.' });
      }

      await query('INSERT INTO otp_codes (phone, code, expires_at) VALUES ($1, $2, $3)', [sanitizedPhone, otpCode, expiresAt]);

      return res.json({ success: true, message: 'OTP sent successfully' });

    } else if (action === 'verify') {
      if (!code || typeof code !== 'string' || code.length !== 6) {
        return res.status(400).json({ error: 'Invalid OTP code' });
      }

      const otpResult = await query(
        `SELECT * FROM otp_codes WHERE phone = $1 AND code = $2 AND verified = false AND expires_at >= $3 ORDER BY created_at DESC LIMIT 1`,
        [sanitizedPhone, code, new Date().toISOString()]
      );

      if (!otpResult.rows[0]) {
        return res.status(401).json({ error: 'ভুল বা মেয়াদোত্তীর্ণ OTP' });
      }

      // Mark as verified
      await query('UPDATE otp_codes SET verified = true WHERE id = $1', [otpResult.rows[0].id]);

      // Find user by phone in profiles
      const profileResult = await query('SELECT user_id FROM profiles WHERE phone = ANY($1::text[]) LIMIT 1', [phoneCandidates]);
      let userId = profileResult.rows[0]?.user_id;

      // If no profile found, auto-create from guest booking
      if (!userId) {
        const guestResult = await query(
          'SELECT id, guest_name, guest_phone, guest_email, guest_address, guest_passport FROM bookings WHERE guest_phone = ANY($1::text[]) ORDER BY created_at DESC LIMIT 1',
          [phoneCandidates]
        );

        if (!guestResult.rows[0]) {
          return res.status(404).json({ error: 'এই নম্বরে কোনো অ্যাকাউন্ট বা বুকিং পাওয়া যায়নি।' });
        }

        const guestBooking = guestResult.rows[0];

        // Use Supabase admin API to create auth user
        const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
          const { createClient } = require('@supabase/supabase-js');
          const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

          const tempEmail = `${sanitizedPhone.replace(/\+/g, '')}@phone.hasantravels.com.bd`;
          const tempPassword = require('uuid').v4() + 'Aa1!';

          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: guestBooking.guest_email || tempEmail,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { full_name: guestBooking.guest_name || '', phone: sanitizedPhone },
          });

          if (createError) {
            if (createError.message?.includes('already') || createError.message?.includes('exists')) {
              const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
              const existingUser = existingUsers?.users?.find(u => u.email === (guestBooking.guest_email || tempEmail));
              if (existingUser) {
                userId = existingUser.id;
                // Upsert profile
                const existingProfile = await query('SELECT id FROM profiles WHERE user_id = $1', [userId]);
                if (existingProfile.rows[0]) {
                  await query('UPDATE profiles SET phone = $1, full_name = COALESCE(full_name, $2) WHERE user_id = $3', [sanitizedPhone, guestBooking.guest_name || '', userId]);
                } else {
                  await query('INSERT INTO profiles (user_id, phone, full_name, email) VALUES ($1, $2, $3, $4)', [userId, sanitizedPhone, guestBooking.guest_name || '', guestBooking.guest_email || null]);
                }
              }
            }
          } else if (newUser?.user) {
            userId = newUser.user.id;
            await query('INSERT INTO profiles (user_id, full_name, phone, email, address, passport_number) VALUES ($1, $2, $3, $4, $5, $6)',
              [userId, guestBooking.guest_name || '', sanitizedPhone, guestBooking.guest_email || null, guestBooking.guest_address || null, guestBooking.guest_passport || null]);
            await query('INSERT INTO user_roles (user_id, role) VALUES ($1, $2)', [userId, 'user']);
          }

          // Link all guest bookings to this user
          if (userId) {
            await query('UPDATE bookings SET user_id = $1 WHERE guest_phone = $2 AND user_id IS NULL', [userId, sanitizedPhone]);
            // Link payments
            const userBookings = await query('SELECT id FROM bookings WHERE user_id = $1', [userId]);
            if (userBookings.rows.length) {
              const bookingIds = userBookings.rows.map(b => b.id);
              await query(`UPDATE payments SET user_id = $1 WHERE booking_id = ANY($2) AND user_id = '00000000-0000-0000-0000-000000000000'`, [userId, bookingIds]);
            }
          }

          if (!userId) {
            return res.status(500).json({ error: 'অ্যাকাউন্ট তৈরি করতে সমস্যা হয়েছে।' });
          }

          // Generate magic link tokens
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
          if (!authUser?.user?.email) {
            return res.status(500).json({ error: 'User account issue. Please contact support.' });
          }

          const { data: magicLink, error: magicError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: authUser.user.email,
          });

          if (magicError) {
            return res.status(500).json({ error: 'Authentication failed' });
          }

          return res.json({
            success: true,
            access_token: magicLink.properties?.access_token,
            refresh_token: magicLink.properties?.refresh_token,
            user_id: userId,
          });
        } else {
          return res.status(500).json({ error: 'Auth service not configured' });
        }
      } else {
        // Existing user - generate magic link
        const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
          return res.status(500).json({ error: 'Auth service not configured' });
        }
        const { createClient } = require('@supabase/supabase-js');
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (!authUser?.user?.email) {
          return res.status(500).json({ error: 'User account issue.' });
        }

        const { data: magicLink, error: magicError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: authUser.user.email,
        });

        if (magicError) {
          return res.status(500).json({ error: 'Authentication failed' });
        }

        return res.json({
          success: true,
          access_token: magicLink.properties?.access_token,
          refresh_token: magicLink.properties?.refresh_token,
          user_id: userId,
        });
      }
    }

    return res.status(400).json({ error: "Invalid action. Use 'send' or 'verify'." });
  } catch (err) {
    console.error('POST /api/send-otp error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// =============================================
// UPLOAD BOOKING DOCUMENT (public)
// =============================================
app.post('/api/upload-booking-document', upload.single('file'), async (req, res) => {
  try {
    const bookingId = req.body.booking_id;
    const trackingId = req.body.tracking_id;
    const documentType = req.body.document_type;
    const file = req.file;

    if (!bookingId || !trackingId || !documentType || !file) {
      return res.status(400).json({ error: 'Missing required fields: booking_id, tracking_id, document_type, file' });
    }

    // Verify booking exists
    const bookingResult = await query('SELECT id, user_id, guest_name FROM bookings WHERE id = $1 AND tracking_id = $2', [bookingId, trackingId]);
    if (!bookingResult.rows[0]) {
      return res.status(404).json({ error: 'Booking not found or tracking ID mismatch' });
    }

    const booking = bookingResult.rows[0];
    const userId = booking.user_id || '00000000-0000-0000-0000-000000000000';

    // Move file to proper location
    const ext = file.originalname.split('.').pop() || 'jpg';
    const relativePath = `booking-documents/${userId}/${bookingId}/${documentType}_${Date.now()}.${ext}`;
    const absolutePath = path.join(uploadsRoot, relativePath);

    await fsp.mkdir(path.dirname(absolutePath), { recursive: true });
    await fsp.rename(file.path, absolutePath);

    const filePath = `/uploads/${relativePath}`;

    // Insert document record
    await query(
      'INSERT INTO booking_documents (booking_id, user_id, document_type, file_name, file_path, file_size) VALUES ($1, $2, $3, $4, $5, $6)',
      [bookingId, userId, documentType, file.originalname, filePath, file.size]
    );

    res.json({ success: true, file_path: filePath });
  } catch (err) {
    console.error('POST /api/upload-booking-document error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// =============================================
// =============================================
// DUE REMINDER + 2FA
// =============================================
const cron = require('node-cron');
const { runDueReminderJob } = require('./services/dueReminder');
const twoFA = require('./services/twoFactor');

// Manual trigger (admin only)
app.post('/api/due-reminder/run', authenticate, requireRole('admin'), async (_req, res) => {
  try {
    const result = await runDueReminderJob();
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Daily at 09:30 Asia/Dhaka
if (process.env.DISABLE_CRON !== '1') {
  cron.schedule('30 9 * * *', () => {
    runDueReminderJob().catch((e) => console.error('[due-reminder] failed:', e.message));
  }, { timezone: 'Asia/Dhaka' });
  console.log('⏰ Due-reminder cron scheduled: daily 09:30 Asia/Dhaka');
}

// === 2FA ROUTES ===
app.get('/api/2fa/status', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const s = await twoFA.getSettings(req.user.id);
    res.json({
      sms_enabled: s?.sms_enabled || false,
      sms_phone: s?.sms_phone || null,
      totp_enabled: s?.totp_enabled || false,
      has_pending_totp: !!s?.totp_secret_pending,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/2fa/sms/enable', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { phone } = req.body || {};
    if (!phone) return res.status(400).json({ error: 'phone required' });
    await twoFA.setSmsEnabled(req.user.id, true, phone);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/2fa/sms/disable', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await twoFA.setSmsEnabled(req.user.id, false, null);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/2fa/totp/setup', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const setup = await twoFA.generateTotpSetup(req.user.id, req.user.email);
    res.json(setup);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/2fa/totp/confirm', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: 'token required' });
    const ok = await twoFA.confirmTotpEnable(req.user.id, token);
    if (!ok) return res.status(401).json({ error: 'Invalid TOTP code' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/2fa/totp/disable', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await twoFA.disableTotp(req.user.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Step-2 login: send SMS OTP
app.post('/api/2fa/login/send-sms', async (req, res) => {
  try {
    const { user_id } = req.body || {};
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    const s = await twoFA.getSettings(user_id);
    if (!s?.sms_enabled || !s.sms_phone) return res.status(400).json({ error: 'SMS 2FA not enabled' });
    await twoFA.sendSmsOtp(user_id, s.sms_phone);
    res.json({ success: true, masked_phone: s.sms_phone.replace(/.(?=.{4})/g, '*') });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Step-2 login: verify (SMS or TOTP)
app.post('/api/2fa/login/verify', async (req, res) => {
  try {
    const { user_id, method, code } = req.body || {};
    if (!user_id || !method || !code) return res.status(400).json({ error: 'user_id, method, code required' });
    const s = await twoFA.getSettings(user_id);
    if (!s) return res.status(400).json({ error: '2FA not configured' });
    let ok = false;
    if (method === 'sms') ok = await twoFA.verifySmsOtp(user_id, code);
    else if (method === 'totp' && s.totp_enabled && s.totp_secret) {
      ok = twoFA.verifyTotpCode(s.totp_secret, code);
    }
    res.json({ success: ok });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// =============================================
// ONLINE PAYMENT (SSLCommerz)
// =============================================
const sslcz = require('./services/sslcommerz');

const getBaseUrl = (req) => process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;

// =============================================
// PUBLIC BOOKING ENDPOINTS (Phase 2)
// =============================================

app.get('/api/public/services', async (req, res) => {
  try {
    const r = await query(`SELECT code, name_en, name_bn, description, icon, sort_order
      FROM services WHERE is_active = true ORDER BY sort_order ASC`);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/public/services/:code/packages', async (req, res) => {
  try {
    const { code } = req.params;
    const { country } = req.query;
    const params = [code];
    let sql = `SELECT * FROM service_packages
      WHERE service_code = $1 AND status = 'active' AND show_on_website = true`;
    if (country) { params.push(country); sql += ` AND country = $${params.length}`; }
    sql += ` ORDER BY sort_order ASC, created_at DESC`;
    const r = await query(sql, params);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/public/payment-methods', async (req, res) => {
  try {
    const r = await query(`SELECT pm.code, pm.name, pm.type, pm.requires_proof, pm.is_online,
        pm.config, w.account_no, w.name as wallet_name
      FROM payment_methods pm
      LEFT JOIN wallets w ON pm.wallet_id = w.id
      WHERE pm.is_active = true ORDER BY pm.sort_order ASC`);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/public/cms/:page', async (req, res) => {
  try {
    const r = await query(`SELECT section_key, content, sort_order FROM cms_sections
      WHERE page = $1 AND is_visible = true ORDER BY sort_order ASC`, [req.params.page]);
    const map = {};
    r.rows.forEach((row) => { map[row.section_key] = row.content; });
    res.json(map);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/public/site-settings', async (req, res) => {
  try {
    const r = await query(`SELECT key, value FROM site_settings`);
    const map = {};
    r.rows.forEach((row) => { map[row.key] = row.value; });
    res.json(map);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/public/menu', async (req, res) => {
  try {
    const r = await query(`SELECT id, label_en, label_bn, href, parent_id, target, sort_order
      FROM menu_items WHERE is_visible = true ORDER BY sort_order ASC`);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Create a new application
app.post('/api/public/applications', optionalAuth, async (req, res) => {
  try {
    const {
      service_code, package_id,
      customer = {},
      application_data = {},
      total_amount = 0,
    } = req.body || {};

    if (!service_code || !customer.full_name || !customer.phone) {
      return res.status(400).json({ error: 'service_code, customer name and phone are required' });
    }

    const svc = await query('SELECT code FROM services WHERE code=$1 AND is_active=true', [service_code]);
    if (!svc.rows[0]) return res.status(400).json({ error: 'Invalid service' });

    const normalizedPhone = String(customer.phone).trim();
    let customerId;
    const existing = await query(
      `SELECT id FROM customers WHERE phone=$1 AND status <> 'deleted' LIMIT 1`,
      [normalizedPhone]
    );
    if (existing.rows[0]) {
      customerId = existing.rows[0].id;
      await query(
        `UPDATE customers SET
           full_name = COALESCE(NULLIF($2,''), full_name),
           email     = COALESCE(NULLIF($3,''), email),
           nid_number = COALESCE(NULLIF($4,''), nid_number),
           passport_number = COALESCE(NULLIF($5,''), passport_number),
           address   = COALESCE(NULLIF($6,''), address),
           city      = COALESCE(NULLIF($7,''), city),
           updated_at = now()
         WHERE id=$1`,
        [customerId, customer.full_name, customer.email || '', customer.nid_number || '',
          customer.passport_number || '', customer.address || '', customer.city || '']
      );
    } else {
      const ins = await query(
        `INSERT INTO customers (user_id, full_name, phone, email, nid_number, passport_number,
            date_of_birth, address, city, emergency_contact)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [
          req.user?.id || null, customer.full_name, normalizedPhone,
          customer.email || null, customer.nid_number || null, customer.passport_number || null,
          customer.date_of_birth || null, customer.address || null, customer.city || null,
          customer.emergency_contact || null,
        ]
      );
      customerId = ins.rows[0].id;
    }

    let finalAmount = Number(total_amount) || 0;
    if (package_id) {
      const pk = await query('SELECT base_price FROM service_packages WHERE id=$1', [package_id]);
      if (pk.rows[0]) finalAmount = Number(pk.rows[0].base_price);
    }

    const app = await query(
      `INSERT INTO applications (service_code, package_id, customer_id, application_data,
          total_amount, due_amount, source)
       VALUES ($1,$2,$3,$4::jsonb,$5,$5,'website') RETURNING *`,
      [service_code, package_id || null, customerId, JSON.stringify(application_data || {}), finalAmount]
    );

    await query(
      `INSERT INTO application_status_history (application_id, to_status, note)
       VALUES ($1, 'submitted', 'Submitted via website')`,
      [app.rows[0].id]
    );

    // Fire-and-forget SMS to applicant
    notifications.notify('application_submitted', {
      phone: normalizedPhone,
      userId: req.user?.id || null,
      data: {
        name: customer.full_name,
        tracking: app.rows[0].tracking_id,
        service: service_code,
      },
    }).catch(() => {});

    res.json({ success: true, application: app.rows[0] });
  } catch (e) {
    console.error('POST /api/public/applications error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/public/applications/:id/documents', optionalAuth, async (req, res) => {
  try {
    const { doc_type, file_name, file_path, file_size, mime_type } = req.body || {};
    if (!doc_type || !file_path) return res.status(400).json({ error: 'doc_type and file_path required' });
    const r = await query(
      `INSERT INTO application_documents (application_id, doc_type, file_name, file_path, file_size, mime_type, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.params.id, doc_type, file_name || 'document', file_path, file_size || null, mime_type || null, req.user?.id || null]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/public/payments/manual', optionalAuth, async (req, res) => {
  try {
    const { application_id, tracking_id, amount, method_code, transaction_ref, proof_file_path, notes } = req.body || {};
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'Invalid amount' });
    if (!method_code) return res.status(400).json({ error: 'method_code required' });

    let appRow;
    if (application_id) {
      const r = await query('SELECT id, customer_id, due_amount FROM applications WHERE id=$1', [application_id]);
      appRow = r.rows[0];
    } else if (tracking_id) {
      const r = await query('SELECT id, customer_id, due_amount FROM applications WHERE tracking_id=$1', [tracking_id]);
      appRow = r.rows[0];
    }
    if (!appRow) return res.status(404).json({ error: 'Application not found' });

    const method = await query('SELECT code, wallet_id, requires_proof FROM payment_methods WHERE code=$1 AND is_active=true', [method_code]);
    if (!method.rows[0]) return res.status(400).json({ error: 'Invalid payment method' });
    if (method.rows[0].requires_proof && !proof_file_path) {
      return res.status(400).json({ error: 'Payment proof is required for this method' });
    }

    const r = await query(
      `INSERT INTO payments (application_id, customer_id, amount, method_code, wallet_id,
          transaction_ref, proof_file_path, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8) RETURNING *`,
      [appRow.id, appRow.customer_id, amount, method_code, method.rows[0].wallet_id,
        transaction_ref || null, proof_file_path || null, notes || null]
    );

    // Notify customer that payment submission was received
    try {
      const cust = await query(
        `SELECT full_name, phone FROM customers WHERE id = $1`,
        [appRow.customer_id],
      );
      const trackR = await query(
        `SELECT tracking_id FROM applications WHERE id = $1`,
        [appRow.id],
      );
      if (cust.rows[0]?.phone) {
        notifications.notify('payment_submitted', {
          phone: cust.rows[0].phone,
          data: {
            name: cust.rows[0].full_name,
            tracking: trackR.rows[0]?.tracking_id || '',
            amount: Number(amount).toLocaleString(),
          },
        }).catch(() => {});
      }
    } catch {}

    res.json({ success: true, payment: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/public/track/:tracking_id', async (req, res) => {
  try {
    const { tracking_id } = req.params;
    const { phone } = req.query;

    const r = await query(`
      SELECT a.id, a.tracking_id, a.status, a.total_amount, a.paid_amount, a.due_amount,
             a.application_data, a.created_at, a.updated_at,
             s.name_en as service_name, s.code as service_code,
             c.full_name, c.phone, c.email
      FROM applications a
      JOIN customers c ON a.customer_id = c.id
      LEFT JOIN services s ON a.service_code = s.code
      WHERE a.tracking_id = $1
    `, [tracking_id]);

    if (!r.rows[0]) return res.status(404).json({ error: 'Application not found' });
    const application = r.rows[0];

    if (phone && String(application.phone).replace(/\D/g, '').slice(-9) !== String(phone).replace(/\D/g, '').slice(-9)) {
      return res.status(403).json({ error: 'Phone does not match' });
    }

    const docs = await query('SELECT id, doc_type, file_name, file_path, verified, created_at FROM application_documents WHERE application_id=$1 ORDER BY created_at DESC', [application.id]);
    const pays = await query('SELECT id, amount, method_code, status, transaction_ref, paid_at, created_at FROM payments WHERE application_id=$1 ORDER BY created_at DESC', [application.id]);
    const hist = await query('SELECT to_status, note, changed_at FROM application_status_history WHERE application_id=$1 ORDER BY changed_at DESC', [application.id]);

    res.json({ application, documents: docs.rows, payments: pays.rows, history: hist.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/my/applications', authenticate, async (req, res) => {
  try {
    let cust = await query('SELECT id FROM customers WHERE user_id=$1', [req.user.id]);
    if (!cust.rows[0] && req.user.phone) {
      cust = await query('SELECT id FROM customers WHERE phone=$1', [req.user.phone]);
    }
    if (!cust.rows[0]) return res.json([]);

    const r = await query(`
      SELECT a.id, a.tracking_id, a.status, a.total_amount, a.paid_amount, a.due_amount,
             a.created_at, s.name_en as service_name, s.code as service_code
      FROM applications a
      LEFT JOIN services s ON a.service_code = s.code
      WHERE a.customer_id = $1
      ORDER BY a.created_at DESC
    `, [cust.rows[0].id]);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Initiate online payment session — works for guest (tracking_id) or logged-in customer
app.post('/api/payments/online/initiate', optionalAuth, async (req, res) => {
  try {
    const { application_id, tracking_id, amount, customer } = req.body || {};
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'Invalid amount' });

    let app;
    if (application_id) {
      const r = await query('SELECT id, customer_id, tracking_id, due_amount FROM applications WHERE id=$1', [application_id]);
      app = r.rows[0];
    } else if (tracking_id) {
      const r = await query('SELECT id, customer_id, tracking_id, due_amount FROM applications WHERE tracking_id=$1', [tracking_id]);
      app = r.rows[0];
    }
    if (!app) return res.status(404).json({ error: 'Application not found' });
    if (Number(amount) > Number(app.due_amount || 0) + 0.01) {
      return res.status(400).json({ error: `Amount exceeds due (৳${app.due_amount})` });
    }

    const tran_id = `${app.tracking_id}-${Date.now()}`;
    const sessionRes = await query(
      `INSERT INTO online_payment_sessions (tran_id, application_id, customer_id, amount)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [tran_id, app.id, app.customer_id, amount]
    );

    const baseUrl = getBaseUrl(req);
    const init = await sslcz.initSession({
      tran_id,
      amount,
      customer: customer || {},
      productName: `Al Rawsha Application ${app.tracking_id}`,
      urls: {
        success: `${baseUrl}/api/payments/online/callback/success`,
        fail: `${baseUrl}/api/payments/online/callback/fail`,
        cancel: `${baseUrl}/api/payments/online/callback/cancel`,
        ipn: `${baseUrl}/api/payments/online/ipn`,
      },
    });

    res.json({ success: true, gateway_url: init.GatewayPageURL, tran_id, session_id: sessionRes.rows[0].id });
  } catch (e) {
    console.error('initiate online payment error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// SSLCommerz callback handler — POST form data, then redirect user to SPA
const handleCallback = (resultStatus) => async (req, res) => {
  try {
    const { tran_id, val_id, status } = req.body || {};
    const sessionRes = await query('SELECT * FROM online_payment_sessions WHERE tran_id=$1', [tran_id]);
    const session = sessionRes.rows[0];
    if (!session) return res.redirect(`/payment/fail?reason=invalid_session`);

    if (resultStatus === 'success' && val_id) {
      const validation = await sslcz.validateTransaction(val_id);
      if (validation.status === 'VALID' || validation.status === 'VALIDATED') {
        await sslcz.markSessionPaid(session, { ...req.body, ...validation });
        return res.redirect(`/payment/success?tran=${encodeURIComponent(tran_id)}`);
      }
      await query("UPDATE online_payment_sessions SET status='failed', gateway_response=$1, updated_at=now() WHERE id=$2",
        [JSON.stringify({ ...req.body, validation }), session.id]);
      return res.redirect(`/payment/fail?tran=${encodeURIComponent(tran_id)}&reason=invalid`);
    }

    await query("UPDATE online_payment_sessions SET status=$1, gateway_response=$2, updated_at=now() WHERE id=$3",
      [resultStatus === 'cancel' ? 'cancelled' : 'failed', JSON.stringify(req.body), session.id]);
    res.redirect(`/payment/${resultStatus}?tran=${encodeURIComponent(tran_id)}`);
  } catch (e) {
    console.error(`SSLCZ ${resultStatus} callback error:`, e.message);
    res.redirect(`/payment/fail?reason=server_error`);
  }
};

// SSLCommerz POSTs to these URLs (form-urlencoded)
app.use('/api/payments/online/callback', express.urlencoded({ extended: true }));
app.post('/api/payments/online/callback/success', handleCallback('success'));
app.post('/api/payments/online/callback/fail', handleCallback('fail'));
app.post('/api/payments/online/callback/cancel', handleCallback('cancel'));

// IPN — server-to-server final confirmation
app.post('/api/payments/online/ipn', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const { tran_id, val_id, status } = req.body || {};
    const sessionRes = await query('SELECT * FROM online_payment_sessions WHERE tran_id=$1', [tran_id]);
    const session = sessionRes.rows[0];
    if (!session) return res.status(404).json({ error: 'session not found' });
    if (session.status === 'success') return res.json({ ok: true, already: true });

    if (status === 'VALID' && val_id) {
      const validation = await sslcz.validateTransaction(val_id);
      if (validation.status === 'VALID' || validation.status === 'VALIDATED') {
        await sslcz.markSessionPaid(session, { ...req.body, ...validation });
        return res.json({ ok: true });
      }
    }
    res.json({ ok: false });
  } catch (e) {
    console.error('IPN error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Public lookup — used by /payment/success page
app.get('/api/payments/online/session/:tran_id', async (req, res) => {
  try {
    const r = await query(
      `SELECT ops.tran_id, ops.status, ops.amount, ops.created_at, a.tracking_id
       FROM online_payment_sessions ops LEFT JOIN applications a ON a.id=ops.application_id
       WHERE ops.tran_id=$1`, [req.params.tran_id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// =============================================
// SERVE FRONTEND (production)
// =============================================
const frontendPath = path.join(__dirname, '..', 'dist');
app.use(express.static(frontendPath));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  }
});

// =============================================
// START
// =============================================
app.listen(PORT, () => {
  console.log(`🚀 Hasan Travels API running on port ${PORT}`);
  console.log(`📁 Serving frontend from ${frontendPath}`);
});
