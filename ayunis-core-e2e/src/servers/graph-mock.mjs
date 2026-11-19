import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import process from "node:process";
import { URL } from "node:url";

// Stands in for https://graph.microsoft.com (MICROSOFT_GRAPH_URL), so syncing
// SharePoint in e2e never reaches Microsoft. Every site exists on first use,
// with one document library holding the files of NEW_SITE_FILES; sites named
// `not-granted-…` answer 403 like a site not granted to the app, `missing-…`
// answer 404. Tests add files with POST /e2e/sites/{name}/files.
const port = Number(process.env.E2E_GRAPH_PORT ?? 3195);

const LIBRARY_NAME = "Dokumente";
// The default library's URL segment is localized, unlike its name.
const LIBRARY_SEGMENT = "Freigegebene%20Dokumente";
const NEW_SITE_FILES = [
  ["Satzungen/Hundesteuer.txt", "Die Hundesteuer beträgt 120 Euro im Jahr."],
  ["Satzungen/Archiv/Gebühren.txt", "Die Verwaltungsgebühr beträgt 15 Euro."],
  ["Ortsplan.jpg", "not an image"],
];

/** @type {Map<string, Site>} by site name */
const sites = new Map();
/** @type {Map<string, Site>} by drive ID */
const drives = new Map();
let nextId = 1;

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
  if (request.method === "GET" && url.pathname === "/health")
    return sendJson(response, 200, { status: "ok" });
  if (request.method === "POST") return addFile(request, response, url);
  if (request.method !== "GET") return notFound(response);
  if (url.pathname.startsWith("/download/")) return download(response, url);
  if (!url.pathname.startsWith("/v1.0/")) return notFound(response);
  return graph(response, url, decodeURIComponent(url.pathname.slice(5)));
});

server.listen(port, "127.0.0.1");

function graph(response, url, path) {
  const sitePath = path.match(/^\/sites\/([^/:]+):\/sites\/([^/]+)$/);
  if (sitePath) return site(response, sitePath[1], sitePath[2]);
  const siteDrives = path.match(/^\/sites\/site-([^/]+)\/drives$/);
  if (siteDrives) {
    const found = sites.get(siteDrives[1]);
    return found
      ? sendJson(response, 200, { value: [driveOf(found)] })
      : notFound(response);
  }
  const inDrive = path.match(/^\/drives\/([^/]+)\/(.*)$/);
  const drive = inDrive && drives.get(inDrive[1]);
  if (!drive) return notFound(response);
  return driveRequest(response, url, drive, inDrive[2]);
}

function site(response, host, name) {
  if (name.startsWith("not-granted-"))
    return sendError(response, 403, "accessDenied");
  if (name.startsWith("missing-")) return sendError(response, 404, "itemNotFound");
  const found = siteNamed(host, name);
  return sendJson(response, 200, {
    id: `site-${name}`,
    displayName: name,
    webUrl: found.webUrl,
  });
}

function driveRequest(response, url, drive, rest) {
  if (rest === "root") return sendJson(response, 200, entryOf(drive.root));
  if (rest === "root/delta") return delta(response, url, drive, drive.root);
  if (rest.startsWith("root:/")) {
    const item = itemAtPath(drive, rest.slice("root:/".length).split("/"));
    return item ? sendJson(response, 200, entryOf(item)) : notFound(response);
  }
  const itemRequest = rest.match(/^items\/([^/]+)\/(delta|children|content)$/);
  const item = itemRequest && drive.items.get(itemRequest[1]);
  if (!item) return notFound(response);
  if (itemRequest[2] === "delta") return delta(response, url, drive, item);
  if (itemRequest[2] === "children")
    return sendJson(response, 200, {
      value: childrenOf(drive, item).map(entryOf),
    });
  // Graph redirects a download to a pre-authenticated URL.
  response.writeHead(302, {
    location: `http://${url.host}/download/${drive.id}/${item.id}`,
  });
  return response.end();
}

/** Everything below `folder` changed since the token, folders first. */
function delta(response, url, drive, folder) {
  const since = Number(url.searchParams.get("token") ?? -1);
  const below = [...drive.items.values()].filter(
    (item) => item.changed > since && isBelow(drive, item, folder),
  );
  const deltaLink = new URL(url.pathname, url);
  deltaLink.searchParams.set("token", String(drive.changes));
  return sendJson(response, 200, {
    value: below.map(entryOf),
    "@odata.deltaLink": deltaLink.toString(),
  });
}

