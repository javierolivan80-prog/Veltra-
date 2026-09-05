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

## 7. Aviso de compromiso del contrato a punto de reducirse

Tercera función. Misma idea que el paso 6, pero para los compromisos del
contrato (entrenar, dormir, meditar…) en vez de hábitos propios: si un
compromiso lleva 2 días marcados seguidos sin cumplirse y hoy tampoco está
hecho, avisa citando el "por qué" del contrato — un día antes de que
`detectAutoReductions` reduzca la frecuencia sola al llegar a 3.

Necesita la migración 0013 (`profile.timezone`) aplicada primero — sin
zona horaria en el perfil, la función no tiene ningún usuario que
considerar "due":

```
supabase db push
```

La zona horaria se captura sola la próxima vez que el usuario guarde su
perfil (onboarding, o abrir y guardar Perfil una vez) — no hace falta que
haga nada especial, solo que la app la guarde una vez.

Despliegue, mismos secretos VAPID del paso 3:

```
supabase functions deploy send-commitment-nudges
```

Y el cron:

```sql
select cron.schedule(
  'send-commitment-nudges',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/send-commitment-nudges',
    headers := jsonb_build_object('Authorization', 'Bearer <anon-key>', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);
```

Para probarlo: cambia `NUDGE_TIME` en
`supabase/functions/send-commitment-nudges/index.ts` a 1-2 minutos en el
futuro, redespliega, y deja un compromiso sin marcar 2 días seguidos
primero (con 0 o 1 fallo no hay nada que avisar todavía — y con 3 ya lo
absorbe la reducción automática antes de llegar aquí). Para desactivar:
`select cron.unschedule('send-commitment-nudges');`

## 8. Aviso de reenganche cuando la app entera lleva días sin abrirse

Cuarta función, distinta de las tres anteriores en una cosa: no mira un
hábito ni un compromiso concreto, mira si ha habido *cualquier* actividad
registrada (entrenamiento, sueño, nutrición, meditación, enfoque, diario,
fe, hábitos) en los últimos días. Si el usuario tiene contrato activo con
un "por qué" y lleva exactamente 3 días sin ningún registro en ningún
módulo, manda un único push citando esa razón — igual que
send-commitment-nudges, pero para la app entera en vez de para un
compromiso suelto.

Mismos secretos VAPID del paso 3, sin migraciones nuevas (usa
`profile.timezone` de la 0013, ya aplicada en el paso 7):

```
supabase functions deploy send-reengagement-nudge
```

Y el cron:

```sql
select cron.schedule(
  'send-reengagement-nudge',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/send-reengagement-nudge',
    headers := jsonb_build_object('Authorization', 'Bearer <anon-key>', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);
```

Para probarlo: cambia `NUDGE_TIME` en
`supabase/functions/send-reengagement-nudge/index.ts` a 1-2 minutos en el
futuro, redespliega, y deja pasar 3 días sin registrar nada en ningún
módulo primero (con 0, 1 o 2 días no hay nada que avisar todavía). Para
desactivar: `select cron.unschedule('send-reengagement-nudge');`
