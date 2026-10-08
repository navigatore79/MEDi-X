alter table public.voice_calls add column media_mode text not null default 'audio' check(media_mode in ('audio','video'));
create function public.start_media_call(p_patient uuid,p_mode text) returns public.voice_calls
language plpgsql security definer set search_path='' as $$
declare c public.voice_calls;
begin
 if p_mode is null or p_mode not in ('audio','video') then raise exception 'Invalid media mode';end if;
 -- The existing RPC verifies MFA, active accounts and the patient relationship,
 -- and serializes both participants before creating the call.
 c:=public.start_voice_call(p_patient);
 update public.voice_calls set media_mode=p_mode where id=c.id returning * into c;
 return c;
end $$;
revoke all on function public.start_media_call(uuid,text) from public,anon;
grant execute on function public.start_media_call(uuid,text) to authenticated;
