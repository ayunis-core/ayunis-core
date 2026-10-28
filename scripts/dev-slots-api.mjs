import { deleteSlotData } from "./dev-slots-cleanup.mjs";
import { restartSlot, startSlot } from "./dev-slots-lifecycle.mjs";
import {
  findAvailableSlots,
  readSlotLogs,
  releaseSlotClaim,
  stopAllSlots,
  stopSlot,
} from "./dev-slots-lib.mjs";
import {
  discoverSlotsWithRemoval,
  removeWorktree,
} from "./dev-slots-worktree.mjs";

function json(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function routeId(pathname, action) {
  return pathname.match(new RegExp(`^/api/slots/([^/]+)/${action}$`))?.[1];
}

function isLoopbackHost(host) {
  try {
    const hostname = new URL(`http://${host}`).hostname;
    return hostname === "127.0.0.1" || hostname === "localhost";
  } catch {
    return false;
  }
}

export function createSlotsHandler({
  repoDir,
  token,
  renderPage,
  discover = discoverSlotsWithRemoval,
  stop = stopSlot,
  stopAll = stopAllSlots,
  release = releaseSlotClaim,
  deleteData = deleteSlotData,
  remove = removeWorktree,
  start = startSlot,
  restart = restartSlot,
  available = findAvailableSlots,
  logs = readSlotLogs,
}) {
  return async (request, response) => {
    try {
      if (!isLoopbackHost(request.headers.host)) {
        json(response, 403, {
          error: "Dashboard requests must use a loopback host.",
        });
        return;
      }
      const url = new URL(request.url, "http://127.0.0.1");
      if (
        url.pathname.startsWith("/api/") &&
        request.headers["x-dev-slots-token"] !== token
      ) {
        json(response, 403, { error: "Invalid dashboard session token." });
        return;
      }
      if (request.method === "GET" && url.pathname === "/") {
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        response.end(renderPage(token));
        return;
      }
      const records = await discover(repoDir);
      if (request.method === "GET" && url.pathname === "/api/slots") {
        json(response, 200, {
          slots: records,
          availableSlots: await available(records),
        });
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/slots/stop-all") {
        json(response, 200, await stopAll({ records }));
        return;
      }
      const logId = routeId(url.pathname, "logs");
      if (request.method === "GET" && logId) {
        const record = records.find(({ id }) => id === logId);
        if (!record)
          throw new Error(
            "Slot owner no longer exists. Refresh and try again.",
          );
        json(response, 200, { logs: await logs(record) });
        return;
      }
      const stopId = routeId(url.pathname, "stop");
      if (request.method === "POST" && stopId) {
        json(response, 200, { output: await stop({ id: stopId, records }) });
        return;
      }
      const releaseId = routeId(url.pathname, "release");
      if (request.method === "POST" && releaseId) {
        json(response, 200, {
          output: await release({ id: releaseId, records }),
        });
        return;
      }
      const deleteDataId = routeId(url.pathname, "delete-data");
      if (request.method === "POST" && deleteDataId) {
        json(response, 200, {
          output: await deleteData({
            id: deleteDataId,
            confirmation: url.searchParams.get("confirmation"),
            records,
          }),
        });
        return;
      }
      const removeWorktreeId = routeId(url.pathname, "remove-worktree");
      if (request.method === "POST" && removeWorktreeId) {
        json(response, 200, {
          output: await remove({
            id: removeWorktreeId,
            confirmation: url.searchParams.get("confirmation"),
            records,
            repoDir,
          }),
        });
        return;
      }
      const startId = routeId(url.pathname, "start");
      if (request.method === "POST" && startId) {
        const targetSlot = Number(url.searchParams.get("slot"));
        const mode = url.searchParams.get("mode") ?? "standard";
        json(response, 200, {
          output: await start({ id: startId, targetSlot, mode, records }),
        });
        return;
      }
      const restartId = routeId(url.pathname, "restart");
      if (request.method === "POST" && restartId) {
        const mode = url.searchParams.get("mode") ?? "standard";
        json(response, 200, {
          output: await restart({ id: restartId, mode, records }),
        });
        return;
      }
      json(response, 404, { error: "Not found." });
    } catch (error) {
      json(response, 409, { error: error.message });
    }
  };
}
