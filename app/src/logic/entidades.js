// Configuração dos cadastros (CRUD genérico).
import { UNIDADES, FORMULACOES } from "./calc";

export const TIPOS_BICO = [
  "Atomizador centrífugo (disco rotativo)",
  "Leque (jato plano) XR11001",
  "Leque (jato plano) XR11002",
  "Leque (jato plano) XR11003",
  "Leque (jato plano) XR11004",
  "Cone cheio",
  "Cone vazio",
  "Antideriva (indução de ar - AI)",
  "Jato duplo (TDXL)",
];

export const ENTIDADES = {
  produtos: {
    titulo: "Produtos", singular: "Produto", icon: "🧪", label: (i) => i.nome,
    sub: (i) => [i.tipo, i.dose ? i.dose + " " + (i.unidade || "") : ""].filter(Boolean).join(" · "),
    campos: [
      { key: "nome", label: "Nome", tipo: "text", req: true },
      { key: "tipo", label: "Tipo", tipo: "select", opcoes: ["Herbicida", "Inseticida", "Fungicida", "Adjuvante", "Fertilizante", "Outro"] },
      { key: "dose", label: "Dose recomendada", tipo: "number" },
      { key: "unidade", label: "Unidade", tipo: "select", opcoes: UNIDADES },
      { key: "formulacao", label: "Formulação (ordem de mistura)", tipo: "select", opcoes: FORMULACOES },
      { key: "classe", label: "Classe toxicológica", tipo: "text" },
      { key: "carencia", label: "Carência (dias)", tipo: "number" },
      { key: "estoqueMinimo", label: "Estoque mínimo", tipo: "number" },
      { key: "custoMedio", label: "Custo médio (R$)", tipo: "number" },
      { key: "observacao", label: "Observações / bula", tipo: "text", multi: true },
    ],
  },
  drones: {
    titulo: "Drones", singular: "Drone", icon: "🚁", label: (i) => i.modelo,
    sub: (i) => [i.serie, i.tanque ? i.tanque + " L" : ""].filter(Boolean).join(" · "),
    campos: [
      { key: "modelo", label: "Modelo", tipo: "text", req: true },
      { key: "serie", label: "Nº de série", tipo: "text" },
      { key: "tanque", label: "Tanque (L)", tipo: "number" },
      { key: "bico", label: "Tipo de bico", tipo: "selectTexto", opcoes: TIPOS_BICO },
      { key: "baterias", label: "Qtd. de baterias", tipo: "number" },
      { key: "sisant", label: "Registro ANAC (SISANT)", tipo: "text" },
      { key: "anatel", label: "Homologação ANATEL", tipo: "text" },
      { key: "licencas", label: "Outras licenças / validade", tipo: "text", multi: true },
    ],
  },
  pilotos: {
    titulo: "Pilotos", singular: "Piloto", icon: "🧑‍✈️", label: (i) => i.nome,
    sub: (i) => i.canac || "",
    campos: [
      { key: "nome", label: "Nome", tipo: "text", req: true },
      { key: "canac", label: "CANAC / certificação", tipo: "text" },
      { key: "contato", label: "Contato", tipo: "text" },
      { key: "certificados", label: "Certificados (PDF)", tipo: "arquivos" },
    ],
  },
  fazendas: {
    titulo: "Fazendas", singular: "Fazenda", icon: "🌾", label: (i) => i.nome,
    sub: (i) => i.cliente || "",
    campos: [
      { key: "nome", label: "Nome", tipo: "text", req: true },
      { key: "cliente", label: "Cliente", tipo: "ref", ref: "clientes" },
    ],
  },
  talhoes: {
    titulo: "Talhões", singular: "Talhão", icon: "📐", label: (i) => i.nome,
    sub: (i) => [i.cliente, i.fazenda, i.area ? i.area + " ha" : ""].filter(Boolean).join(" · "),
    filtroCampo: "cliente", filtroLabel: "Cliente",
    ordenar: (a, b) => String(a.cliente || "").localeCompare(String(b.cliente || ""))
      || String(a.fazenda || "").localeCompare(String(b.fazenda || ""))
      || String(a.nome || "").localeCompare(String(b.nome || "")),
    campos: [
      { key: "nome", label: "Nome do talhão", tipo: "text", req: true },
      { key: "fazenda", label: "Fazenda", tipo: "ref", ref: "fazendas" },
      { key: "cultura", label: "Cultura", tipo: "text" },
      { key: "area", label: "Área (ha)", tipo: "number" },
    ],
  },
  clientes: {
    titulo: "Clientes e Fornecedores", singular: "Cliente/Fornecedor", icon: "🧑‍🌾", label: (i) => i.nome,
    sub: (i) => [i.tipo || "Cliente", i.documento, i.cidade, i.contato].filter(Boolean).join(" · "),
    campos: [
      { key: "nome", label: "Nome", tipo: "text", req: true },
      { key: "tipo", label: "Tipo", tipo: "select", opcoes: ["Cliente", "Fornecedor", "Ambos"] },
      { key: "documento", label: "CPF/CNPJ", tipo: "documento" },
      { key: "inscricaoEstadual", label: "Inscrição Estadual", tipo: "text" },
      { key: "contato", label: "Contato", tipo: "text" },
      { key: "cep", label: "CEP", tipo: "cep" },
      { key: "endereco", label: "Endereço (rua/av.)", tipo: "text" },
      { key: "numero", label: "Número", tipo: "text" },
      { key: "bairro", label: "Bairro", tipo: "text" },
      { key: "cidade", label: "Cidade", tipo: "text" },
      { key: "uf", label: "UF", tipo: "text" },
    ],
  },
  locais: {
    titulo: "Locais de Estoque", singular: "Local", icon: "🏬", label: (i) => i.nome,
    sub: (i) => i.responsavel || "",
    campos: [
      { key: "nome", label: "Nome", tipo: "text", req: true },
      { key: "responsavel", label: "Responsável", tipo: "text" },
    ],
  },
};

export const ORDEM_CADASTRO = ["clientes", "fazendas", "talhoes", "produtos", "drones", "pilotos", "locais"];
