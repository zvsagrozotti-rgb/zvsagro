// Categorias de receita/despesa. Porte de backend/routes/categorias.js do FinControl.
import { listar as listarBase, inserir, atualizar, remover } from "./store";

export async function listarCategorias() {
  const items = await listarBase("categorias");
  return items.sort((a, b) => String(a.tipo).localeCompare(String(b.tipo)) || String(a.nome).localeCompare(String(b.nome)));
}

export async function criarCategoria({ nome, tipo, cor }) {
  if (!String(nome || "").trim() || !tipo) throw new Error("Nome e tipo obrigatórios");
  return inserir("categorias", { nome, tipo, cor: cor || "#6B7280" });
}

export async function editarCategoria(id, { nome, cor }) {
  return atualizar("categorias", id, { nome, cor });
}

export async function excluirCategoria(id) {
  await remover("categorias", id);
}
