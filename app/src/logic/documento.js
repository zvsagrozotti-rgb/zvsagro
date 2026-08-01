// CPF/CNPJ: validação de dígito verificador + busca automática de dados.
//
// IMPORTANTE: só existe busca automática (nome/endereço) para CNPJ, via API
// pública da Receita Federal (BrasilAPI, gratuita, sem chave). Para CPF NÃO
// existe — e não deve existir — um serviço público/legal que devolva nome ou
// endereço de uma pessoa a partir só do número do documento; isso é dado
// protegido por LGPD. Para CPF, só validamos o dígito verificador.
// O endereço (por CEP) é buscado à parte, via ViaCEP, e serve pros dois casos.

export function apenasDigitos(v) {
  return String(v || "").replace(/\D/g, "");
}

export function tipoDocumento(v) {
  const d = apenasDigitos(v);
  if (d.length === 11) return "CPF";
  if (d.length === 14) return "CNPJ";
  return null;
}

export function validarCPF(v) {
  const cpf = apenasDigitos(v);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += Number(cpf[i]) * (10 - i);
  let dv1 = (soma * 10) % 11; if (dv1 === 10) dv1 = 0;
  if (dv1 !== Number(cpf[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(cpf[i]) * (11 - i);
  let dv2 = (soma * 10) % 11; if (dv2 === 10) dv2 = 0;
  return dv2 === Number(cpf[10]);
}

export function validarCNPJ(v) {
  const cnpj = apenasDigitos(v);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calcDv = (base) => {
    const pesos = base.length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * pesos[i];
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const dv1 = calcDv(cnpj.slice(0, 12));
  if (dv1 !== Number(cnpj[12])) return false;
  const dv2 = calcDv(cnpj.slice(0, 13));
  return dv2 === Number(cnpj[13]);
}

export function formatarDocumento(v) {
  const d = apenasDigitos(v);
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return v;
}

// Busca dados de empresa por CNPJ (BrasilAPI - Receita Federal, público e gratuito).
export async function buscarCNPJ(v) {
  const cnpj = apenasDigitos(v);
  if (cnpj.length !== 14) throw new Error("CNPJ precisa ter 14 dígitos.");
  if (!validarCNPJ(cnpj)) throw new Error("CNPJ inválido (dígito verificador não confere).");
  const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
  if (!resp.ok) {
    if (resp.status === 404) throw new Error("CNPJ não encontrado na Receita Federal.");
    throw new Error("Não foi possível consultar o CNPJ agora (tente de novo em instantes).");
  }
  const d = await resp.json();
  // A Receita Federal às vezes já devolve o número grudado no fim do
  // logradouro (ex.: "PAULISTA 37" + numero "37") — remove a duplicação.
  let endereco = [d.descricao_tipo_de_logradouro, d.logradouro].filter(Boolean).join(" ").trim();
  if (d.numero && endereco.endsWith(" " + d.numero)) {
    endereco = endereco.slice(0, -(" " + d.numero).length);
  }
  return {
    nome: d.nome_fantasia || d.razao_social || "",
    razaoSocial: d.razao_social || "",
    contato: d.ddd_telefone_1 ? d.ddd_telefone_1 : (d.email || ""),
    cep: d.cep ? formatarCEP(d.cep) : "",
    endereco,
    numero: d.numero || "",
    bairro: d.bairro || "",
    cidade: d.municipio || "",
    uf: d.uf || "",
  };
}

export function formatarCEP(v) {
  const d = apenasDigitos(v);
  return d.length === 8 ? d.replace(/(\d{5})(\d{3})/, "$1-$2") : v;
}

// Busca endereço por CEP (ViaCEP, público e gratuito) - serve pra CPF e CNPJ.
export async function buscarCEP(v) {
  const cep = apenasDigitos(v);
  if (cep.length !== 8) throw new Error("CEP precisa ter 8 dígitos.");
  const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  if (!resp.ok) throw new Error("Não foi possível consultar o CEP agora.");
  const d = await resp.json();
  if (d.erro) throw new Error("CEP não encontrado.");
  return {
    endereco: d.logradouro || "",
    bairro: d.bairro || "",
    cidade: d.localidade || "",
    uf: d.uf || "",
  };
}
