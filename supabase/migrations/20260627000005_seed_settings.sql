-- ============================================================
-- Migration 005: Default Application Settings (initial seed)
-- Tracked as a migration so it runs exactly once and is
-- recorded in supabase_migrations.schema_migrations.
-- ============================================================

INSERT INTO public.settings (key, value, description) VALUES

  ('session_timeout_hours',
   '8',
   'Number of hours before an idle session is invalidated'),

  ('rate_limit_max_requests',
   '100',
   'Maximum API requests per minute per user'),

  ('default_currency',
   '"INR"',
   'Default currency for fee amounts and payment recording'),

  ('fee_amounts',
   '{
     "registration_fee": 100000,
     "imat_classes": 100000,
     "imat_seat_booking": 50000,
     "admission_process": 250000,
     "visa_process": 250000
   }',
   'Standard fee amounts per category in INR. Overridable per student.'),

  ('notifications_enabled',
   'true',
   'Global toggle for in-app notification generation'),

  ('meta_webhook_enabled',
   'true',
   'Whether the Meta Lead Ads webhook listener is active'),

  ('website_webhook_enabled',
   'true',
   'Whether the website inquiry webhook listener is active'),

  ('default_page_size',
   '25',
   'Default number of rows returned by paginated list endpoints'),

  ('max_page_size',
   '100',
   'Maximum rows a client may request per page'),

  ('password_min_length',
   '8',
   'Minimum password length enforced at the application layer')

ON CONFLICT (key) DO NOTHING;
