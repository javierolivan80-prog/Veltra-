# Veltra

Veltra no es una app para registrar entrenamientos — es una app para disfrutar viendo cómo progresas. El registro es solo la herramienta; la experiencia gira en torno a la motivación, la sensación de progreso y una estética premium, dark-first.

## Stack

- **Expo (React Native + TypeScript)**, `expo-router` para navegación basada en archivos.
- **NativeWind** (Tailwind para React Native) con la paleta de diseño de Veltra en `src/design-system/colors.js`.
- **SQLite local (`expo-sqlite`)** como fuente de verdad en el dispositivo — la app funciona 100% sin conexión.
- **Supabase** (Postgres + Auth + Edge Functions) como backend en la nube opcional: autenticación real, sincronización multi-dispositivo y el entrenador IA.
- **React Query** para cache/estado de servidor, **Zustand** para estado de UI (sesión de entrenamiento activa, temporizador de descanso).
- **react-native-svg + react-native-reanimated** para las gráficas y animaciones a medida (sin librerías de charts de terceros).

## Cómo se ejecuta hoy en este entorno

Este entorno de desarrollo **no tiene un proyecto Supabase real ni una clave de API de Claude configurados**. Por diseño, eso no bloquea nada:

- Toda la app funciona completamente **offline-first** contra SQLite local. Rutinas, entrenamientos, gráficas, rangos, récords y el chat del entrenador funcionan sin ninguna clave.
- El sistema de login (`app/(auth)/sign-in.tsx`, `sign-up.tsx`) está completamente implementado contra Supabase Auth. Sin claves configuradas, muestra un aviso claro y permite continuar en "modo local".
- El entrenador IA intenta llamar a la Edge Function `ai-coach` (Claude) cuando hay conexión a Supabase; si no la hay (como en este entorno), usa un respondedor local determinista (`src/lib/ai/localCoach.ts`) que **solo usa datos reales del dispositivo** — nunca inventa cifras.
- Puedes explorar la app con datos de ejemplo desde el onboarding ("Explorar con datos de ejemplo"), que genera 10 semanas de historial realista (rutinas, sesiones, PRs, rangos, conversaciones) para ver toda la experiencia sin tener que entrenar semanas de verdad.

## Activar el backend real

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Aplica el esquema:
   ```bash
   supabase link --project-ref <tu-project-ref>
   supabase db push   # aplica supabase/migrations/0001_init.sql
   ```
3. Copia `.env.example` a `.env` y rellena:
   ```
   EXPO_PUBLIC_SUPABASE_URL=...
   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
   ```
4. Despliega la Edge Function del entrenador IA y configura su clave de Claude:
   ```bash
   supabase functions deploy ai-coach
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   ```
5. Reinicia `expo start`. El registro y login pasarán a usar Supabase Auth de verdad, la sincronización se activará automáticamente al recuperar conexión, y el chat usará Claude con memoria real.

## Arquitectura de datos offline-first

- `src/lib/db/schema.ts` — esquema SQLite local.
- `supabase/migrations/0001_init.sql` — mismo esquema en Postgres, con RLS por usuario.
- `src/lib/sync/queue.ts` + `src/lib/sync/syncEngine.ts` — cada escritura local se encola; al recuperar conexión (`@react-native-community/netinfo`) se hace push de lo pendiente y pull de cambios remotos.
- Todas las pantallas leen/escriben siempre en SQLite primero (instantáneo, funciona sin red); la nube es un espejo, no una dependencia.

## Estructura del proyecto

```
app/                     rutas (expo-router)
src/
  design-system/         tokens de color, tipografía, componentes base, gráficas
  features/
    exercises/            repos, estadísticas, fórmulas de 1RM, sistema de rangos, recomendador IA
    routines/              CRUD de rutinas
    workouts/               sesión activa, registro de series, PRs
    coach/                  conversaciones, mensajes, memoria
    profile/                perfil, lesiones, peso corporal
  lib/
    db/                    cliente SQLite, esquema, seed, datos de demo
    sync/                   cola de sincronización + motor de sync con Supabase
    ai/                     contexto del entrenador, cliente IA, respondedor local de fallback
  state/                  Zustand (sesión de entrenamiento, auth, selector de ejercicio)
  types/models.ts         modelo de dominio compartido
supabase/
  migrations/             esquema Postgres + RLS
  functions/ai-coach/     Edge Function (Deno) que llama a Claude
```

## Sistema de rangos

`src/features/exercises/ranks.ts` calcula el rango (Bronce → Elite) por ejercicio a partir de la fuerza relativa (1RM estimado ÷ peso corporal), usando tablas de estándares de fuerza aproximadas por sexo y patrón de movimiento (sentadilla, bisagra de cadera, empuje/tirón horizontal y vertical), ajustadas por edad. Solo se calcula rango para patrones compuestos con un estándar poblacional real — no para aislamiento o cardio.

## Desarrollo

```bash
npm install
npm run web      # previsualización en navegador
npm run ios      # requiere macOS/simulador
npm run android
```
