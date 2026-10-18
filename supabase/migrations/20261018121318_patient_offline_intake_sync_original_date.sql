create policy "patient offline intake insert" on public.medication_intakes for insert to authenticated with check (
 patient_id=(select auth.uid()) and intake_date between (now() at time zone 'Europe/Rome')::date-30 and (now() at time zone 'Europe/Rome')::date
 and (confirmed_at at time zone 'Europe/Rome')::date=intake_date and confirmed_at<=now()+interval '5 minutes'
 and exists(select 1 from public.medication_schedules s join public.medications m on m.id=s.medication_id where s.id=medication_schedule_id and m.patient_id=(select auth.uid()) and m.active and (m.starts_on is null or m.starts_on<=intake_date) and (m.ends_on is null or m.ends_on>=intake_date))
);
create policy "patient offline intake update" on public.medication_intakes for update to authenticated using (
 patient_id=(select auth.uid()) and intake_date between (now() at time zone 'Europe/Rome')::date-30 and (now() at time zone 'Europe/Rome')::date
) with check (
 patient_id=(select auth.uid()) and intake_date between (now() at time zone 'Europe/Rome')::date-30 and (now() at time zone 'Europe/Rome')::date
 and (confirmed_at at time zone 'Europe/Rome')::date=intake_date and confirmed_at<=now()+interval '5 minutes'
 and exists(select 1 from public.medication_schedules s join public.medications m on m.id=s.medication_id where s.id=medication_schedule_id and m.patient_id=(select auth.uid()) and m.active and (m.starts_on is null or m.starts_on<=intake_date) and (m.ends_on is null or m.ends_on>=intake_date))
);
