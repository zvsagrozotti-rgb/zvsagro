// Gera o Relatório Financeiro em PDF/impressão (HTML), mesmo padrão do
// relatório de aplicação do AegroPrecisão (imprime só o conteúdo, não a tela
// inteira do app).
import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { fmtMoeda } from "../calc";
import { lerEmpresa } from "../empresa";

function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function dataBR(iso) {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return d + "/" + m + "/" + a;
}

function montarHtml({ itens, inicio, fim, status, totalReceitas, totalDespesas, totalAReceber, totalAPagar, saldoAcumulado }, empresa) {
  const emp = empresa || {};
  const logo = emp.logo ? '<img src="' + emp.logo + '" style="height:48px;max-width:160px;object-fit:contain"/>' : "";
  const statusLbl = { "": "Todos", pendente: "Pendentes", atrasado: "Atrasados", baixado: "Baixados" }[status] || "Todos";

  const linhas = itens.map((x) => {
    const cor = x.status === "baixado" ? "#16a34a" : x.status === "cancelado" ? "#6b7280" : (x.status === "pendente" && x.data_vencimento < fim) ? "#dc2626" : "#ca8a04";
    const valor = x.status === "baixado" ? x.valor_baixa : x.valor;
    return "<tr><td>" + (x.tipo === "receita" ? "💰" : "🧾") + " " + esc(x.descricao) + "</td>"
      + "<td>" + esc(x.categoria || "—") + "</td>"
      + "<td>" + esc(x.cliente || "—") + "</td>"
      + "<td>" + dataBR(x.data_vencimento) + "</td>"
      + "<td><span style='color:" + cor + ";font-weight:700;text-transform:capitalize'>" + esc(x.status) + "</span></td>"
      + "<td class='r' style='color:" + (x.tipo === "receita" ? "#16a34a" : "#dc2626") + "'>" + fmtMoeda(valor) + "</td></tr>";
  }).join("");

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
  .kpis{display:flex;gap:10px;margin:8px 0}
  .kpis div{flex:1;border:1px solid #dde;border-radius:8px;padding:10px;text-align:center}
  .kpis .n{font-size:18px;font-weight:800}
  .muted{color:#889;font-size:11px}
  .foot{margin-top:24px;text-align:center;color:#99a;font-size:10px}
</style></head><body>

  <div class="top">
    ${logo}
    <div><div class="nome">${esc(emp.nome || "Sua Empresa")}</div><div class="muted">${esc(emp.slogan || "")}</div></div>
    <div class="right"><b>Relatório Financeiro</b><br><span class="muted">${dataBR(inicio)} a ${dataBR(fim)} · ${esc(statusLbl)}</span></div>
  </div>

  <div class="kpis">
    <div><div class="n" style="color:#16a34a">${fmtMoeda(totalReceitas)}</div><div class="muted">receitas</div></div>
    <div><div class="n" style="color:#dc2626">${fmtMoeda(totalDespesas)}</div><div class="muted">despesas</div></div>
    <div><div class="n" style="color:${saldoAcumulado >= 0 ? "#16a34a" : "#dc2626"}">${fmtMoeda(saldoAcumulado)}</div><div class="muted">saldo acumulado (até ${dataBR(fim)})</div></div>
  </div>
  <div class="kpis">
    <div><div class="n" style="color:#ca8a04">${fmtMoeda(totalAReceber)}</div><div class="muted">a receber</div></div>
    <div><div class="n" style="color:#ca8a04">${fmtMoeda(totalAPagar)}</div><div class="muted">a pagar</div></div>
  </div>

  <h2>Lançamentos (${itens.length})</h2>
  <table>
    <tr><th>Descrição</th><th>Centro de custo</th><th>Cliente/Fornecedor</th><th>Vencimento</th><th>Status</th><th class="r">Valor</th></tr>
    ${linhas}
  </table>

  <div class="foot">Relatório gerado pelo AegroFin · ${dataBR(new Date().toISOString().split("T")[0])}</div>
</body></html>`;
}

function imprimirWeb(html) {
  const antigo = document.getElementById("fin-print-frame");
  if (antigo) antigo.remove();
  const iframe = document.createElement("iframe");
  iframe.id = "fin-print-frame";
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

export async function imprimirRelatorioFinanceiro(dados) {
  const empresa = await lerEmpresa();
  const html = montarHtml(dados, empresa);
  if (Platform.OS === "web") { imprimirWeb(html); return; }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
}
