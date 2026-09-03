# Activar la revisión semanal (Fase 4)

Sin esto, la app sigue funcionando y en modo local (sin Supabase) la
revisión se genera igual — con reglas fijas, al abrir Progreso, porque ahí
no hay servidor donde esconder la clave de Anthropic. Estos pasos activan
la versión completa: generación automática cada domingo, para todos los
usuarios, con IA y fallback a reglas si falla.

Necesitas: un proyecto de Supabase configurado, la
[CLI de Supabase](https://supabase.com/docs/guides/cli) instalada y logueada
(`supabase login`), el proyecto vinculado (`supabase link --project-ref <ref>`),
y la Edge Function `ai-coach` ya desplegada con `ANTHROPIC_API_KEY` fijada
(si no, ver el propio código de `supabase/functions/ai-coach` — la clave se
comparte entre ambas funciones).

## 1. Aplicar la migración nueva

```
supabase db push
```

Crea la tabla `weekly_reviews`. Solo lectura y actualización de
`proposal_status` para el propio usuario (aceptar/mantener) — las filas las
escribe exclusivamente esta función, con la service role key.

## 2. Desplegar la función

```
supabase functions deploy weekly-review
```

No necesita secretos propios: reutiliza `ANTHROPIC_API_KEY` y
`ANTHROPIC_MODEL` (si no están fijados, la función cae directamente al
fallback de reglas — nunca falla por falta de clave). `SUPABASE_URL` y
`SUPABASE_SERVICE_ROLE_KEY` los da el runtime automáticamente.

Anota la URL que imprime el deploy, algo como:
`https://<project-ref>.supabase.co/functions/v1/weekly-review`

## 3. Programar el cron (cada domingo a las 8:00 UTC)

Pega esto en el SQL Editor del panel de Supabase, sustituyendo
`<project-ref>` y `<anon-key>` por los tuyos:

```sql
select cron.schedule(
  'weekly-review',
  '0 8 * * 0',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/weekly-review',
    headers := jsonb_build_object('Authorization', 'Bearer <anon-key>', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);
```

Ajusta la hora (`0 8 * * 0`, formato cron: minuto hora * * domingo) si
prefieres otra franja UTC.

## 4. Probar sin esperar a domingo

Invoca la función a mano una vez desplegada:

```
curl -X POST https://<project-ref>.supabase.co/functions/v1/weekly-review \
  -H "Authorization: Bearer <anon-key>"
```

Responde con `{"contractsDue": N, "generated": N, "aiUsed": N}`. Si algún
usuario tiene un contrato activo desde hace al menos una semana, debería
aparecer su revisión en Progreso al recargar.

Para probar sin esperar una semana real de datos: crea un contrato de
prueba con `started_on` de hace 8+ días (editando la fila directamente en
el SQL Editor es lo más rápido) y algún registro en las tablas de
actividad (sueño, comidas, sesiones…) en esos días.

Para desactivar el cron más adelante: `select cron.unschedule('weekly-review');`
