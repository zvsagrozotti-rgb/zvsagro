// Relatório geral de aplicações (trabalhos): soma final de valores e hectares.
import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { fmt, fmtMoeda, calcFinanceiro, num } from "./calc";
import { lerEmpresa } from "./empresa";
import { listarReceitas } from "./fin/receitas";

function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function dataReg(iso) { try { const d = new Date(iso); return d.toLocaleDateString("pt-BR"); } catch (e) { return ""; } }
function hojeISO() {
  const d = new Date(); const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

// Status de pagamento de cada trabalho, olhando a receita gerada automaticamente
// no Financeiro (ligada pelo campo reg.receitaId): "recebido" | "pendente" |
// "atrasado" | "cancelado" | null (sem cobrança nessa aplicação).
function statusPagamento(reg, receitasPorId, hoje) {
  const r = reg.receitaId ? receitasPorId[reg.receitaId] : null;
  if (!r) return null;
  if (r.status === "baixado") return "recebido";
  if (r.status === "cancelado") return "cancelado";
  return r.data_vencimento < hoje ? "atrasado" : "pendente";
}

// Recebe a lista bruta de "aplicacoes" e devolve cada item já com área, valor
// e status de recebimento (buscado no Financeiro).
export async function calcularResumo(aplicacoes) {
  const receitas = await listarReceitas({});
  const receitasPorId = Object.fromEntries(receitas.map((r) => [r.id, r]));
  const hoje = hojeISO();
  const linhas = (aplicacoes || []).map((reg) => {
    const d = reg.dados || {};
    const area = num(d.area) || 0;
    const fin = calcFinanceiro({ area: d.area, valorHa: reg.valorHa, cobraDeslocamento: reg.cobraDeslocamento, valorKm: reg.valorKm, km: reg.km });
    return { reg, area, valor: fin.total, recebido: statusPagamento(reg, receitasPorId, hoje) };
  });
  const totalArea = linhas.reduce((s, l) => s + l.area, 0);
  const totalValor = linhas.reduce((s, l) => s + l.valor, 0);
  const totalRecebido = linhas.filter((l) => l.recebido === "recebido").reduce((s, l) => s + l.valor, 0);
  const totalAReceber = linhas.filter((l) => l.recebido === "pendente" || l.recebido === "atrasado").reduce((s, l) => s + l.valor, 0);
  return { linhas, totalArea, totalValor, totalRecebido, totalAReceber, qtd: linhas.length };
}

const RECEBIDO_LABEL = { recebido: "Recebido", pendente: "Pendente", atrasado: "Atrasado", cancelado: "Cancelado" };
const RECEBIDO_COR = { recebido: "#16a34a", pendente: "#ca8a04", atrasado: "#dc2626", cancelado: "#6b7280" };

function montarHtml({ linhas, totalArea, totalValor, totalRecebido, totalAReceber, qtd }, empresa, filtroCliente) {
  const emp = empresa || {};
  const logo = emp.logo ? '<img src="' + emp.logo + '" style="height:48px;max-width:160px;object-fit:contain"/>' : "";

  const corpo = linhas.map(({ reg, area, valor, recebido }) => {
    const d = reg.dados || {};
    const statusTxt = recebido ? "<span style='color:" + RECEBIDO_COR[recebido] + ";font-weight:700'>" + RECEBIDO_LABEL[recebido] + "</span>" : "—";
    return "<tr><td>" + esc(reg.clienteNome || "—") + "</td>"
      + "<td>" + esc(reg.talhaoNome || reg.fazendaNome || "—") + "</td>"
      + "<td>" + esc(reg.dataAplicacao || dataReg(reg.em)) + "</td>"
      + "<td class='r'>" + (area ? fmt(area, 2) + " ha" : "—") + "</td>"
      + "<td class='r'>" + (valor > 0 ? fmtMoeda(valor) : "—") + "</td>"
      + "<td>" + statusTxt + "</td></tr>";
  }).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  @page{margin:14mm}
  *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#1b2733;margin:0;padding:0;font-size:12px}
  table,tr{break-inside:avoid;page-break-inside:avoid}
  .top{display:flex;align-items:center;gap:14px;border-bottom:3px solid #1F3864;padding-bottom:12px}
  .top .nome{font-size:20px;font-weight:800;color:#1F3864}
  .top .right{margin-left:auto;text-align:right}
  .top .right b{font-size:15px;color:#1A5C2A}
  h2{font-size:13px;color:#1F3864;border-bottom:1px solid #dde;padding-bottom:4px;margin:18px 0 8px;text-transform:uppercase;letter-spacing:.5px}
  table{width:100%;border-collapse:collapse}
  th{background:#f4f6f4;color:#667;text-align:left;font-size:10px;text-transform:uppercase;padding:7px 6px;border-bottom:1px solid #dde}
  td{padding:6px;border-bottom:1px solid #eef}
  .r{text-align:right;font-weight:700}
  .kpis{display:flex;gap:10px;margin:10px 0}
  .kpis div{flex:1;border:1px solid #dde;border-radius:8px;padding:10px;text-align:center}
  .kpis .n{font-size:20px;font-weight:800;color:#1A5C2A}
  .muted{color:#889;font-size:11px}
  .foot{margin-top:24px;text-align:center;color:#99a;font-size:10px}
</style></head><body>

  <div class="top">
    ${logo}
    <div><div class="nome">${esc(emp.nome || "Sua Empresa")}</div><div class="muted">${esc(emp.slogan || "")}</div></div>
    <div class="right"><b>Relatório Geral de Aplicações</b><br><span class="muted">${filtroCliente ? "Cliente: " + esc(filtroCliente) : "Todos os clientes"}</span></div>
  </div>

  <div class="kpis">
    <div><div class="n">${qtd}</div><div class="muted">trabalhos</div></div>
    <div><div class="n">${fmt(totalArea, 2)} ha</div><div class="muted">área total</div></div>
    <div><div class="n">${fmtMoeda(totalValor)}</div><div class="muted">valor total</div></div>
  </div>
  <div class="kpis">
    <div><div class="n" style="color:#16a34a">${fmtMoeda(totalRecebido)}</div><div class="muted">já recebido</div></div>
    <div><div class="n" style="color:#ca8a04">${fmtMoeda(totalAReceber)}</div><div class="muted">a receber</div></div>
  </div>

  <h2>Trabalhos realizados</h2>
  <table>
    <tr><th>Cliente</th><th>Talhão / Fazenda</th><th>Data</th><th class="r">Área</th><th class="r">Valor</th><th>Recebido?</th></tr>
    ${corpo}
  </table>

  <div class="foot">Documento gerado pelo AegroFin · ${dataReg(new Date().toISOString())}</div>
</body></html>`;
}

function imprimirWeb(html) {
  const antigo = document.getElementById("geral-print-frame");
  if (antigo) antigo.remove();
  const iframe = document.createElement("iframe");
  iframe.id = "geral-print-frame";
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

export async function imprimirRelatorioGeral(resumo, filtroCliente) {
  const empresa = await lerEmpresa();
  const html = montarHtml(resumo, empresa, filtroCliente);
  if (Platform.OS === "web") { imprimirWeb(html); return; }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
}
