const http = require("http");
const fs = require("fs");
const path = require("path");

const port = process.env.PORT || 3000;
const root = __dirname;
const stateFile = path.join(root, "state.json");

const defaultState = {
  teams: [],
  numBottles: 5,
  adminPass: "admin123",
  timerSeconds: 120,
  matches: [],
  currentRound: 0,
  gameStarted: false,
  bracket: [],
  waitingQueue: [],
  currentPlayer: null,
};

function loadState() {
  try {
    return { ...defaultState, ...JSON.parse(fs.readFileSync(stateFile, "utf8")) };
  } catch {
    return { ...defaultState };
  }
}

let sharedState = loadState();

function saveState() {
  fs.writeFile(stateFile, JSON.stringify(sharedState, null, 2), () => {});
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
  };

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Arquivo nao encontrado");
      return;
    }

    res.writeHead(200, {
      "Content-Type": types[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/state" && req.method === "GET") {
    sendJson(res, 200, sharedState);
    return;
  }

  if (url.pathname === "/api/state" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) req.destroy();
    });
    req.on("end", () => {
      try {
        const incoming = JSON.parse(body || "{}");
        sharedState = { ...defaultState, ...incoming, currentPlayer: null };
        saveState();
        sendJson(res, 200, { ok: true });
      } catch {
        sendJson(res, 400, { ok: false, error: "JSON invalido" });
      }
    });
    return;
  }

  const requestedPath = decodeURIComponent(url.pathname);
  const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const fileName = requestedPath === "/" ? "index.html" : safePath.replace(/^[/\\]/, "");
  const filePath = path.join(root, fileName);

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Acesso negado");
    return;
  }

  serveFile(res, filePath);
});

server.listen(port, () => {
  console.log(`Torneio das Garrafas rodando na porta ${port}`);
});
