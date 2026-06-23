import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');
const port = 4173;
const errors = [];

const mime = { '.html': 'text/html', '.png': 'image/png', '.js': 'text/javascript', '.css': 'text/css' };

function startServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const file = join(dist, req.url === '/' ? 'index.html' : req.url);
      if (!existsSync(file)) {
        res.writeHead(404); res.end(); return;
      }
      res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'text/plain' });
      res.end(readFileSync(file));
    });
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

function findChrome() {
  const paths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  ];
  return paths.find(existsSync);
}

async function checkWithChrome() {
  const chrome = findChrome();
  if (!chrome) throw new Error('Chrome not found for console check');

  return new Promise((resolve, reject) => {
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--window-size=390,844',
      `--remote-debugging-port=9222`,
      `http://127.0.0.1:${port}/`,
    ];

    const proc = spawn(chrome, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d; });

    setTimeout(async () => {
      try {
        const res = await fetch('http://127.0.0.1:9222/json');
        const tabs = await res.json();
        const page = tabs.find((t) => t.type === 'page');
        if (!page?.webSocketDebuggerUrl) throw new Error('No CDP page');

        const ws = new WebSocket(page.webSocketDebuggerUrl);
        const pending = new Map();
        let id = 1;

        ws.addEventListener('message', (ev) => {
          const msg = JSON.parse(ev.data);
          if (msg.id && pending.has(msg.id)) {
            pending.get(msg.id)(msg);
            pending.delete(msg.id);
          }
          if (msg.method === 'Runtime.consoleAPICalled') {
            const type = msg.params.type;
            const text = msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
            if (type === 'error') errors.push(text);
          }
          if (msg.method === 'Runtime.exceptionThrown') {
            errors.push(msg.params.exceptionDetails.text || 'Runtime exception');
          }
        });

        const send = (method, params = {}) => new Promise((res) => {
          const msgId = id++;
          pending.set(msgId, res);
          ws.send(JSON.stringify({ id: msgId, method, params }));
        });

        await new Promise((r) => ws.addEventListener('open', r));
        await send('Runtime.enable');
        await send('Page.enable');
        await send('Page.navigate', { url: `http://127.0.0.1:${port}/` });
        await new Promise((r) => setTimeout(r, 1200));

        await send('Runtime.evaluate', {
          expression: `(() => {
            document.querySelector('.customer-item[data-name="หมู"]')?.click();
            document.querySelector('#searchInput').value = 'ครู';
            document.querySelector('#searchInput').dispatchEvent(new Event('input', { bubbles: true }));
            document.querySelector('.customer-item[data-name="ครูต๋อง"]')?.click();
            document.querySelector('#pasteToggle')?.click();
            document.querySelector('#btnConfirm')?.click();
          })()`,
        });

        await new Promise((r) => setTimeout(r, 800));
        ws.close();
        proc.kill('SIGTERM');
        resolve();
      } catch (err) {
        proc.kill('SIGTERM');
        reject(err);
      }
    }, 2000);
  });
}

const server = await startServer();

try {
  await checkWithChrome();
  if (errors.length) {
    console.error('Console errors:', errors);
    process.exit(1);
  }
  console.log('✓ Console check passed (390×844)');
} catch (err) {
  console.error(err.message);
  process.exit(1);
} finally {
  server.close();
}