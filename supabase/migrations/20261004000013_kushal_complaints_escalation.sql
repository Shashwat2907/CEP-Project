-- ==============================================================================
-- Migration: 20261004000013_kushal_complaints_escalation.sql
-- Owner: Kushal
-- Description: Automated complaint escalation, idempotency constraints,
--              "needs admin attention" top-level flag, and cron helper function.
-- Source of truth: src/features/complaints/README.md & documents/PLAN.md §5.2
-- ==============================================================================

-- 1. Add top-level "needs admin attention" flag to complaints
ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS needs_admin_attention boolean NOT NULL DEFAULT false;

-- 2. Indexes for efficient query performance during escalation sweeps
CREATE INDEX IF NOT EXISTS idx_complaints_admin_attention
  ON public.complaints(needs_admin_attention)
  WHERE needs_admin_attention = true;

CREATE INDEX IF NOT EXISTS idx_complaints_escalation_due
  ON public.complaints(status, due_at)
  WHERE status NOT IN ('resolved', 'closed');

-- 3. Idempotency guarantee:
-- Ensure a complaint can NEVER be escalated to the same level more than once,
-- even if concurrent cron jobs or double executions occur.
CREATE UNIQUE INDEX IF NOT EXISTS uq_complaint_events_escalation
  ON public.complaint_events (complaint_id, to_level)
  WHERE type = 'escalated';

-- 4. PostgreSQL Stored Procedure for Automated Escalation
-- Can be invoked via Supabase pg_cron, Edge Function, or Next.js Cron Route
CREATE OR REPLACE FUNCTION public.check_and_escalate_overdue_complaints()
RETURNS jsonb AS $$
DECLARE
  v_complaint RECORD;
  v_next_assignee RECORD;
  v_event_id uuid;
  v_escalated_count int := 0;
  v_flagged_admin_count int := 0;
  v_escalated_ids uuid[] := '{}';
  v_flagged_ids uuid[] := '{}';
BEGIN
  -- Iterate through all active, unresolved complaints that breached their SLA
  FOR v_complaint IN
    SELECT 
      c.id,
      c.domain_id,
      c.current_level,
      c.assigned_to,
      c.due_at,
      c.author_id,
      c.title,
      c.needs_admin_attention
    FROM public.complaints c
    WHERE c.status NOT IN ('resolved', 'closed')
      AND c.due_at IS NOT NULL
      AND c.due_at < now()
    ORDER BY c.due_at ASC
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Look for next level assignee in the domain's chain
    SELECT 
      da.level,
      da.role_name,
      da.assignee_id,
      da.sla_hours
    INTO v_next_assignee
    FROM public.domain_assignees da
    WHERE da.domain_id = v_complaint.domain_id
      AND da.level = v_complaint.current_level + 1;

    IF FOUND THEN
      -- Try to insert escalation event; unique partial index protects against duplicate runs
      INSERT INTO public.complaint_events (
        complaint_id,
        type,
        from_level,
        to_level,
        from_status,
        to_status,
        actor_id,
        note
      )
      VALUES (
        v_complaint.id,
        'escalated',
        v_complaint.current_level,
        v_next_assignee.level,
        'in_progress',
        'escalated',
        NULL, -- System automated actor
        'Automated escalation: SLA breached at Level ' || v_complaint.current_level || ' (' || v_next_assignee.role_name || ')'
      )
      ON CONFLICT (complaint_id, to_level) WHERE type = 'escalated'
      DO NOTHING
      RETURNING id INTO v_event_id;

      -- If insertion succeeded (not a duplicate), update the complaint ticket
      IF v_event_id IS NOT NULL THEN
        UPDATE public.complaints
        SET
          current_level = v_next_assignee.level,
          assigned_to = v_next_assignee.assignee_id,
          status = 'escalated',
          due_at = now() + (v_next_assignee.sla_hours || ' hours')::interval,
          updated_at = now()
        WHERE id = v_complaint.id;

        v_escalated_count := v_escalated_count + 1;
        v_escalated_ids := array_append(v_escalated_ids, v_complaint.id);
      END IF;

    ELSE
      -- No further level exists in chain: this was the top-level authority!
      -- Flag as "Needs Admin Attention" if not already flagged
      IF NOT v_complaint.needs_admin_attention THEN
        INSERT INTO public.complaint_events (
          complaint_id,
          type,
          from_level,
          to_level,
          from_status,
          to_status,
          actor_id,
          note
        )
        VALUES (
          v_complaint.id,
          'status_changed',
          v_complaint.current_level,
          v_complaint.current_level,
          'escalated',
          'escalated',
          NULL,
          'Top-level authority SLA breached. Ticket flagged as Needs Admin Attention.'
        );

        UPDATE public.complaints
        SET
          needs_admin_attention = true,
          updated_at = now()
        WHERE id = v_complaint.id;

        v_flagged_admin_count := v_flagged_admin_count + 1;
        v_flagged_ids := array_append(v_flagged_ids, v_complaint.id);
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'escalated_count', v_escalated_count,
    'flagged_admin_count', v_flagged_admin_count,
    'escalated_complaint_ids', v_escalated_ids,
    'flagged_complaint_ids', v_flagged_ids,
    'timestamp', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.check_and_escalate_overdue_complaints() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_escalate_overdue_complaints() TO service_role;
