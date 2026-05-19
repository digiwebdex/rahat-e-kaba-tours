-- Phase 7: add SMS event keys for application & payment events
INSERT INTO notification_settings (event_key, event_label) VALUES
  ('application_submitted', 'Application Submitted'),
  ('payment_submitted', 'Payment Submitted (Pending Verification)'),
  ('application_status_changed', 'Application Status Changed')
ON CONFLICT (event_key) DO NOTHING;