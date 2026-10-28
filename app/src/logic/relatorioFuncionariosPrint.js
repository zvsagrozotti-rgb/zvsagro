// Relatório de receitas e despesas por funcionário em PDF/impressão (HTML), no mesmo padrão
// do relatório de abastecimentos: cabeçalho com nome da empresa, resumo e tabela por funcionário.
import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { fmtMoeda } from "./fmt";
import { lerEmpresa } from "./empresa";

function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function dataBR(iso) {
  if (!iso) return "—";
  const [a, m, d] = String(iso).slice(0, 10).split("-");
  return d + "/" + m + "/" + a;
}
const cor = (v) => (v < 0 ? "#dc2626" : "#16a34a");

function montarHtml({ periodoLabel, filtroLabel, relatorio }, empresa) {
  const emp = empresa || {};
  const logo = emp.logo ? '<img src="' + emp.logo + '" style="height:48px;max-width:160px;object-fit:contain"/>' : "";
  const { porFuncionario, totais } = relatorio;

  const blocos = porFuncionario.map((x) => {
    const linhas = x.movimentos.map((m) =>
      "<tr><td>" + dataBR(m.data) + "</td><td>" + esc(m.titulo) + "</td><td>" + esc(m.tipo) + "</td>"
      + "<td class='r' style='color:" + (m.kind === "receita" ? "#16a34a" : "#dc2626") + "'>" + (m.kind === "receita" ? "+ " : "− ") + fmtMoeda(m.valor) + "</td>"
      + "<td class='muted'>" + (m.fechado ? "pago/fechado" : "em aberto") + "</td></tr>").join("");
    const tipos = Object.entries(x.porTipo).map(([t, v]) => esc(t) + " " + fmtMoeda(v)).join(" · ");
    return `<h2>${esc(x.funcionario.nome)}${x.funcionario.funcao ? " · " + esc(x.funcionario.funcao) : ""}</h2>
    <div class="kpis">
      <div><div class="n" style="color:#16a34a">${fmtMoeda(x.receitas)}</div><div class="muted">receitas</div></div>
      <div><div class="n" style="color:#dc2626">${fmtMoeda(x.despesas)}</div><div class="muted">despesas</div></div>
      <div><div class="n" style="color:${cor(x.resultado)}">${fmtMoeda(x.resultado)}</div><div class="muted">resultado</div></div>
    </div>
    ${tipos ? `<div class="muted" style="margin-bottom:6px">Despesas por tipo: ${tipos}</div>` : ""}
    <table><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th class="r">Valor</th><th>Situação</th></tr>
    ${linhas || "<tr><td colspan='5' class='muted'>Sem lançamentos no período.</td></tr>"}</table>`;
  }).join("");

  const resumoGeral = porFuncionario.length > 1 ? `
  <h2>Resumo geral</h2>
  <table><tr><th>Funcionário</th><th class="r">Receitas</th><th class="r">Despesas</th><th class="r">Resultado</th></tr>
  ${porFuncionario.map((x) => "<tr><td>" + esc(x.funcionario.nome) + "</td><td class='r'>" + fmtMoeda(x.receitas) + "</td><td class='r'>" + fmtMoeda(x.despesas)
    + "</td><td class='r' style='color:" + cor(x.resultado) + "'>" + fmtMoeda(x.resultado) + "</td></tr>").join("")}
  <tr><td><b>Total</b></td><td class="r">${fmtMoeda(totais.receitas)}</td><td class="r">${fmtMoeda(totais.despesas)}</td><td class="r" style="color:${cor(totais.resultado)}">${fmtMoeda(totais.resultado)}</td></tr></table>` : "";

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
  .kpis .n{font-size:16px;font-weight:800}
  .foot{margin-top:24px;text-align:center;color:#99a;font-size:10px}
</style></head><body>
  <div class="top">
    ${logo}
    <div><div class="nome">${esc(emp.nome || "Sua Empresa")}</div><div class="muted">${esc(emp.slogan || "")}</div></div>
    <div class="right"><b>Receitas e despesas por funcionário</b><br><span class="muted">${esc(filtroLabel)} · ${esc(periodoLabel)}</span></div>
  </div>
  ${resumoGeral}
  ${blocos || "<p class='muted'>Nenhum funcionário para mostrar.</p>"}
  <div class="foot">Relatório gerado pelo FrotaFácil · ${dataBR(new Date().toISOString().split("T")[0])}</div>
</body></html>`;
}

function imprimirWeb(html) {
  const antigo = document.getElementById("relfunc-print-frame");
  if (antigo) antigo.remove();
  const iframe = document.createElement("iframe");
  iframe.id = "relfunc-print-frame";
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  iframe.setAttribute("aria-hidden", "true");
  iframe.onload = () => { try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch (e) { /* noop */ } };
  iframe.srcdoc = html;
  document.body.appendChild(iframe);
}

export async function imprimirRelatorioFuncionarios(dados) {
  const empresa = await lerEmpresa();
  const html = montarHtml(dados, empresa);
  if (Platform.OS === "web") { imprimirWeb(html); return; }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
}
