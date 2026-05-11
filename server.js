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

function normalizeState(state) {
  const next = { ...defaultState, ...(state || {}) };
  if (!Array.isArray(next.teams)) next.teams = [];
  if (!Array.isArray(next.matches)) next.matches = [];
  if (!Array.isArray(next.waitingQueue)) next.waitingQueue = [];
  next.currentPlayer = null;

  const teamIds = new Set(next.teams.map((team) => team.id));
  next.waitingQueue = [...new Set(next.waitingQueue)].filter((id) => teamIds.has(id));
  next.matches = next.matches.filter((match) => {
    if (!teamIds.has(match.teamA)) return false;
    if (match.teamB && !teamIds.has(match.teamB)) return false;
    return true;
  });

  if (!next.matches.length && !next.waitingQueue.length) next.gameStarted = false;
  return next;
}

sharedState = normalizeState(sharedState);

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

  if (url.pathname === "/api/health" && req.method === "GET") {
    sendJson(res, 200, {
      ok: true,
      service: "torneio-garrafas",
      teams: sharedState.teams.length,
      queue: sharedState.waitingQueue.length,
      matches: sharedState.matches.length,
    });
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
        sharedState = normalizeState(incoming);
        saveState();
        sendJson(res, 200, { ok: true });
      } catch {
        sendJson(res, 400, { ok: false, error: "JSON invalido" });
      }
    });
    return;
  }

  if (url.pathname === "/api/join" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) req.destroy();
    });
    req.on("end", () => {
      try {
        const incoming = JSON.parse(body || "{}");
        const name = String(incoming.name || "").trim();
        if (!name) {
          sendJson(res, 400, { ok: false, error: "Nome da equipe obrigatorio" });
          return;
        }

        sharedState = normalizeState(sharedState);
        let team = sharedState.teams.find(
          (item) => item.name.toLowerCase() === name.toLowerCase(),
        );

        if (!team) {
          team = {
            id: `t${Date.now()}${Math.random()}`,
            name,
            code: "",
          };
          sharedState.teams.push(team);
        }

        const alreadyPlaying = sharedState.matches.some(
          (match) => match.teamA === team.id || match.teamB === team.id,
        );
        if (!alreadyPlaying && !sharedState.waitingQueue.includes(team.id)) {
          sharedState.waitingQueue.push(team.id);
        }

        saveState();
        sendJson(res, 200, { ok: true, team, state: sharedState });
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
