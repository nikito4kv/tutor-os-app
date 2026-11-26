-- 0013_admin_stats_v2.sql — динамический служебный дашборд (срез 11, модуль M1).
-- Расширяем admin_stats() новыми АГРЕГАТАМИ (дельты, уроки по статусам, сигналы
-- активации/оттока). Граница ADR-0003 не двигается: только COUNT, ни одной строки
-- student/lesson за пределы БД. Старые 4 ключа сохраняются (backward-compatible).
-- Гейт is_admin() повторяется здесь — это независимый слой защиты БД.
--
-- Счётчики инбокса (admin_feedback_counts) добавит отдельная миграция вместе с
-- модулем M3 — не заводим неиспользуемую функцию заранее.

create or replace function public.admin_stats()
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  d7  timestamptz := now() - interval '7 days';
  d30 timestamptz := now() - interval '30 days';
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return json_build_object(
    -- существующие ключи (имена неизменны)
    'tutors',        (select count(*) from public.tutor),
    'students',      (select count(*) from public.student),
    'lessons',       (select count(*) from public.lesson),
    'feedback_new',  (select count(*) from public.feedback where status = 'new'),
    -- дельты за 7 дней (по created_at)
    'tutors_new_7d',   (select count(*) from public.tutor   where created_at >= d7),
    'students_new_7d', (select count(*) from public.student where created_at >= d7),
    -- уроки по статусам (схема lesson: scheduled|done|canceled|no_show)
    'lessons_scheduled', (select count(*) from public.lesson where status = 'scheduled'),
    'lessons_done',      (select count(*) from public.lesson where status = 'done'),
    'lessons_canceled',  (select count(*) from public.lesson where status = 'canceled'),
    'lessons_no_show',   (select count(*) from public.lesson where status = 'no_show'),
    -- пульс активности: проведено за неделю (completed_at нет → по starts_at)
    'lessons_done_7d',   (select count(*) from public.lesson
                            where status = 'done' and starts_at >= d7),
    -- активация: репетиторы без единого ученика
    'tutors_no_students', (select count(*) from public.tutor t
                             where not exists (
                               select 1 from public.student s where s.tutor_id = t.id)),
    -- отток: репетиторы без уроков за 30 дней
    'tutors_inactive_30d', (select count(*) from public.tutor t
                              where not exists (
                                select 1
                                from public.lesson l
                                join public.student s on s.id = l.student_id
                                where s.tutor_id = t.id and l.starts_at >= d30))
  );
end
$$;

notify pgrst, 'reload schema';
