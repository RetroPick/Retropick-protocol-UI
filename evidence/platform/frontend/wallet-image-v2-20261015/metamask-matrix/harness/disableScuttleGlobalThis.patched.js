"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disableScuttleGlobalThis = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
// Newer MetaMask builds (13.x) dropped runtime-lavamoat.js; the scuttle config lives in
// hashed runtime.*.js chunks and the service worker. Patch every file that carries the
// enabled marker; a build with no marker at all is simply left untouched.
const disableScuttleGlobalThis = (metaMaskPath) => {
  const candidates = ["runtime-lavamoat.js", "service-worker.js"];
  try { candidates.push(...(0, fs_1.readdirSync)(metaMaskPath).filter((f) => /^runtime(\.[0-9a-f]+)?\.js$/i.test(f))); } catch { /* ignore */ }
  for (const name of candidates) {
    const p = path_1.resolve(metaMaskPath, name);
    if (!(0, fs_1.existsSync)(p)) continue;
    const file = (0, fs_1.readFileSync)(p, "utf8");
    let patched = file.replaceAll(`"scuttleGlobalThis":{"enabled":true`, `"scuttleGlobalThis":{"enabled":false`);
    patched = patched.replaceAll("scuttleGlobalThis:{enabled:!0", "scuttleGlobalThis:{enabled:!1");
    if (patched !== file) (0, fs_1.writeFileSync)(p, patched);
  }
};
exports.disableScuttleGlobalThis = disableScuttleGlobalThis;
