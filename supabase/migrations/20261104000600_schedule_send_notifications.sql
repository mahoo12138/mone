-- Drains the notification queue every minute, alongside the check worker.
select cron.unschedule('mone-send-notifications')
where exists (select 1 from cron.job where jobname = 'mone-send-notifications');

select cron.schedule(
  'mone-send-notifications',
  '* * * * *',
  $$
    select net.http_post(
      url := 'https://ibnggtllzkvcbxwyfiub.supabase.co/functions/v1/send-notifications',
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
