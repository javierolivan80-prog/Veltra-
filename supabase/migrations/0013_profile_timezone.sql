-- Veltra — zona horaria del usuario en profile.
--
-- habits.timezone existe desde la 0004, pero es el único sitio que la
-- guarda. Los avisos de racha en riesgo del contrato (Hoy) necesitan saber
-- la hora local del usuario igual que send-streak-nudges lo hace para
-- Hábitos, y el contrato no tiene una zona horaria propia donde mirar —
-- vive en el perfil, una por usuario, no por compromiso.
--
-- Nullable y sin default: los perfiles existentes se quedan sin ella hasta
-- que el cliente la capture en el siguiente guardado (mismo patrón que
-- habits.timezone ya usa). Sin ella, el aviso simplemente no se manda para
-- ese usuario — no hay hora local con la que decidir cuándo.

alter table profile add column if not exists timezone text;
