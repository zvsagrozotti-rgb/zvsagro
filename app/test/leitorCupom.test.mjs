// Teste do leitor de cupom: node --no-warnings test/leitorCupom.test.mjs
import assert from "node:assert/strict";
import { lerCupomFrotaFacil } from "../src/logic/leitorFrota.js";

const hoje = new Date(2026, 9, 28);

// posto (NFC-e)
const posto = `POSTO SAO JOSE COMBUSTIVEIS LTDA
CNPJ: 11.222.333/0001-81
RODOVIA BR 020 KM 12 FORMOSA GO
DOCUMENTO AUXILIAR DA NOTA FISCAL DE CONSUMIDOR ELETRONICA
001 DIESEL S10 COMUM 150,000 L x 5,89 883,50
QTD. TOTAL DE ITENS 1
VALOR TOTAL R$ 883,50
FORMA DE PAGAMENTO VALOR PAGO
Cartao de Debito 883,50
Data de Emissao: 27/10/2026 10:15:00`;
let r = lerCupomFrotaFacil(posto, hoje);
assert.equal(r.tipo, "Combustível"); assert.equal(r.total, 883.5); assert.equal(r.litros, 150);
assert.equal(r.preco_litro, 5.89); assert.equal(r.cnpj, "11.222.333/0001-81"); assert.equal(r.data, "2026-10-27");
assert.match(r.estabelecimento, /Posto/i);

// restaurante
const rest = `RESTAURANTE SABOR DA ROCA LTDA
CNPJ 11.222.333/0001-81
CUPOM FISCAL ELETRONICO
001 PRATO FEITO 2 x 22,00 44,00
002 SUCO 6,00
TOTAL R$ 50,00
DINHEIRO 50,00
27/10/2026 12:40`;
r = lerCupomFrotaFacil(rest, hoje);
assert.equal(r.tipo, "Alimentação"); assert.equal(r.total, 50); assert.equal(r.litros, null); assert.equal(r.data, "2026-10-27");

// ilegível: não inventa nada
r = lerCupomFrotaFacil("xx ## \n . ,", hoje);
assert.equal(r.total, null); assert.equal(r.litros, null);
console.log("leitor ok");
