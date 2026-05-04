
-- Wipe all transactional / content data; preserve schema, admin users, roles, accounts
TRUNCATE TABLE
  public.booking_documents,
  public.booking_members,
  public.payments,
  public.moallem_commission_payments,
  public.moallem_payments,
  public.moallem_items,
  public.supplier_agent_payments,
  public.supplier_agent_items,
  public.supplier_contract_payments,
  public.settlement_items,
  public.settlements,
  public.refunds,
  public.online_payment_sessions,
  public.notification_logs,
  public.audit_logs,
  public.expenses,
  public.daily_cashbook,
  public.hotel_bookings,
  public.hotel_rooms,
  public.hotels,
  public.ticket_bookings,
  public.bookings,
  public.supplier_contracts,
  public.supplier_agents,
  public.moallems,
  public.packages,
  public.blog_posts,
  public.cms_versions,
  public.site_content,
  public.financial_summary,
  public.company_settings
RESTART IDENTITY CASCADE;

-- Remove non-admin profiles only (keep admin/staff accounts)
DELETE FROM public.profiles
WHERE user_id NOT IN (SELECT user_id FROM public.user_roles);

-- Seed fresh PDF/company config for Hasan Travels
INSERT INTO public.company_settings (setting_key, setting_value)
VALUES (
  'pdf_company',
  jsonb_build_object(
    'company_name', 'Hasan Travels',
    'tagline', 'Travel & Tour Services',
    'phone', '',
    'phone2', '',
    'email', 'info@hasantravels.com.bd',
    'address', '',
    'website', 'https://hasantravels.com.bd',
    'footer_text', 'Thank you for choosing Hasan Travels!',
    'footer_contact', 'This is a computer-generated document.'
  )
);
