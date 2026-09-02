-- Veltra — Recuperación deja la navegación principal.
--
-- Adicciones ya no es una pestaña: se activa desde Perfil y, si está activa,
-- aparece como bloque en Hoy. Esta columna guarda esa decisión.
--
-- Migración aditiva: añade una columna con valor por defecto y no toca datos
-- existentes. Quien ya rastreaba adicciones las conserva; solo tiene que
-- volver a activarlas para verlas en Hoy.
--
-- Apply with the Supabase CLI (or paste into the SQL editor):
--   supabase db push
--
-- Rollback:
--   alter table profile drop column if exists recovery_enabled;

alter table profile add column if not exists recovery_enabled boolean not null default false;
