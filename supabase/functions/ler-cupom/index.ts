// Edge Function "ler-cupom": recebe a foto de um cupom fiscal (base64 JPEG) e devolve os
// dados lidos por IA (Anthropic). Só quem estiver logado no app consegue chamar (JWT verificado
// pelo Supabase). A chave fica no segredo ANTHROPIC_API_KEY, nunca vai para o app.
//
// Publicar: Supabase > Edge Functions > ler-cupom (colar este arquivo) e, em Secrets, criar
// ANTHROPIC_API_KEY. Modelo opcional no segredo ANTHROPIC_MODEL (padrão abaixo).
const MODELO = Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-5-5";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PROMPT = `Você lê cupons fiscais brasileiros (NFC-e, cupom fiscal, nota de posto, restaurante, mercado).
Leia a imagem e responda SOMENTE um JSON, sem texto fora dele, neste formato:
{"estabelecimento": string|null, "cnpj": string|null, "data": "AAAA-MM-DD"|null, "total": number|null,
 "tipo": "Combustível"|"Alimentação"|"Outros", "litros": number|null, "preco_litro": number|null}
Regras: "total" é o valor total pago, em reais, com ponto decimal. "data" é a data de emissão. "tipo" é Combustível
se os itens forem gasolina, etanol, diesel ou GNV; Alimentação se for refeição, lanche, bebida ou mercado; senão Outros.
"litros" e "preco_litro" só para combustível. Se um dado não estiver legível, use null. Não invente valores.`;

function json(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  // Confere o login aqui (a verificação embutida do Supabase usa o segredo antigo e fica desligada).
  const sessao = await fetch((Deno.env.get("SUPABASE_URL") || "") + "/auth/v1/user", {
    headers: { Authorization: req.headers.get("Authorization") || "", apikey: req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "" },
  });
  if (!sessao.ok) return json({ erro: "Sessão inválida. Entre de novo no app." }, 401);

  const chave = Deno.env.get("ANTHROPIC_API_KEY");
  if (!chave) return json({ erro: "Leitura automática ainda não configurada. Preencha os dados à mão." });

  let imagem = "";
  try { imagem = String((await req.json()).imagem || ""); } catch (_e) { return json({ erro: "Pedido inválido." }, 400); }
  if (!imagem) return json({ erro: "Sem imagem." }, 400);

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": chave, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: 600,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imagem } },
        { type: "text", text: PROMPT },
      ] }],
    }),
  });
  if (!r.ok) return json({ erro: "Não consegui ler o cupom agora. Preencha os dados à mão." });

  const resp = await r.json();
  const texto = (resp.content || []).map((c: { text?: string }) => c.text || "").join("");
  const m = texto.match(/\{[\s\S]*\}/);
  if (!m) return json({ erro: "Não consegui entender o cupom. Preencha os dados à mão." });
  try { return json(JSON.parse(m[0])); } catch (_e) { return json({ erro: "Não consegui entender o cupom. Preencha os dados à mão." }); }
});
