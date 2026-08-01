// Condições pra aplicação com drone: clima + vento + índice Kp (atividade
// geomagnética, afeta precisão de GPS/RTK). Fontes públicas e gratuitas:
// Open-Meteo (clima) e NOAA SWPC (Kp). Só leitura, precisa de internet.
const LIMITE_VENTO = 20; // km/h
const LIMITE_RAJADA = 30; // km/h
const LIMITE_CHUVA = 40; // % de probabilidade
const LIMITE_VISIBILIDADE = 5000; // metros
const LIMITE_KP = 5; // tempestade geomagnética (escala NOAA G1+)

export async function buscarCondicoesVoo(lat, lon) {
  const urlClima =
    "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon +
    "&current=temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m" +
    "&hourly=precipitation_probability,visibility&daily=sunrise,sunset&timezone=auto&forecast_days=1";
  const urlKp = "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json";

  const [wx, kpLista] = await Promise.all([
    fetch(urlClima).then((r) => r.json()),
    fetch(urlKp).then((r) => r.json()).catch(() => null),
  ]);

  const agora = new Date();
  let idxHora = Array.isArray(wx.hourly?.time) ? wx.hourly.time.findIndex((t) => new Date(t) >= agora) : -1;
  if (idxHora < 0) idxHora = 0;

  const kpValido = Array.isArray(kpLista) ? kpLista.filter((r) => r && r.kp_index != null) : [];
  const kp = kpValido.length ? Number(kpValido[kpValido.length - 1].kp_index) : null;
  const kpQuando = kpValido.length ? kpValido[kpValido.length - 1].time_tag : null;

  return {
    temp: wx.current?.temperature_2m ?? null,
    umidade: wx.current?.relative_humidity_2m ?? null,
    nuvens: wx.current?.cloud_cover ?? null,
    vento: wx.current?.wind_speed_10m ?? null,
    rajada: wx.current?.wind_gusts_10m ?? null,
    direcaoVento: wx.current?.wind_direction_10m ?? null,
    chuvaProb: wx.hourly?.precipitation_probability?.[idxHora] ?? null,
    visibilidade: wx.hourly?.visibility?.[idxHora] ?? null,
    nascer: wx.daily?.sunrise?.[0] ?? null,
    poente: wx.daily?.sunset?.[0] ?? null,
    kp,
    kpQuando,
    atualizadoEm: agora.toISOString(),
  };
}

export function avaliarCondicoesVoo(d) {
  const problemas = [];
  if (d.vento != null && d.vento > LIMITE_VENTO) problemas.push("Vento acima de " + LIMITE_VENTO + " km/h (risco de deriva)");
  if (d.rajada != null && d.rajada > LIMITE_RAJADA) problemas.push("Rajadas acima de " + LIMITE_RAJADA + " km/h");
  if (d.chuvaProb != null && d.chuvaProb > LIMITE_CHUVA) problemas.push("Alta chance de chuva (" + d.chuvaProb + "%)");
  if (d.visibilidade != null && d.visibilidade < LIMITE_VISIBILIDADE) problemas.push("Visibilidade baixa (" + Math.round(d.visibilidade / 1000) + " km)");
  if (d.kp != null && d.kp >= LIMITE_KP) problemas.push("Tempestade geomagnética (Kp " + d.kp + ") — GPS/RTK pode perder precisão");
  return { bom: problemas.length === 0, problemas };
}

export function statusKp(kp) {
  if (kp == null) return { texto: "—", cor: "#5f7d69" };
  if (kp < 4) return { texto: "Calmo", cor: "#34D399" };
  if (kp < 5) return { texto: "Instável", cor: "#FBBF24" };
  if (kp < 7) return { texto: "Tempestade moderada", cor: "#FB923C" };
  return { texto: "Tempestade forte", cor: "#EF4444" };
}
