// Genera index.html (un solo archivo, sin internet) a partir de src/app.html,
// incrustando Chart.js y SheetJS saneados (solo ASCII imprimible).
// Uso: npm install && node build.js
const fs = require("fs");
const path = require("path");

function sanear(codigo) {
  let s = "";
  for (const ch of codigo) {
    const c = ch.codePointAt(0);
    if ((c < 32 && c !== 9 && c !== 10 && c !== 13) || c > 126) {
      if (c > 0xffff) {
        const v = c - 0x10000;
        s += "\\u" + (0xd800 + (v >> 10)).toString(16).padStart(4, "0") +
             "\\u" + (0xdc00 + (v & 0x3ff)).toString(16).padStart(4, "0");
      } else {
        s += "\\u" + c.toString(16).padStart(4, "0");
      }
    } else {
      s += ch;
    }
  }
  return s.replace(/<\/script/gi, "<\\/script");
}

const nm = path.join(__dirname, "node_modules");
const chart = sanear(fs.readFileSync(path.join(nm, "chart.js/dist/chart.umd.js"), "utf8"));
const xlsx = sanear(fs.readFileSync(path.join(nm, "xlsx/dist/xlsx.full.min.js"), "utf8"));
let html = fs.readFileSync(path.join(__dirname, "src/app.html"), "utf8");
if (!html.includes("/*__CHARTJS__*/") || !html.includes("/*__XLSX__*/")) throw new Error("Faltan marcadores en src/app.html");
const abandono = fs.readFileSync(path.join(__dirname, "src/abandono.js"), "utf8").replace(/<\/script/gi, "<\\/script");
if (!html.includes("/*__ABANDONO__*/")) throw new Error("Falta el marcador de abandono en src/app.html");
html = html.split("/*__CHARTJS__*/").join(chart).split("/*__XLSX__*/").join(xlsx).split("/*__ABANDONO__*/").join(abandono);
fs.writeFileSync(path.join(__dirname, "index.html"), html);
console.log("index.html generado:", (html.length / 1024).toFixed(0), "KB");
