import React, { useState, useLayoutEffect } from "react";
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { calcularCalda, deltaT, corDT, statusDT, fmt, fmtMoeda, calcFinanceiro, num } from "../logic/calc";
import { remover, salvar } from "../logic/store";
import { confirmar, avisar } from "../logic/confirm";
import { gerarRelatorio } from "../logic/relatorio";
import MapaView from "../components/MapaView";
import { C } from "../theme";

function dataFmt(iso) {
  try { const d = new Date(iso); return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }
  catch (e) { return ""; }
}
function horaFmt(iso) {
  try { return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }
  catch (e) { return ""; }
}
function duracaoFmt(iniIso, fimIso) {
  const ini = new Date(iniIso).getTime(), fim = new Date(fimIso).getTime();
  if (!isFinite(ini) || !isFinite(fim) || fim < ini) return "";
  const min = Math.round((fim - ini) / 60000);
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? (h + "h " + m + "min") : (m + "min");
}

export default function AplicacaoDetailScreen({ route, navigation }) {
  const { item } = route.params;
  const [reg, setReg] = useState(item);
  const [editData, setEditData] = useState(false);
  const [dataTmp, setDataTmp] = useState(item.dataAplicacao || "");
  const d = reg.dados || {};
  const calda = calcularCalda({ tanque: d.tanque, vazao: d.vazao, areaTotal: d.area, produtos: d.produtos });
  const T = num(d.temp), R = num(d.umid);
  const dt = isFinite(T) && isFinite(R) ? deltaT(T, R) : null;
  const fin = calcFinanceiro({ area: d.area, valorHa: reg.valorHa, cobraDeslocamento: reg.cobraDeslocamento, valorKm: reg.valorKm, km: reg.km });

  useLayoutEffect(() => {
    navigation.setOptions({
      title: item.clienteNome || "Aplicação",
      headerRight: () => (
        <TouchableOpacity onPress={excluir} style={{ paddingHorizontal: 12 }}>
          <Text style={{ color: C.red, fontWeight: "800" }}>🗑</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  function excluir() {
    confirmar("Excluir", "Remover esta aplicação?", async () => { await remover("aplicacoes", item.id); navigation.goBack(); });
  }
  async function salvarData() {
    const atualizado = { ...reg, dataAplicacao: dataTmp.trim() };
    await salvar("aplicacoes", atualizado);
    setReg(atualizado); setEditData(false);
  }

  async function iniciarAplicacao() {
    const atualizado = { ...reg, inicioAplicacao: new Date().toISOString() };
    await salvar("aplicacoes", atualizado);
    setReg(atualizado);
  }
  async function finalizarAplicacao() {
    const atualizado = { ...reg, fimAplicacao: new Date().toISOString() };
    await salvar("aplicacoes", atualizado);
    setReg(atualizado);
  }
  function reiniciarHorarios() {
    confirmar("Reiniciar horários", "Apaga o início e o fim registrados desta aplicação. Deseja continuar?", async () => {
      const atualizado = { ...reg, inicioAplicacao: null, fimAplicacao: null };
      await salvar("aplicacoes", atualizado);
      setReg(atualizado);
    });
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16 }}>
      <View style={s.card}>
        <Text style={s.h}>📋 Aplicação</Text>
        <Linha l="Cliente" v={reg.clienteNome || "—"} />
        {reg.fazendaNome ? <Linha l="Fazenda" v={reg.fazendaNome} /> : null}
        {(reg.talhaoNome || (d.talhao && d.talhao.nome)) ? <Linha l="Talhão" v={reg.talhaoNome || d.talhao.nome} /> : null}
        {reg.droneModelo ? <Linha l="Equipamento" v={reg.droneModelo + (reg.droneSerie ? " (" + reg.droneSerie + ")" : "")} /> : null}
        {reg.droneBico ? <Linha l="Bico" v={reg.droneBico} /> : null}
        {reg.pilotoNome ? <Linha l="Piloto" v={reg.pilotoNome} /> : null}
        {d.altura ? <Linha l="Altura de voo" v={d.altura + " m"} /> : null}
        {!editData ? (
          <View style={s.linha}>
            <Text style={s.linhaL}>Data da aplicação</Text>
            <TouchableOpacity onPress={() => { setDataTmp(reg.dataAplicacao || ""); setEditData(true); }}>
              <Text style={[s.linhaV, { color: C.blue }]}>{reg.dataAplicacao || "definir"}  ✏️</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ marginVertical: 6 }}>
            <Text style={s.linhaL}>Data da aplicação</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
              <TextInput style={s.dataInput} value={dataTmp} onChangeText={setDataTmp} placeholder="DD/MM/AAAA" placeholderTextColor="#5f7d69" />
              <TouchableOpacity style={s.dataBtn} onPress={salvarData}><Text style={{ color: "#06210b", fontWeight: "800" }}>Salvar</Text></TouchableOpacity>
            </View>
          </View>
        )}
        <Linha l="Registrado em" v={dataFmt(reg.em)} />
        {reg.obs ? <Linha l="Observação" v={reg.obs} /> : null}
      </View>

      <View style={s.card}>
        <Text style={s.h}>⏱️ Início e fim da aplicação</Text>
        {!reg.inicioAplicacao ? (
          <TouchableOpacity style={s.horaBtn} onPress={iniciarAplicacao}>
            <Text style={s.horaBtnTxt}>▶ Iniciar aplicação</Text>
          </TouchableOpacity>
        ) : !reg.fimAplicacao ? (
          <>
            <Linha l="Início" v={horaFmt(reg.inicioAplicacao)} />
            <TouchableOpacity style={[s.horaBtn, { marginTop: 8 }]} onPress={finalizarAplicacao}>
              <Text style={s.horaBtnTxt}>⏹ Finalizar aplicação</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Linha l="Início" v={horaFmt(reg.inicioAplicacao)} />
            <Linha l="Fim" v={horaFmt(reg.fimAplicacao)} />
            <Linha l="Duração" v={duracaoFmt(reg.inicioAplicacao, reg.fimAplicacao) || "—"} />
            <TouchableOpacity onPress={reiniciarHorarios} style={{ marginTop: 8 }}>
              <Text style={s.horaReset}>↺ Reiniciar horários</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {(() => {
        const tc = (d.talhao && d.talhao.coords) || reg.talhaoCoords;
        return Array.isArray(tc) && tc.length > 2 ? (
          <View style={s.card}>
            <Text style={s.h}>🗺️ Mapa do talhão</Text>
            <MapaView coords={tc} height={240} />
          </View>
        ) : null;
      })()}

      <View style={s.card}>
        <Text style={s.h}>🧪 Calda</Text>
        <Linha l="Misturador" v={(d.tanque || "—") + " L"} />
        <Linha l="Vazão" v={(d.vazao || "—") + " L/ha"} />
        {d.area ? <Linha l="Área aplicada" v={fmt(num(d.area), 2) + " ha"} /> : null}
        {calda && calda.modo === "talhao" ? <Linha l="Calda total" v={fmt(calda.caldaTotal, 0) + " L"} /> : null}
        {calda && calda.modo === "talhao" ? <Linha l="Nº de caldas" v={String(calda.nCaldas)} /> : null}
        {calda && calda.modo === "tanque" ? <Linha l="ha por calda" v={fmt(calda.areaPorCalda, 2)} /> : null}
        <View style={s.div} />
        <View style={s.trH}>
          <Text style={[s.th, { flex: 2 }]}>Produto</Text>
          <Text style={[s.th, s.r]}>{calda && calda.modo === "talhao" ? "Total" : "Por calda"}</Text>
          {calda && calda.modo === "talhao" && calda.nCaldas > 1 ? <Text style={[s.th, s.r]}>Por calda</Text> : null}
        </View>
        {calda && calda.itens.map((it, i) => (
          <View key={i} style={s.prow}>
            <Text style={[s.pnome, { flex: 2 }]}>{it.nome}{it.formulacao ? <Text style={s.pmuted}>  ({it.formulacao})</Text> : null}</Text>
            <Text style={[s.pval, s.r]}>{fmt(calda.modo === "talhao" ? it.total : it.porCalda, 2)} {it.un}</Text>
            {calda.modo === "talhao" && calda.nCaldas > 1 ? <Text style={[s.pval, s.r]}>{fmt(it.porCalda, 2)} {it.un}</Text> : null}
          </View>
        ))}
        {calda ? (
          <View style={s.prow}>
            <Text style={[s.pnome, { flex: 2, color: C.blue }]}>💧 Água</Text>
            <Text style={[s.pval, s.r, { color: C.blue }]}>{fmt(calda.modo === "talhao" ? calda.aguaTotal : calda.aguaPorCalda, 1)} L</Text>
            {calda.modo === "talhao" && calda.nCaldas > 1 ? <Text style={[s.pval, s.r, { color: C.blue }]}>{fmt(calda.aguaPorCalda, 1)} L</Text> : null}
          </View>
        ) : null}
      </View>

      {calda && calda.itens.length > 0 ? (
        <View style={s.card}>
          <Text style={s.h}>📋 Ordem de preparo</Text>
          <Text style={s.passo}>1.  Encha ~½ do tanque com água, com a agitação ligada.</Text>
          {calda.itens.slice().sort((a, b) => a.ordem - b.ordem).map((it, i) => (
            <Text key={i} style={s.passo}>{i + 2}.  {it.nome} — {fmt(calda.modo === "talhao" ? it.total : it.porCalda, 2)} {it.un}</Text>
          ))}
          <Text style={s.passo}>{calda.itens.length + 2}.  Complete com água até o volume e mantenha a agitação até aplicar.</Text>
        </View>
      ) : null}

      <View style={s.card}>
        <Text style={s.h}>🌡️ Condições e parâmetros</Text>
        <Linha l="Temperatura" v={d.temp ? d.temp + " °C" : "—"} />
        <Linha l="Umidade" v={d.umid ? d.umid + " %" : "—"} />
        <Linha l="Vento" v={d.vento ? d.vento + " km/h" : "—"} />
        {d.faixa ? <Linha l="Largura da faixa" v={d.faixa + " m"} /> : null}
        {d.vel ? <Linha l="Velocidade" v={d.vel + " km/h"} /> : null}
        {d.q ? <Linha l="Vazão dos bicos" v={d.q + " L/min"} /> : null}
        {dt != null ? (
          <View style={[s.dt, { backgroundColor: corDT(dt) }]}>
            <Text style={s.dtTxt}>Delta T = {dt.toFixed(1)} °C — {statusDT(dt)}</Text>
          </View>
        ) : null}
      </View>

      {fin.total > 0 ? (
        <View style={s.card}>
          <Text style={s.h}>💰 Cobrança</Text>
          <Linha l={"Aplicação (" + fmt(fin.area, 2) + " ha × " + fmtMoeda(fin.vha) + ")"} v={fmtMoeda(fin.vAplic)} />
          {reg.cobraDeslocamento ? <Linha l="Deslocamento" v={fmtMoeda(fin.vDesl)} /> : null}
          <View style={s.div} />
          <Linha l="Total" v={fmtMoeda(fin.total)} />
        </View>
      ) : null}

      <TouchableOpacity style={s.pdf} onPress={async () => { try { await gerarRelatorio(reg); } catch (e) { avisar("Erro", "Não foi possível gerar o PDF."); } }}>
        <Text style={s.pdfTxt}>📄 Gerar relatório PDF</Text>
      </TouchableOpacity>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

function Linha({ l, v }) {
  return (<View style={s.linha}><Text style={s.linhaL}>{l}</Text><Text style={s.linhaV}>{v}</Text></View>);
}

const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 14 },
  h: { color: C.text, fontSize: 14, fontWeight: "800", marginBottom: 10 },
  linha: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, gap: 12 },
  linhaL: { color: C.mut, fontSize: 12, flexShrink: 1 },
  linhaV: { color: C.text, fontSize: 12, fontWeight: "700", flexShrink: 1, textAlign: "right" },
  div: { height: 1, backgroundColor: C.border, marginVertical: 8 },
  dataInput: { flex: 1, backgroundColor: C.bg, borderColor: C.line, borderWidth: 1.5, borderRadius: 8, color: C.text, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  dataBtn: { backgroundColor: C.green, borderRadius: 8, paddingHorizontal: 16, justifyContent: "center" },
  horaBtn: { backgroundColor: C.green, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  horaBtnTxt: { color: "#06210b", fontSize: 14, fontWeight: "800" },
  horaReset: { color: C.mut, fontSize: 12, textAlign: "center" },
  dt: { borderRadius: 9, padding: 10, marginTop: 10 },
  dtTxt: { color: "#0c1a10", fontWeight: "800", fontSize: 13, textAlign: "center" },
  pdf: { backgroundColor: C.green, borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 4 },
  pdfTxt: { color: "#06210b", fontSize: 16, fontWeight: "800" },
  trH: { flexDirection: "row", paddingVertical: 6, borderBottomColor: C.border, borderBottomWidth: 1 },
  th: { color: "#9CBBA6", fontSize: 10, fontWeight: "700", textTransform: "uppercase", flex: 1 },
  r: { textAlign: "right" },
  prow: { flexDirection: "row", paddingVertical: 6, borderBottomColor: "#1e4230", borderBottomWidth: 1 },
  pnome: { color: C.text, fontSize: 13, flex: 1 },
  pval: { color: C.text, fontSize: 13, fontWeight: "700", flex: 1 },
  pmuted: { color: C.mut, fontSize: 11 },
  passo: { color: "#D6E2F0", fontSize: 13, lineHeight: 22 },
});
