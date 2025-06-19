#!/usr/bin/env node
// @ts-check

// Thin wrapper – delegates to the fully featured server implementation
// located in the `forest-server` subdirectory.  This keeps backwards
// compatibility for scripts that expect `node server-modular.js` at the
// repository root.

import('./forest-server/server-modular.js');