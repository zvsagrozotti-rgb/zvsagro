import React, { useState, useCallback, useEffect } from "react";
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { resumos, souAdministrador, meuFuncionario, listarFuncionarios } from "../logic/cupons";
import { assinar } from "../logic/store";
import { fmtMoeda } from "../logic/fmt";
import { C } from "../theme";

// Tela inicial do módulo: um cartão por funcionário com o saldo do ciclo aberto.
export default function CuponsScreen({ navigation }) {
  const [lista, setLista] = useState(null);
  const [admin, setAdmin] = useState(true);
  const [semCadastro, setSemCadastro] = useState(false);

  // Administrador vê todos; funcionário vê só o próprio saldo (pelo e-mail de login cadastrado nele).
  const carregar = useCallback(async () => {
    try {
      const a = await souAdministrador(); setAdmin(a);
      let r = await resumos();
      if (!a) {
        const m = await meuFuncionario(await listarFuncionarios());
        r = m ? r.filter((x) => x.funcionario.id === m.id) : [];
        setSemCadastro(!m);
      }
      setLista(r);
    } catch (e) { setLista([]); }
  }, []);
  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));
  // Cupom lançado por outro aparelho aparece aqui sozinho.
  useEffect(() => { const a = assinar("cupons", carregar), b = assinar("adiantamentos", carregar); return () => { a(); b(); }; }, [carregar]);

  const totalSaldo = (lista || []).reduce((s, r) => s + r.saldo, 0);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16 }}>
      <TouchableOpacity style={s.novo} onPress={() => navigation.navigate("CupomForm", {})}>
        <Text style={s.novoTxt}>📷  Novo cupom</Text>
      </TouchableOpacity>

      {lista && lista.length > 0 ? (
        <View style={s.total}>
          <Text style={s.totalLbl}>{admin ? "Saldo de todos os funcionários" : "Meu saldo"}</Text>
          <Text style={[s.totalVal, { color: totalSaldo < 0 ? C.red : C.greenClaro }]}>{fmtMoeda(totalSaldo)}</Text>
        </View>
      ) : null}

      <Text style={s.secao}>Funcionários</Text>
      {lista && lista.length === 0 ? (
        <Text style={s.vazio}>{admin ? "Nenhum funcionário cadastrado.\nCadastre em Cadastros › Funcionários." : "Seu e-mail ainda não está no cadastro de funcionários.\nPeça ao administrador para cadastrar."}</Text>
      ) : null}
      {(lista || []).map((r) => (
        <TouchableOpacity key={r.funcionario.id} style={s.card} onPress={() => navigation.navigate("FuncionarioSaldo", { funcionarioId: r.funcionario.id })}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.nome} numberOfLines={1}>{r.funcionario.nome}</Text>
            <Text style={s.sub}>Adiantado {fmtMoeda(r.adiantado)} · Gasto {fmtMoeda(r.gasto)} · {r.qtdCupons} cupom(ns)</Text>
          </View>
          <Text style={[s.saldo, { color: r.saldo < 0 ? C.red : C.greenClaro }]}>{fmtMoeda(r.saldo)}</Text>
        </TouchableOpacity>
      ))}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  novo: { backgroundColor: C.green, borderRadius: 12, paddingVertical: 16, alignItems: "center", marginBottom: 16 },
  novoTxt: { color: "#06210b", fontSize: 17, fontWeight: "800" },
  total: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 18 },
  totalLbl: { color: C.mut, fontSize: 12, fontWeight: "700" },
  totalVal: { fontSize: 26, fontWeight: "800", marginTop: 4 },
  secao: { color: C.text, fontSize: 15, fontWeight: "800", marginBottom: 10 },
  vazio: { color: C.mut, fontSize: 13, lineHeight: 20, textAlign: "center", paddingVertical: 20 },
  card: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 15, marginBottom: 10 },
  nome: { color: C.text, fontSize: 15, fontWeight: "800" },
  sub: { color: C.mut, fontSize: 11, marginTop: 3 },
  saldo: { fontSize: 16, fontWeight: "800" },
});
