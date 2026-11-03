-- Schedules the check worker every minute. The bearer token is read from Vault by name,
-- so this file stays safe to commit; create the secret once with:
--   select vault.create_secret('<RUN_DUE_CHECKS_TOKEN>', 'mone_run_due_checks_token');
select cron.unschedule('mone-run-due-checks')
where exists (select 1 from cron.job where jobname = 'mone-run-due-checks');

select cron.schedule(
  'mone-run-due-checks',
  '* * * * *',
  $$
    select net.http_post(
      url := 'https://ibnggtllzkvcbxwyfiub.supabase.co/functions/v1/run-due-checks',
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'authorization', 'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'mone_run_due_checks_token'
          limit 1
        )
      ),
      body := '{}'::jsonb
    );
  $$
);
