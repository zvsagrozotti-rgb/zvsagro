import React, { useState, useCallback } from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { obterDashboard } from "../../logic/fin/dashboard";
import { fmtMoeda } from "../../logic/fmt";
import { FC as C, FCStyles as CS } from "../../logic/fin/finTheme";

function dataBR(iso) {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return d + "/" + m + "/" + a;
}

export default function FinDashboardScreen() {
  const [d, setD] = useState(null);

  useFocusEffect(useCallback(() => { obterDashboard().then(setD); }, []));

  if (!d) return null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16 }}>
      <View style={s.row2}>
        <View style={CS.kpiCard(C.blue)}>
          <Text style={CS.kpiLabel}>Saldo Total</Text>
          <Text style={[CS.kpiValor, { color: d.saldo_total >= 0 ? C.blue : C.red }]}>{fmtMoeda(d.saldo_total)}</Text>
          <Text style={CS.kpiSub}>Todas as contas</Text>
        </View>
        <View style={CS.kpiCard(C.green)}>
          <Text style={CS.kpiLabel}>Recebido no Mês</Text>
          <Text style={[CS.kpiValor, { color: C.green }]}>{fmtMoeda(d.receitas_mes)}</Text>
          <Text style={CS.kpiSub}>Receitas baixadas</Text>
        </View>
      </View>

      <View style={s.row2}>
        <View style={CS.kpiCard(C.red)}>
          <Text style={CS.kpiLabel}>Pago no Mês</Text>
          <Text style={[CS.kpiValor, { color: C.red }]}>{fmtMoeda(d.despesas_mes)}</Text>
          <Text style={CS.kpiSub}>Despesas baixadas</Text>
        </View>
        <View style={CS.kpiCard(d.saldo_mes >= 0 ? C.green : C.red)}>
          <Text style={CS.kpiLabel}>Saldo do Mês</Text>
          <Text style={[CS.kpiValor, { color: d.saldo_mes >= 0 ? C.green : C.red }]}>{fmtMoeda(d.saldo_mes)}</Text>
          <Text style={CS.kpiSub}>Receitas − despesas</Text>
        </View>
      </View>

      {d.atrasados.qtd > 0 ? (
        <View style={s.alerta}>
          <Text style={s.alertaTxt}>⚠️ {d.atrasados.qtd} lançamento(s) atrasado(s) — total {fmtMoeda(d.atrasados.total)}</Text>
        </View>
      ) : null}

      <Text style={s.secaoT}>🏦 Contas Bancárias</Text>
      {d.contas.length === 0 ? <Text style={s.vazio}>Nenhuma conta cadastrada.</Text> : (
        <View style={s.contasG}>
          {d.contas.map((c) => (
            <View key={c.id} style={[CS.contaCard(C.blue), s.contaItem]}>
              <Text style={s.contaNome}>{c.nome}</Text>
              <Text style={[s.contaValor, { color: c.saldo_atual >= 0 ? C.green : C.red }]}>{fmtMoeda(c.saldo_atual)}</Text>
              <Text style={s.contaSub}>{c.tipo}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={s.secaoT}>Próximos vencimentos</Text>
      {d.proximos_vencimentos.length === 0 ? <Text style={s.vazio}>Nada pendente.</Text> : (
        <View style={CS.tabela}>
          <View style={CS.tabelaHead}>
            <Text style={[CS.tabelaHeadTxt, { flex: 1 }]}>Descrição</Text>
            <Text style={[CS.tabelaHeadTxt, { width: 70, textAlign: "right" }]}>Data</Text>
            <Text style={[CS.tabelaHeadTxt, { width: 90, textAlign: "right" }]}>Valor</Text>
          </View>
          {d.proximos_vencimentos.map((p, i) => (
            <View key={i} style={CS.tabelaRow}>
              <Text style={s.rowDesc} numberOfLines={1}>{p.tipo === "receita" ? "💰" : "🧾"} {p.descricao}</Text>
              <Text style={s.rowMuted}>{dataBR(p.data_vencimento)}</Text>
              <Text style={[s.rowValor, { color: p.tipo === "receita" ? C.green : C.red, width: 90 }]}>{fmtMoeda(p.valor)}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={s.secaoT}>Últimas movimentações</Text>
      {d.ultimas_transacoes.length === 0 ? <Text style={s.vazio}>Nenhuma movimentação ainda.</Text> : (
        <View style={CS.tabela}>
          <View style={CS.tabelaHead}>
            <Text style={[CS.tabelaHeadTxt, { flex: 1 }]}>Descrição</Text>
            <Text style={[CS.tabelaHeadTxt, { width: 70, textAlign: "right" }]}>Data</Text>
            <Text style={[CS.tabelaHeadTxt, { width: 90, textAlign: "right" }]}>Valor</Text>
          </View>
          {d.ultimas_transacoes.map((t, i) => (
            <View key={i} style={CS.tabelaRow}>
              <Text style={s.rowDesc} numberOfLines={1}>{t.tipo === "receita" ? "💰" : "🧾"} {t.descricao}</Text>
              <Text style={s.rowMuted}>{dataBR(t.data)}</Text>
              <Text style={[s.rowValor, { color: t.tipo === "receita" ? C.green : C.red, width: 90 }]}>
                {t.tipo === "receita" ? "+" : "-"}{fmtMoeda(t.valor)}
              </Text>
            </View>
          ))}
        </View>
      )}
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  row2: { flexDirection: "row", gap: 12, marginBottom: 12 },
  alerta: { backgroundColor: C.redBg, borderColor: C.red, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16 },
  alertaTxt: { color: "#991b1b", fontSize: 13, fontWeight: "700" },
  secaoT: { color: C.navy, fontSize: 14, fontWeight: "800", marginTop: 8, marginBottom: 10 },
  vazio: { color: C.mut, fontSize: 13, marginBottom: 16 },
  contasG: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 6 },
  contaItem: { width: "47%", flexGrow: 1 },
  contaNome: { color: C.mut, fontSize: 12 },
  contaValor: { fontSize: 18, fontWeight: "800", marginTop: 2 },
  contaSub: { color: "#9ca3af", fontSize: 11, marginTop: 2 },
  rowDesc: { flex: 1, color: C.text, fontSize: 13, fontWeight: "600" },
  rowMuted: { width: 70, color: "#9ca3af", fontSize: 11, textAlign: "right" },
  rowValor: { fontSize: 13, fontWeight: "700", textAlign: "right" },
});
