import { defineConfig } from 'astro/config';

import solid from '@astrojs/solid-js';
import tailwind from '@astrojs/tailwind';

import { output, adapter } from 'astro-auto-adapter';

// https://astro.build/config
export default defineConfig({
  output: "hybrid",
  integrations: [solid(), tailwind()],
  adapter: await adapter(),
});