function download(response, url) {
  const [, , driveId, itemId] = url.pathname.split("/");
  const item = drives.get(driveId)?.items.get(itemId);
  if (!item?.content) return notFound(response);
  const body = Buffer.from(item.content);
  response.writeHead(200, {
    "content-type": "application/octet-stream",
    "content-length": body.length,
  });
  return response.end(body);
}

function addFile(request, response, url) {
  const name = url.pathname.match(/^\/e2e\/sites\/([^/]+)\/files$/)?.[1];
  const found = name && sites.get(decodeURIComponent(name));
  if (!found) return notFound(response);
  let body = "";
  request.on("data", (chunk) => (body += chunk));
  request.on("end", () => {
    const { path, content } = JSON.parse(body);
    const drive = drives.get(driveIdOf(found));
    const item = putFile(drive, path, content);
    sendJson(response, 201, { id: item.id });
  });
}

function siteNamed(host, name) {
  const existing = sites.get(name);
  if (existing) return existing;
  const webUrl = `https://${host}/sites/${name}`;
  const created = { name, webUrl };
  sites.set(name, created);
  const drive = {
    id: driveIdOf(created),
    webUrl: `${webUrl}/${LIBRARY_SEGMENT}`,
    items: new Map(),
    changes: 0,
  };
  drive.root = { id: `root-${name}`, name: "root", parentId: null, root: true };
  drive.items.set(drive.root.id, { ...drive.root, changed: 0 });
  drives.set(drive.id, drive);
  for (const [path, content] of NEW_SITE_FILES) putFile(drive, path, content);
  return created;
}

function driveIdOf(found) {
  return `drive-${found.name}`;
}

function driveOf(found) {
  const drive = drives.get(driveIdOf(found));
  return {
    id: drive.id,
    name: LIBRARY_NAME,
    webUrl: drive.webUrl,
    driveType: "documentLibrary",
  };
}

function putFile(drive, path, content) {
  const segments = path.split("/");
  let parent = drive.items.get(drive.root.id);
  for (const segment of segments.slice(0, -1))
    parent =
      childrenOf(drive, parent).find((child) => child.name === segment) ??
      putItem(drive, { name: segment, parentId: parent.id, folder: true });
  return putItem(drive, {
    name: segments.at(-1),
    parentId: parent.id,
    content,
  });
}

function putItem(drive, item) {
  const created = { id: `item-${nextId++}`, ...item, changed: ++drive.changes };
  drive.items.set(created.id, created);
  return created;
}

function itemAtPath(drive, segments) {
  let item = drive.items.get(drive.root.id);
  for (const segment of segments.filter(Boolean)) {
    item = childrenOf(drive, item).find(
      (child) => child.name === decodeURIComponent(segment),
    );
    if (!item) return null;
  }
  return item;
}

function childrenOf(drive, folder) {
  return [...drive.items.values()].filter(
    (item) => item.parentId === folder.id,
  );
}

function isBelow(drive, item, folder) {
  for (let current = item; current; current = drive.items.get(current.parentId))
    if (current.id === folder.id) return true;
  return false;
}

function entryOf(item) {
  const entry = {
    id: item.id,
    name: item.name,
    parentReference: item.parentId ? { id: item.parentId } : undefined,
  };
  if (item.root) return { ...entry, root: {}, folder: { childCount: 0 } };
  if (item.folder) return { ...entry, folder: { childCount: 0 } };
  const hash = createHash("sha1").update(item.content).digest("base64");
  return {
    ...entry,
    file: { mimeType: "text/plain", hashes: { quickXorHash: hash } },
    size: Buffer.byteLength(item.content),
    cTag: `"c:{${item.id}},${item.changed}"`,
    eTag: `"{${item.id}},${item.changed}"`,
  };
}

function notFound(response) {
  return sendError(response, 404, "itemNotFound");
}

function sendError(response, status, code) {
  return sendJson(response, status, { error: { code, message: code } });
}

function sendJson(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}
