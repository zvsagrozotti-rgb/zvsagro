// Tema visual do módulo Financeiro — igual ao do FinControl (claro, cards
// brancos, azul como cor principal), diferente do resto do Aegrofin (escuro).
// Mesmas chaves do tema escuro (C) pra poder ser importado como substituto
// direto nas telas de fin/ sem precisar trocar cada referência.
export const FC = {
  bg: "#f0f4f8", card: "#ffffff", border: "#e5e7eb", line: "#e5e7eb",
  text: "#1f2937", mut: "#6b7280",
  green: "#16a34a", greenClaro: "#16a34a", greenEscuro: "#0f7a37",
  blue: "#1a73e8", blueEscuro: "#1557b0",
  red: "#dc2626", amarelo: "#ca8a04",
  // Cor principal do módulo (cabeçalhos, card de saldo, botões primários) —
  // igual ao Aegrofin em si (verde), não o navy do FinControl original.
  navy: "#16a34a",
  // fundos claros pros badges de status (mesmas cores do FinControl)
  greenBg: "#dcfce7", amareloBg: "#fef9c3", redBg: "#fee2e2", grayBg: "#f3f4f6",
  // fundo cinza-claro dos cards de conta ("conta-c" do FinControl)
  contaCard: "#f8fafc",
  // pastéis usados nos tiles de "Ações Rápidas" da tela Início
  pastelVermelho: "#fde8e8", pastelVerde: "#dcf5e3", pastelAzul: "#dbe9fd", pastelAmarelo: "#fdf1cf",
};

// Estilos compartilhados que reproduzem os componentes do FinControl
// (cards com borda colorida à esquerda, "tabela" em card branco com linhas
// divididas). Usados nas telas de fin/ além do StyleSheet próprio de cada uma.
export const FCStyles = {
  kpiCard: (cor) => ({
    flex: 1, backgroundColor: "#fff", borderRadius: 13, padding: 14,
    borderLeftWidth: 4, borderLeftColor: cor || FC.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  }),
  kpiLabel: { fontSize: 11, color: FC.mut, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: "600", marginBottom: 5 },
  kpiValor: { fontSize: 20, fontWeight: "800" },
  kpiSub: { fontSize: 11, color: "#9ca3af", marginTop: 3 },
  contaCard: (cor) => ({
    backgroundColor: FC.contaCard, borderRadius: 11, padding: 15,
    borderLeftWidth: 3, borderLeftColor: cor || FC.blue,
  }),
  tabela: {
    backgroundColor: "#fff", borderRadius: 13, overflow: "hidden", borderWidth: 1, borderColor: FC.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  tabelaHead: {
    flexDirection: "row", backgroundColor: "#f8fafc", paddingVertical: 9, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: FC.border,
  },
  tabelaHeadTxt: { fontSize: 10, color: FC.mut, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: "700" },
  tabelaRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 11, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: "#f5f5f5",
  },
  badge: { fontSize: 10, fontWeight: "700", borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3, alignSelf: "flex-start", overflow: "hidden" },
  // Card de KPI "chapado" (sem borda colorida à esquerda) — usado nos 3
  // totais do topo do Relatório (Receitas/Despesas/Saldo), igual ao FinControl.
  kpiFlat: {
    flex: 1, backgroundColor: "#fff", borderRadius: 13, padding: 14, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  botaoPrimario: { backgroundColor: FC.green, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  botaoPrimarioTxt: { color: "#fff", fontWeight: "700" },
  // Estado vazio padrão (ícone grande + título em negrito + subtítulo cinza),
  // igual ao usado em Receitas/Contas/Cartões/Relatórios do FinControl.
  vazioIcone: { fontSize: 44, marginBottom: 14, textAlign: "center" },
  vazioTitulo: { color: FC.text, fontSize: 16, fontWeight: "800", textAlign: "center" },
  vazioSub: { color: FC.mut, fontSize: 13, textAlign: "center", marginTop: 4 },
};
