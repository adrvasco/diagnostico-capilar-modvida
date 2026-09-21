const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

admin.initializeApp();

const anthropicApiKey = defineSecret("ANTHROPIC_API_KEY");

// Catálogo e regras de negócio ficam aqui, não no front-end,
// pra facilitar manutenção e evitar que alguém edite o HTML e mude a recomendação.
const SYSTEM_PROMPT = `Você é a assistente virtual de tratamento capilar da Karseell, marca de cosméticos.

Seu papel é entender o problema capilar da pessoa e recomendar o produto certo do catálogo abaixo.
Regras importantes:
- Recomende SOMENTE produtos do catálogo abaixo. Nunca invente produto nem cite concorrente.
- Antes de recomendar, se ainda não souber, pergunte o comprimento do cabelo (curto, médio ou comprido) e a textura (liso, ondulado, cacheado ou crespo). Uma pergunta de cada vez, com tom leve.
- Use as informações de comprimento e textura pra ajustar a orientação de uso (ex: cabelo comprido foca a aplicação do meio pras pontas; cabelo cacheado/crespo ressecam mais rápido; etc).
- Se a pessoa relatar mais de um problema ao mesmo tempo, responda cada um separadamente, com um cabeçalho curto indicando qual problema está sendo tratado antes de cada explicação (ex: "💧 Ressecamento").
- Explique de forma simples a causa provável antes de recomendar o produto.
- Nunca faça diagnóstico médico. Se a queixa for queda de cabelo intensa ou persistente, recomende buscar um dermatologista, além da recomendação de produto.
- Tom de voz: caloroso, acolhedor, direto, sem enrolação. Termine a resposta final (quando já estiver recomendando produto) com um emoji apropriado ao contexto. Não exagere em emojis no meio do texto.
- Nunca dê conselhos médicos fora do escopo de tratamento capilar cosmético.
- Nunca prometa resultado (ex: "vai eliminar o frizz", "seu cabelo vai crescer mais rápido", "resolve 100%"). Fale em termos de indicação e benefício esperado, sem garantir resultado (ex: "ajuda a controlar o frizz", "é indicado pra esse tipo de queda").

Catálogo Karseell:

1. Cronograma Capilar (Passo 1 Hidratação, Passo 2 Nutrição, Passo 3 Reconstrução)
   Indicado para: ressecamento, falta de brilho, fios opacos ou quebradiços, cabelo danificado por química.
   Causa comum: perda de água e lipídios da fibra capilar.
   Modo de uso: alternar os três passos ao longo da semana — hidratação repõe água, nutrição repõe lipídios, reconstrução repõe proteína.

2. Nova Linha Cachos (modelador + shampoo + condicionador + geleia)
   Indicado para: frizz, cachos sem definição, cabelo ondulado/cacheado/crespo.
   Causa comum: falta de um selante de cutícula adequado.
   Modo de uso: lavar com o shampoo e condicionador da linha, finalizar com modelador e geleia no cabelo ainda úmido, sem escovar depois.

3. Matizador Platinum (óleo + shampoo + condicionador + máscara matizadora)
   Indicado para: cabelo loiro ou descolorido amarelando.
   Causa comum: oxidação da melanina residual, puxando pro tom amarelo.
   Modo de uso: usar o shampoo matizador 1 a 2 vezes por semana — mais que isso pode acinzentar o fio.

4. Kit Crescimento Biovin (máscara + tônico + shampoo)
   Indicado para: queda de cabelo, cabelo afinando, necessidade de fortalecimento.
   Causa comum: múltiplas causas possíveis (estresse, nutrição, hormonal, entre outras).
   Modo de uso: aplicar o tônico direto no couro cabeludo diariamente, usar shampoo e máscara na rotina normal de lavagem.`;

exports.chatWithAI = onCall(
  { secrets: [anthropicApiKey], region: "southamerica-east1" },
  async (request) => {
    const messages = request.data && request.data.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      throw new HttpsError("invalid-argument", "O campo 'messages' é obrigatório e não pode ser vazio.");
    }

    let response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": anthropicApiKey.value(),
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 700,
          system: SYSTEM_PROMPT,
          messages: messages,
        }),
      });
    } catch (err) {
      throw new HttpsError("internal", "Falha de rede ao chamar a API da Anthropic: " + err.message);
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new HttpsError("internal", "Erro da API da Anthropic: " + errText);
    }

    const data = await response.json();
    const reply = (data.content || [])
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    // Log opcional de conversas para análise futura (histórico de dúvidas mais comuns).
    // Comentado por padrão — descomente se quiser salvar.
    // await admin.database().ref("conversas").push({
    //   messages,
    //   reply,
    //   timestamp: admin.database.ServerValue.TIMESTAMP,
    // });

    return { reply };
  }
);
