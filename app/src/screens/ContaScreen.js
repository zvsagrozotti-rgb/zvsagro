import React, { useState, useContext } from "react";
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { excluirConta } from "../logic/authOnline";
import { exportarMeusDados } from "../logic/exportarDados";
import { AppCtx } from "../logic/appctx";
import { confirmar, avisar } from "../logic/confirm";
import { C } from "../theme";
import appJson from "../../app.json";

export default function ContaScreen({ navigation }) {
  const { sair } = useContext(AppCtx);
  const [excluindo, setExcluindo] = useState(false);
  const [exportando, setExportando] = useState(false);

  async function exportar() {
    setExportando(true);
    try {
      const r = await exportarMeusDados();
      avisar("Backup gerado!", "Arquivo \"" + r.arquivo + "\" com " + r.total + " registro(s). Guarde em local seguro.");
    } catch (e) {
      avisar("Erro", "Não foi possível gerar o backup.");
    }
    setExportando(false);
  }

  function confirmarSair() {
    confirmar("Sair", "Deseja sair do app?", () => sair());
  }

  function confirmarExcluir() {
    confirmar(
      "Excluir minha conta",
      "Isso apaga sua conta pra sempre. Se você for dono de uma empresa com outras pessoas, primeiro remova elas da equipe. Essa ação NÃO pode ser desfeita. Deseja continuar?",
      async () => {
        setExcluindo(true);
        const r = await excluirConta();
        setExcluindo(false);
        if (!r.ok) { avisar("Não foi possível excluir", r.erro); return; }
      }
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 18 }}>
      <View style={s.card}>
        <Text style={s.h}>Seus dados</Text>
        <Text style={s.mut}>Tudo o que você cadastra fica salvo automaticamente na nuvem e sincroniza sozinho entre todos os seus aparelhos — não precisa de backup manual no dia a dia.</Text>

        <Text style={[s.label, { marginTop: 12 }]}>Levar seus dados</Text>
        <Text style={s.mut}>Vai parar de usar o sistema, ou só quer guardar uma cópia? Gere um arquivo com tudo que está cadastrado.</Text>
        <TouchableOpacity style={[s.btnSec, { marginTop: 4 }, exportando && { opacity: 0.6 }]} onPress={exportar} disabled={exportando}>
          <Text style={s.btnSecTxt}>{exportando ? "Gerando…" : "💾 Baixar meus dados"}</Text>
        </TouchableOpacity>
      </View>

      <View style={s.card}>
        <Text style={s.h}>Equipe</Text>
        <Text style={s.mut}>Convide colegas pra acessarem os mesmos dados com o login deles.</Text>
        <TouchableOpacity style={s.btnSec} onPress={() => navigation.navigate("MinhaEquipe")}>
          <Text style={s.btnSecTxt}>👥 Minha equipe</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btnSec, { marginTop: 10 }]} onPress={() => navigation.navigate("Atividade")}>
          <Text style={s.btnSecTxt}>📜 Atividade recente</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={s.sair} onPress={confirmarSair}><Text style={s.sairTxt}>Sair do app</Text></TouchableOpacity>

      <TouchableOpacity style={[s.excluir, excluindo && { opacity: 0.6 }]} onPress={confirmarExcluir} disabled={excluindo}>
        <Text style={s.excluirTxt}>{excluindo ? "Excluindo…" : "🗑 Excluir minha conta"}</Text>
      </TouchableOpacity>

      <Text style={s.versao}>VZS Agro · versão {appJson.expo.version} (build {appJson.expo.android?.versionCode ?? "?"})</Text>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 14 },
  h: { color: C.text, fontSize: 14, fontWeight: "800", marginBottom: 8 },
  status: { color: C.text, fontSize: 14, fontWeight: "700", marginBottom: 10 },
  mut: { color: C.mut, fontSize: 12, lineHeight: 18, marginBottom: 8 },
  label: { color: "#A9C9B4", fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  btnSec: { borderColor: C.blue, borderWidth: 1.5, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  btnSecTxt: { color: C.blue, fontSize: 14, fontWeight: "800" },
  sair: { borderColor: C.line, borderWidth: 1.5, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  sairTxt: { color: C.mut, fontSize: 15, fontWeight: "700" },
  excluir: { paddingVertical: 14, alignItems: "center", marginTop: 8 },
  excluirTxt: { color: C.red, fontSize: 13, fontWeight: "700" },
  versao: { color: C.mut, fontSize: 11, textAlign: "center", marginTop: 18 },
});
