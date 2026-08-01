// Gera o Relatório de Aplicação em PDF (HTML → impressão/compartilhamento).
// Suporta um único relatório (gerarRelatorio) ou vários juntos num PDF só,
// um por página, cada um IDÊNTICO ao relatório individual (gerarRelatorioMultiplo).
import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { calcularCalda, deltaT, statusDT, corDT, fmt, fmtMoeda, calcFinanceiro, num } from "./calc";
import { lerEmpresa } from "./empresa";
import appJson from "../../app.json";

function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function dataReg(iso) { try { const d = new Date(iso); return d.toLocaleDateString("pt-BR"); } catch (e) { return ""; } }
function horaReg(iso) { try { return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; } }
function dataHoraReg(iso) {
  try { const d = new Date(iso); return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }
  catch (e) { return ""; }
}
function dmsTxt(deg, isLat) {
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const minFloat = (abs - d) * 60;
  const m = Math.floor(minFloat);
  const s = ((minFloat - m) * 60).toFixed(1);
  const hemi = isLat ? (deg >= 0 ? "N" : "S") : (deg >= 0 ? "E" : "W");
  return d + "°" + m + "'" + s + '"' + hemi;
}
function centroide(coords) {
  if (!Array.isArray(coords) || !coords.length) return null;
  const n = coords.length;
  const lat = coords.reduce((s, c) => s + c[0], 0) / n;
  const lng = coords.reduce((s, c) => s + c[1], 0) / n;
  return [lat, lng];
}
function coordTxt(c) {
  if (!Array.isArray(c) || c.length < 2) return "";
  return dmsTxt(c[0], true) + " " + dmsTxt(c[1], false);
}
function duracaoTxt(iniIso, fimIso) {
  const ini = new Date(iniIso).getTime(), fim = new Date(fimIso).getTime();
  if (!isFinite(ini) || !isFinite(fim) || fim < ini) return "";
  const min = Math.round((fim - ini) / 60000);
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? (h + "h " + m + "min") : (m + "min");
}

