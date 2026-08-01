import React, { useState, useMemo, useCallback, useEffect } from "react";
import { ScrollView, View, Text, TextInput, TouchableOpacity, Switch, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  UNIDADES, calcularCalda, deltaT, corDT, statusDT, vazaoLha, fmt, fmtMoeda, calcFinanceiro, num, DT_TEMPS, DT_UMID,
} from "../logic/calc";
import { listar } from "../logic/store";
import { avaliarIncompatibilidade } from "../logic/incompatibilidade";
import PickerModal from "../components/PickerModal";
import AgrofitBusca from "../components/AgrofitBusca";
import { C } from "../theme";

function Field({ label, value, onChange, placeholder }) {
  return (
    <View style={{ flex: 1, minWidth: 110 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput style={s.input} value={String(value ?? "")} onChangeText={onChange}
        placeholder={placeholder} placeholderTextColor="#5f7d69" keyboardType="decimal-pad" />
    </View>
  );
}
function Kpi({ n, l, color }) {
  return (<View style={s.kpi}><Text style={[s.kpiN, color && { color }]}>{n}</Text><Text style={s.kpiL}>{l}</Text></View>);
}
function Leg({ c, t }) {
  return (<View style={s.legItem}><View style={[s.dot, { backgroundColor: c }]} /><Text style={s.legTxt}>{t}</Text></View>);
}

export default function CalculadoraScreen({ navigation, route }) {
  const [tanque, setTanque] = useState("40");
  const [vazao, setVazao] = useState("10");
  const [area, setArea] = useState(route.params?.talhao ? String(route.params.talhao.area ?? "") : "");
  const [talhao, setTalhao] = useState(route.params?.talhao || null);
  useEffect(() => {
    const t = route.params?.talhao;
    if (t) { setTalhao(t); if (t.area != null) setArea(String(t.area)); }
  }, [route.params?.talhao]);
  const [produtos, setProdutos] = useState([
    { nome: "Herbicida exemplo", dose: "1.5", uni: "L/ha" },
    { nome: "Adjuvante", dose: "0.5", uni: "% v/v" },
  ]);
  const [temp, setTemp] = useState("26");
  const [umid, setUmid] = useState("60");
  const [vento, setVento] = useState("");
  const [q, setQ] = useState("2.4");
  const [vel, setVel] = useState("18");
  const [faixa, setFaixa] = useState("8");
  const [valorHa, setValorHa] = useState("");
  const [cobraDeslocamento, setCobraDeslocamento] = useState(false);
  const [valorKm, setValorKm] = useState("");
  const [km, setKm] = useState("");
  const [volJarra, setVolJarra] = useState("1");

  const calda = useMemo(() => calcularCalda({ tanque, vazao, areaTotal: area, produtos }), [tanque, vazao, area, produtos]);
  const avisosIncompat = useMemo(() => avaliarIncompatibilidade(produtos), [produtos]);
  const nProdValidos = useMemo(() => produtos.filter((p) => p.nome && p.nome.trim()).length, [produtos]);
  const dtVal = useMemo(() => { const T = num(temp), R = num(umid); return isFinite(T) && isFinite(R) ? deltaT(T, R) : null; }, [temp, umid]);
  const vz = useMemo(() => vazaoLha(q, vel, faixa), [q, vel, faixa]);
  const fin = calcFinanceiro({ area, valorHa, cobraDeslocamento, valorKm, km });

  const [cadastro, setCadastro] = useState([]);
  const [fazendas, setFazendas] = useState([]);
  const [talhoesLista, setTalhoesLista] = useState([]);
  const [prodPickerRow, setProdPickerRow] = useState(null);
  const [uniPickerRow, setUniPickerRow] = useState(null);
  const [agrofitRow, setAgrofitRow] = useState(null);
  const [fazPicker, setFazPicker] = useState(false);
  const [talPickerFaz, setTalPickerFaz] = useState(null);
  useFocusEffect(useCallback(() => {
    listar("produtos").then(setCadastro);
    listar("fazendas").then(setFazendas);
    listar("talhoes").then(setTalhoesLista);
  }, []));

  function escolherTalhao(t) {
    setTalhao(t);
    if (t && t.area != null) setArea(String(t.area));
    setTalPickerFaz(null);
  }

  const setProd = (i, k, v) => setProdutos(p => p.map((x, j) => j === i ? { ...x, [k]: v } : x));
  const addProd = (pre) => setProdutos(p => [...p, pre || { nome: "", dose: "", uni: "L/ha" }]);
  const escolherProduto = (it) => {
    const i = prodPickerRow; if (i == null) return;
    const prod = it._o || it;
    setProdutos(p => p.map((x, j) => j === i ? {
      nome: prod.nome || it.label || "",
      dose: prod.dose != null ? String(prod.dose) : "",
      uni: UNIDADES.includes(prod.unidade) ? prod.unidade : "L/ha",
      formulacao: prod.formulacao || "",
    } : x));
    setProdPickerRow(null);
  };
  // Puxa direto do catálogo AGROFIT (sem cadastrar): preenche nome e formulação; a dose você digita.
  const escolherAgrofit = (p) => {
    const i = agrofitRow; if (i == null) return;
    setProdutos(arr => arr.map((x, j) => j === i ? { ...x, nome: p.n, formulacao: p.fc || x.formulacao || "" } : x));
    setAgrofitRow(null);
  };
  const coletarDados = () => ({ tanque, vazao, area, produtos, temp, umid, vento, q, vel, faixa, talhao, valorHa, cobraDeslocamento, valorKm, km });
  const rmProd = (i) => setProdutos(p => p.filter((_, j) => j !== i));

  const nT = num(temp), nR = num(umid);
  const hereT = isFinite(nT) ? DT_TEMPS.reduce((a, b) => Math.abs(b - nT) < Math.abs(a - nT) ? b : a) : null;
  const hereU = isFinite(nR) ? DT_UMID.reduce((a, b) => Math.abs(b - nR) < Math.abs(a - nR) ? b : a) : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
      {talhao ? (
        <View style={s.vincBanner}>
          <Text style={s.vincTxt}>📐 Aplicação p/ <Text style={{ fontWeight: "800" }}>{talhao.nome}</Text>{talhao.fazenda ? " · " + talhao.fazenda : ""} — {fmt(num(talhao.area), 2)} ha</Text>
          <TouchableOpacity onPress={() => setTalhao(null)}><Text style={{ color: C.red, fontWeight: "800" }}>✕</Text></TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={s.escTalhao} onPress={() => setFazPicker(true)}>
          <Text style={s.escTalhaoTxt}>📐 Escolher talhão cadastrado</Text>
          <Text style={s.escTalhaoSub}>Escolha a fazenda e o talhão — a área entra sozinha</Text>
        </TouchableOpacity>
      )}
      <View style={s.card}>
        <Text style={s.h2}>🧪 Cálculo da calda</Text>
        <View style={s.row}>
          <Field label="Tanque (L)" value={tanque} onChange={setTanque} />
          <Field label="Vazão (L/ha)" value={vazao} onChange={setVazao} />
          <Field label="Área total (ha)" value={area} onChange={setArea} placeholder="opcional" />
        </View>
        <Text style={s.label}>Produtos</Text>
        {produtos.map((p, i) => (
          <View key={i} style={s.prodBox}>
            <View style={s.nomeWrap}>
              <TextInput style={s.nomeInput} value={p.nome} placeholder="Produto (digite, ▾ ou 🔎)" placeholderTextColor="#5f7d69" onChangeText={(v) => setProd(i, "nome", v)} />
              <TouchableOpacity style={s.dd} onPress={() => setProdPickerRow(i)}>
                <Text style={s.ddTxt}>▾</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.agroBtn} onPress={() => setAgrofitRow(i)}>
                <Text style={s.agroBtnTxt}>🔎</Text>
              </TouchableOpacity>
            </View>
            <View style={s.doseRow}>
              <TextInput style={[s.input, { flex: 1 }]} value={p.dose} placeholder="Dose" placeholderTextColor="#5f7d69" keyboardType="decimal-pad" onChangeText={(v) => setProd(i, "dose", v)} />
              <TouchableOpacity style={s.uniBtn} onPress={() => setUniPickerRow(i)}><Text style={s.uniTxt}>{p.uni} ▾</Text></TouchableOpacity>
              <TouchableOpacity style={s.xBtn} onPress={() => rmProd(i)}><Text style={{ color: C.red, fontWeight: "800" }}>✕</Text></TouchableOpacity>
            </View>
          </View>
        ))}
        <TouchableOpacity style={s.addBtn} onPress={() => addProd()}><Text style={{ color: "#bff0cf", fontWeight: "700" }}>＋ Adicionar produto</Text></TouchableOpacity>
        <Text style={s.tip}>▾ = seus produtos cadastrados · 🔎 = buscar no AGROFIT (4.359 produtos, sem cadastrar) · ou digite o nome. A dose você informa pela bula.</Text>

        {avisosIncompat.length > 0 ? (
          <View style={s.avisoBox}>
            <Text style={s.avisoH}>⚠️ Possível incompatibilidade na mistura</Text>
            {avisosIncompat.map((a, i) => <Text key={i} style={s.avisoTxt}>• {a}</Text>)}
            <Text style={s.avisoTip}>Aviso automático por palavra-chave — não substitui a bula. Confirme a compatibilidade na bula de cada produto e faça o teste de jarra antes de misturar no tanque.</Text>
          </View>
        ) : nProdValidos >= 2 ? (
          <Text style={s.tip}>💡 O sistema só alerta por palavra-chave (cobre, enxofre, óleo, biológico) — não cobre todas as combinações. Mesmo sem aviso aqui, confirme a compatibilidade dos produtos na bula e faça o teste de jarra antes de misturar no tanque.</Text>
        ) : null}

        {!calda ? (
          <Text style={s.tip}>Informe tanque, vazão e produtos.</Text>
        ) : calda.modo === "talhao" ? (
          <View>
            <View style={[s.row, { marginTop: 14 }]}>
              <Kpi n={fmt(calda.caldaTotal, 0) + " L"} l="calda total (talhão)" />
              <Kpi n={String(calda.nCaldas)} l={calda.nCaldas > 1 ? "caldas no misturador" : "calda (cabe no misturador)"} />
              <Kpi n={fmt(calda.aguaTotal, 1) + " L"} l="água total" color={C.blue} />
            </View>
            {calda.itens.length > 0 && (
              <View style={s.tbl}>
                <View style={s.trH}>
                  <Text style={[s.th, { flex: 2 }]}>Produto</Text>
                  <Text style={[s.th, s.r]}>Total talhão</Text>
                  {calda.nCaldas > 1 ? <Text style={[s.th, s.r]}>Por calda</Text> : null}
                </View>
                {calda.itens.map((it, i) => (
                  <View key={i} style={s.tr}>
                    <Text style={[s.td, { flex: 2 }]}>{it.nome}</Text>
                    <Text style={[s.td, s.r, s.b]}>{fmt(it.total, 2)} {it.un}</Text>
                    {calda.nCaldas > 1 ? <Text style={[s.td, s.r, s.b]}>{fmt(it.porCalda, 2)} {it.un}</Text> : null}
                  </View>
                ))}
                <View style={s.tr}>
                  <Text style={[s.td, { flex: 2, color: C.blue }]}>💧 Água</Text>
                  <Text style={[s.td, s.r, s.b, { color: C.blue }]}>{fmt(calda.aguaTotal, 1)} L</Text>
                  {calda.nCaldas > 1 ? <Text style={[s.td, s.r, s.b, { color: C.blue }]}>{fmt(calda.aguaPorCalda, 1)} L</Text> : null}
                </View>
              </View>
            )}
            <Text style={s.tip}>Misturador de {tanque} L → {calda.nCaldas} calda(s).{calda.nCaldas > 1 ? " Cada calda cheia cobre " + fmt(calda.areaPorCalda, 2) + " ha." : " A calda inteira do talhão cabe em uma batelada."}</Text>
          </View>
        ) : (
          <View>
            <View style={[s.row, { marginTop: 14 }]}>
              <Kpi n={fmt(calda.areaPorCalda, 2)} l="ha por calda" />
              <Kpi n={fmt(calda.aguaPorCalda, 1) + " L"} l="água por calda" color={C.blue} />
            </View>
            {calda.itens.length > 0 ? (
              <View style={s.tbl}>
                <View style={s.trH}>
                  <Text style={[s.th, { flex: 2 }]}>Produto</Text>
                  <Text style={[s.th, s.r]}>Por calda</Text>
                </View>
                {calda.itens.map((it, i) => (
                  <View key={i} style={s.tr}>
                    <Text style={[s.td, { flex: 2 }]}>{it.nome}</Text>
                    <Text style={[s.td, s.r, s.b]}>{fmt(it.porCalda, 2)} {it.un}</Text>
                  </View>
                ))}
                <View style={s.tr}>
                  <Text style={[s.td, { flex: 2, color: C.blue }]}>💧 Água</Text>
                  <Text style={[s.td, s.r, s.b, { color: C.blue }]}>{fmt(calda.aguaPorCalda, 1)} L</Text>
                </View>
              </View>
            ) : null}
            <Text style={s.tip}>Informe a Área total (ou venha de um talhão) pra ver o total do talhão e o nº de caldas.</Text>
          </View>
        )}

        {calda && calda.itens.length > 0 && (
          <View style={s.preparo}>
            <Text style={s.preparoH}>📋 Ordem de preparo</Text>
            <Text style={s.passo}>1.  Encha ~½ do tanque com água, com a agitação ligada.</Text>
            {calda.itens.slice().sort((a, b) => a.ordem - b.ordem).map((it, i) => (
              <Text key={i} style={s.passo}>{i + 2}.  {it.nome} — {fmt(calda.modo === "talhao" ? it.total : it.porCalda, 2)} {it.un}{it.formulacao ? "   · " + it.formulacao : ""}</Text>
            ))}
            <Text style={s.passo}>{calda.itens.length + 2}.  Complete com água até o volume e mantenha a agitação até aplicar.</Text>
            <Text style={s.tip}>Dica: aguarde cada produto dispersar antes de adicionar o próximo. Cadastre a Formulação dos produtos pra ordem ficar exata.</Text>

            <View style={s.jarra}>
              <Text style={s.preparoH}>🧫 Teste de jarra</Text>
              <Text style={s.tip}>Antes de misturar no tanque, faça o teste num recipiente pequeno na mesma proporção. Se formar grumos, flocos, espuma excessiva ou separação, não misture no tanque.</Text>
              <View style={[s.row, { marginTop: 8 }]}>
                <Field label="Volume do teste (L)" value={volJarra} onChange={setVolJarra} />
              </View>
              {(() => {
                const tanqueL = num(tanque);
                const volL = num(volJarra);
                if (!isFinite(tanqueL) || tanqueL <= 0 || !isFinite(volL) || volL <= 0) {
                  return <Text style={s.tip}>Informe o tanque (acima) e o volume do teste pra ver as quantidades.</Text>;
                }
                const fator = volL / tanqueL;
                return (
                  <View style={s.tbl}>
                    <View style={s.trH}>
                      <Text style={[s.th, { flex: 2 }]}>Produto</Text>
                      <Text style={[s.th, s.r]}>Na jarra ({fmt(volL, 2)} L)</Text>
                    </View>
                    {calda.itens.slice().sort((a, b) => a.ordem - b.ordem).map((it, i) => (
                      <View key={i} style={s.tr}>
                        <Text style={[s.td, { flex: 2 }]}>{it.nome}</Text>
                        <Text style={[s.td, s.r, s.b]}>{fmt(it.porCalda * fator, 3)} {it.un}</Text>
                      </View>
                    ))}
                    <View style={s.tr}>
                      <Text style={[s.td, { flex: 2, color: C.blue }]}>💧 Água</Text>
                      <Text style={[s.td, s.r, s.b, { color: C.blue }]}>{fmt(calda.aguaPorCalda * fator, 3)} L</Text>
                    </View>
                  </View>
                );
              })()}
            </View>
          </View>
        )}
      </View>

      <View style={s.card}>
        <Text style={s.h2}>🌡️ Delta T — janela de aplicação</Text>
        <View style={s.row}>
          <Field label="Temperatura (°C)" value={temp} onChange={setTemp} />
          <Field label="Umidade (%)" value={umid} onChange={setUmid} />
          <Field label="Vento (km/h)" value={vento} onChange={setVento} placeholder="opcional" />
        </View>
        <View style={[s.dtStatus, { backgroundColor: dtVal != null ? corDT(dtVal) : C.bg }]}>
          <Text style={s.dtStatusTxt}>{dtVal != null ? `Delta T = ${dtVal.toFixed(1)} °C — ${statusDT(dtVal)}` : "Informe temperatura e umidade"}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator style={s.dtWrap}>
          <View>
            <View style={s.dtRow}>
              <Text style={[s.dtHead, s.dtCorner]}>°C\%UR</Text>
              {DT_UMID.map(u => <Text key={u} style={s.dtHead}>{u}</Text>)}
            </View>
            {DT_TEMPS.map(t => (
              <View key={t} style={s.dtRow}>
                <Text style={s.dtHead}>{t}</Text>
                {DT_UMID.map(u => {
                  const d = deltaT(t, u); const here = t === hereT && u === hereU;
                  return (<View key={u} style={[s.dtCell, { backgroundColor: corDT(d) }, here && s.dtHere]}><Text style={s.dtCellTxt}>{d.toFixed(1)}</Text></View>);
                })}
              </View>
            ))}
          </View>
        </ScrollView>
        <View style={s.legend}>
          <Leg c="#7EC8FF" t="<2 risco" /><Leg c="#34D399" t="2–8 ideal" />
          <Leg c="#FFD23F" t="8–10 marginal" /><Leg c="#FF5C5C" t=">10 inadequado" />
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.h2}>📐 Conferência de vazão</Text>
        <View style={s.row}>
          <Field label="Bicos (L/min)" value={q} onChange={setQ} />
          <Field label="Velocidade (km/h)" value={vel} onChange={setVel} />
          <Field label="Faixa (m)" value={faixa} onChange={setFaixa} />
        </View>
        <View style={s.row}><Kpi n={vz != null ? fmt(vz, 2) : "—"} l="Taxa resultante (L/ha)" /></View>
        <Text style={s.tip}>L/ha = (vazão × 600) ÷ (velocidade × faixa)</Text>
      </View>

      <View style={s.card}>
        <Text style={s.h2}>💰 Cobrança</Text>
        <View style={s.row}>
          <Field label="Valor por hectare (R$/ha)" value={valorHa} onChange={setValorHa} placeholder="0,00" />
        </View>
        <View style={s.switchRow}>
          <Text style={s.label}>Cobrar deslocamento?</Text>
          <Switch value={cobraDeslocamento} onValueChange={setCobraDeslocamento} trackColor={{ true: C.green, false: "#3a4a63" }} thumbColor="#fff" />
        </View>
        {cobraDeslocamento ? (
          <View style={s.row}>
            <Field label="R$/km" value={valorKm} onChange={setValorKm} placeholder="0,00" />
            <Field label="Distância (km)" value={km} onChange={setKm} placeholder="0" />
          </View>
        ) : null}
        <View style={s.tbl}>
          <View style={s.tr}>
            <Text style={[s.td, { flex: 2 }]}>Aplicação ({fmt(fin.area, 2)} ha × {fmtMoeda(fin.vha)})</Text>
            <Text style={[s.td, s.r, s.b]}>{fmtMoeda(fin.vAplic)}</Text>
          </View>
          {cobraDeslocamento ? (
            <View style={s.tr}>
              <Text style={[s.td, { flex: 2 }]}>Deslocamento</Text>
              <Text style={[s.td, s.r, s.b]}>{fmtMoeda(fin.vDesl)}</Text>
            </View>
          ) : null}
          <View style={s.tr}>
            <Text style={[s.td, { flex: 2, fontWeight: "800" }]}>TOTAL</Text>
            <Text style={[s.td, s.r, s.b, { color: C.green }]}>{fmtMoeda(fin.total)}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={s.salvarApp} onPress={() => navigation.navigate("SalvarAplicacao", { dados: coletarDados() })}>
        <Text style={s.salvarAppTxt}>💾 Salvar aplicação</Text>
      </TouchableOpacity>

      <PickerModal
        visible={prodPickerRow != null}
        titulo="Escolher produto cadastrado"
        itens={cadastro.map(p => ({ id: p.id, label: p.nome, sub: p.dose ? p.dose + " " + (p.unidade || "") : "", _o: p }))}
        onSelect={escolherProduto}
        onClose={() => setProdPickerRow(null)}
        vazioMsg="Nenhum produto cadastrado ainda."
      />

      <PickerModal
        visible={uniPickerRow != null}
        titulo="Unidade da dose"
        itens={UNIDADES.map(u => ({ id: u, label: u }))}
        onSelect={(it) => { setProd(uniPickerRow, "uni", it.label); setUniPickerRow(null); }}
        onClose={() => setUniPickerRow(null)}
      />

      <AgrofitBusca visible={agrofitRow != null} onSelect={escolherAgrofit} onClose={() => setAgrofitRow(null)} />

      <PickerModal
        visible={fazPicker}
        titulo="Escolher fazenda"
        itens={fazendas.map(f => ({ id: f.id, label: f.nome, sub: [f.cliente, f.cultura].filter(Boolean).join(" · "), _o: f }))}
        onSelect={(it) => { setFazPicker(false); setTalPickerFaz(it._o); }}
        onClose={() => setFazPicker(false)}
        vazioMsg="Nenhuma fazenda cadastrada. Cadastre em Cadastros › Fazendas."
      />
      <PickerModal
        visible={talPickerFaz != null}
        titulo={talPickerFaz ? "Talhões de " + talPickerFaz.nome : "Talhões"}
        itens={talhoesLista.filter(t => t.fazendaId === (talPickerFaz && talPickerFaz.id)).map(t => ({ id: t.id, label: t.nome, sub: [t.cultura, t.area ? t.area + " ha" : ""].filter(Boolean).join(" · "), _o: t }))}
        onSelect={(it) => escolherTalhao(it._o)}
        onClose={() => setTalPickerFaz(null)}
        vazioMsg="Nenhum talhão nesta fazenda. Cadastre em Cadastros › Talhões (dá pra importar KML)."
      />

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 16 },
  card: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 16 },
  h2: { color: C.text, fontSize: 15, fontWeight: "800", marginBottom: 14 },
  label: { color: "#A9C9B4", fontSize: 11, fontWeight: "700", marginBottom: 5, textTransform: "uppercase" },
  input: { backgroundColor: C.bg, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, color: C.text, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  prodRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  prodBox: { marginBottom: 12, gap: 6 },
  doseRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  uniBtn: { backgroundColor: "#1c4a30", borderRadius: 9, paddingHorizontal: 10, paddingVertical: 11, minWidth: 62, alignItems: "center" },
  uniTxt: { color: "#bff0cf", fontWeight: "700", fontSize: 12 },
  xBtn: { backgroundColor: "#3a1f28", borderRadius: 9, paddingHorizontal: 11, paddingVertical: 11 },
  addBtn: { backgroundColor: "#1c4a30", borderRadius: 9, paddingVertical: 11, alignItems: "center", marginTop: 2 },
  tip: { color: C.mut, fontSize: 11, marginTop: 8, lineHeight: 16 },
  preparo: { marginTop: 16, borderTopColor: C.border, borderTopWidth: 1, paddingTop: 12 },
  preparoH: { color: C.text, fontSize: 13, fontWeight: "800", marginBottom: 8 },
  passo: { color: "#D6E2F0", fontSize: 13, lineHeight: 22 },
  avisoBox: { backgroundColor: "#3a2a12", borderColor: "#c98a2e", borderWidth: 1.5, borderRadius: 10, padding: 12, marginTop: 12 },
  avisoH: { color: "#ffcf7a", fontSize: 13, fontWeight: "800", marginBottom: 6 },
  avisoTxt: { color: "#ffe3b0", fontSize: 12, lineHeight: 18 },
  avisoTip: { color: "#d8b688", fontSize: 11, marginTop: 8, lineHeight: 16 },
  jarra: { marginTop: 16, borderTopColor: C.border, borderTopWidth: 1, paddingTop: 12 },
  nomeWrap: { flexDirection: "row", alignItems: "center", backgroundColor: C.bg, borderColor: C.line, borderWidth: 1.5, borderRadius: 9 },
  nomeInput: { flex: 1, minWidth: 0, color: C.text, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
  dd: { paddingHorizontal: 9, paddingVertical: 9 },
  ddTxt: { color: C.blue, fontSize: 16, fontWeight: "800" },
  agroBtn: { paddingHorizontal: 9, paddingVertical: 9, borderLeftColor: C.line, borderLeftWidth: 1 },
  agroBtnTxt: { fontSize: 14 },
  salvarApp: { backgroundColor: C.green, borderRadius: 12, paddingVertical: 15, alignItems: "center", marginBottom: 4 },
  salvarAppTxt: { color: "#06210b", fontSize: 16, fontWeight: "800" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6, marginBottom: 6 },
  vincBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#13362a", borderColor: "#2f6b48", borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 14 },
  vincTxt: { color: "#cdeedd", fontSize: 13, flex: 1 },
  escTalhao: { backgroundColor: "#12301F", borderColor: C.green, borderWidth: 1.5, borderRadius: 10, padding: 12, marginBottom: 14, alignItems: "center" },
  escTalhaoTxt: { color: C.greenClaro, fontSize: 15, fontWeight: "800" },
  escTalhaoSub: { color: C.mut, fontSize: 11, marginTop: 2 },
  kpi: { flex: 1, minWidth: 120, backgroundColor: C.bg, borderColor: C.line, borderWidth: 1, borderRadius: 10, padding: 11 },
  kpiN: { color: C.green, fontSize: 20, fontWeight: "800" },
  kpiL: { color: "#A9C9B4", fontSize: 11, marginTop: 2 },
  tbl: { marginTop: 14, borderTopColor: C.border, borderTopWidth: 1 },
  trH: { flexDirection: "row", paddingVertical: 8, borderBottomColor: C.border, borderBottomWidth: 1 },
  tr: { flexDirection: "row", paddingVertical: 9, borderBottomColor: C.border, borderBottomWidth: 1 },
  th: { color: "#9CBBA6", fontSize: 10, fontWeight: "700", textTransform: "uppercase", flex: 1 },
  td: { color: C.text, fontSize: 13, flex: 1 },
  r: { textAlign: "right" }, b: { fontWeight: "700" },
  dtStatus: { borderRadius: 10, padding: 12, marginBottom: 14 },
  dtStatusTxt: { textAlign: "center", fontWeight: "800", fontSize: 14, color: "#0c1a10" },
  dtWrap: { borderColor: C.border, borderWidth: 1, borderRadius: 10 },
  dtRow: { flexDirection: "row" },
  dtHead: { width: 42, paddingVertical: 6, textAlign: "center", color: "#A9C9B4", fontSize: 11, fontWeight: "700", backgroundColor: C.bg, borderColor: "#12301F", borderWidth: 0.5 },
  dtCorner: { width: 52, fontSize: 9 },
  dtCell: { width: 42, paddingVertical: 6, alignItems: "center", justifyContent: "center", borderColor: "#12301F", borderWidth: 0.5 },
  dtCellTxt: { color: "#0c1a10", fontWeight: "700", fontSize: 11 },
  dtHere: { borderColor: "#fff", borderWidth: 2 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 10 },
  legItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 13, height: 13, borderRadius: 3 },
  legTxt: { color: "#cdd9e8", fontSize: 11 },
});
