// Login de verdade (conta com e-mail/senha via Supabase) — é o que permite o
// MESMO usuário entrar em vários aparelhos e ver os mesmos dados.
import { supabase } from "./supabaseClient";
import { limparCacheEmpresa } from "./empresaOnline";

export async function cadastrar(email, senha) {
  const { data, error } = await supabase.auth.signUp({ email, password: senha });
  if (error) return { ok: false, erro: traduzErro(error) };
  if (!data.session) {
    return { ok: false, erro: "Conta criada! Confirme seu e-mail (verifique a caixa de entrada) antes de entrar.", precisaConfirmar: true };
  }
  return { ok: true };
}

export async function entrar(email, senha) {
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) return { ok: false, erro: traduzErro(error) };
  return { ok: true };
}

export async function sair() {
  await supabase.auth.signOut();
  limparCacheEmpresa();
}

// Manda o e-mail com o link de "definir nova senha" (o app detecta sozinho
// quando a pessoa volta por esse link e mostra a tela de trocar senha).
// Precisa do `redirectTo` explícito: sem isso o Supabase manda pra "Site URL"
// padrão do projeto (não necessariamente https://.../aegrofin-online/), o que
// dava 404 no GitHub Pages (hospedado numa subpasta, não na raiz do domínio).
export async function recuperarSenha(email) {
  const opts = {};
  if (typeof window !== "undefined" && window.location) {
    opts.redirectTo = window.location.origin + window.location.pathname;
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), opts);
  if (error) return { ok: false, erro: traduzErro(error) };
  return { ok: true };
}

// Chamado já dentro da sessão de recuperação (depois que a pessoa clicou no
// link do e-mail) — define a senha nova de verdade.
export async function definirNovaSenha(novaSenha) {
  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  if (error) return { ok: false, erro: traduzErro(error) };
  return { ok: true };
}

// Apaga a conta pra sempre (com trava no banco: dono de empresa com outros
// membros não consegue excluir sem antes remover a equipe).
export async function excluirConta() {
  const { error } = await supabase.rpc("excluir_minha_conta");
  if (error) return { ok: false, erro: error.message };
  await supabase.auth.signOut();
  limparCacheEmpresa();
  return { ok: true };
}

export async function sessaoAtual() {
  const { data } = await supabase.auth.getSession();
  return data.session || null;
}

// Chama cb(sessao, evento) sempre que o estado de login mudar (login/logout,
// em QUALQUER aba/aparelho onde essa mesma sessão for usada). `evento` vem
// como "PASSWORD_RECOVERY" quando a pessoa voltou pelo link de recuperação
// de senha — é assim que a tela sabe quando mostrar "definir nova senha".
export function aoMudarSessao(cb) {
  const { data } = supabase.auth.onAuthStateChange((evento, sessao) => cb(sessao, evento));
  return () => data.subscription.unsubscribe();
}

function traduzErro(error) {
  const msg = error?.message || "";
  if (msg.includes("Invalid login credentials")) return "E-mail ou senha incorretos.";
  if (msg.includes("User already registered")) return "Já existe uma conta com esse e-mail. Tente entrar.";
  if (msg.includes("Password should be at least")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (msg.includes("Unable to validate email address")) return "E-mail inválido.";
  return msg || "Não foi possível completar a operação.";
}
