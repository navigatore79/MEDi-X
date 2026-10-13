-- No HTTP requests or push dispatch. All synthetic rows disappear on rollback.
begin;
create temporary table call_fixture as select gen_random_uuid() patient, gen_random_uuid() doctor, gen_random_uuid() outsider;
grant select on call_fixture to authenticated;
insert into auth.users(id,raw_user_meta_data)
select x.id,'{"full_name":"TURN AUDIT SYNTHETIC"}'::jsonb from call_fixture f
cross join lateral (values(f.patient),(f.doctor),(f.outsider)) x(id);
update public.profiles set role='Clinician',account_active=true where id=(select doctor from call_fixture);
insert into public.patient_clinicians(patient_id,clinician_id) select patient,doctor from call_fixture;
set local role authenticated;
do $$
declare f record; c public.voice_calls; blocked boolean; i integer;
begin
 select * into f from call_fixture;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f.doctor,'role','authenticated','aal','aal2')::text,true);
 perform public.request_turn_credentials();
 c:=public.start_media_call(f.patient,'video');
 assert c.media_mode='video' and c.status='ringing','Video creation';
 perform public.send_voice_call_signal(c.id,'offer','{"type":"offer","sdp":"synthetic-only"}');
 blocked:=false;
 begin perform public.start_voice_call(f.patient); exception when others then if sqlerrm='CALL_BUSY' then blocked:=true;else raise;end if;end;
 assert blocked,'Busy guard';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f.outsider,'role','authenticated')::text,true);
 assert not exists(select 1 from public.voice_calls where id=c.id),'Call RLS isolation';
 assert not exists(select 1 from public.voice_call_signals where call_id=c.id),'Signal RLS isolation';
 blocked:=false;
 begin perform public.request_turn_credentials(); exception when others then if sqlerrm='Not authorized' then blocked:=true;else raise;end if;end;
 assert blocked,'Unlinked TURN credentials';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f.patient,'role','authenticated')::text,true);
 perform public.request_turn_credentials();
 blocked:=false;
 begin perform public.send_voice_call_signal(c.id,'answer','{}'); exception when others then if sqlerrm='Not authorized' then blocked:=true;else raise;end if;end;
 assert blocked,'Answer before consent';
 c:=public.update_voice_call(c.id,'accept'); assert c.status='accepted','Accept';
 perform public.send_voice_call_signal(c.id,'answer','{"type":"answer","sdp":"synthetic-only"}');
 c:=public.update_voice_call(c.id,'end'); assert c.status='ended','End';
 assert not exists(select 1 from public.voice_call_signals where call_id=c.id),'Signal cleanup';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f.doctor,'role','authenticated','aal','aal2')::text,true);
 c:=public.start_voice_call(f.patient); assert c.media_mode='audio','Audio creation';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f.patient,'role','authenticated')::text,true);
 c:=public.update_voice_call(c.id,'reject'); assert c.status='rejected','Reject';
 -- One initial credential request above plus five requests are allowed.
 for i in 1..5 loop perform public.request_turn_credentials();end loop;
 blocked:=false;
 begin perform public.request_turn_credentials(); exception when others then if sqlerrm='TURN_RATE_LIMIT' then blocked:=true;else raise;end if;end;
 assert blocked,'Minute quota';
end $$;
reset role;
update private.turn_credential_usage set minute_start=clock_timestamp()-interval '2 minutes',day_start=(clock_timestamp() at time zone 'UTC')::date,day_count=100 where user_id=(select patient from call_fixture);
set local role authenticated;
do $$
declare f record; blocked boolean:=false;
begin
 select * into f from call_fixture;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',f.patient,'role','authenticated')::text,true);
 begin perform public.request_turn_credentials();exception when others then if sqlerrm='TURN_RATE_LIMIT' then blocked:=true;else raise;end if;end;
 assert blocked,'Daily quota';
end $$;
reset role;
update private.turn_credential_usage set day_start=(clock_timestamp() at time zone 'UTC')::date-1 where user_id=(select patient from call_fixture);
set local role authenticated;
do $$
begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',(select patient from call_fixture),'role','authenticated')::text,true);
 perform public.request_turn_credentials();
end $$;
reset role;
update public.patient_clinicians set active=false where patient_id=(select patient from call_fixture);
set local role authenticated;
do $$
declare blocked boolean:=false;
begin
 begin perform public.request_turn_credentials();exception when others then if sqlerrm='Not authorized' then blocked:=true;else raise;end if;end;
 assert blocked,'Revoked relationship';
end $$;
rollback;
select 'PASS: synthetic audio/video, busy, consent, RLS, accept/reject/end, cleanup, quotas, reset, revocation; rollback' as result;
