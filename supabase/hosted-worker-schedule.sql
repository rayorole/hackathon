-- Apply once in the shared project's SQL editor after provisioning OPENAI_API_KEY.
-- The token remains inside Supabase Vault; never print it or put it in source control.
begin;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
do $$
declare worker_token text;
begin
  select decrypted_secret into worker_token from vault.decrypted_secrets where name='straatbeeld_worker_token';
  if worker_token is null then
    worker_token := encode(extensions.gen_random_bytes(32),'hex');
    perform vault.create_secret(worker_token,'straatbeeld_worker_token','Authorizes only the municipal research function');
  end if;
  update public.straatbeeld_ai_budget set worker_secret_hash=encode(extensions.digest(worker_token,'sha256'),'hex') where id=true;
end $$;
select cron.schedule('straatbeeld-municipal-research','* * * * *', $job$
 select net.http_post(
   url := 'https://qsyxwwllwhhrwjhrfehf.supabase.co/functions/v1/municipal-research',
   headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='straatbeeld_worker_token')),
   body := '{}'::jsonb,
   timeout_milliseconds := 130000
 );
$job$);
commit;
