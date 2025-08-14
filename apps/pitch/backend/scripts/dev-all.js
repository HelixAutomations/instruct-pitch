// Lightweight dev runner that spawns client, backend, and decoupled-functions
// Works cross-platform. Run from apps/pitch/backend with `node scripts/dev-all.js`.

const { spawn } = require('child_process');
const path = require('path');

function run(cmd, args, opts) {
  const p = spawn(cmd, args, Object.assign({ stdio: 'inherit', shell: true }, opts));
  p.on('exit', code => {
    console.log(`Process ${cmd} ${args.join(' ')} exited with ${code}`);
  });
  return p;
}

const root = path.resolve(__dirname, '..');
const clientDir = path.join(root, '..', 'client');
const functionsDir = path.join('D:', 'helix projects', 'workspace', 'vsc', 'instructions', 'decoupled-functions');

console.log('Starting client (vite)...');
const client = run('npm', ['run', 'dev'], { cwd: clientDir });

console.log('Starting backend (server.js)...');
const backend = run('npm', ['run', 'start'], { cwd: root });

console.log('Starting decoupled-functions...');
// Pass through KEY_VAULT_NAME from parent env if present (helps local Functions load secrets)
const functionsEnv = Object.assign({}, process.env);
// If not provided by the user's environment, set a reasonable default used by this repo
functionsEnv.KEY_VAULT_NAME = process.env.KEY_VAULT_NAME || 'helixlaw-instructions';
functionsEnv.KEY_VAULT_URL = process.env.KEY_VAULT_URL || 'https://helixlaw-instructions.vault.azure.net';
const functions = run('npm', ['run', 'start'], { cwd: functionsDir, env: functionsEnv });

// on main process exit, kill children
function shutdown() {
  console.log('Shutting down dev processes...');
  [client, backend, functions].forEach(p => { if (p && !p.killed) p.kill(); });
  process.exit();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('Dev runner started. Press Ctrl+C to stop.');
