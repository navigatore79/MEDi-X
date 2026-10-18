alter table public.medical_reports add column if not exists specialty_code text not null default 'unclassified';
create or replace function public.submit_care_questionnaire_offline(p_assignment uuid,p_answers jsonb,p_response_date date)
returns uuid language plpgsql security invoker set search_path='' as $$
declare a public.care_questionnaire_assignments; q jsonb; answer text; result_id uuid; message_body text; existing_answers jsonb;
begin
 if auth.uid() is null then raise exception 'Accesso richiesto'; end if;
 select * into a from public.care_questionnaire_assignments where id=p_assignment and patient_id=auth.uid() and active;
 if a.id is null or not exists(select 1 from public.patient_clinicians where patient_id=auth.uid() and clinician_id=a.clinician_id and active) then raise exception 'Questionario non assegnato o collegamento non attivo'; end if;
 if p_response_date is null or p_response_date > (now() at time zone 'Europe/Rome')::date or p_response_date < (now() at time zone 'Europe/Rome')::date-30 or p_response_date < (a.created_at at time zone 'Europe/Rome')::date then raise exception 'Data di compilazione non valida'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text||p_assignment::text||p_response_date::text,0));
 select id,answers into result_id,existing_answers from public.care_questionnaire_responses where assignment_id=a.id and response_date=p_response_date;
 if result_id is not null then
  if existing_answers<>p_answers then raise exception 'Esiste già un questionario diverso per questa giornata. Contatta il medico.';end if;
  return result_id;
 end if;
 if p_answers is null or jsonb_typeof(p_answers)<>'object' or pg_column_size(p_answers)>40000 then raise exception 'Risposte non valide';end if;
 message_body:='Questionario quotidiano: '||a.title||E'\nCompilato il: '||p_response_date::text;
 for q in select value from jsonb_array_elements(a.questions) loop
  answer:=p_answers->>(q->>'id');
  if coalesce((q->>'required')::boolean,false) and coalesce(btrim(answer),'')='' then raise exception 'Completa le domande obbligatorie';end if;
  if length(coalesce(answer,''))>1000 then raise exception 'Risposta troppo lunga';end if;
  if q->>'type'='choice' and coalesce(answer,'')<>'' and not(q->'options' ? answer) then raise exception 'Risposta non ammessa';end if;
  message_body:=message_body||E'\n'||(q->>'label')||': '||coalesce(answer,'—');
 end loop;
 insert into public.care_questionnaire_responses(assignment_id,patient_id,response_date,answers) values(a.id,auth.uid(),p_response_date,p_answers) returning id into result_id;
 insert into public.chat_messages(sender_id,recipient_id,body) values(auth.uid(),a.clinician_id,message_body);
 return result_id;
end $$;
revoke all on function public.submit_care_questionnaire_offline(uuid,jsonb,date) from public,anon;
grant execute on function public.submit_care_questionnaire_offline(uuid,jsonb,date) to authenticated;
alter policy care_response_create on public.care_questionnaire_responses with check (
 patient_id=(select auth.uid()) and response_date between ((now() at time zone 'Europe/Rome')::date-30) and (now() at time zone 'Europe/Rome')::date
 and exists(select 1 from public.care_questionnaire_assignments a join public.patient_clinicians l on l.patient_id=a.patient_id and l.clinician_id=a.clinician_id and l.active where a.id=assignment_id and a.patient_id=(select auth.uid()) and a.active and response_date >= (a.created_at at time zone 'Europe/Rome')::date)
);
