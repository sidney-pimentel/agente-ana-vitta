// Servidor estático do Respira. Sem dependências: `node server.js`.
//
// Não existe backend, e isso é uma decisão de arquitetura, não uma limitação:
// dado de saúde é dado pessoal sensível pela LGPD, e a forma mais segura de
// proteger um dado é não coletá-lo. Tudo vive no aparelho do usuário.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(fileURLToPath(new URL('.', import.meta.url)), 'app');
const PORTA = process.env.PORT || 3000;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

const servidor = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let caminho = normalize(decodeURIComponent(url.pathname));
    if (caminho.includes('..')) return responder(res, 403, 'Proibido');
    if (caminho === '/' || caminho === '') caminho = '/index.html';

    const arquivo = join(RAIZ, caminho);
    const dados = await readFile(arquivo);
    const tipo = TIPOS[extname(arquivo)] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': tipo,
      'Cache-Control': caminho === '/sw.js' ? 'no-cache' : 'public, max-age=0, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    });
    res.end(dados);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // SPA com rotas por hash: qualquer caminho desconhecido devolve o app.
      try {
        const html = await readFile(join(RAIZ, 'index.html'));
        res.writeHead(200, { 'Content-Type': TIPOS['.html'] });
        return res.end(html);
      } catch {
        return responder(res, 404, 'Não encontrado');
      }
    }
    responder(res, 500, 'Erro interno');
  }
});

function responder(res, codigo, texto) {
  res.writeHead(codigo, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(texto);
}

servidor.listen(PORTA, () => {
  console.log(`Respira rodando em http://localhost:${PORTA}`);
});
