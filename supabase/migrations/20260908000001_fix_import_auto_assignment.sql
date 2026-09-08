-- ============================================================
-- Migration: Fix leads that were auto-assigned to the importer
-- ============================================================
-- Root cause: importLeads() in lead.service.ts was setting
--   assigned_counselor_id = user.id
-- for every imported lead, even when the spreadsheet had no
-- counselor-assignment column.
--
-- All 1691 affected leads are assigned to the admin account
-- (id = '223c5aff-7593-4a53-bea5-75bd154c9293') because that
-- user ran the bulk import.  We target exactly those leads while
-- leaving any lead that was subsequently re-assigned via the
-- explicit assign action untouched (safety guard via activity_logs).

UPDATE public.leads
SET
  assigned_counselor_id = NULL,
  updated_at            = now()
WHERE
  deleted_at            IS NULL
  -- Only leads currently auto-assigned to the importing admin
  AND assigned_counselor_id = '223c5aff-7593-4a53-bea5-75bd154c9293'
  -- Skip any that were later explicitly re-assigned by a user
  -- (importLeads never logs an 'assigned' entry for individual leads)
  AND id NOT IN (
    SELECT DISTINCT entity_id
    FROM   public.activity_logs
    WHERE  entity_type = 'lead'
    AND    action      = 'assigned'
  );
