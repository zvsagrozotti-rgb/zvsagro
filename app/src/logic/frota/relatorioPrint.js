// Gera o Relatório de Abastecimentos em PDF/impressão (HTML), mesmo padrão
// do relatório financeiro: cabeçalho com logo/nome da empresa, resumo,
// comparativo por veículo e tabela detalhada de abastecimentos.
import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { fmt, fmtMoeda } from "../fmt";
import { lerEmpresa } from "../empresa";

function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function dataBR(iso) {
  if (!iso) return "—";
  const [a, m, d] = String(iso).slice(0, 10).split("-");
  return d + "/" + m + "/" + a;
}

function montarHtml({ periodoLabel, linhas, veiculosComparados, consumoMedio, distanciaTotal, gastoTotal, qtd }, empresa) {
  const emp = empresa || {};
  const logo = emp.logo ? '<img src="' + emp.logo + '" style="height:48px;max-width:160px;object-fit:contain"/>' : "";

  const linhasComparativo = veiculosComparados.map((v) =>
    "<tr><td>" + esc(v.nome) + "</td>"
    + "<td class='r'>" + (v.consumoMedio != null ? fmt(v.consumoMedio) + " km/L" : "—") + "</td>"
    + "<td class='r'>" + fmt(v.distancia, 0) + " km</td>"
    + "<td class='r'>" + fmtMoeda(v.gasto) + "</td></tr>"
  ).join("");

  const linhasAbastecimentos = linhas.map((l) =>
    "<tr><td>" + esc(l.veiculoNome) + "</td>"
    + "<td>" + dataBR(l.data) + "</td>"
    + "<td class='r'>" + fmt(l.odometro, 0) + " km</td>"
    + "<td class='r'>" + fmt(l.volume) + " L</td>"
    + "<td class='r'>" + (l.preco != null ? fmtMoeda(l.preco) : "—") + "</td>"
    + "<td class='r'>" + (l.valor != null ? fmtMoeda(l.valor) : "—") + "</td>"
    + "<td class='r'>" + (l.consumoKmL != null ? fmt(l.consumoKmL) + " km/L" : "—") + "</td>"
    + (l.completou ? "" : "<td class='muted'>parcial</td>")
    + "</tr>"
  ).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  @page{margin:14mm}
  *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#1f2937;margin:0;padding:0;font-size:12px}
  table,tr{break-inside:avoid;page-break-inside:avoid}
  .top{display:flex;align-items:center;gap:14px;border-bottom:3px solid #1a3a5c;padding-bottom:12px}
  .top .nome{font-size:20px;font-weight:800;color:#1a3a5c}
  .top .right{margin-left:auto;text-align:right}
  .top .right b{font-size:15px;color:#1a73e8}
  h2{font-size:13px;color:#1a3a5c;border-bottom:1px solid #dde;padding-bottom:4px;margin:18px 0 8px;text-transform:uppercase;letter-spacing:.5px}
  table{width:100%;border-collapse:collapse}
  th{background:#f8fafc;color:#6b7280;text-align:left;font-size:10px;text-transform:uppercase;padding:7px 8px;border-bottom:1px solid #e5e7eb}
  td{padding:7px 8px;border-bottom:1px solid #f0f0f0}
  .r{text-align:right;font-weight:700}
  .muted{color:#889;font-size:11px}
  .kpis{display:flex;gap:10px;margin:8px 0}
  .kpis div{flex:1;border:1px solid #dde;border-radius:8px;padding:10px;text-align:center}
  .kpis .n{font-size:18px;font-weight:800;color:#16a34a}
  .foot{margin-top:24px;text-align:center;color:#99a;font-size:10px}
</style></head><body>

  <div class="top">
    ${logo}
    <div><div class="nome">${esc(emp.nome || "Sua Empresa")}</div><div class="muted">${esc(emp.slogan || "")}</div></div>
    <div class="right"><b>Relatório de Abastecimentos</b><br><span class="muted">${esc(periodoLabel)}</span></div>
  </div>

  <div class="kpis">
    <div><div class="n">${consumoMedio != null ? fmt(consumoMedio) : "—"}</div><div class="muted">km/L médio</div></div>
    <div><div class="n">${fmt(distanciaTotal, 0)}</div><div class="muted">km rodados</div></div>
    <div><div class="n">${fmtMoeda(gastoTotal)}</div><div class="muted">gasto total</div></div>
    <div><div class="n">${qtd}</div><div class="muted">abastecimentos</div></div>
  </div>

  ${veiculosComparados.length > 1 ? `
  <h2>Comparativo por veículo</h2>
  <table>
    <tr><th>Veículo</th><th class="r">Consumo médio</th><th class="r">Distância</th><th class="r">Gasto</th></tr>
    ${linhasComparativo}
  </table>` : ""}

  <h2>Abastecimentos (${linhas.length})</h2>
  <table>
    <tr><th>Veículo</th><th>Data</th><th class="r">Odômetro</th><th class="r">Volume</th><th class="r">Preço/L</th><th class="r">Valor</th><th class="r">Consumo</th></tr>
    ${linhasAbastecimentos}
  </table>

  <div class="foot">Relatório gerado pelo VZS Agro · ${dataBR(new Date().toISOString().split("T")[0])}</div>
</body></html>`;
}

function imprimirWeb(html) {
  const antigo = document.getElementById("frota-print-frame");
  if (antigo) antigo.remove();
  const iframe = document.createElement("iframe");
  iframe.id = "frota-print-frame";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  iframe.onload = () => {
    try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch (e) { /* noop */ }
  };
  iframe.srcdoc = html;
  document.body.appendChild(iframe);
}

export async function imprimirRelatorioAbastecimentos(dados) {
  const empresa = await lerEmpresa();
  const html = montarHtml(dados, empresa);
  if (Platform.OS === "web") { imprimirWeb(html); return; }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
}
