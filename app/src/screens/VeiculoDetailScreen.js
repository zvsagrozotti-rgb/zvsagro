import React, { useState, useCallback, useLayoutEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { assinar } from "../logic/store";
import { listarAbastecimentos, calcularLinhas, calcularEstatisticas } from "../logic/frota/abastecimentos";
import { fmt, fmtMoeda } from "../logic/fmt";
import { souAdministrador, listarFuncionarios } from "../logic/cupons";
import { listarUsos, historicoDoVeiculo, usoAberto, entregarVeiculo, devolverVeiculo } from "../logic/usoVeiculo";
import PickerModal from "../components/PickerModal";
import { confirmar, avisar } from "../logic/confirm";
import { C } from "../theme";

function dataBR(iso) {
  if (!iso) return "—";
  const [a, m, d] = String(iso).slice(0, 10).split("-");
  return d && m && a ? d + "/" + m + "/" + a : iso;
}

export default function VeiculoDetailScreen({ route, navigation }) {
  const { veiculo } = route.params;
  const [linhas, setLinhas] = useState([]);
  const [admin, setAdmin] = useState(false);
  const [usos, setUsos] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [pickFunc, setPickFunc] = useState(false);
  const [atual, setAtual] = useState(veiculo);
  React.useEffect(() => { souAdministrador().then(setAdmin); }, []);

  const carregar = useCallback(() => {
    listarAbastecimentos(veiculo.id).then((abs) => setLinhas(calcularLinhas(abs)));
  }, [veiculo.id]);
  useFocusEffect(carregar);
  const carregarUsos = useCallback(() => { listarUsos().then(setUsos).catch(() => {}); }, []);
  useFocusEffect(carregarUsos);
  React.useEffect(() => assinar("usos", carregarUsos), [carregarUsos]);
  React.useEffect(() => { if (admin) listarFuncionarios().then(setFuncionarios).catch(() => {}); }, [admin]);

  function hojeISO() { const d = new Date(); const p = (n) => String(n).padStart(2, "0"); return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()); }
  async function entregar(f) {
    setPickFunc(false);
    try { setAtual(await entregarVeiculo(atual, f, hojeISO())); carregarUsos(); } catch (e) { avisar("Erro", e.message || "Não foi possível registrar."); }
  }
  function devolver() {
    confirmar("Devolver veículo", "Encerrar o uso de " + (atual.usoAtualNome || "este funcionário") + " hoje?", async () => {
      try { setAtual(await devolverVeiculo(atual, hojeISO())); carregarUsos(); } catch (e) { avisar("Erro", e.message || "Não foi possível registrar."); }
    });
  }
  const historicoUso = historicoDoVeiculo(usos, veiculo.id);
  const emUso = usoAberto(usos, veiculo.id);
  React.useEffect(() => assinar("abastecimentos", carregar), [carregar]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: veiculo.apelido || veiculo.placa || "Veículo",
      headerRight: () => admin ? (
        <TouchableOpacity onPress={() => navigation.navigate("VeiculoForm", { item: veiculo })} style={{ paddingHorizontal: 14 }}>
          <Text style={{ color: C.text, fontSize: 18 }}>✏️</Text>
        </TouchableOpacity>
      ) : null,
    });
  }, [navigation, veiculo, admin]);

  const { geral, ultimos, ultimosX } = calcularEstatisticas(linhas, 5);
  const ordenadas = [...linhas].reverse(); // mais recente primeiro

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={ordenadas}
        keyExtractor={(i, idx) => i.id || String(idx)}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            {(geral || ultimos) ? (
              <View style={s.statsRow}>
                <PainelStats titulo="Geral" r={geral} />
                <PainelStats titulo={"Últimos " + ultimosX} r={ultimos} />
              </View>
            ) : (
              <Text style={s.vazioStats}>Sem estatísticas ainda — registre abastecimentos até completar o tanque pelo menos uma vez.</Text>
            )}
            <Text style={s.subTitulo}>Quem está com o veículo</Text>
            <View style={s.usoBox}>
              <Text style={s.usoAtual}>{emUso ? emUso.funcionarioNome + " · desde " + dataBR(emUso.inicio) : "Sem funcionário no momento"}</Text>
              {admin ? (
                <View style={s.usoBtns}>
                  <TouchableOpacity style={s.usoBtn} onPress={() => setPickFunc(true)}><Text style={s.usoBtnTxt}>{emUso ? "↔ Trocar de funcionário" : "＋ Entregar a um funcionário"}</Text></TouchableOpacity>
                  {emUso ? <TouchableOpacity style={s.usoBtn} onPress={devolver}><Text style={s.usoBtnTxt}>✔ Devolver</Text></TouchableOpacity> : null}
                </View>
              ) : null}
              {historicoUso.length > 0 ? <Text style={s.usoTit}>Histórico de uso</Text> : null}
              {historicoUso.slice(0, 12).map((u) => (
                <View key={u.id} style={s.usoLinha}>
                  <Text style={s.usoNome} numberOfLines={1}>{u.funcionarioNome}</Text>
                  <Text style={s.usoPeriodo}>{dataBR(u.inicio)} → {u.fim ? dataBR(u.fim) : "em uso"}</Text>
                </View>
              ))}
            </View>
            <Text style={s.subTitulo}>Histórico de abastecimentos</Text>
          </View>
        }
        ListEmptyComponent={<Text style={s.vazio}>{admin ? "Nenhum abastecimento registrado.\nToque em ＋ para adicionar." : "Nenhum abastecimento registrado."}</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.row} disabled={!admin} onPress={() => navigation.navigate("AbastecimentoForm", { veiculoId: veiculo.id, veiculoNome: veiculo.apelido || veiculo.placa, item })}>
            <View style={{ flex: 1 }}>
              <Text style={s.rowData}>{dataBR(item.data)} · {fmt(item.odometro, 0)} km</Text>
              {item.funcionarioNome ? <Text style={s.rowSub}>Funcionário: {item.funcionarioNome}</Text> : null}
              <Text style={s.rowSub}>
                {fmt(item.volume)} L{item.preco ? " · " + fmtMoeda(item.preco) + "/L" : ""}{item.valor != null ? " · " + fmtMoeda(item.valor) : ""}
                {!item.completou ? " · parcial" : ""}
              </Text>
              {item.consumoKmL != null ? (
                <Text style={s.rowCalc}>
                  {fmt(item.consumoKmL)} km/L · {fmt(item.l100km)} L/100km · {fmtMoeda(item.custoKm)}/km
                </Text>
              ) : null}
            </View>
            {admin ? <Text style={s.chev}>›</Text> : null}
          </TouchableOpacity>
        )}
      />
      <PickerModal visible={pickFunc} titulo="Entregar o veículo a" vazioMsg="Cadastre funcionários em Cadastros › Funcionários."
        itens={funcionarios.map((f) => ({ id: f.id, label: f.nome, sub: f.funcao }))}
        onSelect={(it) => entregar(funcionarios.find((f) => f.id === it.id))} onClose={() => setPickFunc(false)} />
      {admin ? (
        <TouchableOpacity style={s.fab} onPress={() => navigation.navigate("AbastecimentoForm", { veiculoId: veiculo.id, veiculoNome: veiculo.apelido || veiculo.placa })}>
          <Text style={s.fabTxt}>＋ Abastecimento</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function PainelStats({ titulo, r }) {
  return (
    <View style={s.painel}>
      <Text style={s.painelTitulo}>{titulo}</Text>
      {r ? (
        <>
          <Linha l="Distância" v={fmt(r.distancia, 0) + " km"} />
          <Linha l="Gasto total" v={fmtMoeda(r.gasto)} />
          <Linha l="Consumo médio" v={fmt(r.consumoMedio) + " km/L"} />
          <Linha l="Consumo mín/máx" v={fmt(r.consumoMin) + " / " + fmt(r.consumoMax)} />
          <Linha l="Custo/km médio" v={fmtMoeda(r.custoMedio)} />
          <Linha l="Abastecimentos" v={String(r.qtd)} />
        </>
      ) : <Text style={s.painelVazio}>Sem dados.</Text>}
    </View>
  );
}
function Linha({ l, v }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
      <Text style={s.painelLabel}>{l}</Text>
      <Text style={s.painelValor}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  usoBox: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 14 },
  usoAtual: { color: C.text, fontSize: 15, fontWeight: "800" },
  usoBtns: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" },
  usoBtn: { borderColor: C.line, borderWidth: 1.5, borderRadius: 9, paddingVertical: 9, paddingHorizontal: 12 },
  usoBtnTxt: { color: C.text, fontSize: 12, fontWeight: "800" },
  usoTit: { color: "#A9C9B4", fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginTop: 14, marginBottom: 6 },
  usoLinha: { flexDirection: "row", justifyContent: "space-between", gap: 8, paddingVertical: 5, borderTopColor: C.border, borderTopWidth: 1 },
  usoNome: { color: C.text, fontSize: 13, fontWeight: "700", flex: 1 },
  usoPeriodo: { color: C.mut, fontSize: 12 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 6 },
  painel: { flex: 1, backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 12 },
  painelTitulo: { color: C.text, fontSize: 13, fontWeight: "800", marginBottom: 6 },
  painelLabel: { color: C.mut, fontSize: 11 },
  painelValor: { color: C.text, fontSize: 11, fontWeight: "700" },
  painelVazio: { color: C.mut, fontSize: 11 },
  vazioStats: { color: C.mut, fontSize: 12, lineHeight: 18, marginBottom: 10 },
  subTitulo: { color: C.text, fontSize: 14, fontWeight: "800", marginTop: 14, marginBottom: 4 },
  vazio: { color: C.mut, textAlign: "center", marginTop: 40, lineHeight: 22 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  rowData: { color: C.text, fontSize: 14, fontWeight: "700" },
  rowSub: { color: C.mut, fontSize: 12, marginTop: 3 },
  rowCalc: { color: C.greenClaro, fontSize: 12, marginTop: 4, fontWeight: "600" },
  chev: { color: C.mut, fontSize: 22, fontWeight: "800" },
  fab: { position: "absolute", right: 16, bottom: 20, backgroundColor: C.green, borderRadius: 30, paddingVertical: 14, paddingHorizontal: 20 },
  fabTxt: { color: "#06210b", fontSize: 14, fontWeight: "800" },
});
