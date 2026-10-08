// Opt-in deployment validation. No route or public switch exists.
// Only the exact commit selected by an operator may run these checks.
const { spawnSync } = require('node:child_process');
const requested = process.env.GOPLAY_VALIDATE_COMMIT;
if (requested && requested === process.env.RENDER_GIT_COMMIT) {
  console.log('[GOPLAY VALIDATION] validating release with isolated fixtures');
  const result = spawnSync(process.execPath, ['test/topicos-17-20.integration.js', '--release-validation'], { env: process.env, stdio: 'inherit', timeout: 600000 });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status || 1);
  console.log('[GOPLAY VALIDATION] release validated; all fixture accounts removed');
}
