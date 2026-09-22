# Diagnóstico Capilar — Modvida

Chat com IA (Claude/Anthropic) que recomenda produtos Modvida a partir do que a pessoa descreve sobre o cabelo dela.

- **Front-end**: `index.html` puro (HTML/JS), hospedado no GitHub Pages
- **Back-end**: Cloud Function do Firebase (`functions/`), que protege a chave da API e conversa com a Anthropic
- **Projeto Firebase separado** do `folha-de-ponto-xpro` usado nos outros apps

---

## 1. Criar o projeto no Firebase

1. Acesse https://console.firebase.google.com e crie um projeto novo (ex: `diagnostico-capilar-modvida`)
2. No projeto, vá em **Configurações do projeto > Uso e faturamento** e mude pro plano **Blaze** (pay-as-you-go) — é pré-requisito pra usar Cloud Functions. O uso aqui é tão baixo que na prática fica dentro da faixa gratuita de invocações.
3. Ainda nas configurações, em **Seus apps**, clique em **Adicionar app > Web** (ícone `</>`), dê um nome, e copie o objeto `firebaseConfig` gerado — vai precisar dele no passo 4.

## 2. Instalar as ferramentas (se ainda não tiver)

```bash
npm install -g firebase-tools
firebase login
```

## 3. Configurar e publicar a Cloud Function

Dentro da pasta deste projeto (onde estão `functions/`, `firebase.json` etc.):

```bash
firebase use --add
# selecione o projeto diagnostico-capilar-modvida criado no passo 1

cd functions
npm install
cd ..

firebase functions:secrets:set ANTHROPIC_API_KEY
# cole a chave da API quando for solicitado (gerada em console.anthropic.com)

firebase deploy --only functions,database
```

Isso publica a function `chatWithAI` e as regras do Realtime Database (que ficam fechadas pra acesso do cliente por padrão — só a própria function acessa via Admin SDK).

## 4. Configurar o front-end

Abra `index.html` e preencha o objeto `firebaseConfig` (perto do início da tag `<script>`) com os valores copiados no passo 1:

```js
var firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

Confira também se a região usada em `firebase.app().functions("southamerica-east1")` bate com a região que você publicou a function (`southamerica-east1` já vem configurado em `functions/index.js`).

## 5. Publicar no GitHub Pages

```bash
# crie um repositório novo no GitHub (ex: diagnostico-capilar-modvida)
git init
git add .
git commit -m "Primeira versão do diagnóstico capilar"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/diagnostico-capilar-modvida.git
git push -u origin main
```

Depois, no repositório do GitHub: **Settings > Pages > Branch: main / (root)** e salvar. Em alguns minutos o site fica disponível em `https://SEU_USUARIO.github.io/diagnostico-capilar-modvida`.

## 6. Testar

Abra o link do GitHub Pages, descreva um problema de cabelo no chat e confira se a IA responde puxando os produtos certos do catálogo (que está descrito dentro de `functions/index.js`, no `SYSTEM_PROMPT`).

---

## Ajustando o catálogo ou o comportamento da IA

Tudo isso mora em `functions/index.js`, na constante `SYSTEM_PROMPT` — é só editar o texto (produtos, regras de tom, o que perguntar antes de recomendar) e rodar `firebase deploy --only functions` de novo. Não precisa mexer no `index.html` pra isso.

## Botões de comprimento e textura do cabelo

Pra evitar que o cliente precise digitar, as duas perguntas de triagem (comprimento: curto/médio/comprido; textura: liso/ondulado/cacheado/crespo) aparecem como botões no app, não como texto livre.

Funciona por um marcador invisível: no `SYSTEM_PROMPT`, a IA é instruída a terminar a pergunta de comprimento com `[BOTOES_COMPRIMENTO]` e a de textura com `[BOTOES_TEXTURA]`. O `index.html` detecta esse marcador na resposta, remove o texto antes de exibir (o cliente nunca vê) e mostra os botões correspondentes. Se precisar mudar as opções de cada grupo, é só editar os arrays `COMPRIMENTO_OPTIONS` e `TEXTURA_OPTIONS` dentro do `<script>` do `index.html`.

## Custo esperado

- Cloud Functions: dentro da faixa gratuita do plano Blaze pro volume esperado
- API da Anthropic (Claude Haiku 4.5): pay-as-you-go por token, sem mensalidade — estimativa detalhada já passada à parte
