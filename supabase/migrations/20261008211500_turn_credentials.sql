-- Operational counters only: no tokens, ICE credentials or medical content.
create table private.turn_credential_usage (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 minute_start timestamptz not null,
 minute_count integer not null,
 day_start date not null,
 day_count integer not null
);
alter table private.turn_credential_usage enable row level security;
revoke all on private.turn_credential_usage from public,anon,authenticated;
create function public.request_turn_credentials() returns void
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); c private.turn_credential_usage; t timestamptz:=clock_timestamp();
begin
 if v_uid is null or not exists(
 select 1 from public.patient_clinicians pc
 join public.profiles d on d.id=pc.clinician_id and d.role='Clinician' and d.account_active
 join public.profiles p on p.id=pc.patient_id and p.role='Patient' and p.account_active
 where pc.active and ((pc.patient_id=v_uid and private.my_role()='Patient') or (pc.clinician_id=v_uid and private.is_clinician_aal2())))
 then raise exception 'Not authorized';end if;
 perform pg_advisory_xact_lock(hashtextextended('turn-credentials:'||v_uid::text,0));
 select * into c from private.turn_credential_usage where user_id=v_uid for update;
 if not found then
 insert into private.turn_credential_usage values(v_uid,t,1,(t at time zone 'UTC')::date,1);return;
 end if;
 if t>=c.minute_start+interval '1 minute' then c.minute_start:=t;c.minute_count:=0;end if;
 if c.day_start<>(t at time zone 'UTC')::date then c.day_start:=(t at time zone 'UTC')::date;c.day_count:=0;end if;
 if c.minute_count>=6 or c.day_count>=100 then raise exception 'TURN_RATE_LIMIT';end if;
 update private.turn_credential_usage set minute_start=c.minute_start,minute_count=c.minute_count+1,day_start=c.day_start,day_count=c.day_count+1 where user_id=v_uid;
end $$;
revoke all on function public.request_turn_credentials() from public,anon;
grant execute on function public.request_turn_credentials() to authenticated;
