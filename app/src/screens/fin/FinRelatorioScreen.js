import React, { useState, useCallback } from "react";
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { relatorioCompleto, extrato } from "../../logic/fin/relatorios";
import { listarContas } from "../../logic/fin/contas";
import { imprimirRelatorioFinanceiro } from "../../logic/fin/relatorioPrint";
import { fmtMoeda } from "../../logic/fmt";
import { avisar } from "../../logic/confirm";
import { FC as C, FCStyles as CS } from "../../logic/fin/finTheme";
import FinTabBar from "../../components/fin/FinTabBar";
import FinMesNav from "../../components/fin/FinMesNav";
import VazioEstado from "../../components/fin/VazioEstado";

const STATUS = [
  { id: "", label: "Todos" },
  { id: "baixado", label: "Baixados" },
  { id: "pendente", label: "Pendentes" },
  { id: "atrasado", label: "Atrasados" },
];

function dataBR(iso) {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return d + "/" + m + "/" + a;
}
function hoje() {
  const d = new Date(); const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}
function ultimoDia(ano, mes) { return new Date(ano, mes + 1, 0).getDate(); }

export default function FinRelatorioScreen({ navigation }) {
  const hj = new Date();
  const [mes, setMes] = useState({ ano: hj.getFullYear(), mes: hj.getMonth() });
  const [todos, setTodos] = useState(false);
  const [status, setStatus] = useState("");
  const [itens, setItens] = useState([]);
  const [saldoAcumulado, setSaldoAcumulado] = useState(0);
  const [imprimindo, setImprimindo] = useState(false);

  const p = (n) => String(n).padStart(2, "0");
  const inicio = todos ? null : mes.ano + "-" + p(mes.mes + 1) + "-01";
  const fim = todos ? null : mes.ano + "-" + p(mes.mes + 1) + "-" + p(ultimoDia(mes.ano, mes.mes));

  const carregar = useCallback(() => {
    relatorioCompleto({ inicio, fim, status }).then(setItens)
      .catch((e) => avisar("Erro ao carregar", e.message || "Não foi possível carregar o relatório. Tente novamente."));
    // Saldo acumulado = saldo real até o FIM do período, não só o líquido do mês
    // isolado — senão um mês que fechou no vermelho parece "zerado" no mês
    // seguinte, em vez de continuar descontando do que já tinha sobrado antes.
    Promise.all([extrato({ fim }), listarContas()]).then(([baixados, contas]) => {
      const somaBaixados = baixados.reduce((s, x) => s + (x.tipo === "receita" ? 1 : -1) * parseFloat(x.valor_baixa), 0);
      const somaInicial = contas.filter((c) => !c.sistema).reduce((s, c) => s + parseFloat(c.saldo_inicial || 0), 0);
      setSaldoAcumulado(somaInicial + somaBaixados);
    }).catch((e) => avisar("Erro ao carregar", e.message || "Não foi possível calcular o saldo acumulado."));
    // eslint-disable-next-line
  }, [inicio, fim, status]);
  useFocusEffect(carregar);

  function mudarMes(delta) {
    setMes((m) => {
      let mm = m.mes + delta, aa = m.ano;
      if (mm < 0) { mm = 11; aa--; } else if (mm > 11) { mm = 0; aa++; }
      return { ano: aa, mes: mm };
    });
  }

  const totalReceitas = itens.filter(x => x.tipo === "receita" && x.status !== "cancelado")
    .reduce((s, x) => s + parseFloat(x.status === "baixado" ? x.valor_baixa : x.valor), 0);
  const totalDespesas = itens.filter(x => x.tipo === "despesa" && x.status !== "cancelado")
    .reduce((s, x) => s + parseFloat(x.status === "baixado" ? x.valor_baixa : x.valor), 0);
  const totalAReceber = itens.filter(x => x.tipo === "receita" && x.status === "pendente")
    .reduce((s, x) => s + parseFloat(x.valor), 0);
  const totalAPagar = itens.filter(x => x.tipo === "despesa" && x.status === "pendente")
    .reduce((s, x) => s + parseFloat(x.valor), 0);

  async function onImprimir() {
    setImprimindo(true);
    try {
      await imprimirRelatorioFinanceiro({ itens, inicio, fim, status, totalReceitas, totalDespesas, totalAReceber, totalAPagar, saldoAcumulado });
    } catch (e) { avisar("Erro", "Não foi possível gerar o relatório."); }
    setImprimindo(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FinMesNav mes={mes} onMudar={mudarMes} todos={todos} onTodos={() => setTodos((t) => !t)} />
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <View style={s.row2}>
          <View style={CS.kpiFlat}>
            <Text style={s.kpiLbl}>Receitas</Text>
            <Text style={[s.kpiVal, { color: C.green }]}>{fmtMoeda(totalReceitas)}</Text>
          </View>
          <View style={CS.kpiFlat}>
            <Text style={s.kpiLbl}>Despesas</Text>
            <Text style={[s.kpiVal, { color: C.red }]}>{fmtMoeda(totalDespesas)}</Text>
          </View>
          <View style={CS.kpiFlat}>
            <Text style={s.kpiLbl}>Saldo{todos ? "" : " acumulado"}</Text>
            <Text style={[s.kpiVal, { color: saldoAcumulado >= 0 ? C.text : C.red }]}>{fmtMoeda(saldoAcumulado)}</Text>
          </View>
        </View>

        <View style={s.row2}>
          <View style={CS.kpiFlat}>
            <Text style={s.kpiLbl}>A Receber</Text>
            <Text style={[s.kpiVal, { color: C.amarelo }]}>{fmtMoeda(totalAReceber)}</Text>
          </View>
          <View style={CS.kpiFlat}>
            <Text style={s.kpiLbl}>A Pagar</Text>
            <Text style={[s.kpiVal, { color: C.amarelo }]}>{fmtMoeda(totalAPagar)}</Text>
          </View>
        </View>

        <View style={s.chips}>
          {STATUS.map((st) => (
            <TouchableOpacity key={st.id} style={[s.chip, status === st.id && s.chipAtivo]} onPress={() => setStatus(st.id)}>
              <Text style={[s.chipTxt, status === st.id && s.chipTxtAtivo]}>{st.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[s.imprimir, (imprimindo || itens.length === 0) && { opacity: 0.6 }]} onPress={onImprimir} disabled={imprimindo || itens.length === 0}>
          <Text style={s.imprimirTxt}>{imprimindo ? "Gerando…" : "🖨️ Imprimir relatório"}</Text>
        </TouchableOpacity>

        {itens.length === 0 ? (
          <VazioEstado icone="📊" titulo="Nada neste período" sub="Troque o mês ou o filtro acima" />
        ) : (
          <View style={CS.tabela}>
            <View style={CS.tabelaHead}>
              <Text style={[CS.tabelaHeadTxt, { flex: 1 }]}>Descrição</Text>
              <Text style={[CS.tabelaHeadTxt, { width: 74, textAlign: "center" }]}>Status</Text>
              <Text style={[CS.tabelaHeadTxt, { width: 90, textAlign: "right" }]}>Valor</Text>
            </View>
            {itens.map((x) => {
              const atrasado = x.status === "pendente" && x.data_vencimento < hoje();
              const badge = x.status === "baixado" ? { color: C.green, backgroundColor: C.greenBg }
                : x.status === "cancelado" ? { color: C.mut, backgroundColor: C.grayBg }
                : atrasado ? { color: C.red, backgroundColor: C.redBg }
                : { color: C.amarelo, backgroundColor: C.amareloBg };
              return (
                <View key={x.tipo + x.id} style={CS.tabelaRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.linhaL} numberOfLines={1}>{x.tipo === "receita" ? "💰" : "🧾"} {x.descricao}</Text>
                    <Text style={s.linhaSub}>{dataBR(x.data_vencimento)}{x.categoria ? " · " + x.categoria : ""}{x.cliente ? " · " + x.cliente : ""}</Text>
                  </View>
                  <View style={{ width: 74, alignItems: "center" }}>
                    <Text style={[CS.badge, badge]}>{atrasado ? "atrasado" : x.status}</Text>
                  </View>
                  <Text style={[s.linhaV, {
                    width: 90,
                    color: x.status === "baixado" ? C.green
                      : x.status === "cancelado" ? C.mut
                      : atrasado ? C.red
                      : C.amarelo,
                  }]}>{fmtMoeda(x.status === "baixado" ? x.valor_baixa : x.valor)}</Text>
                </View>
              );
            })}
          </View>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
      <FinTabBar navigation={navigation} ativa="FinRelatorio" />
    </View>
  );
}

const s = StyleSheet.create({
  row2: { flexDirection: "row", gap: 10, marginBottom: 14, marginTop: 14 },
  kpiLbl: { color: C.mut, fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  kpiVal: { fontSize: 16, fontWeight: "800", marginTop: 4 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: { borderColor: C.line, borderWidth: 1.5, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: "#fff" },
  chipAtivo: { backgroundColor: C.navy, borderColor: C.navy },
  chipTxt: { color: C.mut, fontSize: 12, fontWeight: "700" },
  chipTxtAtivo: { color: "#fff" },
  imprimir: { backgroundColor: C.navy, borderRadius: 10, paddingVertical: 13, alignItems: "center", marginBottom: 14 },
  imprimirTxt: { color: "#fff", fontWeight: "700" },
  linhaL: { color: C.text, fontSize: 13, fontWeight: "700" },
  linhaSub: { color: "#9ca3af", fontSize: 11, marginTop: 2 },
  linhaV: { fontSize: 13, fontWeight: "800", textAlign: "right" },
});