// Nome de arquivo com a versão do app embutida — assim dá pra saber, só olhando o
// nome, se o relatório que foi mandado pro cliente saiu de uma versão desatualizada.
function sanitizar(txt) {
  return String(txt || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function nomeArquivoRelatorio(reg) {
  const cliente = sanitizar(reg.clienteNome) || "cliente";
  const data = sanitizar(reg.dataAplicacao || dataReg(reg.em)) || sanitizar(new Date().toISOString().slice(0, 10));
  return "Aegrofin-v" + appJson.expo.version + "-relatorio-" + cliente + "-" + data;
}
function nomeArquivoRelatorioMultiplo(regs) {
  const cliente = sanitizar(regs[0] && regs[0].clienteNome) || "cliente";
  return "Aegrofin-v" + appJson.expo.version + "-relatorio-" + cliente + "-" + regs.length + "talhoes";
}

// Desenha o contorno do talhão como SVG (offline, imprime sempre).
function poligonoSvg(coords) {
  if (!Array.isArray(coords) || coords.length < 3) return "";
  const lats = coords.map(c => c[0]), lngs = coords.map(c => c[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const W = 360, H = 220, pad = 12;
  const dLat = (maxLat - minLat) || 1e-6, dLng = (maxLng - minLng) || 1e-6;
  const sc = Math.min((W - 2 * pad) / dLng, (H - 2 * pad) / dLat);
  const pts = coords.map(c => {
    const x = pad + (c[1] - minLng) * sc;
    const y = pad + (maxLat - c[0]) * sc;
    return x.toFixed(1) + "," + y.toFixed(1);
  }).join(" ");
  return '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">'
    + '<rect width="' + W + '" height="' + H + '" fill="#eef3ee" stroke="#cfe0cf"/>'
    + '<polygon points="' + pts + '" fill="rgba(76,175,80,0.22)" stroke="#2e7d32" stroke-width="2.5"/></svg>';
}

// Foto de satélite do talhão (com o contorno desenhado por cima) — usada no
// relatório quando há internet; se não der (ex.: app offline em campo), cai
// de volta pro desenho vetorial (poligonoSvg), que não depende de rede.
const MAPA_W = 640, MAPA_H = 400;
function bboxDeTalhao(coords, padFrac) {
  const lats = coords.map(c => c[0]), lngs = coords.map(c => c[1]);
  let minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const dLat = (maxLat - minLat) || 0.0006, dLng = (maxLng - minLng) || 0.0006;
  const p = padFrac == null ? 0.18 : padFrac;
  minLat -= dLat * p; maxLat += dLat * p; minLng -= dLng * p; maxLng += dLng * p;
  // O serviço de imagem de satélite retorna erro ("Error: bytes") quando a área
  // pedida é menor que ~0.006° — força um recorte mínimo pra talhões pequenos.
  const MIN_SPAN = 0.006;
  const cLat = (minLat + maxLat) / 2, cLng = (minLng + maxLng) / 2;
  if (maxLat - minLat < MIN_SPAN) { minLat = cLat - MIN_SPAN / 2; maxLat = cLat + MIN_SPAN / 2; }
  if (maxLng - minLng < MIN_SPAN) { minLng = cLng - MIN_SPAN / 2; maxLng = cLng + MIN_SPAN / 2; }
  return { minLat, maxLat, minLng, maxLng };
}
function mapaImgUrl(bbox) {
  return "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox="
    + bbox.minLng + "," + bbox.minLat + "," + bbox.maxLng + "," + bbox.maxLat
    + "&bboxSR=4326&imageSR=4326&size=" + MAPA_W + "," + MAPA_H + "&format=png&f=image";
}
function poligonoOverlaySvg(coords, bbox) {
  const pts = coords.map(c => {
    const x = (c[1] - bbox.minLng) / (bbox.maxLng - bbox.minLng) * MAPA_W;
    const y = (bbox.maxLat - c[0]) / (bbox.maxLat - bbox.minLat) * MAPA_H;
    return x.toFixed(1) + "," + y.toFixed(1);
  }).join(" ");
  return '<svg width="' + MAPA_W + '" height="' + MAPA_H + '" viewBox="0 0 ' + MAPA_W + ' ' + MAPA_H + '" style="position:absolute;top:0;left:0" xmlns="http://www.w3.org/2000/svg">'
    + '<polygon points="' + pts + '" fill="rgba(76,175,80,0.20)" stroke="#ffee33" stroke-width="3"/></svg>';
}
function comTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
}
async function imagemBase64(url) {
  try {
    if (Platform.OS === "web") {
      const resp = await comTimeout(fetch(url), 8000);
      if (!resp.ok) return null;
      const blob = await resp.blob();
      return await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
    }
    const dest = FileSystem.cacheDirectory + "dp_mapa_tmp.png";
    await comTimeout(FileSystem.downloadAsync(url, dest), 8000);
    const b64 = await FileSystem.readAsStringAsync(dest, { encoding: FileSystem.EncodingType.Base64 });
    return "data:image/png;base64," + b64;
  } catch (e) { return null; }
}
async function mapaHtml(coords) {
  if (!Array.isArray(coords) || coords.length < 3) return "";
  const bbox = bboxDeTalhao(coords);
  const b64 = await imagemBase64(mapaImgUrl(bbox));
  if (!b64) return poligonoSvg(coords);
  return '<div style="position:relative;width:' + MAPA_W + 'px;max-width:100%;height:' + MAPA_H + 'px">'
    + '<img src="' + b64 + '" width="' + MAPA_W + '" height="' + MAPA_H + '" style="display:block;width:100%;height:100%;object-fit:cover;border-radius:6px" />'
    + poligonoOverlaySvg(coords, bbox)
    + '</div>';
}

const CSS = `
  @page{margin:14mm}
  *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#1b2733;margin:0;padding:0;font-size:13px}
  .pagina{break-inside:avoid}
  .pagina + .pagina{page-break-before:always;margin-top:0}
  .sec{break-inside:avoid;page-break-inside:avoid;margin-bottom:2px}
  table,.kpis,ol,svg,.ass,.grid{break-inside:avoid;page-break-inside:avoid}
  tr{break-inside:avoid;page-break-inside:avoid}
  h2{break-after:avoid;page-break-after:avoid}
  .top{display:flex;align-items:center;gap:16px;border-bottom:4px solid #1F3864;padding-bottom:14px;margin-bottom:10px}
  .top .nome{font-size:24px;font-weight:800;color:#1F3864;line-height:1.15}
  .top .slogan{color:#667;font-size:13px;margin-top:2px}
  .top .right{margin-left:auto;text-align:right}
  .top .right b{font-size:16px;color:#1A5C2A}
  .empbox{display:flex;flex-wrap:wrap;gap:8px 10px;margin-bottom:16px}
  .empitem{background:#eef3fb;border:1px solid #c9d8f0;border-left:3px solid #1F3864;border-radius:7px;padding:6px 12px}
  .empitem .k{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.6px;color:#5a6b85;font-weight:800;margin-bottom:1px}
  .empitem .v{display:block;font-size:13.5px;color:#16233b;font-weight:700}
  h2{font-size:13px;color:#1F3864;border-bottom:1px solid #dde;padding-bottom:4px;margin:18px 0 8px;text-transform:uppercase;letter-spacing:.5px}
  table{width:100%;border-collapse:collapse} td{padding:5px 6px;border-bottom:1px solid #eef} .r{text-align:right;font-weight:700}
  .grid{display:flex;flex-wrap:wrap;gap:6px 24px} .grid div{min-width:30%} .grid b{color:#334}
  .muted{color:#889;font-weight:400;font-size:11px}
  ol{margin:6px 0;padding-left:20px} li{margin:3px 0}
  .kpis{display:flex;gap:10px;margin:8px 0} .kpis div{flex:1;border:1px solid #dde;border-radius:8px;padding:8px;text-align:center}
  .kpis .n{font-size:18px;font-weight:800;color:#1A5C2A}
  .pagto{background:#fff8e6;border:1px solid #f0dca0;border-radius:8px;padding:10px 14px;margin-top:6px;font-size:12px;color:#5c4b12}
  .pagto b{color:#3a2e08}
  .ass{margin-top:40px;display:flex;gap:40px} .ass div{flex:1;border-top:1px solid #334;padding-top:6px;text-align:center;font-size:11px;color:#556}
  .foot{margin-top:24px;text-align:center;color:#99a;font-size:10px}
`;

// Cabeçalho + dados da empresa — reutilizado no topo de cada página do relatório.
function montarCabecalho(emp, tituloDireita, dataDireita) {
  const logo = emp.logo ? '<img src="' + emp.logo + '" style="height:60px;max-width:180px;object-fit:contain"/>' : '';
  const contato = [emp.telefone, emp.email].filter(Boolean).map(esc).join(" &nbsp;·&nbsp; ");
  const linhasEmp = [
    emp.agronomo && ('<div class="empitem"><span class="k">Resp. técnico</span><span class="v">' + esc(emp.agronomo) + '</span></div>'),
    emp.documento && ('<div class="empitem"><span class="k">CNPJ/CPF</span><span class="v">' + esc(emp.documento) + '</span></div>'),
    contato && ('<div class="empitem"><span class="k">Contato</span><span class="v">' + contato + '</span></div>'),
    emp.endereco && ('<div class="empitem"><span class="k">Endereço</span><span class="v">' + esc(emp.endereco) + '</span></div>'),
  ].filter(Boolean).join("");

  return `<div class="top">
    ${logo}
    <div><div class="nome">${esc(emp.nome || "Sua Empresa")}</div><div class="slogan">${esc(emp.slogan || "")}</div></div>
    <div class="right"><b>${esc(tituloDireita)}</b><br><span class="muted">${esc(dataDireita)}</span></div>
  </div>
  ${linhasEmp ? '<div class="empbox">' + linhasEmp + '</div>' : ''}`;
}

// Caixa "Dados para pagamento" (banco/agência/conta/PIX) — só aparece se houver valor cobrado.
function montarPagamento(emp) {
  const linhas = [
    emp.banco && ('<b>Banco:</b> ' + esc(emp.banco)),
    emp.agencia && ('<b>Agência:</b> ' + esc(emp.agencia)),
    emp.conta && ('<b>Conta:</b> ' + esc(emp.conta)),
    emp.pix && ('<b>Chave PIX:</b> ' + esc(emp.pix)),
  ].filter(Boolean);
  if (linhas.length === 0) return "";
  return '<div class="pagto">💰 <b>Dados para pagamento</b><br>' + linhas.join(' &nbsp;·&nbsp; ') + '</div>';
}

// Corpo de UM relatório (sem <html>/<head> — reutilizável tanto sozinho quanto
// dentro de um PDF com vários, um por página).
async function montarCorpo(reg, empresa) {
  const d = reg.dados || {};
  const calda = calcularCalda({ tanque: d.tanque, vazao: d.vazao, areaTotal: d.area, produtos: d.produtos });
  const T = num(d.temp), R = num(d.umid);
  const dt = (isFinite(T) && isFinite(R)) ? deltaT(T, R) : null;
  const emp = empresa || {};
  const coords = (d.talhao && d.talhao.coords) || reg.talhaoCoords;
  const fin = calcFinanceiro({ area: d.area, valorHa: reg.valorHa, cobraDeslocamento: reg.cobraDeslocamento, valorKm: reg.valorKm, km: reg.km });

  const linhasCalda = calda ? calda.itens.map(it =>
    "<tr><td>" + esc(it.nome) + (it.formulacao ? ' <span class="muted">(' + esc(it.formulacao) + ')</span>' : "")
    + "</td><td class='r'>" + fmt(calda.modo === "talhao" ? it.total : it.porCalda, 2) + " " + it.un + "</td></tr>"
  ).join("") : "";

  const preparo = calda ? calda.itens.slice().sort((a, b) => a.ordem - b.ordem) : [];
  const passos = preparo.map((it, i) =>
    "<li>" + esc(it.nome) + " — " + fmt(calda.modo === "talhao" ? it.total : it.porCalda, 2) + " " + it.un + "</li>"
  ).join("");

  const dtBadge = dt != null
    ? '<span style="background:' + corDT(dt) + ';color:#06210b;padding:2px 8px;border-radius:5px;font-weight:700">Delta T ' + dt.toFixed(1) + ' °C — ' + esc(statusDT(dt)) + '</span>'
    : "—";

  return `${montarCabecalho(emp, "Relatório de Aplicação", "Data: " + (reg.dataAplicacao || dataReg(reg.em)))}

  <div class="sec">
  <h2>Dados da aplicação</h2>
  <div class="grid">
    <div><b>Cliente:</b> ${esc(reg.clienteNome || "—")}</div>
    <div><b>Fazenda:</b> ${esc(reg.fazendaNome || "—")}</div>
    <div><b>Talhão:</b> ${esc(reg.talhaoNome || (d.talhao && d.talhao.nome) || "—")}</div>
    <div><b>Cultura:</b> ${esc((d.talhao && d.talhao.cultura) || "—")}</div>
    <div><b>Área:</b> ${d.area ? esc(d.area) + " ha" : "—"}</div>
    <div><b>Data:</b> ${esc(reg.dataAplicacao || dataReg(reg.em))}</div>
  </div>
  ${(reg.droneModelo || reg.pilotoNome || d.altura) ? '<div class="grid" style="margin-top:8px">'
    + (reg.droneModelo ? '<div><b>Equipamento:</b> ' + esc(reg.droneModelo) + (reg.droneSerie ? ' (' + esc(reg.droneSerie) + ')' : '') + '</div>' : '')
    + (reg.droneBico ? '<div><b>Bico:</b> ' + esc(reg.droneBico) + '</div>' : '')
    + (reg.pilotoNome ? '<div><b>Piloto:</b> ' + esc(reg.pilotoNome) + '</div>' : '')
    + (d.altura ? '<div><b>Altura de voo:</b> ' + esc(d.altura) + ' m</div>' : '')
    + '</div>' : ''}
  ${reg.inicioAplicacao ? '<div class="grid" style="margin-top:8px">'
    + '<div><b>Início:</b> ' + esc(dataHoraReg(reg.inicioAplicacao)) + '</div>'
    + '<div><b>Fim:</b> ' + (reg.fimAplicacao ? esc(dataHoraReg(reg.fimAplicacao)) : "—") + '</div>'
    + (reg.fimAplicacao ? '<div><b>Duração:</b> ' + esc(duracaoTxt(reg.inicioAplicacao, reg.fimAplicacao)) + '</div>' : '')
    + '</div>' : ''}
  ${reg.obs ? '<div style="margin-top:6px"><b>Obs.:</b> ' + esc(reg.obs) + '</div>' : ''}
  </div>

  ${coords ? '<div class="sec"><h2>Mapa do talhão</h2><div>' + (await mapaHtml(coords)) + '</div>'
    + '<div class="muted" style="margin-top:8px;font-size:11px;line-height:1.6">'
    + '<b style="color:#334">Coordenadas (centro):</b> ' + coordTxt(centroide(coords))
    + '</div></div>' : ''}

  <div class="sec">
  <h2>Calda</h2>
  <div class="kpis">
    <div><div class="n">${d.tanque || "—"} L</div><div class="muted">misturador</div></div>
    <div><div class="n">${d.vazao || "—"} L/ha</div><div class="muted">vazão</div></div>
    ${calda && calda.modo === "talhao" ? '<div><div class="n">' + fmt(calda.caldaTotal, 0) + ' L</div><div class="muted">calda total</div></div><div><div class="n">' + calda.nCaldas + '</div><div class="muted">caldas</div></div>' : ''}
  </div>
  <table>
    <tr><td><b>Produto</b></td><td class="r"><b>${calda && calda.modo === "talhao" ? "Total" : "Por calda"}</b></td></tr>
    ${linhasCalda}
    ${calda ? '<tr><td><b>💧 Água</b></td><td class="r"><b>' + fmt(calda.modo === "talhao" ? calda.aguaTotal : calda.aguaPorCalda, 1) + ' L</b></td></tr>' : ''}
  </table>
  </div>

  <div class="sec">
  <h2>Ordem de preparo</h2>
  <ol>
    <li>Encher ~½ do tanque com água, com agitação ligada.</li>
    ${passos}
    <li>Completar com água até o volume e manter a agitação até aplicar.</li>
  </ol>
  </div>

  <div class="sec">
  <h2>Condições no momento da aplicação</h2>
  <div class="grid">
    <div><b>Temperatura:</b> ${d.temp ? esc(d.temp) + " °C" : "—"}</div>
    <div><b>Umidade:</b> ${d.umid ? esc(d.umid) + " %" : "—"}</div>
    <div><b>Vento:</b> ${d.vento ? esc(d.vento) + " km/h" : "—"}</div>
  </div>
  <div style="margin-top:8px">${dtBadge}</div>
  ${(d.faixa || d.vel) ? '<div class="grid" style="margin-top:8px"><div><b>Largura da faixa:</b> ' + (d.faixa ? esc(d.faixa) + ' m' : '—') + '</div><div><b>Velocidade:</b> ' + (d.vel ? esc(d.vel) + ' km/h' : '—') + '</div></div>' : ''}
  </div>

  ${fin.total > 0 ? '<div class="sec"><h2>Valor do serviço</h2><table>'
    + '<tr><td>Aplicação (' + fmt(fin.area, 2) + ' ha × ' + fmtMoeda(fin.vha) + ')</td><td class="r">' + fmtMoeda(fin.vAplic) + '</td></tr>'
    + (reg.cobraDeslocamento ? '<tr><td>Deslocamento</td><td class="r">' + fmtMoeda(fin.vDesl) + '</td></tr>' : '')
    + '<tr><td><b>TOTAL</b></td><td class="r"><b>' + fmtMoeda(fin.total) + '</b></td></tr></table>'
    + montarPagamento(emp) + '</div>' : ''}

  <div class="ass">
    <div>${esc(emp.agronomo || "Responsável Técnico")}<br><span class="muted">Responsável técnico</span></div>
    <div>&nbsp;<br><span class="muted">Cliente / produtor</span></div>
  </div>

  <div class="foot">Documento gerado pelo Aegrofin · ${esc(reg.dataAplicacao || dataReg(reg.em))}</div>`;
}

async function montarHtml(reg, empresa) {
  const titulo = esc(nomeArquivoRelatorio(reg));
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${titulo}</title><style>${CSS}</style></head><body>
  <div class="pagina">${await montarCorpo(reg, empresa)}</div>
</body></html>`;
}

// Um PDF só, com um relatório completo (igual ao individual) por página, um para
// cada aplicação selecionada — em vez de mandar um PDF por talhão pro cliente.
async function montarHtmlMultiplo(regs, empresa) {
  const titulo = esc(nomeArquivoRelatorioMultiplo(regs));
  const corpos = await Promise.all(regs.map(reg => montarCorpo(reg, empresa)));
  const paginas = corpos.map(c => '<div class="pagina">' + c + '</div>').join("\n");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${titulo}</title><style>${CSS}</style></head><body>
  ${paginas}
</body></html>`;
}

// No web, o expo-print imprime a página inteira do app. Aqui isolamos: um iframe
// invisível recebe SÓ o HTML do relatório e imprimimos o conteúdo dele.
function imprimirWeb(html) {
  const antigo = document.getElementById("dp-print-frame");
  if (antigo) antigo.remove();
  const iframe = document.createElement("iframe");
  iframe.id = "dp-print-frame";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  iframe.onload = () => {
    try {
      const w = iframe.contentWindow;
      w.focus();
      w.print();
    } catch (e) { /* noop */ }
  };
  iframe.srcdoc = html;
  document.body.appendChild(iframe);
}

async function imprimirOuCompartilhar(html, nomeArquivo) {
  if (Platform.OS === "web") {
    imprimirWeb(html);
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  // Renomeia pra incluir a versão do app no nome — assim, se o cliente receber
  // relatórios de aparelhos com versões diferentes, dá pra identificar pelo nome.
  let uriFinal = uri;
  if (nomeArquivo) {
    try {
      const destino = FileSystem.cacheDirectory + nomeArquivo + ".pdf";
      await FileSystem.copyAsync({ from: uri, to: destino });
      uriFinal = destino;
    } catch (e) { /* mantém o nome original se não conseguir renomear */ }
  }
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uriFinal, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
}

export async function gerarRelatorio(reg) {
  const empresa = await lerEmpresa();
  await imprimirOuCompartilhar(await montarHtml(reg, empresa), nomeArquivoRelatorio(reg));
}

// regs: lista de aplicações (podem ser de talhões/fazendas diferentes, do mesmo
// cliente ou não) — sai um único PDF, um relatório completo por página.
export async function gerarRelatorioMultiplo(regs) {
  if (!Array.isArray(regs) || regs.length === 0) return;
  if (regs.length === 1) return gerarRelatorio(regs[0]);
  const empresa = await lerEmpresa();
  await imprimirOuCompartilhar(await montarHtmlMultiplo(regs, empresa), nomeArquivoRelatorioMultiplo(regs));
}
