import React, { useState, useCallback } from "react";
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Platform, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import { buscarCondicoesVoo, avaliarCondicoesVoo, statusKp } from "../logic/condicoesVoo";
import { C } from "../theme";

function hora(iso) {
  try { return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }
  catch (e) { return "—"; }
}

export default function CondicoesVooScreen() {
  const [estado, setEstado] = useState("carregando"); // carregando | ok | erro
  const [erro, setErro] = useState("");
  const [dados, setDados] = useState(null);

  const carregar = useCallback(async () => {
    setEstado("carregando");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setErro("Preciso da localização pra saber o clima e o Kp do seu local."); setEstado("erro"); return; }
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const d = await buscarCondicoesVoo(p.coords.latitude, p.coords.longitude);
      setDados(d);
      setEstado("ok");
    } catch (e) {
      setErro("Não consegui buscar as condições agora. Confira sua internet e tente de novo.");
      setEstado("erro");
    }
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  if (estado === "carregando") {
    return (
      <View style={[s.tela, s.centro]}>
        <Text style={s.mut}>Buscando condições…</Text>
      </View>
    );
  }

  if (estado === "erro") {
    return (
      <View style={[s.tela, s.centro, { padding: 24 }]}>
        <Text style={[s.mut, { textAlign: "center", marginBottom: 16 }]}>{erro}</Text>
        <TouchableOpacity style={s.btn} onPress={carregar}><Text style={s.btnTxt}>Tentar de novo</Text></TouchableOpacity>
      </View>
    );
  }

  const d = dados;
  const av = avaliarCondicoesVoo(d);
  const kpInfo = statusKp(d.kp);

  return (
    <ScrollView style={s.tela} contentContainerStyle={{ padding: 16 }}>
      <View style={[s.banner, { backgroundColor: av.bom ? "#163B24" : "#3B1616" }]}>
        <Text style={[s.bannerTxt, { color: av.bom ? "#6FE39A" : "#E39A9A" }]}>
          {av.bom ? "✔ Boas condições pra voar" : "⚠ Atenção antes de voar"}
        </Text>
        {!av.bom ? av.problemas.map((p, i) => (
          <Text key={i} style={s.bannerItem}>• {p}</Text>
        )) : null}
      </View>

      <View style={s.grid}>
        <Card titulo="Temperatura" valor={d.temp != null ? Math.round(d.temp) + " °C" : "—"} />
        <Card titulo="Umidade" valor={d.umidade != null ? d.umidade + " %" : "—"} />
        <Card titulo="Vento" valor={d.vento != null ? Math.round(d.vento) + " km/h" : "—"} />
        <Card titulo="Rajadas" valor={d.rajada != null ? Math.round(d.rajada) + " km/h" : "—"} />
        <Card titulo="Chance de chuva" valor={d.chuvaProb != null ? d.chuvaProb + " %" : "—"} />
        <Card titulo="Nuvens" valor={d.nuvens != null ? d.nuvens + " %" : "—"} />
        <Card titulo="Visibilidade" valor={d.visibilidade != null ? Math.round(d.visibilidade / 1000) + " km" : "—"} />
        <Card titulo="Índice Kp" valor={d.kp != null ? d.kp.toFixed(2).replace(".00", "") : "—"} corValor={kpInfo.cor} sub={kpInfo.texto} />
      </View>

      <View style={s.card2}>
        <Linha l="Nascer do sol" v={d.nascer ? hora(d.nascer) : "—"} />
        <Linha l="Pôr do sol" v={d.poente ? hora(d.poente) : "—"} />
      </View>

      <TouchableOpacity style={[s.btn, { marginTop: 16 }]} onPress={carregar}>
        <Text style={s.btnTxt}>↻ Atualizar</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[s.btnSec, { marginTop: 10 }]}
        onPress={() => Linking.openURL("https://www2.inpe.br/climaespacial/portal/sci-home/")}
      >
        <Text style={s.btnSecTxt}>🛰️ Ver mapa de cintilação ionosférica (INPE)</Text>
      </TouchableOpacity>

      <Text style={s.rodape}>
        Clima: Open-Meteo · Kp: NOAA SWPC — dados públicos, atualizados a cada poucos minutos. Isso é uma referência, não substitui sua avaliação de campo.
      </Text>
    </ScrollView>
  );
}

function Card({ titulo, valor, corValor, sub }) {
  return (
    <View style={s.card}>
      <Text style={s.cardTitulo}>{titulo}</Text>
      <Text style={[s.cardValor, corValor ? { color: corValor } : null]}>{valor}</Text>
      {sub ? <Text style={[s.cardSub, corValor ? { color: corValor } : null]}>{sub}</Text> : null}
    </View>
  );
}

function Linha({ l, v }) {
  return (<View style={s.linha}><Text style={s.linhaL}>{l}</Text><Text style={s.linhaV}>{v}</Text></View>);
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: C.bg },
  centro: { justifyContent: "center", alignItems: "center" },
  mut: { color: C.mut, fontSize: 14 },
  banner: { borderRadius: 12, padding: 14, marginBottom: 14 },
  bannerTxt: { fontSize: 15, fontWeight: "800" },
  bannerItem: { color: "#F0C9C9", fontSize: 12, marginTop: 6, lineHeight: 17 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: { width: "47%", flexGrow: 1, backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 14, alignItems: "center", minHeight: 84, justifyContent: "center" },
  cardTitulo: { color: C.mut, fontSize: 11, textTransform: "uppercase", fontWeight: "700", marginBottom: 6, textAlign: "center" },
  cardValor: { color: C.text, fontSize: 20, fontWeight: "800" },
  cardSub: { color: C.mut, fontSize: 11, marginTop: 2, textAlign: "center" },
  card2: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 14 },
  linha: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  linhaL: { color: C.mut, fontSize: 12 },
  linhaV: { color: C.text, fontSize: 12, fontWeight: "700" },
  btn: { backgroundColor: C.green, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  btnTxt: { color: "#06210b", fontSize: 14, fontWeight: "800" },
  btnSec: { borderColor: C.green, borderWidth: 1.5, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  btnSecTxt: { color: C.greenClaro || C.green, fontSize: 13, fontWeight: "800" },
  rodape: { color: "#5f7d69", fontSize: 10, textAlign: "center", marginTop: 14, lineHeight: 15 },
});
