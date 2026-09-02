import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Las cinco secciones se colapsan en Hoy + Progreso + Perfil, pero los
  // enlaces viejos siguen vivos en marcadores, en la pantalla de inicio de
  // quien la tenga instalada y en las notificaciones ya enviadas.
  //
  // Los módulos (/sleep, /food, /habits, /focus…) no se tocan: dejan de ser
  // destinos de navegación, no dejan de existir. Lo que redirige son las
  // cinco antiguas portadas de sección y los tres módulos archivados.
  async redirects() {
    return [
      { source: "/body", destination: "/dashboard", permanent: false },
      { source: "/mind", destination: "/dashboard", permanent: false },
      { source: "/life", destination: "/dashboard", permanent: false },
      // Recuperación se activa desde Perfil, así que ahí es donde vive ahora.
      { source: "/recovery", destination: "/profile", permanent: false },
      // Archivados: sus tablas siguen intactas, su interfaz no.
      { source: "/finances", destination: "/profile", permanent: false },
      { source: "/screen-time", destination: "/profile", permanent: false },
      { source: "/goals", destination: "/contract", permanent: false },
      { source: "/goals/:id", destination: "/contract", permanent: false },
    ];
  },
};

export default nextConfig;
