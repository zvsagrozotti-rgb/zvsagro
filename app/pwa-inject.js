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
    <meta name="apple-mobile-web-app-title" content="AegroPrecisão"/>
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

// Contador de visitas — "bati aqui" anônimo + cidade/região/país aproximados
// (via IP, sem guardar o IP em si), sem cookies, sem dado pessoal, pro painel.html.
const visita = `
    <script>
      fetch("https://ipapi.co/json/").then(function (r) { return r.json(); }).catch(function () { return {}; })
        .then(function (loc) {
          return fetch("https://puxpynqrjcrhvcbuouiv.supabase.co/rest/v1/visitas_pwa", {
            method: "POST",
            headers: { apikey: "sb_publishable_SWDKlAGLefiorQbcz13Vjw_G7SWS3_T", "Content-Type": "application/json" },
            body: JSON.stringify({ cidade: loc.city || null, regiao: loc.region || null, pais: loc.country_name || null })
          });
        }).catch(function () {});
    </script>`;

if (!html.includes("rel=\"manifest\"")) html = html.replace("</head>", head + "\n  </head>");
if (!html.includes("serviceWorker")) html = html.replace("</body>", sw + "\n  </body>");
if (!html.includes("visitas_pwa")) html = html.replace("</body>", visita + "\n  </body>");

fs.writeFileSync(idx, html);
console.log("PWA injetado em " + distDir + "/index.html");
