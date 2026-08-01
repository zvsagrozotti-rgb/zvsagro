import React, { useEffect, useState, useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, Image, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { C } from "./src/theme";
import { seedProdutosPadrao } from "./src/logic/seedProdutos";
import { sessaoAtual, aoMudarSessao, sair as sairOnline } from "./src/logic/authOnline";
import { iniciarAutoSync } from "./src/logic/store";
import { lerEmpresa } from "./src/logic/empresa";
import { migrarArmazenamentoAntigo } from "./src/logic/migrarAntigo";
import { AppCtx } from "./src/logic/appctx";
import SyncBadge from "./src/components/SyncBadge";
import HomeScreen from "./src/screens/HomeScreen";
import CalculadoraScreen from "./src/screens/CalculadoraScreen";
import CadastrosScreen from "./src/screens/CadastrosScreen";
import CatalogoScreen from "./src/screens/CatalogoScreen";
import CrudListScreen from "./src/screens/CrudListScreen";
import CrudFormScreen from "./src/screens/CrudFormScreen";
import SalvarAplicacaoScreen from "./src/screens/SalvarAplicacaoScreen";
import AplicacoesScreen from "./src/screens/AplicacoesScreen";
import AplicacaoDetailScreen from "./src/screens/AplicacaoDetailScreen";
import RelatorioGeralScreen from "./src/screens/RelatorioGeralScreen";
import MapaScreen from "./src/screens/MapaScreen";
import CondicoesVooScreen from "./src/screens/CondicoesVooScreen";
import SalvarTalhaoScreen from "./src/screens/SalvarTalhaoScreen";
import MinhaEmpresaScreen from "./src/screens/MinhaEmpresaScreen";
import MinhaEquipeScreen from "./src/screens/MinhaEquipeScreen";
import AtividadeScreen from "./src/screens/AtividadeScreen";
import EmBreveScreen from "./src/screens/EmBreveScreen";
import LoginScreen from "./src/screens/LoginScreen";
import NovaSenhaScreen from "./src/screens/NovaSenhaScreen";
import ContaScreen from "./src/screens/ContaScreen";
import MarcaVZSAgro from "./src/components/MarcaVZSAgro";
import FinanceiroScreen from "./src/screens/fin/FinanceiroScreen";
import FinDashboardScreen from "./src/screens/fin/FinDashboardScreen";
import FinContasScreen from "./src/screens/fin/FinContasScreen";
import FinContaFormScreen from "./src/screens/fin/FinContaFormScreen";
import FinCategoriasScreen from "./src/screens/fin/FinCategoriasScreen";
import FinCategoriaFormScreen from "./src/screens/fin/FinCategoriaFormScreen";
import FinCartoesScreen from "./src/screens/fin/FinCartoesScreen";
import FinCartaoFormScreen from "./src/screens/fin/FinCartaoFormScreen";
import FinFaturaScreen from "./src/screens/fin/FinFaturaScreen";
import FinLancamentosScreen from "./src/screens/fin/FinLancamentosScreen";
import FinLancamentoFormScreen from "./src/screens/fin/FinLancamentoFormScreen";
import FinLancamentoDetailScreen from "./src/screens/fin/FinLancamentoDetailScreen";
import FinTransferenciasScreen from "./src/screens/fin/FinTransferenciasScreen";
import FinRelatorioScreen from "./src/screens/fin/FinRelatorioScreen";
import EstoqueScreen from "./src/screens/EstoqueScreen";
import EstoqueProdutoDetalheScreen from "./src/screens/EstoqueProdutoDetalheScreen";
import EstoqueMovimentoFormScreen from "./src/screens/EstoqueMovimentoFormScreen";
import EstoqueRelatorioScreen from "./src/screens/EstoqueRelatorioScreen";
import FaturamentoScreen from "./src/screens/FaturamentoScreen";
import CompraFormScreen from "./src/screens/CompraFormScreen";
import VendaFormScreen from "./src/screens/VendaFormScreen";

const Stack = createNativeStackNavigator();
const APP_ICON = require("./assets/icon.png");

function TituloHome() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Image source={APP_ICON} style={{ width: 28, height: 28, borderRadius: 7 }} resizeMode="contain" />
      <MarcaVZSAgro style={{ fontSize: 18, fontWeight: "800" }} />
    </View>
  );
}

const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: C.bg, card: C.card, text: C.text, border: C.border, primary: C.green },
};

