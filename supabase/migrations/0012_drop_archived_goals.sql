-- Veltra — retirar las tablas de Metas, archivadas desde la Fase 1.
--
-- Metas fue una feature completa (src/features/goals) que se borró a
-- propósito en el colapso a Hoy/Progreso/Perfil. Desde entonces las tablas
-- siguen ahí sin que nada las lea ni las escriba: la migración 0006 ya lo
-- decía por escrito ("Goals está archivado (Fase 1) y no lo usa ninguna
-- feature activa"). Se retiran ahora junto con sus tipos de TypeScript y
-- sus stores de IndexedDB, porque una tabla huérfana con tipos vivos hace
-- creer que la feature existe.
--
-- SOLO se borran si están vacías — mismo criterio que usó 0006 con estas
-- mismas tablas: nunca se borran datos reales de forma automática. Si
-- tuvieras metas guardadas, esta migración no hace nada y las tablas se
-- quedan como están; en ese caso el borrado es una decisión tuya, a mano,
-- después de exportar lo que quieras conservar.
--
-- Apply with the Supabase CLI (o pegándolo en el SQL editor):
--   supabase db push
--
-- Rollback: `create table` de 0006 las devuelve vacías. Las filas no, si
-- las hubiera habido — por eso el guardia de arriba.

do $$
begin
  if to_regclass('public.goals') is not null
     and not exists (select 1 from public.goals limit 1)
     and (to_regclass('public.goal_checkpoints') is null or not exists (select 1 from public.goal_checkpoints limit 1))
  then
    -- El orden importa: goal_checkpoints referencia a goals.
    drop table if exists public.goal_checkpoints;
    drop table if exists public.goals;
  end if;
end $$;
