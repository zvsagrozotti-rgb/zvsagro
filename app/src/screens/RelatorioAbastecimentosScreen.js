import React, { useState, useCallback, useLayoutEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { listar, assinar } from "../logic/store";
import { calcularLinhas } from "../logic/frota/abastecimentos";
import { imprimirRelatorioAbastecimentos } from "../logic/frota/relatorioPrint";
import { avisar } from "../logic/confirm";
import { fmt, fmtMoeda } from "../logic/fmt";
import { C } from "../theme";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function hoje() {
  const d = new Date(); const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}
function pad2(n) { return String(n).padStart(2, "0"); }
function dataBR(iso) {
  if (!iso) return "—";
  const [a, m, d] = String(iso).slice(0, 10).split("-");
  return d && m && a ? d + "/" + m + "/" + a : iso;
}

const GRANULARIDADES = [
  { key: "dia", label: "Dia", tamanho: 10 },
  { key: "mes", label: "Mês", tamanho: 7 },
  { key: "ano", label: "Ano", tamanho: 4 },
];

function valorPadrao(key) {
  if (key === "dia") return hoje();
  if (key === "mes") return hoje().slice(0, 7);
  return hoje().slice(0, 4);
}

function formatarValor(key, valor) {
  if (key === "dia") return dataBR(valor);
  if (key === "mes") {
    const [a, m] = valor.split("-");
    return (MESES[Number(m) - 1] || "?") + " " + a;
  }
  return valor;
}

function mover(key, valor, delta) {
  if (key === "dia") {
    const d = new Date(valor + "T12:00:00");
    d.setDate(d.getDate() + delta);
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }
  if (key === "mes") {
    const [a, m] = valor.split("-").map(Number);
    const d = new Date(a, m - 1 + delta, 1);
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1);
  }
  return String(Number(valor) + delta);
}

