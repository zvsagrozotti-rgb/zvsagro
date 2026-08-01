// Gera o Relatório de Estoque em PDF/impressão (HTML), mesmo padrão do
// relatório financeiro (imprime só o conteúdo, não a tela inteira do app).
import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { lerEmpresa } from "../empresa";

function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function dataBR(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear();
}

function montarHtml(secoes, empresa) {
  const emp = empresa || {};
  const logo = emp.logo ? '<img src="' + emp.logo + '" style="height:48px;max-width:160px;object-fit:contain"/>' : "";
  const totalItens = secoes.reduce((s, sec) => s + sec.data.length, 0);

  const blocos = secoes.map((sec) => {
    const linhas = sec.data.map((p) => {
      const minimo = Number(p.estoqueMinimo) || 0;
      const baixo = minimo > 0 && p.quantidade <= minimo;
      return "<tr><td>" + esc(p.nome) + "</td>"
        + "<td class='r'" + (baixo ? " style='color:#ca8a04;font-weight:700'" : "") + ">" + p.quantidade + (p.unidade ? " " + esc(p.unidade) : "") + (baixo ? " ⚠" : "") + "</td></tr>";
    }).join("");
    return "<h2>" + esc(sec.title) + "</h2><table><tr><th>Produto</th><th class='r'>Quantidade</th></tr>" + linhas + "</table>";
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
  .muted{color:#889;font-size:11px}
  .foot{margin-top:24px;text-align:center;color:#99a;font-size:10px}
</style></head><body>

  <div class="top">
    ${logo}
    <div><div class="nome">${esc(emp.nome || "Sua Empresa")}</div><div class="muted">${esc(emp.slogan || "")}</div></div>
    <div class="right"><b>Relatório de Estoque</b><br><span class="muted">${totalItens} produto${totalItens !== 1 ? "s" : ""} com saldo</span></div>
  </div>

  ${blocos}

  <div class="foot">Relatório gerado pelo AegroFin · ${dataBR(new Date().toISOString())}</div>
</body></html>`;
}

function imprimirWeb(html) {
  const antigo = document.getElementById("estoque-print-frame");
  if (antigo) antigo.remove();
  const iframe = document.createElement("iframe");
  iframe.id = "estoque-print-frame";
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

export async function imprimirRelatorioEstoque(secoes) {
  const empresa = await lerEmpresa();
  const html = montarHtml(secoes, empresa);
  if (Platform.OS === "web") { imprimirWeb(html); return; }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
}
