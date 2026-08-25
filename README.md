# Veltra

Veltra no es una app para registrar entrenamientos — es una plataforma premium donde el objetivo es que disfrutes viendo tu progreso y quieras volver cada día. El registro es solo la herramienta; la experiencia gira en torno a la motivación, la sensación de progreso y una estética dark-first de nivel Symmetry / Whoop / Linear.

## Progreso

Sección de análisis de evolución por ejercicio (nivel Hevy / Strong, con **Recharts**). El usuario busca cualquier ejercicio y ve un gráfico de área interactivo con selector de métrica (peso, reps, volumen, 1RM estimado) y filtros temporales (30 días / 3 · 6 meses / 1 año / todo). Debajo, un análisis determinista y fundamentado en datos reales (`src/features/exercises/progressAnalysis.ts`) indica en < 5 s si progresa, se estanca o retrocede (semáforo verde/amarillo/rojo), el ritmo medio de progreso, la mejora a 30/90/365 días, si va más rápido o lento de lo esperado para su nivel (usando los estándares de fuerza del sistema de rangos) y recomendaciones concretas (progresión doble, descarga, etc.). El PR se marca con insignia dorada en el gráfico y en la tarjeta.

## Veltra Food

Módulo de nutrición integrado de forma nativa (misma identidad visual, componentes y arquitectura). Registrar una comida es tan fácil como enviar un mensaje: cada día se crea automáticamente un chat ("Hoy", "Ayer"…), el usuario escribe qué ha comido y/o adjunta fotos, y la IA analiza texto **e** imágenes juntos para estimar calorías y macros (las cantidades escritas mandan sobre la estimación visual; si hay demasiada duda, pregunta antes de registrar). Cada comida se guarda automáticamente y actualiza en tiempo real las barras de progreso del día frente a los objetivos configurables (calorías, proteínas, carbohidratos, grasas). Sin conexión / sin backend usa un estimador local determinista (`src/lib/ai/localFood.ts`); con Supabase activo llama a la misma Edge Function del entrenador (`type: "food"`, con visión de Claude). Datos en `src/features/food/` y tablas en `supabase/migrations/0002_food.sql`.

## Stack

- **Next.js 16 (App Router) + TypeScript + Tailwind CSS v4**, Framer Motion para animaciones.
- **Supabase** (Postgres + Auth por email/contraseña + verificación por email + RLS + Edge Functions) como backend en la nube.
- **IndexedDB** (vía `idb`) como almacén local — modo "explorar con datos de ejemplo" y respaldo sin conexión mientras no haya un proyecto Supabase configurado.
- **React Query** para estado de servidor/caché, **Zustand** para estado de UI (temporizador de descanso, sesión de auth).
- **SVG a medida** (sin librerías de gráficas) para todas las visualizaciones de progreso.
- **Radix UI** (`Dialog`) para los diálogos accesibles (selector de ejercicios, formularios).

## Cómo se ejecuta hoy en este entorno

Este entorno de desarrollo **no tiene un proyecto Supabase real ni una clave de API de Claude configurados**. Por diseño, eso no bloquea nada:

- La app entera funciona contra **IndexedDB local** cuando no hay claves de Supabase. Rutinas, entrenamientos, gráficas, rangos, récords y el chat del entrenador funcionan igualmente.
- El sistema de autenticación (`/sign-in`, `/sign-up`, recuperación de contraseña) está completamente implementado contra Supabase Auth. Sin claves, muestra un aviso claro y permite continuar en "modo local".
- El entrenador IA intenta llamar a la Edge Function `ai-coach` (Claude) cuando hay una sesión de Supabase activa; si no la hay, usa un respondedor local determinista (`src/lib/ai/localCoach.ts`) que **solo cita datos reales del navegador** — nunca inventa cifras.
- Desde el onboarding puedes elegir "Explorar con datos de ejemplo", que genera 10 semanas de historial realista (rutinas, sesiones, PRs, rangos, conversaciones) para ver la experiencia completa sin tener que entrenar semanas de verdad.

## Activar el backend real

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Aplica el esquema:
   ```bash
   supabase link --project-ref <tu-project-ref>
   supabase db push   # aplica supabase/migrations/0001_init.sql y 0002_food.sql
   ```
3. Copia `.env.example` a `.env.local` y rellena:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
4. Despliega la Edge Function del entrenador IA y su clave de Claude:
   ```bash
   supabase functions deploy ai-coach
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   ```
5. Reinicia `npm run dev`. El registro, la verificación por email y el chat pasarán a usar la nube real.

## Desplegar en Render

1. Crea un **Web Service** en Render apuntando a este repositorio.
2. Build command: `npm install && npm run build` · Start command: `npm run start`.
3. Añade las variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en la configuración del servicio.
4. En Supabase, añade la URL pública de Render (`https://tu-app.onrender.com/auth/callback`) como redirect URL permitida (Authentication → URL Configuration).

## Arquitectura de datos

Cada función de `src/features/*/repo.ts` habla con **uno de dos backends** según `isSupabaseConfigured`:

- **Supabase** (`src/lib/supabase/`): cliente de navegador (`@supabase/ssr`), cliente de servidor para Route Handlers, y un `proxy.ts` (antes "middleware") que refresca la sesión en cada petición.
- **IndexedDB local** (`src/lib/db/`): mismo esquema de tablas que `supabase/migrations/0001_init.sql`, un almacén por tabla.

Esto significa que toda pantalla llama a la misma API (`listExercises()`, `addSet()`, `getProfile()`...) sin importar qué backend esté activo — el cambio es invisible para la interfaz.

## Estructura del proyecto

```
src/
  app/                    rutas (Next.js App Router)
    (auth)/                sign-in, sign-up, forgot/reset-password
    (app)/                 dashboard, rutinas, coach, perfil (con AppShell)
    onboarding/             intro + configuración de perfil + cuenta
    workout/[sessionId]/   registro de entrenamiento (pantalla completa)
    auth/callback/          Route Handler para verificación de email y reset de contraseña
  design-system/          tokens de color, tipografía, componentes base, gráficas SVG
  features/
    exercises/             repos, estadísticas, fórmulas de 1RM, sistema de rangos, recomendador IA
    routines/               CRUD de rutinas
    workouts/                sesión activa, registro de series, PRs
    coach/                   conversaciones, mensajes, memoria
    profile/                 perfil, lesiones, peso corporal
    auth/, onboarding/       formularios de cuenta y alta
    shell/                   navegación responsive (sidebar / bottom nav)
  lib/
    db/                     esquema y cliente IndexedDB, seed, generador de datos de ejemplo
    supabase/                clientes browser/server, proxy de sesión, mapeo camelCase↔snake_case
    ai/                      contexto del entrenador, cliente IA, respondedor local de fallback
  state/                  Zustand (temporizador de descanso, sesión de auth)
  types/models.ts         modelo de dominio compartido
supabase/
  migrations/             esquema Postgres + RLS (perfil ligado 1:1 a auth.users)
  functions/ai-coach/     Edge Function (Deno) que llama a Claude
```

## Sistema de rangos

`src/features/exercises/ranks.ts` calcula el rango (Bronce → Elite) por ejercicio a partir de la fuerza relativa (1RM estimado ÷ peso corporal), usando tablas de estándares de fuerza aproximadas por sexo y patrón de movimiento (sentadilla, bisagra de cadera, empuje/tirón horizontal y vertical), ajustadas por edad. Solo se calcula rango para patrones compuestos con un estándar poblacional real — no para aislamiento o cardio.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build de producción
```
