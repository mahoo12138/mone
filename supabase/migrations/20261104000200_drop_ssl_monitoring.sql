-- SSL certificate monitoring is removed: the Supabase Edge Runtime cannot read certificate
-- validity dates (node:tls getPeerCertificate returns only subject/subjectaltname and
-- Deno.startTls exposes no peerCertificate), so expiry alerting is not implementable here.

delete from public.monitors where type = 'ssl';

alter table public.monitors drop constraint if exists monitors_type_check;
alter table public.monitors add constraint monitors_type_check check (type in ('http', 'tcp'));

alter table public.monitors drop constraint if exists monitors_config_shape;
alter table public.monitors add constraint monitors_config_shape check (
  (type = 'http' and config ? 'url' and config ? 'method' and config ? 'timeout_ms')
  or (type = 'tcp' and config ? 'host' and config ? 'port' and config ? 'timeout_ms')
);

alter table public.monitors drop column if exists last_ssl_expiring_notified_at;

alter table public.notification_deliveries drop constraint if exists notification_deliveries_event_type_check;
alter table public.notification_deliveries add constraint notification_deliveries_event_type_check
  check (event_type in ('down', 'recovered'));
