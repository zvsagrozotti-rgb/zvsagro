import React, { useState, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { minhaEmpresa, listarMembros, convitesPendentes, convitesParaMim, convidar, aceitarConvite, removerMembro } from "../logic/empresaOnline";
import { avisar, confirmar } from "../logic/confirm";
import { AppCtx } from "../logic/appctx";
import { C } from "../theme";

export default function MinhaEquipeScreen() {
  const { recarregar } = React.useContext(AppCtx);
  const [empresa, setEmpresa] = useState(null);
  const [membros, setMembros] = useState([]);
  const [pendentes, setPendentes] = useState([]);
  const [convitesMeus, setConvitesMeus] = useState([]);
  const [email, setEmail] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    const e = await minhaEmpresa();
    setEmpresa(e);
    setMembros(await listarMembros());
    if (e && e.papel === "dono") setPendentes(await convitesPendentes());
    setConvitesMeus(await convitesParaMim());
  }, []);
  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  async function enviarConvite() {
    if (!email.trim()) { avisar("Atenção", "Digite o e-mail da pessoa."); return; }
    setOcupado(true);
    const r = await convidar(email.trim());
    setOcupado(false);
    if (!r.ok) { avisar("Erro", r.erro); return; }
    setEmail("");
    avisar("Convite enviado!", "Se ela ainda não tem conta: assim que criar uma com esse e-mail, já cai direto na sua equipe, automaticamente. Se ela já tem conta, é só abrir esta mesma tela e aceitar o convite.");
    await carregar();
  }

  function aceitar(conviteId, nomeEmpresa) {
    confirmar("Aceitar convite", "Você vai passar a ver os dados de \"" + (nomeEmpresa || "outra empresa") + "\" em vez dos seus atuais. Deseja continuar?", async () => {
      const r = await aceitarConvite(conviteId);
      if (!r.ok) { avisar("Erro", r.erro); return; }
      avisar("Pronto!", "Você agora faz parte dessa empresa.");
      await recarregar();
      await carregar();
    });
  }

  function remover(userId, emailAlvo) {
    confirmar("Remover da equipe", "Remover \"" + emailAlvo + "\" da sua equipe? Ela perde o acesso aos dados, mas não perde a conta dela.", async () => {
      const r = await removerMembro(userId);
      if (!r.ok) { avisar("Erro", r.erro); return; }
      avisar("Removido", "\"" + emailAlvo + "\" não faz mais parte da equipe.");
      await carregar();
    });
  }

  const souDono = empresa && empresa.papel === "dono";

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={membros}
        keyExtractor={(i) => i.user_id}
        ListHeaderComponent={
          <>
            {convitesMeus.length > 0 ? (
              <View style={s.card}>
                <Text style={s.h}>📩 Convite(s) recebido(s)</Text>
                {convitesMeus.map((c) => (
                  <View key={c.id} style={s.conviteRow}>
                    <Text style={s.mut}>{c.empresas?.nome || "Uma empresa"} te convidou</Text>
                    <TouchableOpacity style={s.btnMini} onPress={() => aceitar(c.id, c.empresas?.nome)}>
                      <Text style={s.btnMiniTxt}>Aceitar</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={s.card}>
              <Text style={s.h}>Minha equipe{empresa?.nome ? " — " + empresa.nome : ""}</Text>
              <Text style={s.mut}>Todos aqui veem e editam os mesmos cadastros, aplicações e dados financeiros.</Text>
            </View>

            {souDono ? (
              <View style={s.card}>
                <Text style={s.h}>Convidar colega</Text>
                <Text style={s.mut}>Convide antes mesmo dela ter conta — quando ela criar uma com esse e-mail, já entra direto na sua equipe.</Text>
                <TextInput style={s.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
                  placeholder="email@da-pessoa.com" placeholderTextColor="#5f7d69" />
                <TouchableOpacity style={[s.btn, ocupado && { opacity: 0.6 }]} onPress={enviarConvite} disabled={ocupado}>
                  <Text style={s.btnTxt}>{ocupado ? "Enviando…" : "＋ Convidar"}</Text>
                </TouchableOpacity>

                {pendentes.length > 0 ? (
                  <View style={{ marginTop: 14 }}>
                    <Text style={s.label}>Convites aguardando resposta</Text>
                    {pendentes.map((c) => (
                      <Text key={c.id} style={s.mut}>⏳ {c.email}</Text>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}

            <Text style={[s.label, { marginTop: 4 }]}>Membros</Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.nome}>{item.email}</Text>
              <Text style={s.papel}>{item.papel === "dono" ? "👑 Dono" : "Membro"}</Text>
            </View>
            {souDono && item.papel !== "dono" ? (
              <TouchableOpacity style={s.btnRemover} onPress={() => remover(item.user_id, item.email)}>
                <Text style={s.btnRemoverTxt}>Remover</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 14 },
  h: { color: C.text, fontSize: 14, fontWeight: "800", marginBottom: 6 },
  mut: { color: C.mut, fontSize: 12, marginBottom: 4, lineHeight: 17 },
  label: { color: "#A9C9B4", fontSize: 11, fontWeight: "700", marginBottom: 8, marginTop: 4, textTransform: "uppercase" },
  input: { backgroundColor: C.bg, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, color: C.text, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, marginTop: 8 },
  btn: { backgroundColor: C.green, borderRadius: 12, paddingVertical: 13, alignItems: "center", marginTop: 10 },
  btnTxt: { color: "#06210b", fontSize: 15, fontWeight: "800" },
  conviteRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  btnMini: { backgroundColor: C.green, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 12 },
  btnMiniTxt: { color: "#06210b", fontSize: 12, fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  nome: { color: C.text, fontSize: 14, fontWeight: "700", flexShrink: 1 },
  papel: { color: C.mut, fontSize: 12, fontWeight: "700", marginTop: 2 },
  btnRemover: { borderColor: C.red, borderWidth: 1.5, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 12, marginLeft: 10 },
  btnRemoverTxt: { color: C.red, fontSize: 12, fontWeight: "700" },
});
