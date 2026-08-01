// Injeta as tags de PWA no dist/index.html depois do `expo export --platform web`.
// Uso: node pwa-inject.js
const fs = require("fs");
const path = require("path");

const distDir = process.argv[2] || "dist";
const idx = path.join(__dirname, distDir, "index.html");
let html = fs.readFileSync(idx, "utf8");

// viewport-fit=cover é OBRIGATÓRIO no iOS standalone: sem isso, env(safe-area-inset-*)
// fica zerado e o conteúdo entra sob o notch/indicador (cabeçalho some, textos sobrepõem).
html = html.replace(/<meta name="viewport"[^>]*>/i,
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, shrink-to-fit=no" />');

const head = `
    <link rel="manifest" href="manifest.json"/>
    <meta name="theme-color" content="#0B1D13"/>
    <meta name="mobile-web-app-capable" content="yes"/>
    <meta name="apple-mobile-web-app-capable" content="yes"/>
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
    <meta name="apple-mobile-web-app-title" content="VZS Agro"/>
    <link rel="apple-touch-icon" href="apple-touch-icon.png"/>
    <link rel="icon" type="image/png" sizes="512x512" href="icon-512.png"/>
    <style>html,body{background:#0B1D13} @supports(padding:max(0px)){body{background:#0B1D13}}</style>`;

const sw = `
    <script>
      if ("serviceWorker" in navigator) {
        window.addEventListener("load", function () {
          navigator.serviceWorker.register("sw.js").catch(function (e) { console.log("SW erro", e); });
        });
      }
    </script>`;

if (!html.includes("rel=\"manifest\"")) html = html.replace("</head>", head + "\n  </head>");
if (!html.includes("serviceWorker")) html = html.replace("</body>", sw + "\n  </body>");

fs.writeFileSync(idx, html);
console.log("PWA injetado em " + distDir + "/index.html");
