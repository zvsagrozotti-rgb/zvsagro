import React, { useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { listar, assinar } from "../logic/store";
import { calcularLinhas } from "../logic/frota/abastecimentos";
import { fmt, fmtMoeda } from "../logic/fmt";
import { C } from "../theme";

function hoje() {
  const d = new Date(); const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}
function dataBR(iso) {
  if (!iso) return "—";
  const [a, m, d] = String(iso).slice(0, 10).split("-");
  return d && m && a ? d + "/" + m + "/" + a : iso;
}

const GRANULARIDADES = [
  { key: "dia", label: "Dia", placeholder: "aaaa-mm-dd", tamanho: 10 },
  { key: "mes", label: "Mês", placeholder: "aaaa-mm", tamanho: 7 },
  { key: "ano", label: "Ano", placeholder: "aaaa", tamanho: 4 },
];

export default function RelatorioAbastecimentosScreen() {
  const [linhas, setLinhas] = useState([]);
  const [granularidade, setGranularidade] = useState("mes");
  const [valor, setValor] = useState(hoje().slice(0, 7));

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
  const filtradas = linhas.filter((l) => l.data && String(l.data).slice(0, gConfig.tamanho) === valor);

  const fechadas = filtradas.filter((l) => l.consumoKmL != null);
  const consumoMedio = fechadas.length ? fechadas.reduce((s, l) => s + l.consumoKmL, 0) / fechadas.length : null;
  const distanciaTotal = fechadas.reduce((s, l) => s + (l.kmDoCiclo || 0), 0);
  const gastoTotal = filtradas.reduce((s, l) => s + (l.valor || 0), 0);

  function mudarGranularidade(key) {
    setGranularidade(key);
    if (key === "dia") setValor(hoje());
    else if (key === "mes") setValor(hoje().slice(0, 7));
    else setValor(hoje().slice(0, 4));
  }

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
        <TextInput
          style={s.input}
          value={valor}
          onChangeText={setValor}
          placeholder={gConfig.placeholder}
          placeholderTextColor="#5f7d69"
        />
      </View>

      <View style={s.resumo}>
        <View style={s.resumoItem}><Text style={s.resumoValor}>{consumoMedio != null ? fmt(consumoMedio) : "—"}</Text><Text style={s.resumoLabel}>km/L médio</Text></View>
        <View style={s.resumoItem}><Text style={s.resumoValor}>{fmt(distanciaTotal, 0)}</Text><Text style={s.resumoLabel}>km rodados</Text></View>
        <View style={s.resumoItem}><Text style={s.resumoValor}>{fmtMoeda(gastoTotal)}</Text><Text style={s.resumoLabel}>gasto</Text></View>
        <View style={s.resumoItem}><Text style={s.resumoValor}>{filtradas.length}</Text><Text style={s.resumoLabel}>abastecimentos</Text></View>
      </View>

      <FlatList
        data={filtradas}
        keyExtractor={(i, idx) => i.id || String(idx)}
        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
        ListEmptyComponent={<Text style={s.vazio}>Nenhum abastecimento neste período.</Text>}
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
  segRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  seg: { flex: 1, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, paddingVertical: 9, alignItems: "center" },
  segAtivo: { backgroundColor: C.green, borderColor: C.green },
  segTxt: { color: C.mut, fontSize: 13, fontWeight: "700" },
  segTxtAtivo: { color: "#06210b" },
  input: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, color: C.text, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  resumo: { flexDirection: "row", flexWrap: "wrap", padding: 16, paddingBottom: 0, gap: 10 },
  resumoItem: { flexGrow: 1, minWidth: "22%", backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 10, padding: 10, alignItems: "center" },
  resumoValor: { color: C.greenClaro, fontSize: 15, fontWeight: "800" },
  resumoLabel: { color: C.mut, fontSize: 10, marginTop: 2, textAlign: "center" },
  vazio: { color: C.mut, textAlign: "center", marginTop: 40, lineHeight: 22 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  rowVeiculo: { color: C.blue, fontSize: 11, fontWeight: "800", textTransform: "uppercase", marginBottom: 2 },
  rowData: { color: C.text, fontSize: 14, fontWeight: "700" },
  rowSub: { color: C.mut, fontSize: 12, marginTop: 3 },
  rowConsumo: { color: C.greenClaro, fontSize: 13, fontWeight: "800", marginLeft: 8 },
});