// No web/desktop não existe o botão de voltar nativo do celular — então
// adicionamos um "‹ Voltar" próprio no cabeçalho quando dá pra voltar.
function screenOptions({ navigation }) {
  return {
    headerStyle: { backgroundColor: C.card },
    headerTintColor: C.text,
    headerTitleStyle: { fontWeight: "800" },
    contentStyle: { backgroundColor: C.bg },
    headerLeft: Platform.OS === "web"
      ? () => (navigation.canGoBack() ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingVertical: 4, paddingRight: 16, flexDirection: "row", alignItems: "center" }}>
            <Text style={{ color: C.text, fontSize: 22, marginRight: 2 }}>‹</Text>
            <Text style={{ color: C.text, fontSize: 15, fontWeight: "700" }}>Voltar</Text>
          </TouchableOpacity>
        ) : null)
      : undefined,
  };
}

// Cabeçalho claro (mesma paleta do FinControl) pras telas do módulo Financeiro,
// que usam tema claro no conteúdo — sem isso a barra de navegação ficava
// escura por cima de um conteúdo claro, quebrando a consistência visual.
function finHeaderOptions({ navigation }, title) {
  return {
    title,
    headerStyle: { backgroundColor: "#16a34a" },
    headerTintColor: "#fff",
    headerTitleStyle: { fontWeight: "800", color: "#fff" },
    contentStyle: { backgroundColor: "#f0f4f8" },
    headerLeft: Platform.OS === "web"
      ? () => (navigation.canGoBack() ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingVertical: 4, paddingRight: 16, flexDirection: "row", alignItems: "center" }}>
            <Text style={{ color: "#fff", fontSize: 22, marginRight: 2 }}>‹</Text>
            <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>Voltar</Text>
          </TouchableOpacity>
        ) : null)
      : undefined,
  };
}

