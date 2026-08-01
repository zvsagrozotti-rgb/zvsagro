// Controle de consumo de combustível por veículo — mesma lógica da planilha
// de referência do cliente: cada abastecimento soma km/volume/valor no
// "ciclo" atual (desde o último tanque cheio); quando o abastecimento marca
// "completou o tanque", o ciclo fecha e vira consumo (km/L), custo por km
// etc. Abastecimentos parciais entram na conta do ciclo mas não fecham
// cálculo sozinhos — só quem completa o tanque fecha.
import { listar, salvar, remover } from "../store";
import { num } from "../fmt";

const MILHAS_POR_KML = 2.3521458;

export async function listarAbastecimentos(veiculoId) {
  const todos = await listar("abastecimentos");
  return todos.filter((a) => a.veiculoId === veiculoId);
}

export async function salvarAbastecimento(veiculoId, dados) {
  return salvar("abastecimentos", { ...dados, veiculoId });
}

export async function removerAbastecimento(id) {
  return remover("abastecimentos", id);
}

function porOrdem(a, b) {
  const oa = num(a.odometro), ob = num(b.odometro);
  if (isFinite(oa) && isFinite(ob) && oa !== ob) return oa - ob;
  return new Date(a.data || 0) - new Date(b.data || 0);
}

// Recalcula, a partir do histórico bruto, os campos derivados de cada linha.
// Nunca fica nada pré-calculado guardado — sempre reprocessa a lista
// completa (mesmo princípio do módulo de Estoque: uma única fonte de verdade).
export function calcularLinhas(abastecimentos) {
  const ordenados = [...(abastecimentos || [])].sort(porOrdem);
  let kmCiclo = 0, volCiclo = 0, valorCiclo = 0, odomAnterior = null;

  return ordenados.map((a) => {
    const odometro = num(a.odometro);
    const volume = num(a.volume);
    const preco = num(a.precoLitro);
    const valor = (isFinite(volume) && isFinite(preco)) ? volume * preco : null;

    const kmRodado = (odomAnterior != null && isFinite(odometro)) ? (odometro - odomAnterior) : null;
    if (kmRodado != null) kmCiclo += kmRodado;
    if (isFinite(volume)) volCiclo += volume;
    if (valor != null) valorCiclo += valor;
    if (isFinite(odometro)) odomAnterior = odometro;

    let consumoKmL = null, l100km = null, milhasGalao = null, custoKm = null;
    let kmDoCiclo = null, volDoCiclo = null, valorDoCiclo = null;

    if (a.completou) {
      if (kmCiclo > 0 && volCiclo > 0) {
        kmDoCiclo = kmCiclo; volDoCiclo = volCiclo; valorDoCiclo = valorCiclo;
        consumoKmL = kmCiclo / volCiclo;
        l100km = 100 / consumoKmL;
        milhasGalao = consumoKmL * MILHAS_POR_KML;
        custoKm = valorCiclo / kmCiclo;
      }
      // Sempre zera ao completar o tanque — mesmo no primeiro abastecimento
      // (que só estabelece a linha de base, sem consumo pra calcular ainda).
      // Sem isso, o volume/valor da linha de base vazava pro ciclo seguinte.
      kmCiclo = 0; volCiclo = 0; valorCiclo = 0;
    }

    return {
      ...a, odometro, volume, preco, valor, kmRodado,
      kmDoCiclo, volDoCiclo, valorDoCiclo,
      consumoKmL, l100km, milhasGalao, custoKm,
    };
  });
}

// Estatísticas "Geral" (todo o histórico) vs "Últimos X" ciclos fechados —
// mesmas duas colunas de estatística da planilha de referência.
//
// "Gasto" soma o valor de TODOS os abastecimentos da janela (mesmo o
// primeiro, que só estabelece a linha de base e por isso não entra no
// cálculo de consumo/custo por km) — dinheiro gasto é dinheiro gasto,
// mesmo antes de dar pra medir o consumo daquele trecho.
export function calcularEstatisticas(linhas, ultimosX = 5) {
  const todas = linhas || [];
  const fechadas = todas.filter((l) => l.consumoKmL != null);

  function resumo(lista, gasto) {
    if (!lista.length) return null;
    const distancia = lista.reduce((s, l) => s + (l.kmDoCiclo || 0), 0);
    const volume = lista.reduce((s, l) => s + (l.volDoCiclo || 0), 0);
    const consumos = lista.map((l) => l.consumoKmL);
    const custos = lista.map((l) => l.custoKm);
    const primeira = lista[0], ultima = lista[lista.length - 1];
    const dias = (primeira && ultima) ? Math.round((new Date(ultima.data) - new Date(primeira.data)) / 86400000) : 0;
    return {
      qtd: lista.length,
      distancia, volume, gasto,
      consumoMedio: media(consumos), consumoMin: Math.min(...consumos), consumoMax: Math.max(...consumos),
      custoMedio: media(custos), custoMin: Math.min(...custos), custoMax: Math.max(...custos),
      dias,
    };
  }

  const gastoTotal = todas.reduce((s, l) => s + (l.valor || 0), 0);
  const ultimasLinhas = todas.slice(-ultimosX);
  const gastoUltimos = ultimasLinhas.reduce((s, l) => s + (l.valor || 0), 0);

  return {
    geral: resumo(fechadas, gastoTotal),
    ultimos: resumo(fechadas.slice(-ultimosX), gastoUltimos),
    ultimosX,
  };
}

function media(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
