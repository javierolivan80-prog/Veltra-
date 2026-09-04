# Activar notificaciones en segundo plano (Hábitos)

Sin esto, Hábitos funciona igual (crear hábitos, responder, rachas, calendario),
pero los avisos solo aparecen dentro de la app ("Pendientes hoy"), no como
notificación real con el navegador cerrado. Estos pasos activan el aviso real.

Necesitas: un proyecto de Supabase configurado (`.env.local` con
`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`) y la
[CLI de Supabase](https://supabase.com/docs/guides/cli) instalada y logueada
(`supabase login`), con el proyecto vinculado (`supabase link --project-ref <ref>`).

## 1. Aplicar las migraciones nuevas

```
supabase db push
```

Esto crea las tablas de Hábitos/Sueño/Adicciones y `push_subscriptions`, y
habilita las extensiones `pg_cron`/`pg_net` que necesita el paso 4.

## 2. Generar las claves VAPID

```
npx web-push generate-vapid-keys
```

Copia la clave pública a `.env.local`:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<la clave pública>
```

## 3. Desplegar la función y sus secretos

```
supabase functions deploy send-habit-reminders
supabase secrets set VAPID_PUBLIC_KEY=<la clave pública>
supabase secrets set VAPID_PRIVATE_KEY=<la clave privada>
supabase secrets set VAPID_SUBJECT=mailto:tu-email@ejemplo.com
```

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya están disponibles
automáticamente dentro de cualquier Edge Function — no hace falta fijarlos.

Anota la URL que imprime el deploy, algo como:
`https://<project-ref>.supabase.co/functions/v1/send-habit-reminders`

## 4. Programar el cron (cada minuto)

Pega esto en el SQL Editor del panel de Supabase, sustituyendo `<project-ref>`
y `<anon-key>` (o una service role key) por los tuyos:

```sql
select cron.schedule(
  'send-habit-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/send-habit-reminders',
    headers := jsonb_build_object('Authorization', 'Bearer <anon-key>', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);
```

## 5. Probar

Abre Veltra en Chrome, entra en Hábitos con al menos un hábito creado, y
pulsa "Activar" en el banner de notificaciones. Acepta el permiso del
navegador. Crea (o edita) un hábito con la hora de notificación puesta a
1-2 minutos en el futuro y espera — debería llegar el aviso real, incluso
con la pestaña cerrada.

Para desactivar el cron más adelante: `select cron.unschedule('send-habit-reminders');`

## 6. Aviso de racha en riesgo (opcional, misma infraestructura)

Segunda función, independiente de la anterior: cada día a las 20:30 (hora
local de cada usuario, tomada de sus hábitos), si alguno lleva racha de 3
días o más y hoy todavía no está marcado, manda un único push avisando.
Usa los mismos secretos VAPID ya configurados en el paso 3 — no hace falta
repetirlos.

```
supabase functions deploy send-streak-nudges
```

Y el cron, igual que el paso 4 pero apuntando a esta función:

```sql
select cron.schedule(
  'send-streak-nudges',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/send-streak-nudges',
    headers := jsonb_build_object('Authorization', 'Bearer <anon-key>', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);
```

Para probarlo sin esperar al final del día, cambia `NUDGE_TIME` en
`supabase/functions/send-streak-nudges/index.ts` a 1-2 minutos en el futuro,
redespliega, y responde "Sí" a un hábito 3 días seguidos primero (sin racha
no hay nada que avisar). Para desactivar: `select cron.unschedule('send-streak-nudges');`
