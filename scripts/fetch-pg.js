// scripts/fetch-pg.js
const https = require("https");
const fs = require("fs");
const path = require("path");

const URL = "https://platinumgod.co.uk/bag-of-crafting/new_bag4.js";
const outDir = path.join(process.cwd(), "docs");
const outFile = path.join(outDir, "new_bag4.js");

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
console.log("[fetch-pg] Downloading:", URL);

https.get(URL, (res) => {
  if (res.statusCode !== 200) {
    console.error("[fetch-pg] HTTP", res.statusCode);
    res.resume();
    process.exit(1);
  }
  const file = fs.createWriteStream(outFile);
  res.pipe(file);
  file.on("finish", () => {
    file.close(() => {
      console.log("[fetch-pg] Saved to:", outFile);
      process.exit(0);
    });
  });
}).on("error", (e) => {
  console.error("[fetch-pg] Error:", e.message);
  process.exit(1);
});
