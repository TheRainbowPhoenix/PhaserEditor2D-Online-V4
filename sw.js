importScripts("/editor/plugins/phaserstudio.idb/sw-libs/localforage.js");
// importScripts("https://cdn.phaser.io/editor/dist/editor/app/plugins/phaserstudio.idb/sw-libs/localforage.js");

const ver = 28;

/** @type {LocalForage} */
const localForage = self.localforage;

/** @type {Map<LocalForageDriver>} */
let databaseMap = new Map();

self.addEventListener("install", e => {

    log("Installing service worker v" + ver);

    self.skipWaiting();
});

self.addEventListener("activate", (event) => {

    event.waitUntil(clients.claim());
});

self.addEventListener("fetch", async (/** @type {FetchEvent} */ event) => {

    event.respondWith(makeResponse(event));
});

/**
 * @param {FetchEvent} event 
 */
async function makeResponse(event) {

    const request = event.request

    const url = new URL(request.url);
    const path = url.pathname;

    log("fetch: " + path);

    /** @type {string} */
    let fileKey;

    let dbName = "";

    if (path.startsWith("/editor/project/")) {

        fileKey = path.substring("/editor/project".length);

    } else if (path.startsWith("/editor/external/")) {

        fileKey = path.substring("/editor/external".length);

    } else if (path.startsWith("/editor/trial-external/")) {

        // ["", "editor", "trial-external", dbName, fileKey...]]
        const parts = path.split("/");
        dbName = parts[3];
        fileKey = path.substring(`/editor/trial-external/${dbName}`.length);

        log("parts", parts);
        log("dbName:", dbName, "file:", fileKey);
    }

    if (fileKey === "/") {

        fileKey = "/index.html";
    }

    if (fileKey) {

        fileKey = decodeURIComponent(fileKey);

        log("testing key " + fileKey);

        let database = databaseMap.get(dbName);

        if (!database) {

            database = localForage.createInstance({
                storeName: `PhaserEditor-FsDatabase-${dbName}`,
                driver: localForage.INDEXEDDB,
                name: `Phaser Editor - FileSystem IndexedDB-${dbName}`
            });

            databaseMap.set(dbName, database);
        }

        const content = await database.getItem(fileKey);

        if (content) {

            log("respondWith indexedDB: " + fileKey + " [" + (typeof content) + "]");

            const extension = fileKey.split(".").pop();

            const contentType = getContentType(extension);

            return new Response(content, {
                headers: { "Content-Type": contentType }
            });

        } else {

            log("can't find " + fileKey + " in database");
        }
    }

    log("respondWith fetch: " + url);

    if (path.startsWith("/editor/external/") || path.startsWith("/editor/trial-external/")) {

        return new Response("Not found", {
            headers: { "Content-Type": "text/plain" },
            status: 404
        });
    }

    return fetch(request);
}

const CONTENT_TYPE_MAP = {
    "txt": "text/plain",
    "json": "application/json",
    "html": "text/html",
    "css": "text/css",
    "js": "application/javascript",
    "jpg": "image/jpeg",
    "png": "image/png",
    "gif": "image/gif",
    "mp4": "video/mp4",
    "mp3": "audio/mpeg",
    "wav": "audio/wav",
    "ogg": "audio/ogg",
    "webm": "video/webm",
    "woff": "application/font-woff",
    "woff2": "font/woff2",
    "ttf": "font/ttf",
    "otf": "font/otf",
    "eot": "application/vnd.ms-fontobject",
    "svg": "image/svg+xml"
};

function getContentType(extension) {

    // default to binary data if no mapping found
    return CONTENT_TYPE_MAP[extension.toLowerCase()] || "application/octet-stream";
}

function log(...args) {

    console.log(`SW v${ver}:`, ...args);
}