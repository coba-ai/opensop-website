import fs from "node:fs";
import crypto from "node:crypto";

const hash = (path) =>
  crypto.createHash("sha256").update(fs.readFileSync(path)).digest("hex").slice(0, 8);

const jsV = hash("assets/editorial.js");
const cssV = hash("assets/editorial.css");

const html = fs.readFileSync("index.html", "utf8");
const updated = html
  .replace(/assets\/editorial\.js(\?v=[^"'\s]*)?/g, `assets/editorial.js?v=${jsV}`)
  .replace(/assets\/editorial\.css(\?v=[^"'\s]*)?/g, `assets/editorial.css?v=${cssV}`);

fs.writeFileSync("index.html", updated);
console.log(`cache-bust: editorial.js?v=${jsV}, editorial.css?v=${cssV}`);
