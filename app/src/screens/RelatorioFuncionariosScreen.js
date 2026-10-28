import React, { useState, useCallback, useLayoutEffect, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { assinar } from "../logic/store";
import { carregarTudo, souAdministrador, meuFuncionario } from "../logic/cupons";
import { relatorioFuncionarios } from "../logic/saldo";
import { imprimirRelatorioFuncionarios } from "../logic/relatorioFuncionariosPrint";
import { fmtMoeda } from "../logic/fmt";
import { avisar } from "../logic/confirm";
import PickerModal from "../components/PickerModal";
import { C } from "../theme";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const pad2 = (n) => String(n).padStart(2, "0");
function hoje() { const d = new Date(); return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
function dataBR(iso) { if (!iso) return "—"; const [a, m, d] = String(iso).slice(0, 10).split("-"); return d && m && a ? d + "/" + m + "/" + a : iso; }

const GRANULARIDADES = [
  { key: "todos", label: "Tudo" },
  { key: "dia", label: "Dia", tamanho: 10 },
  { key: "mes", label: "Mês", tamanho: 7 },
  { key: "ano", label: "Ano", tamanho: 4 },
];
function valorPadrao(key) { if (key === "dia") return hoje(); if (key === "mes") return hoje().slice(0, 7); return hoje().slice(0, 4); }
function formatarValor(key, valor) {
  if (key === "dia") return dataBR(valor);
  if (key === "mes") { const [a, m] = valor.split("-"); return (MESES[Number(m) - 1] || "?") + " " + a; }
  return valor;
}
function mover(key, valor, delta) {
  if (key === "dia") { const d = new Date(valor + "T12:00:00"); d.setDate(d.getDate() + delta); return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  if (key === "mes") { const [a, m] = valor.split("-").map(Number); const d = new Date(a, m - 1 + delta, 1); return d.getFullYear() + "-" + pad2(d.getMonth() + 1); }
  return String(Number(valor) + delta);
}

// Receitas (adiantamentos) e despesas (cupons) por funcionário: um por um ou todos, por período.
export default function RelatorioFuncionariosScreen({ navigation }) {
  const [dados, setDados] = useState({ funcionarios: [], cupons: [], creditos: [] });
  const [admin, setAdmin] = useState(true);
  const [meu, setMeu] = useState(null);
  const [funcionarioId, setFuncionarioId] = useState(null); // null = todos
  const [granularidade, setGranularidade] = useState("mes");
  const [valor, setValor] = useState(valorPadrao("mes"));
  const [picker, setPicker] = useState(false);
  const [imprimindo, setImprimindo] = useState(false);
  const todos = granularidade === "todos";

  const carregar = useCallback(async () => {
    const [t, a] = await Promise.all([carregarTudo(), souAdministrador()]);
    setDados(t); setAdmin(a);
    if (!a) { const m = await meuFuncionario(t.funcionarios); setMeu(m); if (m) setFuncionarioId(m.id); }
  }, []);
  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));
  useEffect(() => { const x = assinar("cupons", carregar), y = assinar("adiantamentos", carregar); return () => { x(); y(); }; }, [carregar]);

  const gConfig = GRANULARIDADES.find((g) => g.key === granularidade);
  const prefixo = todos ? null : valor;
  const lista = admin ? dados.funcionarios : (meu ? [meu] : []);
  const relatorio = relatorioFuncionarios(lista, dados.creditos, dados.cupons, { funcionarioId, prefixo });
  const nomeFiltro = funcionarioId ? ((lista.find((f) => f.id === funcionarioId) || {}).nome || "") : "Todos os funcionários";
  const periodoLabel = todos ? "Todo o histórico" : formatarValor(granularidade, valor) + " (" + gConfig.label + ")";

  function mudarGranularidade(key) { setGranularidade(key); if (key !== "todos") setValor(valorPadrao(key)); }

  async function imprimir() {
    setImprimindo(true);
    try { await imprimirRelatorioFuncionarios({ periodoLabel, filtroLabel: nomeFiltro, relatorio }); }
    catch (e) { avisar("Erro", "Não foi possível gerar o relatório: " + e.message); }
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
  }, [navigation, imprimindo, periodoLabel, nomeFiltro, relatorio]);

  const { totais, porFuncionario } = relatorio;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={s.filtros}>
        {admin ? (
          <TouchableOpacity style={s.combo} onPress={() => setPicker(true)}>
            <Text style={s.comboLbl}>Funcionário:</Text>
            <Text style={s.comboVal} numberOfLines={1}>{nomeFiltro}</Text>
            <Text style={s.chev}>▾</Text>
          </TouchableOpacity>
        ) : null}
        <View style={s.segRow}>
          {GRANULARIDADES.map((g) => (
            <TouchableOpacity key={g.key} style={[s.seg, granularidade === g.key && s.segAtivo]} onPress={() => mudarGranularidade(g.key)}>
              <Text style={[s.segTxt, granularidade === g.key && s.segTxtAtivo]}>{g.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {!todos ? (
          <View style={s.nav}>
            <TouchableOpacity onPress={() => setValor((v) => mover(granularidade, v, -1))} style={s.seta}><Text style={s.setaTxt}>‹</Text></TouchableOpacity>
            <Text style={s.navTitulo}>{formatarValor(granularidade, valor)}</Text>
            <TouchableOpacity onPress={() => setValor((v) => mover(granularidade, v, 1))} style={s.seta}><Text style={s.setaTxt}>›</Text></TouchableOpacity>
          </View>
        ) : null}
      </View>

      <FlatList
        data={porFuncionario}
        keyExtractor={(x) => x.funcionario.id}
        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
        ListEmptyComponent={<Text style={s.vazio}>{admin ? "Nenhum funcionário cadastrado." : "Seu e-mail ainda não está no cadastro de funcionários."}</Text>}
        ListHeaderComponent={
          <View style={s.resumo}>
            <View style={s.resumoItem}><Text style={[s.resumoValor, { color: C.greenClaro }]}>{fmtMoeda(totais.receitas)}</Text><Text style={s.resumoLabel}>receitas</Text></View>
            <View style={s.resumoItem}><Text style={[s.resumoValor, { color: C.red }]}>{fmtMoeda(totais.despesas)}</Text><Text style={s.resumoLabel}>despesas</Text></View>
            <View style={s.resumoItem}><Text style={[s.resumoValor, { color: totais.resultado < 0 ? C.red : C.greenClaro }]}>{fmtMoeda(totais.resultado)}</Text><Text style={s.resumoLabel}>resultado</Text></View>
          </View>
        }
        renderItem={({ item: x }) => (
          <View style={s.bloco}>
            <View style={s.blocoTopo}>
              <Text style={s.blocoNome} numberOfLines={1}>{x.funcionario.nome}</Text>
              <Text style={[s.blocoRes, { color: x.resultado < 0 ? C.red : C.greenClaro }]}>{fmtMoeda(x.resultado)}</Text>
            </View>
            <Text style={s.blocoSub}>Receitas {fmtMoeda(x.receitas)} · Despesas {fmtMoeda(x.despesas)}</Text>
            {Object.keys(x.porTipo).length > 0 ? <Text style={s.blocoSub}>{Object.entries(x.porTipo).map(([t, v]) => t + " " + fmtMoeda(v)).join(" · ")}</Text> : null}
            {x.movimentos.length === 0 ? <Text style={s.semMov}>Sem lançamentos no período.</Text> : null}
            {x.movimentos.map((m) => (
              <View key={m.kind + m.id} style={s.mov}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.movT} numberOfLines={1}>{m.titulo}</Text>
                  <Text style={s.movS}>{dataBR(m.data)} · {m.tipo}{m.fechado ? " · fechado" : ""}</Text>
                </View>
                <Text style={[s.movV, { color: m.kind === "receita" ? C.greenClaro : C.red }]}>{m.kind === "receita" ? "+ " : "− "}{fmtMoeda(m.valor)}</Text>
              </View>
            ))}
          </View>
        )}
      />

      <PickerModal visible={picker} titulo="Funcionário"
        itens={[{ id: "__todos", label: "Todos os funcionários" }, ...lista.map((f) => ({ id: f.id, label: f.nome, sub: f.funcao }))]}
        onSelect={(i) => { setFuncionarioId(i.id === "__todos" ? null : i.id); setPicker(false); }} onClose={() => setPicker(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  filtros: { padding: 16, borderBottomColor: C.border, borderBottomWidth: 1 },
  combo: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 12 },
  comboLbl: { color: C.mut, fontSize: 12, fontWeight: "700" },
  comboVal: { color: C.text, fontSize: 15, fontWeight: "800", flex: 1 },
  chev: { color: C.mut, fontSize: 16 },
  segRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  seg: { flex: 1, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, paddingVertical: 9, alignItems: "center" },
  segAtivo: { backgroundColor: C.green, borderColor: C.green },
  segTxt: { color: C.mut, fontSize: 13, fontWeight: "700" },
  segTxtAtivo: { color: "#06210b" },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, paddingHorizontal: 6 },
  seta: { paddingHorizontal: 14, paddingVertical: 10 },
  setaTxt: { color: C.blue, fontSize: 22, fontWeight: "800" },
  navTitulo: { color: C.text, fontSize: 15, fontWeight: "800" },
  resumo: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8, marginBottom: 6 },
  resumoItem: { flexGrow: 1, minWidth: "30%", backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 10, padding: 10, alignItems: "center" },
  resumoValor: { fontSize: 15, fontWeight: "800" },
  resumoLabel: { color: C.mut, fontSize: 10, marginTop: 2, textAlign: "center" },
  vazio: { color: C.mut, textAlign: "center", marginTop: 40, lineHeight: 22 },
  bloco: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 10 },
  blocoTopo: { flexDirection: "row", alignItems: "center", gap: 8 },
  blocoNome: { color: C.text, fontSize: 15, fontWeight: "800", flex: 1 },
  blocoRes: { fontSize: 15, fontWeight: "800" },
  blocoSub: { color: C.mut, fontSize: 12, marginTop: 4 },
  semMov: { color: C.mut, fontSize: 12, marginTop: 10 },
  mov: { flexDirection: "row", alignItems: "center", gap: 10, borderTopColor: C.border, borderTopWidth: 1, marginTop: 10, paddingTop: 10 },
  movT: { color: C.text, fontSize: 13, fontWeight: "700" },
  movS: { color: C.mut, fontSize: 11, marginTop: 2 },
  movV: { fontSize: 13, fontWeight: "800" },
});
