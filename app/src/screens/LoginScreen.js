import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image } from "react-native";
import { entrar as entrarOnline, cadastrar, recuperarSenha } from "../logic/authOnline";
import MarcaAegroFin from "../components/MarcaAegroFin";
import { C } from "../theme";

const APP_ICON = require("../../assets/icon.png");

export default function LoginScreen({ empresa }) {
  const [modo, setModo] = useState("entrar"); // "entrar" | "cadastrar"
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function enviar() {
    setErro(""); setAviso(""); setOcupado(true);
    const r = modo === "entrar" ? await entrarOnline(email.trim(), senha) : await cadastrar(email.trim(), senha);
    setOcupado(false);
    if (!r.ok) {
      if (r.precisaConfirmar) { setAviso(r.erro); setModo("entrar"); }
      else setErro(r.erro);
      return;
    }
    // Sessão trocou — o App.js escuta isso sozinho e troca de tela.
  }

  async function esqueciSenha() {
    if (!email.trim()) { setErro(""); setAviso("Digite seu e-mail ali em cima primeiro."); return; }
    setErro(""); setAviso(""); setOcupado(true);
    const r = await recuperarSenha(email);
    setOcupado(false);
    if (!r.ok) { setErro(r.erro); return; }
    setAviso("Te mandamos um e-mail com o link pra criar uma senha nova. Confira sua caixa de entrada.");
  }

  const logo = empresa && empresa.logo;

  return (
    <KeyboardAvoidingView style={s.wrap} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.box}>
        {logo ? <Image source={{ uri: logo }} style={s.logo} resizeMode="contain" />
              : <Image source={APP_ICON} style={s.appIcon} resizeMode="contain" />}
        {empresa && empresa.nome ? <Text style={s.nome}>{empresa.nome}</Text> : <MarcaAegroFin style={s.nome} />}
        <Text style={s.sub}>{modo === "entrar" ? "Acesse com seu e-mail e senha" : "Crie sua conta"}</Text>

        <Text style={s.label}>E-mail</Text>
        <TextInput style={s.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
          placeholder="voce@email.com" placeholderTextColor="#5f7d69" />

        <Text style={s.label}>Senha</Text>
        <TextInput style={s.input} value={senha} onChangeText={setSenha} secureTextEntry
          placeholder={modo === "cadastrar" ? "mínimo 6 caracteres" : "senha"} placeholderTextColor="#5f7d69" onSubmitEditing={enviar} />

        {erro ? <Text style={s.erro}>{erro}</Text> : null}
        {aviso ? <Text style={s.avisoTxt}>{aviso}</Text> : null}

        <TouchableOpacity style={[s.btn, ocupado && { opacity: 0.6 }]} onPress={enviar} disabled={ocupado}>
          <Text style={s.btnTxt}>{ocupado ? "Aguarde…" : modo === "entrar" ? "Entrar" : "Criar conta"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.trocarModo} onPress={() => { setModo(modo === "entrar" ? "cadastrar" : "entrar"); setErro(""); setAviso(""); }}>
          <Text style={s.trocarModoTxt}>
            {modo === "entrar" ? "Ainda não tem conta? Criar conta" : "Já tem conta? Entrar"}
          </Text>
        </TouchableOpacity>

        {modo === "entrar" ? (
          <TouchableOpacity style={s.trocarModo} onPress={esqueciSenha}>
            <Text style={s.esqueciTxt}>Esqueci minha senha</Text>
          </TouchableOpacity>
        ) : null}

        <Text style={s.dica}>Essa conta é a mesma em todos os seus aparelhos — os dados sincronizam sozinhos entre eles.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, justifyContent: "center", padding: 22 },
  box: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 16, padding: 22 },
  logo: { height: 64, width: 180, alignSelf: "center", marginBottom: 8 },
  appIcon: { width: 92, height: 92, alignSelf: "center", marginBottom: 8, borderRadius: 20 },
  nome: { color: C.text, fontSize: 22, fontWeight: "800", textAlign: "center" },
  sub: { color: C.mut, fontSize: 13, textAlign: "center", marginTop: 4, marginBottom: 16 },
  label: { color: "#A9C9B4", fontSize: 11, fontWeight: "700", marginBottom: 5, marginTop: 8, textTransform: "uppercase" },
  input: { backgroundColor: C.bg, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, color: C.text, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15 },
  erro: { color: C.red, fontSize: 13, marginTop: 10, textAlign: "center" },
  avisoTxt: { color: "#ffd76b", fontSize: 13, marginTop: 10, textAlign: "center" },
  btn: { backgroundColor: C.green, borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 18 },
  btnTxt: { color: "#06210b", fontSize: 16, fontWeight: "800" },
  trocarModo: { marginTop: 14, alignItems: "center" },
  trocarModoTxt: { color: C.blue, fontSize: 13, fontWeight: "700" },
  esqueciTxt: { color: C.mut, fontSize: 12, fontWeight: "600" },
  dica: { color: C.mut, fontSize: 11, textAlign: "center", marginTop: 16, lineHeight: 16 },
  b: { color: C.text, fontWeight: "800" },
});
