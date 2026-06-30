const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const port = Number(process.env.PORT || 3000);
const adminCode = process.env.ADMIN_CODE || "admin";
const dataFile = path.join(__dirname, "records.json");
const publicFiles = new Map([
  ["/", { file: "index.html", type: "text/html; charset=utf-8" }],
  ["/index.html", { file: "index.html", type: "text/html; charset=utf-8" }],
  ["/styles.css", { file: "styles.css", type: "text/css; charset=utf-8" }],
  ["/app.js", { file: "app.js", type: "application/javascript; charset=utf-8" }],
]);

function readRecords() {
  try {
    const records = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

function writeRecords(records) {
  fs.writeFileSync(dataFile, JSON.stringify(records, null, 2));
}

function sendJson(response, status, data) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(data));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > 100_000) {
        reject(new Error("too-large"));
        request.destroy();
      }
    });

    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("invalid-json"));
      }
    });

    request.on("error", reject);
  });
}

function cleanName(value) {
  return String(value || "").trim().slice(0, 40);
}

function cleanSubject(value) {
  return String(value || "その他").trim().slice(0, 20);
}

function cleanHours(value) {
  const hours = Number(value);
  return Number.isFinite(hours) && hours >= 0 ? hours : null;
}

function isAdmin(body) {
  return String(body.adminCode || "") === adminCode;
}

async function handleApi(request, response, pathname) {
  if (request.method === "GET" && pathname === "/api/records") {
    sendJson(response, 200, { records: readRecords() });
    return;
  }

  if (request.method === "POST" && pathname === "/api/records") {
    const body = await readJsonBody(request);
    const name = cleanName(body.name);
    const hours = cleanHours(body.hours);
    const subject = cleanSubject(body.subject);

    if (!name || hours === null || hours <= 0) {
      sendJson(response, 400, { error: "invalid-record" });
      return;
    }

    const records = readRecords();
    records.push({
      id: crypto.randomUUID(),
      name,
      hours,
      subject,
      createdAt: new Date().toISOString(),
    });
    writeRecords(records);
    sendJson(response, 201, { records });
    return;
  }

  if (request.method === "PUT" && pathname === "/api/member") {
    const body = await readJsonBody(request);

    if (!isAdmin(body)) {
      sendJson(response, 403, { error: "admin-code" });
      return;
    }

    const name = cleanName(body.name);
    const hours = cleanHours(body.hours);

    if (!name || hours === null) {
      sendJson(response, 400, { error: "invalid-record" });
      return;
    }

    const records = readRecords().filter((record) => record.name !== name);
    records.push({
      id: crypto.randomUUID(),
      name,
      hours,
      subject: "管理者変更",
      type: "admin-edit",
      createdAt: new Date().toISOString(),
    });
    writeRecords(records);
    sendJson(response, 200, { records });
    return;
  }

  if (request.method === "POST" && pathname === "/api/reset") {
    const body = await readJsonBody(request);

    if (!isAdmin(body)) {
      sendJson(response, 403, { error: "admin-code" });
      return;
    }

    writeRecords([]);
    sendJson(response, 200, { records: [] });
    return;
  }

  sendJson(response, 404, { error: "not-found" });
}

function serveStatic(response, pathname) {
  const publicFile = publicFiles.get(pathname);

  if (!publicFile) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const filePath = path.join(__dirname, publicFile.file);
  response.writeHead(200, {
    "Content-Type": publicFile.type,
    "Cache-Control": "no-store",
  });
  fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer(async (request, response) => {
  const { pathname } = new URL(request.url, `http://${request.headers.host}`);

  try {
    if (pathname.startsWith("/api/")) {
      await handleApi(request, response, pathname);
      return;
    }

    serveStatic(response, pathname);
  } catch {
    sendJson(response, 500, { error: "server-error" });
  }
});

server.listen(port, () => {
  console.log(`Study Rank is running on http://localhost:${port}`);
});
