// Configuração dos cadastros (CRUD genérico).

export const TIPOS_COMBUSTIVEL = ["Diesel S10", "Diesel S500", "Gasolina", "Etanol", "Flex", "GNV", "Outro"];

export const ENTIDADES = {
  veiculos: {
    titulo: "Veículos", singular: "Veículo", icon: "🚗", label: (i) => i.apelido || i.placa || "(sem nome)",
    sub: (i) => [i.placa, i.modelo, i.tipoCombustivel].filter(Boolean).join(" · "),
    campos: [
      { key: "apelido", label: "Apelido / Nome", tipo: "text", req: true },
      { key: "placa", label: "Placa", tipo: "text" },
      { key: "modelo", label: "Modelo", tipo: "text" },
      { key: "tipoCombustivel", label: "Tipo de combustível", tipo: "select", opcoes: TIPOS_COMBUSTIVEL },
      { key: "odometroInicial", label: "Odômetro inicial (km)", tipo: "number" },
    ],
  },
  clientes: {
    titulo: "Pessoas", singular: "Pessoa", icon: "🧑‍🌾", label: (i) => i.nome,
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
};

export const ORDEM_CADASTRO = ["clientes"];
