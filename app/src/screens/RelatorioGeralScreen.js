import React, { useState, useCallback } from "react";
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { listar } from "../logic/store";
import { fmt, fmtMoeda } from "../logic/calc";
import { calcularResumo, imprimirRelatorioGeral } from "../logic/relatorioGeral";
import { avisar } from "../logic/confirm";
import PickerModal from "../components/PickerModal";
import { C } from "../theme";

function dataReg(iso) {
  try { const d = new Date(iso); return d.toLocaleDateString("pt-BR"); } catch (e) { return ""; }
}

const RECEBIDO_LABEL = { recebido: "recebido", pendente: "a receber", atrasado: "atrasado", cancelado: "cancelado" };
const RECEBIDO_STYLE = {
  recebido: { color: "#8fe6b0", backgroundColor: "#1c4a30" },
  pendente: { color: "#ffe08a", backgroundColor: "#3a3410" },
  atrasado: { color: "#ff8b9a", backgroundColor: "#3a1f28" },
  cancelado: { color: C.mut, backgroundColor: C.card },
};

export default function RelatorioGeralScreen() {
  const [aplicacoes, setAplicacoes] = useState([]);
  const [filtro, setFiltro] = useState("*");
  const [pickOpen, setPickOpen] = useState(false);
  const [imprimindo, setImprimindo] = useState(false);
  const [resumo, setResumo] = useState({ linhas: [], totalArea: 0, totalValor: 0, totalRecebido: 0, totalAReceber: 0, qtd: 0 });

  useFocusEffect(useCallback(() => {
    listar("aplicacoes").then((a) => setAplicacoes(a.slice().sort((x, y) => (y.em || "").localeCompare(x.em || ""))));
  }, []));

  const clientes = [...new Set(aplicacoes.map((i) => i.clienteNome || "—"))].sort((a, b) => String(a).localeCompare(String(b)));
  const filtradas = filtro === "*" ? aplicacoes : aplicacoes.filter((i) => (i.clienteNome || "—") === filtro);

  useFocusEffect(useCallback(() => {
    calcularResumo(filtradas).then(setResumo);
    // eslint-disable-next-line
  }, [aplicacoes, filtro]));

  async function onImprimir() {
    setImprimindo(true);
    try { await imprimirRelatorioGeral(resumo, filtro === "*" ? null : filtro); }
    catch (e) { avisar("Erro", "Não foi possível gerar o relatório."); }
    setImprimindo(false);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16 }}>
      {clientes.length > 1 ? (
        <TouchableOpacity style={s.combo} onPress={() => setPickOpen(true)}>
          <Text style={s.comboLbl}>Cliente:</Text>
          <Text style={s.comboVal} numberOfLines={1}>{filtro === "*" ? "Todos" : filtro}</Text>
          <Text style={s.comboChev}>▾</Text>
        </TouchableOpacity>
      ) : null}

      <View style={s.kpis}>
        <View style={s.kpi}>
          <Text style={s.kpiN}>{resumo.qtd}</Text>
          <Text style={s.kpiL}>trabalhos</Text>
        </View>
        <View style={s.kpi}>
          <Text style={s.kpiN}>{fmt(resumo.totalArea, 2)}</Text>
          <Text style={s.kpiL}>ha no total</Text>
        </View>
        <View style={s.kpi}>
          <Text style={s.kpiN}>{fmtMoeda(resumo.totalValor)}</Text>
          <Text style={s.kpiL}>valor total</Text>
        </View>
      </View>
      <View style={s.kpis}>
        <View style={s.kpi}>
          <Text style={[s.kpiN, { color: "#8fe6b0" }]}>{fmtMoeda(resumo.totalRecebido)}</Text>
          <Text style={s.kpiL}>já recebido</Text>
        </View>
        <View style={s.kpi}>
          <Text style={[s.kpiN, { color: "#ffe08a" }]}>{fmtMoeda(resumo.totalAReceber)}</Text>
          <Text style={s.kpiL}>a receber</Text>
        </View>
      </View>

      <TouchableOpacity style={[s.imprimir, (imprimindo || resumo.qtd === 0) && { opacity: 0.6 }]} onPress={onImprimir} disabled={imprimindo || resumo.qtd === 0}>
        <Text style={s.imprimirTxt}>{imprimindo ? "Gerando…" : "🖨️ Imprimir relatório"}</Text>
      </TouchableOpacity>

      {resumo.linhas.length === 0 ? <Text style={s.vazio}>Nenhum trabalho registrado ainda.</Text> : resumo.linhas.map(({ reg, area, valor, recebido }, i) => (
        <View key={reg.id || i} style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.nome}>{reg.clienteNome || "(sem cliente)"}</Text>
            <Text style={s.sub}>📅 {reg.dataAplicacao || dataReg(reg.em)}{reg.talhaoNome ? " · 📐 " + reg.talhaoNome : (reg.fazendaNome ? " · " + reg.fazendaNome : "")}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.valor}>{area ? fmt(area, 2) + " ha" : "—"}</Text>
            {valor > 0 ? <Text style={s.valorMoeda}>{fmtMoeda(valor)}</Text> : null}
            {recebido ? <Text style={[s.tag, RECEBIDO_STYLE[recebido]]}>{RECEBIDO_LABEL[recebido]}</Text> : null}
          </View>
        </View>
      ))}

      <PickerModal
        visible={pickOpen}
        titulo="Filtrar por cliente"
        itens={[{ id: "*", label: "Todos" }, ...clientes.map((c) => ({ id: c, label: c }))]}
        onSelect={(it) => { setFiltro(it.id); setPickOpen(false); }}
        onClose={() => setPickOpen(false)}
      />
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  combo: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 14 },
  comboLbl: { color: C.mut, fontSize: 13, fontWeight: "700" },
  comboVal: { color: C.text, fontSize: 14, fontWeight: "700", flex: 1 },
  comboChev: { color: C.blue, fontSize: 16, fontWeight: "800" },
  kpis: { flexDirection: "row", gap: 10, marginBottom: 10 },
  kpi: { flex: 1, backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 14, alignItems: "center" },
  kpiN: { color: C.text, fontSize: 18, fontWeight: "800" },
  kpiL: { color: C.mut, fontSize: 11, marginTop: 3, textTransform: "uppercase" },
  imprimir: { backgroundColor: C.green, borderRadius: 10, paddingVertical: 13, alignItems: "center", marginTop: 6, marginBottom: 16 },
  imprimirTxt: { color: "#06210b", fontWeight: "700" },
  vazio: { color: C.mut, textAlign: "center", marginTop: 40, lineHeight: 22 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  nome: { color: C.text, fontSize: 15, fontWeight: "800" },
  sub: { color: C.mut, fontSize: 12, marginTop: 3 },
  valor: { color: C.text, fontSize: 14, fontWeight: "800" },
  valorMoeda: { color: C.green, fontSize: 12, fontWeight: "700", marginTop: 2 },
  tag: { fontSize: 10, fontWeight: "700", borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, marginTop: 5, overflow: "hidden" },
});
