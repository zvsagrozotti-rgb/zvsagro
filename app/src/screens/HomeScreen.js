import React, { useState, useCallback } from "react";
import { ScrollView, View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { lerEmpresa } from "../logic/empresa";
import { precisaBackup } from "../logic/backup";
import { C } from "../theme";

const ITENS = [
  { icon: "⛽", titulo: "Frota", sub: "Veículos, abastecimentos e consumo", tela: "Frota", ok: true },
  { icon: "📋", titulo: "Cadastros", sub: "Clientes e fornecedores", tela: "Cadastros", ok: true },
  { icon: "🏢", titulo: "Minha Empresa", sub: "Logo, CNPJ, contato", tela: "MinhaEmpresa", ok: true },
  { icon: "💵", titulo: "Financeiro", sub: "Contas, receitas, despesas, cartões…", tela: "Financeiro", ok: true },
];

export default function HomeScreen({ navigation }) {
  const [empresa, setEmpresa] = useState(null);
  const [lembrarBk, setLembrarBk] = useState(false);
  useFocusEffect(useCallback(() => {
    lerEmpresa().then(setEmpresa);
    precisaBackup().then(setLembrarBk).catch(() => {});
  }, []));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={s.scroll}>
      <View style={s.header}>
        {empresa && empresa.logo ? (
          <Image source={{ uri: empresa.logo }} style={s.logo} resizeMode="contain" />
        ) : (
          <Text style={{ fontSize: 30 }}>🚁</Text>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.h1} numberOfLines={1}>{(empresa && empresa.nome) || "Sua Empresa"}</Text>
          <Text style={s.sub} numberOfLines={1}>{(empresa && empresa.slogan) || "Configure em Minha Empresa"}</Text>
        </View>
      </View>

      {lembrarBk ? (
        <TouchableOpacity style={s.bkBanner} onPress={() => navigation.navigate("Conta")}>
          <Text style={s.bkTxt}>💾 Faça um backup dos seus dados para não perder nada. Toque aqui.</Text>
        </TouchableOpacity>
      ) : null}

      <View style={s.grid}>
        {ITENS.map((it, i) => (
          <TouchableOpacity key={i} style={s.card}
            onPress={() => it.ok ? navigation.navigate(it.tela) : navigation.navigate("EmBreve", { titulo: it.titulo })}>
            <Text style={s.icon}>{it.icon}</Text>
            <Text style={s.titulo}>{it.titulo}</Text>
            <Text style={s.cardSub}>{it.sub}</Text>
            {!it.ok && <Text style={s.tag}>em breve</Text>}
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.foot}>VZS Agro · Soluções Integradas{"\n"}Todos os direitos reservados.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
  logo: { width: 54, height: 44 },
  h1: { color: C.text, fontSize: 22, fontWeight: "800" },
  sub: { color: C.mut, fontSize: 12, marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { width: "47%", flexGrow: 1, backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 14, padding: 16, minHeight: 120 },
  icon: { fontSize: 30, marginBottom: 8 },
  titulo: { color: C.text, fontSize: 15, fontWeight: "800" },
  cardSub: { color: C.mut, fontSize: 11, marginTop: 4, lineHeight: 15 },
  tag: { color: "#8fe6b0", fontSize: 10, fontWeight: "700", backgroundColor: "#1c4a30", alignSelf: "flex-start", borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2, marginTop: 8 },
  foot: { color: "#6f8f79", fontSize: 11, textAlign: "center", marginTop: 24 },
  bkBanner: { backgroundColor: "#3a3410", borderColor: "#7a6a1e", borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 14 },
  bkTxt: { color: "#ffe08a", fontSize: 13, fontWeight: "600", lineHeight: 18 },
});