export default function App() {
  const [pronto, setPronto] = useState(false);
  const [logged, setLogged] = useState(false);
  const [empresa, setEmpresa] = useState(null);
  const [recuperandoSenha, setRecuperandoSenha] = useState(false);

  const recarregar = useCallback(async () => {
    await migrarArmazenamentoAntigo();
    const [sessao, e] = await Promise.all([sessaoAtual(), lerEmpresa()]);
    setLogged(!!sessao); setEmpresa(e); setPronto(true);
  }, []);

  const sair = useCallback(async () => { await sairOnline(); await recarregar(); }, [recarregar]);

  useEffect(() => {
    seedProdutosPadrao();
    recarregar();
    iniciarAutoSync();
    // Reage sozinho a login/logout — inclusive se o token expirar/renovar em
    // background. Recarrega tudo de novo (não só o "logged"): licença e
    // empresa dependem de quem está logado, senão ficam com o valor de antes
    // do login (ex.: "expirada" porque ainda não tinha ninguém logado).
    // PASSWORD_RECOVERY = a pessoa voltou pelo link de "esqueci minha senha".
    const cancelar = aoMudarSessao((_sessao, evento) => {
      if (evento === "PASSWORD_RECOVERY") setRecuperandoSenha(true);
      recarregar();
    });
    return cancelar;
  }, [recarregar]);

  const ctx = useMemo(() => ({ recarregar, sair }), [recarregar, sair]);

  if (!pronto) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" }}>
        <StatusBar style="light" />
        <Text style={{ color: C.mut, fontSize: 15 }}>Carregando…</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppCtx.Provider value={ctx}>
        <StatusBar style="light" />
        {recuperandoSenha ? (
          <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
            <NovaSenhaScreen onPronto={async () => { setRecuperandoSenha(false); await sair(); }} />
          </SafeAreaView>
        ) : !logged ? (
          <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
            <LoginScreen empresa={empresa} />
          </SafeAreaView>
        ) : (
          <View style={{ flex: 1 }}>
            <SyncBadge />
            <NavigationContainer theme={navTheme}>
            <Stack.Navigator screenOptions={screenOptions}>
              <Stack.Screen name="Home" component={HomeScreen}
                options={({ navigation }) => ({
                  headerTitle: () => <TituloHome />,
                  headerRight: () => (
                    <TouchableOpacity onPress={() => navigation.navigate("Conta")} style={{ paddingHorizontal: 10 }}>
                      <Text style={{ color: C.text, fontSize: 20 }}>⚙️</Text>
                    </TouchableOpacity>
                  ),
                })} />
              <Stack.Screen name="Calculadora" component={CalculadoraScreen} options={{ title: "Calculadora de Calda" }} />
              <Stack.Screen name="Cadastros" component={CadastrosScreen} options={{ title: "Cadastros" }} />
              <Stack.Screen name="Catalogo" component={CatalogoScreen} options={{ title: "Catálogo de Produtos" }} />
              <Stack.Screen name="CrudList" component={CrudListScreen} />
              <Stack.Screen name="CrudForm" component={CrudFormScreen} />
              <Stack.Screen name="SalvarAplicacao" component={SalvarAplicacaoScreen} options={{ title: "Salvar aplicação" }} />
              <Stack.Screen name="Aplicacoes" component={AplicacoesScreen} options={{ title: "Aplicações" }} />
              <Stack.Screen name="AplicacaoDetail" component={AplicacaoDetailScreen} options={{ title: "Aplicação" }} />
              <Stack.Screen name="RelatorioGeral" component={RelatorioGeralScreen} options={{ title: "Relatório Geral" }} />
              <Stack.Screen name="Mapa" component={MapaScreen} options={{ title: "Mapa do Talhão" }} />
              <Stack.Screen name="CondicoesVoo" component={CondicoesVooScreen} options={{ title: "Condições pra Voo" }} />
              <Stack.Screen name="SalvarTalhao" component={SalvarTalhaoScreen} options={{ title: "Salvar talhão" }} />
              <Stack.Screen name="MinhaEmpresa" component={MinhaEmpresaScreen} options={{ title: "Minha Empresa" }} />
              <Stack.Screen name="MinhaEquipe" component={MinhaEquipeScreen} options={{ title: "Minha Equipe" }} />
              <Stack.Screen name="Atividade" component={AtividadeScreen} options={{ title: "Atividade recente" }} />
              <Stack.Screen name="Conta" component={ContaScreen} options={{ title: "Conta" }} />
              <Stack.Screen name="EmBreve" component={EmBreveScreen} />
              <Stack.Screen name="Faturamento" component={FaturamentoScreen} options={{ title: "Faturamento" }} />
              <Stack.Screen name="Compra" component={CompraFormScreen} options={{ title: "Nova compra" }} />
              <Stack.Screen name="Venda" component={VendaFormScreen} options={{ title: "Nova venda" }} />
              <Stack.Screen name="Estoque" component={EstoqueScreen} />
              <Stack.Screen name="EstoqueProduto" component={EstoqueProdutoDetalheScreen} />
              <Stack.Screen name="EstoqueMovimento" component={EstoqueMovimentoFormScreen} options={{ title: "Movimento de estoque" }} />
              <Stack.Screen name="EstoqueRelatorio" component={EstoqueRelatorioScreen} options={{ title: "Relatório de Estoque" }} />
              <Stack.Screen name="Financeiro" component={FinanceiroScreen} options={(p) => finHeaderOptions(p, "Financeiro")} />
              <Stack.Screen name="FinDashboard" component={FinDashboardScreen} options={(p) => finHeaderOptions(p, "Painel financeiro")} />
              <Stack.Screen name="FinContas" component={FinContasScreen} options={(p) => finHeaderOptions(p, "Contas")} />
              <Stack.Screen name="FinContaForm" component={FinContaFormScreen} options={(p) => finHeaderOptions(p, "Conta")} />
              <Stack.Screen name="FinCategorias" component={FinCategoriasScreen} options={(p) => finHeaderOptions(p, "Centros de Custo")} />
              <Stack.Screen name="FinCategoriaForm" component={FinCategoriaFormScreen} options={(p) => finHeaderOptions(p, "Centro de Custo")} />
              <Stack.Screen name="FinCartoes" component={FinCartoesScreen} options={(p) => finHeaderOptions(p, "Cartões")} />
              <Stack.Screen name="FinCartaoForm" component={FinCartaoFormScreen} options={(p) => finHeaderOptions(p, "Cartão")} />
              <Stack.Screen name="FinFatura" component={FinFaturaScreen} options={(p) => finHeaderOptions(p, "Pagar fatura")} />
              <Stack.Screen name="FinReceitas" component={FinLancamentosScreen} initialParams={{ tipo: "receita" }} options={(p) => finHeaderOptions(p, "Receitas")} />
              <Stack.Screen name="FinDespesas" component={FinLancamentosScreen} initialParams={{ tipo: "despesa" }} options={(p) => finHeaderOptions(p, "Despesas")} />
              <Stack.Screen name="FinLancamentoForm" component={FinLancamentoFormScreen} options={(p) => finHeaderOptions(p, p.route.params.tipo === "receita" ? "Nova receita" : "Nova despesa")} />
              <Stack.Screen name="FinLancamentoDetail" component={FinLancamentoDetailScreen} options={(p) => finHeaderOptions(p, "Lançamento")} />
              <Stack.Screen name="FinTransferencias" component={FinTransferenciasScreen} options={(p) => finHeaderOptions(p, "Transferências")} />
              <Stack.Screen name="FinRelatorio" component={FinRelatorioScreen} options={(p) => finHeaderOptions(p, "Relatórios")} />
            </Stack.Navigator>
            </NavigationContainer>
          </View>
        )}
      </AppCtx.Provider>
    </SafeAreaProvider>
  );
}
