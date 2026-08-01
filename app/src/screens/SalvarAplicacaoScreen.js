import React, { useState, useCallback } from "react";
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { listar, salvar } from "../logic/store";
import { calcularCalda, deltaT, statusDT, fmt, fmtMoeda, calcFinanceiro, num } from "../logic/calc";
import { criarReceita } from "../logic/fin/receitas";
import { confirmar, avisar } from "../logic/confirm";
import PickerModal from "../components/PickerModal";
import { C } from "../theme";

function hoje() {
  const d = new Date(); const p = (n) => String(n).padStart(2, "0");
  return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear();
}

// Converte "DD/MM/AAAA" (formato da tela) para "AAAA-MM-DD" (formato do financeiro).
function brParaIso(dataBr) {
  const m = String(dataBr || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return hoje().split("/").reverse().join("-");
  return m[3] + "-" + m[2] + "-" + m[1];
}

export default function SalvarAplicacaoScreen({ route, navigation }) {
  const dados = route.params?.dados || {};
  const talhao = dados.talhao || null;
  const [clientes, setClientes] = useState([]);
  const [fazendas, setFazendas] = useState([]);
  const [drones, setDrones] = useState([]);
  const [pilotos, setPilotos] = useState([]);
  const [cliente, setCliente] = useState(talhao && talhao.clienteId ? { id: talhao.clienteId, nome: talhao.cliente } : null);
  const [fazenda, setFazenda] = useState(talhao && talhao.fazendaId ? { id: talhao.fazendaId, nome: talhao.fazenda } : null);
  const [drone, setDrone] = useState(null);
  const [piloto, setPiloto] = useState(null);
  const [altura, setAltura] = useState("");
  const [obs, setObs] = useState("");
  const [data, setData] = useState(hoje());
  const [pickCli, setPickCli] = useState(false);
  const [pickFaz, setPickFaz] = useState(false);
  const [pickDrone, setPickDrone] = useState(false);
  const [pickPiloto, setPickPiloto] = useState(false);

  useFocusEffect(useCallback(() => {
    listar("clientes").then(setClientes);
    listar("fazendas").then(setFazendas);
    listar("drones").then(setDrones);
    listar("pilotos").then(setPilotos);
  }, []));

  const calda = calcularCalda({ tanque: dados.tanque, vazao: dados.vazao, areaTotal: dados.area, produtos: dados.produtos });
  const T = num(dados.temp), R = num(dados.umid);
  const dt = isFinite(T) && isFinite(R) ? deltaT(T, R) : null;
  const fin = calcFinanceiro({ area: dados.area, valorHa: dados.valorHa, cobraDeslocamento: dados.cobraDeslocamento, valorKm: dados.valorKm, km: dados.km });

  async function onSalvar() {
    if (!cliente) { avisar("Atenção", "Escolha o cliente para vincular a aplicação."); return; }
    // Garante que o talhão salvo tenha o contorno (coords) — busca o completo no banco se faltar.
    let talhaoFull = talhao;
    if (talhao && talhao.id && (!talhao.coords || talhao.coords.length < 3)) {
      try {
        const lista = await listar("talhoes");
        const t = lista.find((x) => x && x.id === talhao.id);
        if (t) talhaoFull = t;
      } catch (e) {}
    }
    let dadosFinal = talhaoFull ? { ...dados, talhao: talhaoFull } : { ...dados };
    if (altura) dadosFinal.altura = altura;

    // Cria a receita ANTES de salvar a aplicação, pra poder guardar o vínculo
    // (receitaId) e depois saber, no Relatório Geral, se já foi recebido.
    let receitaId = null;
    if (fin.total > 0) {
      try {
        const r = await criarReceita({
          descricao: "Aplicação — " + cliente.nome + (talhaoFull ? " (" + talhaoFull.nome + ")" : ""),
          valor: fin.total,
          data_vencimento: brParaIso(data),
          observacao: "Gerado automaticamente pela Calculadora de Calda.",
          origem: "aplicacao",
        });
        receitaId = (r.ids && r.ids[0]) || null;
      } catch (e) { /* não bloqueia o salvamento da aplicação por falha no financeiro */ }
    }

    await salvar("aplicacoes", {
      em: new Date().toISOString(),
      dataAplicacao: data,
      valorHa: dados.valorHa, cobraDeslocamento: dados.cobraDeslocamento, valorKm: dados.valorKm, km: dados.km,
      clienteId: cliente.id, clienteNome: cliente.nome,
      fazendaId: fazenda ? fazenda.id : null, fazendaNome: fazenda ? fazenda.nome : null,
      talhaoId: talhaoFull ? talhaoFull.id : null, talhaoNome: talhaoFull ? talhaoFull.nome : null,
      talhaoCoords: talhaoFull ? talhaoFull.coords : null,
      droneId: drone ? drone.id : null, droneModelo: drone ? drone.modelo : null, droneSerie: drone ? drone.serie : null, droneBico: drone ? drone.bico : null,
      pilotoId: piloto ? piloto.id : null, pilotoNome: piloto ? piloto.nome : null,
      obs,
      dados: dadosFinal,
      receitaId,
    });
    confirmar("Aplicação salva!", "Registrada para " + cliente.nome + ".\n\nVer a lista de aplicações?",
      () => navigation.reset({ index: 1, routes: [{ name: "Home" }, { name: "Aplicacoes" }] }),
      () => navigation.reset({ index: 0, routes: [{ name: "Home" }] }));
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Text style={s.label}>Data da aplicação</Text>
      <TextInput style={s.input} value={data} onChangeText={setData} placeholder="DD/MM/AAAA" placeholderTextColor="#5f7d69" />

      <Text style={s.label}>Cliente *</Text>
      <TouchableOpacity style={s.sel} onPress={() => setPickCli(true)}>
        <Text style={[s.selTxt, !cliente && { color: "#5f7d69" }]}>{cliente ? cliente.nome : "Escolher cliente"}</Text>
        <Text style={s.selChev}>▾</Text>
      </TouchableOpacity>

      <Text style={s.label}>Fazenda / Talhão</Text>
      <TouchableOpacity style={s.sel} onPress={() => setPickFaz(true)}>
        <Text style={[s.selTxt, !fazenda && { color: "#5f7d69" }]}>{fazenda ? fazenda.nome : "Opcional"}</Text>
        <Text style={s.selChev}>▾</Text>
      </TouchableOpacity>

      <Text style={s.label}>Equipamento (drone)</Text>
      <TouchableOpacity style={s.sel} onPress={() => setPickDrone(true)}>
        <Text style={[s.selTxt, !drone && { color: "#5f7d69" }]}>{drone ? drone.modelo : "Opcional"}</Text>
        <Text style={s.selChev}>▾</Text>
      </TouchableOpacity>

      <Text style={s.label}>Piloto</Text>
      <TouchableOpacity style={s.sel} onPress={() => setPickPiloto(true)}>
        <Text style={[s.selTxt, !piloto && { color: "#5f7d69" }]}>{piloto ? piloto.nome : "Opcional"}</Text>
        <Text style={s.selChev}>▾</Text>
      </TouchableOpacity>

      <Text style={s.label}>Altura de voo (m)</Text>
      <TextInput style={s.input} value={altura} onChangeText={setAltura} placeholder="Ex.: 5" placeholderTextColor="#5f7d69" keyboardType="numeric" />

      <Text style={s.label}>Observação</Text>
      <TextInput style={[s.input, { minHeight: 70, textAlignVertical: "top" }]} multiline value={obs} onChangeText={setObs}
        placeholder="Ex.: cultura, talhão, condições…" placeholderTextColor="#5f7d69" />

      <View style={s.resumo}>
        <Text style={s.resumoH}>Resumo</Text>
        <Linha l="Data" v={data} />
        {talhao ? <Linha l="Talhão" v={talhao.nome + " (" + fmt(num(talhao.area), 2) + " ha)"} /> : null}
        {drone ? <Linha l="Equipamento" v={drone.modelo} /> : null}
        {drone && drone.bico ? <Linha l="Bico" v={drone.bico} /> : null}
        {piloto ? <Linha l="Piloto" v={piloto.nome} /> : null}
        {altura ? <Linha l="Altura de voo" v={altura + " m"} /> : null}
        <Linha l="Tanque / vazão" v={`${dados.tanque || "—"} L · ${dados.vazao || "—"} L/ha`} />
        {calda && calda.modo === "talhao" && <Linha l="Calda total" v={fmt(calda.caldaTotal, 0) + " L"} />}
        {calda && calda.modo === "talhao" && <Linha l="Nº de caldas" v={String(calda.nCaldas)} />}
        {calda && calda.modo === "talhao" && <Linha l="Água total" v={fmt(calda.aguaTotal, 1) + " L"} />}
        {calda && calda.itens && calda.itens.length > 0
          ? calda.itens.map((it, i) => (
              <Linha key={i} l={it.nome} v={fmt(calda.modo === "talhao" ? it.total : it.porCalda, 2) + " " + it.un} />
            ))
          : <Linha l="Produtos" v="—" />}
        {dt != null && <Linha l="Delta T" v={`${dt.toFixed(1)} °C — ${statusDT(dt)}`} />}
        {fin.total > 0 ? <Linha l="Total cobrado" v={fmtMoeda(fin.total)} /> : null}
      </View>

      <TouchableOpacity style={s.salvar} onPress={onSalvar}><Text style={s.salvarTxt}>💾 Salvar aplicação</Text></TouchableOpacity>
      <View style={{ height: 30 }} />

      <PickerModal visible={pickCli} titulo="Escolher cliente"
        itens={clientes.map(c => ({ id: c.id, label: c.nome, sub: [c.cidade, c.contato].filter(Boolean).join(" · "), _o: c }))}
        onSelect={(it) => { setCliente(it._o); setPickCli(false); }}
        onClose={() => setPickCli(false)} vazioMsg="Nenhum cliente cadastrado. Cadastre em Cadastros › Clientes." />
      <PickerModal visible={pickFaz} titulo="Escolher fazenda/talhão"
        itens={fazendas.map(f => ({ id: f.id, label: f.nome, sub: [f.cultura, f.area ? f.area + " ha" : ""].filter(Boolean).join(" · "), _o: f }))}
        onSelect={(it) => { setFazenda(it._o); setPickFaz(false); }}
        onClose={() => setPickFaz(false)} vazioMsg="Nenhuma fazenda cadastrada." />
      <PickerModal visible={pickDrone} titulo="Escolher equipamento"
        itens={drones.map(d => ({ id: d.id, label: d.modelo, sub: [d.serie, d.tanque ? d.tanque + " L" : ""].filter(Boolean).join(" · "), _o: d }))}
        onSelect={(it) => { setDrone(it._o); setPickDrone(false); }}
        onClose={() => setPickDrone(false)} vazioMsg="Nenhum drone cadastrado. Cadastre em Cadastros › Drones." />
      <PickerModal visible={pickPiloto} titulo="Escolher piloto"
        itens={pilotos.map(p => ({ id: p.id, label: p.nome, sub: p.canac || "", _o: p }))}
        onSelect={(it) => { setPiloto(it._o); setPickPiloto(false); }}
        onClose={() => setPickPiloto(false)} vazioMsg="Nenhum piloto cadastrado. Cadastre em Cadastros › Pilotos." />
    </ScrollView>
  );
}

function Linha({ l, v }) {
  return (<View style={s.linha}><Text style={s.linhaL}>{l}</Text><Text style={s.linhaV}>{v}</Text></View>);
}

const s = StyleSheet.create({
  label: { color: "#A9C9B4", fontSize: 11, fontWeight: "700", marginBottom: 5, marginTop: 12, textTransform: "uppercase" },
  input: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, color: C.text, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  cobr: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 14 },
  cobrLbl: { color: "#A9C9B4", fontSize: 12, fontWeight: "700", marginBottom: 5 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4, marginBottom: 6 },
  row2: { flexDirection: "row", gap: 10 },
  totalBox: { marginTop: 8, borderTopColor: C.border, borderTopWidth: 1, paddingTop: 8 },
  sel: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1.5, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 13, flexDirection: "row", alignItems: "center" },
  selTxt: { color: C.text, fontSize: 15, flex: 1 },
  selChev: { color: C.blue, fontSize: 16, fontWeight: "800" },
  resumo: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 18 },
  resumoH: { color: C.text, fontSize: 13, fontWeight: "800", marginBottom: 8 },
  linha: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, gap: 12 },
  linhaL: { color: C.mut, fontSize: 12 },
  linhaV: { color: C.text, fontSize: 12, fontWeight: "700", flexShrink: 1, textAlign: "right" },
  salvar: { backgroundColor: C.green, borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 18 },
  salvarTxt: { color: "#06210b", fontSize: 16, fontWeight: "800" },
});
