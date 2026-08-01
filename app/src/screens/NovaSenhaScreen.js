// Aparece sozinha quando a pessoa volta pelo link de "esqueci minha senha".
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { definirNovaSenha } from "../logic/authOnline";
import { C } from "../theme";

export default function NovaSenhaScreen({ onPronto }) {
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function salvar() {
    setErro("");
    if (senha.length < 6) { setErro("A senha precisa ter pelo menos 6 caracteres."); return; }
    if (senha !== confirmar) { setErro("As senhas digitadas são diferentes."); return; }
    setOcupado(true);
    const r = await definirNovaSenha(senha);
    setOcupado(false);
    if (!r.ok) { setErro(r.erro); return; }
    onPronto();
  }

  return (
    <KeyboardAvoidingView style={s.wrap} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.box}>
        <Text style={s.nome}>Nova senha</Text>
        <Text style={s.sub}>Escolha uma senha nova pra sua conta.</Text>

        <Text style={s.label}>Nova senha</Text>
        <TextInput style={s.input} value={senha} onChangeText={setSenha} secureTextEntry
          placeholder="mínimo 6 caracteres" placeholderTextColor="#5f7d69" />

        <Text style={s.label}>Confirmar senha</Text>
        <TextInput style={s.input} value={confirmar} onChangeText={setConfirmar} secureTextEntry
          placeholder="digite de novo" placeholderTextColor="#5f7d69" onSubmitEditing={salvar} />

        {erro ? <Text style={s.erro}>{erro}</Text> : null}

        <TouchableOpacity style={[s.btn, ocupado && { opacity: 0.6 }]} onPress={salvar} disabled={ocupado}>
          <Text style={s.btnTxt}>{ocupado ? "Salvando…" : "Salvar nova senha"}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, justifyContent: "center", padding: 22 },
  box: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 16, padding: 22 },
  nome: { color: C.text, fontSize: 22, fontWeight: "800", textAlign: "center" },
  sub: { color: C.mut, fontSize: 13, textAlign: "center", marginTop: 4, marginBottom: 16 },
  label: { color: "#A9C9B4", fontSize: 11, fontWeight: "700", marginBottom: 5, marginTop: 8, textTransform: "uppercase" },
  input: { backgroundColor: C.bg, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, color: C.text, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15 },
  erro: { color: C.red, fontSize: 13, marginTop: 10, textAlign: "center" },
  btn: { backgroundColor: C.green, borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 18 },
  btnTxt: { color: "#06210b", fontSize: 16, fontWeight: "800" },
});
