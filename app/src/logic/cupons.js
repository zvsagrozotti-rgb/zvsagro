// Cupons fiscais, adiantamentos e fechamento de ciclo por funcionário.
// Tudo fica na tabela genérica "registros" (mesmo armazenamento dos outros
// cadastros); a foto vai em uma entidade à parte para não pesar nas listas.
import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { listar, salvar, remover } from "./store";
import { supabase } from "./supabaseClient";
import { textoDaImagem } from "./cupomOcr";
import { lerCupomFrotaFacil } from "./leitorFrota";
import { minhaEmpresa } from "./empresaOnline";
import { resumoFuncionario, idsParaFechar } from "./saldo";
import { salvarAbastecimento, removerAbastecimento } from "./frota/abastecimentos";

export const TIPOS_CUPOM = ["Combustível", "Alimentação", "Outros"];

export const listarFuncionarios = () => listar("funcionarios");
export const listarCupons = () => listar("cupons");
export const listarCreditos = () => listar("adiantamentos");

export async function souAdministrador() {
  try { const e = await minhaEmpresa(); return !e || e.papel === "dono" || e.papel === "administrador"; } catch (e) { return true; }
}

// Funcionário cadastrado com o e-mail de login de quem está usando o app (null se não houver).
export async function meuFuncionario(funcionarios) {
  try {
    const { data } = await supabase.auth.getUser();
    const email = String((data && data.user && data.user.email) || "").trim().toLowerCase();
    if (!email) return null;
    return (funcionarios || []).find((f) => String(f.email || "").trim().toLowerCase() === email) || null;
  } catch (e) { return null; }
}

export async function carregarTudo() {
  const [funcionarios, cupons, creditos] = await Promise.all([listarFuncionarios(), listarCupons(), listarCreditos()]);
  return { funcionarios, cupons, creditos };
}

export async function resumos() {
  const { funcionarios, cupons, creditos } = await carregarTudo();
  return funcionarios.map((f) => ({ funcionario: f, ...resumoFuncionario(f.id, creditos, cupons) }));
}

// ---- foto ----
export async function tirarFoto(camera = true) {
  const opc = { mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 };
  let res;
  if (camera && Platform.OS !== "web") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error("Permita o uso da câmera para fotografar o cupom.");
    res = await ImagePicker.launchCameraAsync(opc);
  } else {
    res = await ImagePicker.launchImageLibraryAsync(opc);
  }
  if (res.canceled || !res.assets || !res.assets[0]) return null;
  // 1280 px de largura: cupom térmico precisa de resolução para ser legível e lido pela IA.
  const m = await ImageManipulator.manipulateAsync(res.assets[0].uri, [{ resize: { width: 1280 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true });
  return m.base64;
}

export async function lerFoto(cupomId) {
  const todas = await listar("cupom_fotos");
  const f = todas.find((x) => x.id === cupomId);
  return f ? f.dados : null;
}

// ---- leitura automática (OCR no próprio aparelho, sem chave nem custo) ----
export async function lerCupomDaFoto(base64) {
  const texto = await textoDaImagem(base64);
  return lerCupomFrotaFacil(texto);
}

// ---- cupom ----
// dados: { id?, funcionarioId, tipo, estabelecimento, cnpj, data, valor, observacao,
//          veiculoId?, odometro?, litros?, precoLitro? }
export async function salvarCupom(dados, fotoBase64) {
  const antigo = dados.id ? (await listarCupons()).find((c) => c.id === dados.id) : null;
  let abastecimentoId = antigo ? antigo.abastecimentoId : undefined;

  if (dados.tipo === "Combustível" && dados.veiculoId) {
    const ab = await salvarAbastecimento(dados.veiculoId, {
      ...(abastecimentoId ? { id: abastecimentoId } : {}),
      data: dados.data, odometro: String(dados.odometro ?? "").replace(",", "."),
      volume: String(dados.litros ?? "").replace(",", "."), precoLitro: String(dados.precoLitro ?? "").replace(",", "."),
      completou: true, origemCupom: true,
    });
    abastecimentoId = ab.id;
  } else if (abastecimentoId) {
    await removerAbastecimento(abastecimentoId); abastecimentoId = undefined;
  }

  const cupom = await salvar("cupons", { ...(antigo || {}), ...dados, abastecimentoId });
  if (fotoBase64) await salvar("cupom_fotos", { id: cupom.id, dados: fotoBase64 });
  return cupom;
}

export async function removerCupom(cupom) {
  if (cupom.abastecimentoId) await removerAbastecimento(cupom.abastecimentoId);
  await remover("cupons", cupom.id);
  try { await remover("cupom_fotos", cupom.id); } catch (e) {}
}

// ---- adiantamento (receita) e fechamento ----
export async function lancarAdiantamento({ funcionarioId, valor, data, descricao }) {
  return salvar("adiantamentos", { funcionarioId, valor: Number(valor), data, descricao: descricao || "Adiantamento" });
}

// Dá a receita como paga (fecha tudo que está em aberto do funcionário) e,
// opcionalmente, sobe um novo adiantamento para o próximo ciclo.
export async function fecharCiclo(funcionarioId, { novoValor, hoje }) {
  const { cupons, creditos } = await carregarTudo();
  const f = idsParaFechar(funcionarioId, creditos, cupons);
  for (const id of f.creditos) { const c = creditos.find((x) => x.id === id); await salvar("adiantamentos", { ...c, fechadoEm: hoje }); }
  for (const id of f.cupons) { const c = cupons.find((x) => x.id === id); await salvar("cupons", { ...c, fechadoEm: hoje }); }
  if (Number(novoValor) > 0) await lancarAdiantamento({ funcionarioId, valor: novoValor, data: hoje, descricao: "Novo ciclo" });
  return f.resumo;
}
