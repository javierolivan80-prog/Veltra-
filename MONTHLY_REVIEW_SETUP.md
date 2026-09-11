# Activar la revisión mensual (Fase 6)

Sin esto, la app sigue funcionando y en modo local (sin Supabase) la
revisión se genera igual — con reglas fijas, al abrir Progreso, porque ahí
no hay servidor donde esconder la clave de Anthropic. Estos pasos activan
la versión completa: generación automática el día 1 de cada mes, para
todos los usuarios, con IA y fallback a reglas si falla. Mismo patrón que
`WEEKLY_REVIEW_SETUP.md` — repetido aquí porque es otra función y otro cron.

Necesitas: un proyecto de Supabase configurado, la
[CLI de Supabase](https://supabase.com/docs/guides/cli) instalada y logueada
(`supabase login`), el proyecto vinculado (`supabase link --project-ref <ref>`),
y la Edge Function `ai-coach` ya desplegada con `ANTHROPIC_API_KEY` fijada
(si no, ver el propio código de `supabase/functions/ai-coach` — la clave se
comparte entre las tres funciones de revisión/coach).

## 1. Aplicar la migración nueva

```
supabase db push
```

Crea la tabla `monthly_reviews`. Solo lectura para el propio usuario — a
diferencia de `weekly_reviews`, no hay columna de propuesta que aceptar o
mantener, así que tampoco hace falta policy de update.

## 2. Desplegar la función

```
supabase functions deploy monthly-review
```

No necesita secretos propios: reutiliza `ANTHROPIC_API_KEY` y
`ANTHROPIC_MODEL` (si no están fijados, la función cae directamente al
fallback de reglas — nunca falla por falta de clave). `SUPABASE_URL` y
`SUPABASE_SERVICE_ROLE_KEY` los da el runtime automáticamente.

Anota la URL que imprime el deploy, algo como:
`https://<project-ref>.supabase.co/functions/v1/monthly-review`

## 3. Programar el cron (día 1 de cada mes a las 8:00 UTC)

Pega esto en el SQL Editor del panel de Supabase, sustituyendo
`<project-ref>` y `<anon-key>` por los tuyos:

```sql
select cron.schedule(
  'monthly-review',
  '0 8 1 * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/monthly-review',
    headers := jsonb_build_object('Authorization', 'Bearer <anon-key>', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);
```

## 4. Probar sin esperar al día 1

Invoca la función a mano una vez desplegada:

```
curl -X POST https://<project-ref>.supabase.co/functions/v1/monthly-review \
  -H "Authorization: Bearer <anon-key>"
```

Responde con `{"contractsDue": N, "generated": N, "aiUsed": N}`. Solo genera
revisión para usuarios con un contrato activo desde antes del mes natural
que acaba de cerrarse — para probar sin esperar un mes real de datos: crea
un contrato de prueba con `started_on` de hace 2+ meses (editando la fila
directamente en el SQL Editor es lo más rápido) y algún registro en las
tablas de actividad (sueño, comidas, sesiones…) durante el mes anterior al
actual.

Para desactivar el cron más adelante: `select cron.unschedule('monthly-review');`
