import React, { useEffect, useState, useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, Image, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { C } from "./src/theme";
import { sessaoAtual, aoMudarSessao, sair as sairOnline } from "./src/logic/authOnline";
import { iniciarAutoSync } from "./src/logic/store";
import { lerEmpresa } from "./src/logic/empresa";
import { AppCtx } from "./src/logic/appctx";
import SyncBadge from "./src/components/SyncBadge";
import HomeScreen from "./src/screens/HomeScreen";
import CadastrosScreen from "./src/screens/CadastrosScreen";
import CrudListScreen from "./src/screens/CrudListScreen";
import CrudFormScreen from "./src/screens/CrudFormScreen";
import FrotaScreen from "./src/screens/FrotaScreen";
import VeiculoDetailScreen from "./src/screens/VeiculoDetailScreen";
import VeiculoFormScreen from "./src/screens/VeiculoFormScreen";
import AbastecimentoFormScreen from "./src/screens/AbastecimentoFormScreen";
import RelatorioAbastecimentosScreen from "./src/screens/RelatorioAbastecimentosScreen";
import MinhaEmpresaScreen from "./src/screens/MinhaEmpresaScreen";
import MinhaEquipeScreen from "./src/screens/MinhaEquipeScreen";
import AtividadeScreen from "./src/screens/AtividadeScreen";
import EmBreveScreen from "./src/screens/EmBreveScreen";
import LoginScreen from "./src/screens/LoginScreen";
import NovaSenhaScreen from "./src/screens/NovaSenhaScreen";
import ContaScreen from "./src/screens/ContaScreen";
import CuponsScreen from "./src/screens/CuponsScreen";
import FuncionarioSaldoScreen from "./src/screens/FuncionarioSaldoScreen";
import CupomFormScreen from "./src/screens/CupomFormScreen";
import AdiantamentoScreen from "./src/screens/AdiantamentoScreen";
import RelatorioFuncionariosScreen from "./src/screens/RelatorioFuncionariosScreen";
import MarcaFrotaFacil from "./src/components/MarcaFrotaFacil";

const Stack = createNativeStackNavigator();
const LOGO = require("./assets/logo.png");

function TituloHome() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Image source={LOGO} style={{ width: 30, height: 30 }} resizeMode="contain" />
      <MarcaFrotaFacil style={{ fontSize: 18, fontWeight: "800" }} />
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

export default function App() {
  const [pronto, setPronto] = useState(false);
  const [logged, setLogged] = useState(false);
  const [empresa, setEmpresa] = useState(null);
  const [recuperandoSenha, setRecuperandoSenha] = useState(false);

  const recarregar = useCallback(async () => {
    const [sessao, e] = await Promise.all([sessaoAtual(), lerEmpresa()]);
    setLogged(!!sessao); setEmpresa(e); setPronto(true);
  }, []);

  const sair = useCallback(async () => { await sairOnline(); await recarregar(); }, [recarregar]);

  useEffect(() => {
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
              <Stack.Screen name="Cadastros" component={CadastrosScreen} options={{ title: "Cadastros" }} />
              <Stack.Screen name="CrudList" component={CrudListScreen} />
              <Stack.Screen name="CrudForm" component={CrudFormScreen} />
              <Stack.Screen name="Frota" component={FrotaScreen} options={{ title: "Frota" }} />
              <Stack.Screen name="VeiculoDetail" component={VeiculoDetailScreen} />
              <Stack.Screen name="VeiculoForm" component={VeiculoFormScreen} />
              <Stack.Screen name="AbastecimentoForm" component={AbastecimentoFormScreen} />
              <Stack.Screen name="RelatorioAbastecimentos" component={RelatorioAbastecimentosScreen} options={{ title: "Relatório de Abastecimentos" }} />
              <Stack.Screen name="MinhaEmpresa" component={MinhaEmpresaScreen} options={{ title: "Minha Empresa" }} />
              <Stack.Screen name="MinhaEquipe" component={MinhaEquipeScreen} options={{ title: "Minha Equipe" }} />
              <Stack.Screen name="Atividade" component={AtividadeScreen} options={{ title: "Atividade recente" }} />
              <Stack.Screen name="Conta" component={ContaScreen} options={{ title: "Conta" }} />
              <Stack.Screen name="EmBreve" component={EmBreveScreen} />
              <Stack.Screen name="Cupons" component={CuponsScreen} options={{ title: "Cupons e Saldos" }} />
              <Stack.Screen name="FuncionarioSaldo" component={FuncionarioSaldoScreen} />
              <Stack.Screen name="CupomForm" component={CupomFormScreen} />
              <Stack.Screen name="Adiantamento" component={AdiantamentoScreen} />
              <Stack.Screen name="RelatorioFuncionarios" component={RelatorioFuncionariosScreen} options={{ title: "Receitas e despesas" }} />
            </Stack.Navigator>
            </NavigationContainer>
          </View>
        )}
      </AppCtx.Provider>
    </SafeAreaProvider>
  );
}
