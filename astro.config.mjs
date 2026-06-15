import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://dev.jeremiebalais.com',
  // Production is a static export (GitHub Pages); the dev/preview servers are
  // local-only tools reached from sibling Docker containers (e.g. Playwright)
  // via host.docker.internal, so they may accept any host.
  vite: {
    server: { allowedHosts: true },
    preview: { allowedHosts: true },
  },
});
