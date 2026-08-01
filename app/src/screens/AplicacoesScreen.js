import React, { useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { listar, remover } from "../logic/store";
import { confirmar, avisar } from "../logic/confirm";
import { fmtMoeda, calcFinanceiro } from "../logic/calc";
import { gerarRelatorioMultiplo } from "../logic/relatorio";
import PickerModal from "../components/PickerModal";
import { C } from "../theme";

function dataFmt(iso) {
  try { const d = new Date(iso); return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }
  catch (e) { return ""; }
}

export default function AplicacoesScreen({ navigation }) {
  const [itens, setItens] = useState([]);
  const [filtro, setFiltro] = useState("*");
  const [pickOpen, setPickOpen] = useState(false);
  const [modoSelecao, setModoSelecao] = useState(false);
  const [selecionados, setSelecionados] = useState({});
  const [gerando, setGerando] = useState(false);

  const carregar = useCallback(() => {
    listar("aplicacoes").then(a => setItens(a.slice().sort((x, y) => (y.em || "").localeCompare(x.em || ""))));
  }, []);
  useFocusEffect(carregar);

  function excluir(item) {
    confirmar("Excluir aplicação", "Remover a aplicação de " + (item.clienteNome || "—") + "?", async () => {
      await remover("aplicacoes", item.id); carregar();
    });
  }

  function sairSelecao() { setModoSelecao(false); setSelecionados({}); }

  function alternar(item) {
    setSelecionados(s => {
      const novo = { ...s };
      if (novo[item.id]) delete novo[item.id]; else novo[item.id] = true;
      return novo;
    });
  }

  async function gerarSelecionados() {
    const escolhidas = itens.filter(i => selecionados[i.id]);
    if (escolhidas.length === 0) { avisar("Atenção", "Selecione ao menos uma aplicação."); return; }
    setGerando(true);
    try { await gerarRelatorioMultiplo(escolhidas); }
    catch (e) { avisar("Erro", "Não foi possível gerar o relatório."); }
    setGerando(false);
    sairSelecao();
  }

  const clientes = [...new Set(itens.map(i => i.clienteNome || "—"))].sort((a, b) => String(a).localeCompare(String(b)));
  const lista = filtro === "*" ? itens : itens.filter(i => (i.clienteNome || "—") === filtro);
  const qtdSel = Object.keys(selecionados).length;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16, flexDirection: "row", gap: 8 }}>
        <TouchableOpacity style={[s.relatorioGeral, { flex: 1 }]} onPress={() => navigation.navigate("RelatorioGeral")}>
          <Text style={s.relatorioGeralTxt}>📊 Relatório geral de trabalhos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.selBtn} onPress={() => (modoSelecao ? sairSelecao() : setModoSelecao(true))}>
          <Text style={s.selBtnTxt}>{modoSelecao ? "✕ Cancelar" : "☑ Selecionar"}</Text>
        </TouchableOpacity>
      </View>
      {modoSelecao ? (
        <Text style={s.dica}>Toque nas aplicações que quer incluir no relatório (pode ser de talhões diferentes).</Text>
      ) : null}
      {clientes.length > 1 ? (
        <View style={s.filtroWrap}>
          <TouchableOpacity style={s.combo} onPress={() => setPickOpen(true)}>
            <Text style={s.comboLbl}>Cliente:</Text>
            <Text style={s.comboVal} numberOfLines={1}>{filtro === "*" ? "Todos" : filtro}</Text>
            <Text style={s.comboChev}>▾</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        data={lista}
        keyExtractor={(i, idx) => i.id || String(idx)}
        contentContainerStyle={{ padding: 16, paddingBottom: modoSelecao ? 90 : 16 }}
        ListEmptyComponent={<Text style={s.vazio}>Nenhuma aplicação {filtro !== "*" ? "para este cliente" : "salva ainda"}.{filtro === "*" ? "\nCalculadora › 💾 Salvar aplicação." : ""}</Text>}
        renderItem={({ item }) => {
          const d = item.dados || {};
          const fin = calcFinanceiro({ area: d.area, valorHa: item.valorHa, cobraDeslocamento: item.cobraDeslocamento, valorKm: item.valorKm, km: item.km });
          const marcado = !!selecionados[item.id];
          return (
            <View style={[s.row, modoSelecao && marcado && s.rowMarcada]}>
              <TouchableOpacity
                style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}
                onPress={() => modoSelecao ? alternar(item) : navigation.navigate("AplicacaoDetail", { item })}
              >
                {modoSelecao ? <Text style={s.check}>{marcado ? "☑" : "☐"}</Text> : null}
                <View style={{ flex: 1 }}>
                  <Text style={s.nome}>{item.clienteNome || "(sem cliente)"}</Text>
                  <Text style={s.sub}>📅 {item.dataAplicacao || dataFmt(item.em)}{item.talhaoNome ? " · 📐 " + item.talhaoNome : (item.fazendaNome ? " · " + item.fazendaNome : "")}</Text>
                  <Text style={s.sub2}>{d.area ? d.area + " ha · " : ""}{(d.produtos || []).filter(p => p.nome).length} produto(s){fin.total > 0 ? " · " + fmtMoeda(fin.total) : ""}</Text>
                  {item.inicioAplicacao && !item.fimAplicacao ? <Text style={s.emAndamento}>⏱ Em andamento</Text> : null}
                </View>
              </TouchableOpacity>
              {!modoSelecao ? (
                <TouchableOpacity style={s.del} onPress={() => excluir(item)}>
                  <Text style={{ color: C.red, fontWeight: "800", fontSize: 16 }}>🗑</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        }}
      />

      {modoSelecao ? (
        <View style={s.barraInferior}>
          <TouchableOpacity
            style={[s.gerar, (gerando || qtdSel === 0) && { opacity: 0.6 }]}
            onPress={gerarSelecionados}
            disabled={gerando || qtdSel === 0}
          >
            <Text style={s.gerarTxt}>{gerando ? "Gerando…" : "📄 Gerar relatório (" + qtdSel + ")"}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <PickerModal
        visible={pickOpen}
        titulo="Filtrar por cliente"
        itens={[{ id: "*", label: "Todos" }, ...clientes.map(c => ({ id: c, label: c }))]}
        onSelect={(it) => { setFiltro(it.id); setPickOpen(false); }}
        onClose={() => setPickOpen(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  relatorioGeral: { backgroundColor: "#1c4a30", borderRadius: 10, paddingVertical: 12, alignItems: "center", marginBottom: 4 },
  relatorioGeralTxt: { color: "#bff0cf", fontWeight: "700" },
  selBtn: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, justifyContent: "center", marginBottom: 4 },
  selBtnTxt: { color: C.text, fontSize: 13, fontWeight: "700" },
  dica: { color: C.mut, fontSize: 12, paddingHorizontal: 16, paddingTop: 10, lineHeight: 18 },
  filtroWrap: { padding: 12, borderBottomColor: C.border, borderBottomWidth: 1 },
  combo: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 11 },
  comboLbl: { color: C.mut, fontSize: 13, fontWeight: "700" },
  comboVal: { color: C.text, fontSize: 14, fontWeight: "700", flex: 1 },
  comboChev: { color: C.blue, fontSize: 16, fontWeight: "800" },
  vazio: { color: C.mut, textAlign: "center", marginTop: 40, lineHeight: 22 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  rowMarcada: { borderColor: C.green, backgroundColor: "#123420" },
  check: { fontSize: 20, color: C.green },
  nome: { color: C.text, fontSize: 15, fontWeight: "800" },
  sub: { color: C.mut, fontSize: 12, marginTop: 3 },
  sub2: { color: "#7d93b3", fontSize: 11, marginTop: 2 },
  emAndamento: { color: "#FAC775", fontSize: 11, fontWeight: "700", marginTop: 3 },
  del: { paddingHorizontal: 8, paddingVertical: 6 },
  barraInferior: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 14, backgroundColor: C.bg, borderTopColor: C.border, borderTopWidth: 1 },
  gerar: { backgroundColor: C.green, borderRadius: 12, paddingVertical: 15, alignItems: "center" },
  gerarTxt: { color: "#06210b", fontSize: 15, fontWeight: "800" },
});
