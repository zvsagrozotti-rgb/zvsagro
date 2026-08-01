import React, { useState, useCallback } from "react";
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { listarReceitas } from "../../logic/fin/receitas";
import { listarDespesas } from "../../logic/fin/despesas";
import { fmtMoeda } from "../../logic/calc";
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
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  return d + "/" + m + "/" + a;
}
function hojeISO() {
  const d = new Date(); const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}
function corStatus(x, atrasado) {
  if (x.status === "baixado") return C.green;
  if (x.status === "cancelado") return C.mut;
  if (atrasado) return C.red;
  return C.amarelo;
}
function badgeStyle(x, atrasado) {
  if (x.status === "baixado") return { color: C.green, backgroundColor: C.greenBg };
  if (x.status === "cancelado") return { color: C.mut, backgroundColor: C.grayBg };
  if (atrasado) return { color: C.red, backgroundColor: C.redBg };
  return { color: C.amarelo, backgroundColor: C.amareloBg };
}

export default function FinLancamentosScreen({ route, navigation }) {
  const tipo = route.params.tipo; // "receita" | "despesa"
  const [itens, setItens] = useState([]);
  const [status, setStatus] = useState("");
  const [busca, setBusca] = useState("");
  const hoje = new Date();
  const [mes, setMes] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() });
  const [todos, setTodos] = useState(false);

  useFocusEffect(useCallback(() => {
    const fn = tipo === "receita" ? listarReceitas : listarDespesas;
    fn({}).then(setItens).catch((e) => avisar("Erro ao carregar", e.message || "Não foi possível carregar os lançamentos. Tente novamente."));
  }, [tipo]));

  function mudarMes(delta) {
    setMes((m) => {
      let mm = m.mes + delta, aa = m.ano;
      if (mm < 0) { mm = 11; aa--; } else if (mm > 11) { mm = 0; aa++; }
      return { ano: aa, mes: mm };
    });
  }

  const hojeStr = hojeISO();
  const noMes = itens.filter((x) => {
    if (todos) return true;
    if (!x.data_vencimento) return false;
    const [a, m] = x.data_vencimento.split("-");
    return Number(a) === mes.ano && Number(m) - 1 === mes.mes;
  });
  const buscaNorm = busca.trim().toLowerCase();
  const filtrados = noMes.filter((x) => {
    if (status) {
      if (status === "atrasado") { if (!(x.status === "pendente" && x.data_vencimento < hojeStr)) return false; }
      else if (x.status !== status) return false;
    }
    if (buscaNorm) {
      const nomeMatch = (x.cliente_nome || "").toLowerCase().includes(buscaNorm);
      // Aceita tanto "125" quanto "125,50" — normaliza vírgula pra casar com o valor formatado (ex.: "1192.00").
      const valorAtual = parseFloat(x.status === "baixado" ? x.valor_baixa : x.valor).toFixed(2);
      const valorMatch = valorAtual.includes(buscaNorm.replace(",", "."));
      if (!nomeMatch && !valorMatch) return false;
    }
    return true;
  });
  const total = filtrados.filter(x => x.status !== "cancelado").reduce((s, x) => s + parseFloat(x.status === "baixado" ? x.valor_baixa : x.valor), 0);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FinMesNav mes={mes} onMudar={mudarMes} todos={todos} onTodos={() => setTodos((t) => !t)} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <TouchableOpacity style={s.novo} onPress={() => navigation.navigate("FinLancamentoForm", { tipo })}>
          <Text style={s.novoTxt}>＋ Nova {tipo === "receita" ? "receita" : "despesa"}</Text>
        </TouchableOpacity>

        <TextInput
          style={s.busca}
          value={busca}
          onChangeText={setBusca}
          placeholder={"Buscar por " + (tipo === "receita" ? "cliente" : "fornecedor") + " ou valor"}
          placeholderTextColor="#9ca3af"
        />

        <View style={s.chips}>
          {STATUS.map((st) => (
            <TouchableOpacity key={st.id} style={[s.chip, status === st.id && s.chipAtivo]} onPress={() => setStatus(st.id)}>
              <Text style={[s.chipTxt, status === st.id && s.chipTxtAtivo]}>{st.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {filtrados.length > 0 && (
          <>
            <View style={CS.kpiCard(tipo === "receita" ? C.green : C.red)}>
              <Text style={CS.kpiLabel}>Total {status ? STATUS.find(s2 => s2.id === status)?.label : "geral"}</Text>
              <Text style={[CS.kpiValor, { color: tipo === "receita" ? C.green : C.red }]}>{fmtMoeda(total)}</Text>
            </View>
            <View style={{ height: 14 }} />
          </>
        )}

        {filtrados.length === 0 ? (
          <VazioEstado icone={tipo === "receita" ? "💰" : "🧾"} titulo={`Nenhuma ${tipo === "receita" ? "receita" : "despesa"}`}
            sub={buscaNorm ? "Nada encontrado pra essa busca." : todos ? "Nada por aqui ainda." : "Nada neste mês. Troque o mês ou veja todos."} />
        ) : (
          <View style={CS.tabela}>
            <View style={CS.tabelaHead}>
              <Text style={[CS.tabelaHeadTxt, { flex: 1 }]}>Descrição</Text>
              <Text style={[CS.tabelaHeadTxt, { width: 74, textAlign: "center" }]}>Status</Text>
              <Text style={[CS.tabelaHeadTxt, { width: 90, textAlign: "right" }]}>Valor</Text>
            </View>
            {filtrados.map((x) => {
              const atrasado = x.status === "pendente" && x.data_vencimento < hojeStr;
              return (
                <TouchableOpacity key={x.id} style={CS.tabelaRow} onPress={() => navigation.navigate("FinLancamentoDetail", { tipo, id: x.id })}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.nome} numberOfLines={1}>{x.descricao}</Text>
                    <Text style={s.sub}>{dataBR(x.data_vencimento)}{x.categoria_nome ? " · " + x.categoria_nome : ""}{x.cliente_nome ? " · " + x.cliente_nome : ""}</Text>
                  </View>
                  <View style={{ width: 74, alignItems: "center" }}>
                    <Text style={[CS.badge, badgeStyle(x, atrasado)]}>
                      {x.status === "baixado" ? "baixado" : x.status === "cancelado" ? "cancelado" : atrasado ? "atrasado" : "pendente"}
                    </Text>
                  </View>
                  <Text style={[s.valor, { color: corStatus(x, atrasado), width: 90 }]}>{fmtMoeda(x.status === "baixado" ? x.valor_baixa : x.valor)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
      <FinTabBar navigation={navigation} ativa={tipo === "receita" ? "FinReceitas" : "FinDespesas"} />
    </View>
  );
}

const s = StyleSheet.create({
  novo: { backgroundColor: C.green, borderRadius: 10, paddingVertical: 13, alignItems: "center", marginBottom: 14 },
  busca: { backgroundColor: "#fff", borderColor: C.line, borderWidth: 1.5, borderRadius: 9, color: C.text, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, marginBottom: 14 },
  novoTxt: { color: "#fff", fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  chip: { borderColor: C.line, borderWidth: 1.5, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: "#fff" },
  chipAtivo: { backgroundColor: C.green, borderColor: C.green },
  chipTxt: { color: C.mut, fontSize: 12, fontWeight: "700" },
  chipTxtAtivo: { color: "#fff" },
  nome: { color: C.text, fontSize: 13, fontWeight: "700" },
  sub: { color: "#9ca3af", fontSize: 11, marginTop: 2 },
  valor: { fontSize: 13, fontWeight: "800", textAlign: "right" },
});