// Barra horizontal simples pra comparar veículos — sem lib de gráfico, só
// Views proporcionais ao maior valor do grupo.
function GrupoBarras({ titulo, sufixo, itens, cor }) {
  const max = Math.max(1, ...itens.map((i) => i.valor || 0));
  return (
    <View style={s.grupoBarras}>
      <Text style={s.grupoTitulo}>{titulo}</Text>
      {itens.map((it) => (
        <View key={it.nome} style={{ marginBottom: 8 }}>
          <View style={s.barraLinha}>
            <Text style={s.barraNome} numberOfLines={1}>{it.nome}</Text>
            <Text style={s.barraValor}>{it.valor != null ? fmt(it.valor) + (sufixo || "") : "—"}</Text>
          </View>
          <View style={s.barraFundo}>
            <View style={[s.barraPreenchida, { width: (Math.max(0, it.valor || 0) / max) * 100 + "%", backgroundColor: cor }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function RelatorioAbastecimentosScreen({ navigation }) {
  const [linhas, setLinhas] = useState([]);
  const [granularidade, setGranularidade] = useState("mes");
  const [valor, setValor] = useState(valorPadrao("mes"));
  const [todos, setTodos] = useState(true);
  const [imprimindo, setImprimindo] = useState(false);

  const carregar = useCallback(async () => {
    const [veiculos, abastecimentos] = await Promise.all([listar("veiculos"), listar("abastecimentos")]);
    const porVeiculo = {};
    (abastecimentos || []).forEach((a) => { (porVeiculo[a.veiculoId] = porVeiculo[a.veiculoId] || []).push(a); });
    const todasLinhas = [];
    Object.keys(porVeiculo).forEach((veiculoId) => {
      const veiculo = veiculos.find((v) => v.id === veiculoId);
      calcularLinhas(porVeiculo[veiculoId]).forEach((l) => {
        todasLinhas.push({ ...l, veiculoNome: (veiculo && (veiculo.apelido || veiculo.placa)) || "(veículo removido)" });
      });
    });
    todasLinhas.sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));
    setLinhas(todasLinhas);
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));
  React.useEffect(() => {
    const cancelarV = assinar("veiculos", carregar);
    const cancelarA = assinar("abastecimentos", carregar);
    return () => { cancelarV(); cancelarA(); };
  }, [carregar]);

  const gConfig = GRANULARIDADES.find((g) => g.key === granularidade);
  const filtradas = todos
    ? linhas
    : linhas.filter((l) => l.data && String(l.data).slice(0, gConfig.tamanho) === valor);

  const fechadas = filtradas.filter((l) => l.consumoKmL != null);
  const consumoMedio = fechadas.length ? fechadas.reduce((s, l) => s + l.consumoKmL, 0) / fechadas.length : null;
  const distanciaTotal = fechadas.reduce((s, l) => s + (l.kmDoCiclo || 0), 0);
  const gastoTotal = filtradas.reduce((s, l) => s + (l.valor || 0), 0);

  // Comparativo por veículo, dentro do mesmo período filtrado.
  const porVeiculoNome = {};
  filtradas.forEach((l) => { (porVeiculoNome[l.veiculoNome] = porVeiculoNome[l.veiculoNome] || []).push(l); });
  const veiculosComparados = Object.keys(porVeiculoNome).sort().map((nome) => {
    const linhasV = porVeiculoNome[nome];
    const fechadasV = linhasV.filter((l) => l.consumoKmL != null);
    return {
      nome,
      consumoMedio: fechadasV.length ? fechadasV.reduce((s, l) => s + l.consumoKmL, 0) / fechadasV.length : null,
      distancia: fechadasV.reduce((s, l) => s + (l.kmDoCiclo || 0), 0),
      gasto: linhasV.reduce((s, l) => s + (l.valor || 0), 0),
    };
  });

  function mudarGranularidade(key) {
    setGranularidade(key);
    setValor(valorPadrao(key));
    setTodos(false);
  }

  const periodoLabel = todos ? "Todo o histórico" : formatarValor(granularidade, valor) + " (" + gConfig.label + ")";

  async function imprimir() {
    setImprimindo(true);
    try {
      await imprimirRelatorioAbastecimentos({
        periodoLabel, linhas: filtradas, veiculosComparados,
        consumoMedio, distanciaTotal, gastoTotal, qtd: filtradas.length,
      });
    } catch (e) {
      avisar("Erro", "Não foi possível gerar o relatório: " + e.message);
    }
    setImprimindo(false);
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={imprimir} disabled={imprimindo} style={{ paddingHorizontal: 14 }}>
          <Text style={{ fontSize: 18 }}>{imprimindo ? "…" : "🖨️"}</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, imprimindo, periodoLabel, filtradas, veiculosComparados, consumoMedio, distanciaTotal, gastoTotal]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={s.filtros}>
        <View style={s.segRow}>
          {GRANULARIDADES.map((g) => (
            <TouchableOpacity key={g.key} style={[s.seg, granularidade === g.key && s.segAtivo]} onPress={() => mudarGranularidade(g.key)}>
              <Text style={[s.segTxt, granularidade === g.key && s.segTxtAtivo]}>{g.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={s.nav}>
          <TouchableOpacity onPress={() => setValor((v) => mover(granularidade, v, -1))} style={s.seta} disabled={todos}>
            <Text style={[s.setaTxt, todos && s.setaDesativada]}>‹</Text>
          </TouchableOpacity>
          <Text style={[s.navTitulo, todos && s.setaDesativada]}>{todos ? "Todo o histórico" : formatarValor(granularidade, valor)}</Text>
          <TouchableOpacity onPress={() => setValor((v) => mover(granularidade, v, 1))} style={s.seta} disabled={todos}>
            <Text style={[s.setaTxt, todos && s.setaDesativada]}>›</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={s.pill} onPress={() => setTodos((v) => !v)}>
          <Text style={s.pillTxt}>{todos ? "Filtrar por " + gConfig.label.toLowerCase() : "Ver todo o histórico"}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtradas}
        keyExtractor={(i, idx) => i.id || String(idx)}
        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
        ListEmptyComponent={<Text style={s.vazio}>{todos ? "Nenhum abastecimento registrado ainda." : "Nenhum abastecimento neste período."}</Text>}
        ListHeaderComponent={
          <View>
            <View style={s.resumo}>
              <View style={s.resumoItem}><Text style={s.resumoValor}>{consumoMedio != null ? fmt(consumoMedio) : "—"}</Text><Text style={s.resumoLabel}>km/L médio</Text></View>
              <View style={s.resumoItem}><Text style={s.resumoValor}>{fmt(distanciaTotal, 0)}</Text><Text style={s.resumoLabel}>km rodados</Text></View>
              <View style={s.resumoItem}><Text style={s.resumoValor}>{fmtMoeda(gastoTotal)}</Text><Text style={s.resumoLabel}>gasto</Text></View>
              <View style={s.resumoItem}><Text style={s.resumoValor}>{filtradas.length}</Text><Text style={s.resumoLabel}>abastecimentos</Text></View>
            </View>

            {veiculosComparados.length > 1 ? (
              <View>
                <Text style={s.tituloComparativo}>Comparativo entre veículos</Text>
                <GrupoBarras titulo="Consumo médio (km/L)" itens={veiculosComparados.map((v) => ({ nome: v.nome, valor: v.consumoMedio }))} cor={C.greenClaro} />
                <GrupoBarras titulo="Distância (km)" itens={veiculosComparados.map((v) => ({ nome: v.nome, valor: v.distancia }))} cor={C.blue} />
                <GrupoBarras titulo="Gasto (R$)" itens={veiculosComparados.map((v) => ({ nome: v.nome, valor: v.gasto }))} sufixo="" cor={C.amarelo} />
              </View>
            ) : null}

            <Text style={s.tituloComparativo}>Abastecimentos do período</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.rowVeiculo}>{item.veiculoNome}</Text>
              <Text style={s.rowData}>{dataBR(item.data)} · {fmt(item.odometro, 0)} km</Text>
              <Text style={s.rowSub}>
                {fmt(item.volume)} L{item.preco ? " · " + fmtMoeda(item.preco) + "/L" : ""}{item.valor != null ? " · " + fmtMoeda(item.valor) : ""}
                {!item.completou ? " · parcial" : ""}
              </Text>
            </View>
            <Text style={s.rowConsumo}>{item.consumoKmL != null ? fmt(item.consumoKmL) + " km/L" : "—"}</Text>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  filtros: { padding: 16, borderBottomColor: C.border, borderBottomWidth: 1 },
  segRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  seg: { flex: 1, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, paddingVertical: 9, alignItems: "center" },
  segAtivo: { backgroundColor: C.green, borderColor: C.green },
  segTxt: { color: C.mut, fontSize: 13, fontWeight: "700" },
  segTxtAtivo: { color: "#06210b" },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, paddingHorizontal: 6 },
  seta: { paddingHorizontal: 14, paddingVertical: 10 },
  setaTxt: { color: C.blue, fontSize: 22, fontWeight: "800" },
  navTitulo: { color: C.text, fontSize: 15, fontWeight: "800" },
  setaDesativada: { opacity: 0.35 },
  pill: { alignSelf: "center", borderColor: C.line, borderWidth: 1.5, borderRadius: 99, paddingHorizontal: 16, paddingVertical: 7, marginTop: 10 },
  pillTxt: { color: C.blue, fontSize: 12, fontWeight: "700" },
  resumo: { flexDirection: "row", flexWrap: "wrap", padding: 16, paddingBottom: 0, gap: 10 },
  resumoItem: { flexGrow: 1, minWidth: "22%", backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 10, padding: 10, alignItems: "center" },
  resumoValor: { color: C.greenClaro, fontSize: 15, fontWeight: "800" },
  resumoLabel: { color: C.mut, fontSize: 10, marginTop: 2, textAlign: "center" },
  tituloComparativo: { color: C.text, fontSize: 14, fontWeight: "800", marginTop: 20, marginBottom: 8, paddingHorizontal: 2 },
  grupoBarras: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  grupoTitulo: { color: "#A9C9B4", fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginBottom: 10 },
  barraLinha: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  barraNome: { color: C.text, fontSize: 12, fontWeight: "700", flex: 1, marginRight: 8 },
  barraValor: { color: C.mut, fontSize: 12, fontWeight: "700" },
  barraFundo: { height: 8, borderRadius: 5, backgroundColor: "#0B1D13", overflow: "hidden" },
  barraPreenchida: { height: 8, borderRadius: 5 },
  vazio: { color: C.mut, textAlign: "center", marginTop: 40, lineHeight: 22 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  rowVeiculo: { color: C.blue, fontSize: 11, fontWeight: "800", textTransform: "uppercase", marginBottom: 2 },
  rowData: { color: C.text, fontSize: 14, fontWeight: "700" },
  rowSub: { color: C.mut, fontSize: 12, marginTop: 3 },
  rowConsumo: { color: C.greenClaro, fontSize: 13, fontWeight: "800", marginLeft: 8 },
});
