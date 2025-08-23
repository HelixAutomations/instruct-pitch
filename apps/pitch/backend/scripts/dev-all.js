// Unified dev runner: spins up Azurite (if not already running), Vite client, backend server, and Azure Functions.
// Run from apps/pitch/backend with `node scripts/dev-all.js`.
// NOTE: Avoid opening multiple terminals running this script simultaneously; it will auto-detect an existing Azurite.

const { spawn } = require('child_process');
const path = require('path');
const net = require('net');

function run(cmd, args, opts) {
  const p = spawn(cmd, args, Object.assign({ stdio: 'inherit', shell: true }, opts));
  p.on('exit', code => {
    console.log(`Process ${cmd} ${args.join(' ')} exited with ${code}`);
  });
  return p;
}

function isPortListening(port, host = '127.0.0.1', timeoutMs = 600) {
  return new Promise(resolve => {
    const socket = net.createConnection({ port, host });
    let settled = false;
    const done = v => { if (!settled) { settled = true; socket.destroy(); resolve(v); } };
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
    socket.setTimeout(timeoutMs, () => done(false));
  });
}

async function start() {
  const root = path.resolve(__dirname, '..');
  const clientDir = path.join(root, '..', 'client');
  // Workspace root (three levels up from backend): apps/pitch/backend -> apps/pitch -> apps -> <workspace>
  const workspaceRoot = path.resolve(root, '..', '..', '..');
  const azuriteDir = path.join(workspaceRoot, 'azurite');
  try {
    require('fs').mkdirSync(azuriteDir, { recursive: true });
  } catch (e) {
    console.warn('Could not ensure azurite directory exists:', e.message);
  }
  const functionsDir = path.join(workspaceRoot, 'decoupled-functions');

  const procs = { azurite: null, client: null, backend: null, functions: null };

  // Attempt Azurite startup only if blob port 10000 not already bound.
  const azuriteAlready = await isPortListening(10000);
  if (azuriteAlready) {
    console.log('Azurite already running on port 10000 – skipping spawn.');
  } else {
    console.log('Starting Azurite (blob/queue/table)...');
    const azLocation = path.relative(process.cwd(), azuriteDir);
    const debugFile = path.join(azuriteDir, 'debug.log');
    procs.azurite = run('npx', [
      'azurite',
      `--location "${azLocation}"`,
      `--debug "${debugFile}"`,
      '--silent',
      '--blobHost 127.0.0.1', '--queueHost 127.0.0.1', '--tableHost 127.0.0.1',
      '--blobPort 10000', '--queuePort 10001', '--tablePort 10002'
    ], { cwd: workspaceRoot });
  }

  console.log('Starting client (vite)...');
  procs.client = run('npm', ['run', 'dev'], { cwd: clientDir });

  if (await isPortListening(3000)) {
    console.log('Backend port 3000 already in use – assuming backend running; skipping spawn.');
  } else {
    console.log('Starting backend (server.js)...');
    procs.backend = run('npm', ['run', 'start'], { cwd: root });
  }

  console.log('Starting decoupled-functions...');
  if (await isPortListening(7071)) {
    console.log('Functions host port 7071 already in use – skipping spawn.');
  } else {
    const functionsEnv = { ...process.env };
    functionsEnv.KEY_VAULT_NAME = process.env.KEY_VAULT_NAME || 'helixlaw-instructions';
    functionsEnv.KEY_VAULT_URL = process.env.KEY_VAULT_URL || 'https://helixlaw-instructions.vault.azure.net';
    procs.functions = run('npm', ['run', 'start'], { cwd: functionsDir, env: functionsEnv });
  }

  function shutdown() {
    console.log('Shutting down dev processes...');
    Object.values(procs).forEach(p => { if (p && !p.killed) p.kill(); });
    process.exit();
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log('Dev runner started. Press Ctrl+C to stop.');
}

start().catch(err => {
  console.error('Failed to start dev environment:', err);
  process.exit(1);
});
