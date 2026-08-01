// "Empresa" = o espaço de dados compartilhado. Vários logins (usuários)
// podem pertencer à mesma empresa e ver/editar os mesmos dados.
import { supabase } from "./supabaseClient";

let cacheEmpresaId = null;

// Empresa do usuário logado agora ({ empresaId, nome, papel }) — cacheado
// na memória (recarrega automaticamente se o login mudar).
export async function minhaEmpresa() {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes?.user) return null;
  const { data, error } = await supabase
    .from("membros")
    .select("empresa_id, papel, empresas(nome)")
    .eq("user_id", userRes.user.id)
    .maybeSingle();
  if (error || !data) return null;
  cacheEmpresaId = data.empresa_id;
  return { empresaId: data.empresa_id, nome: data.empresas?.nome, papel: data.papel };
}

// Usado pelo syncStore pra montar os registros — evita bater no banco toda
// hora; se ainda não tiver em cache, busca uma vez.
export async function empresaIdAtual() {
  if (cacheEmpresaId) return cacheEmpresaId;
  const e = await minhaEmpresa();
  return e ? e.empresaId : null;
}

export function limparCacheEmpresa() { cacheEmpresaId = null; }

export async function listarMembros() {
  const empresaId = await empresaIdAtual();
  if (!empresaId) return [];
  const { data, error } = await supabase
    .from("membros")
    .select("user_id, email, papel, criado_em")
    .eq("empresa_id", empresaId)
    .order("criado_em", { ascending: true });
  if (error) return [];
  return data || [];
}

export async function convitesPendentes() {
  const empresaId = await empresaIdAtual();
  if (!empresaId) return [];
  const { data, error } = await supabase
    .from("convites")
    .select("id, email, status, criado_em")
    .eq("empresa_id", empresaId)
    .eq("status", "pendente")
    .order("criado_em", { ascending: false });
  if (error) return [];
  return data || [];
}

// Convite dirigido a MIM (pra eu aceitar e entrar numa empresa de outra pessoa).
// Filtra pelo próprio e-mail explicitamente: como dono de empresa também
// enxerga (via outra regra) os convites que ELE mandou, sem esse filtro a
// consulta devolveria também os convites que eu mesmo criei pra outros.
export async function convitesParaMim() {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes?.user?.email) return [];
  const { data, error } = await supabase
    .from("convites")
    .select("id, empresa_id, status, criado_em, empresas(nome)")
    .eq("status", "pendente")
    .eq("email", userRes.user.email);
  if (error) return [];
  return data || [];
}

export async function convidar(email) {
  const empresaId = await empresaIdAtual();
  if (!empresaId) return { ok: false, erro: "Empresa não encontrada." };
  const { error } = await supabase.from("convites").insert({ empresa_id: empresaId, email: email.trim().toLowerCase() });
  if (error) return { ok: false, erro: traduzErro(error) };
  return { ok: true };
}

export async function aceitarConvite(conviteId) {
  const { error } = await supabase.rpc("aceitar_convite", { p_convite_id: conviteId });
  if (error) return { ok: false, erro: traduzErro(error) };
  limparCacheEmpresa();
  return { ok: true };
}

// Só o dono pode chamar (o banco garante isso, não só a tela). A pessoa
// removida não perde a conta, só o acesso aos dados dessa empresa.
export async function removerMembro(userId) {
  const { error } = await supabase.rpc("remover_membro", { p_user_id: userId });
  if (error) return { ok: false, erro: traduzErro(error) };
  return { ok: true };
}

function traduzErro(error) {
  const msg = error?.message || "";
  if (msg.includes("duplicate key")) return "Esse e-mail já foi convidado.";
  return msg || "Não foi possível completar a operação.";
}
