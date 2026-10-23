import { z } from 'zod';
// Configure before constructing schemas: even a caught eval probe violates strict CSP.
z.config({ jitless: true });
export { z };
