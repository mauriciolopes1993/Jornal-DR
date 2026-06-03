const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const Parser = require("rss-parser");
const { GoogleGenAI, Type } = require("@google/genai");

// Inicialização Firebase (Atualizado para o projeto solicitado pelo usuário)
admin.initializeApp({
  projectId: "jornal-dr"
});

const db = admin.firestore();
const parser = new Parser();

// Chave Injetada via Variáveis de Ambiente / Hardcode Fallback Conforme Solicitado
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AQ.Ab8RN6LAvYZBO43T6MCAlo6r2jHbDsS63t_zOugRe41ztoJJIg";
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY }); 

// ======= 1. CONFIGURAÇÕES DIÁRIAS DO DR =======
const NICHOS_CONFIG = {
  "Emagrecimento": {
    US: 'https://news.google.com/rss/search?q=("weight+loss"+OR+"fat+burn"+OR+"ozempic"+OR+"mounjaro")+AND+("hollywood"+OR+"celebrity"+OR+"popstar"+OR+"secret"+OR+"banned"+OR+"scandal"+OR+"big+pharma"+OR+"enzyme"+OR+"trick"+OR+"leaked")&hl=en-US&gl=US',
    BR: 'https://news.google.com/rss/search?q=("emagrecer"+OR+"perder+peso"+OR+"ozempic")+AND+("famosa"+OR+"celebridade"+OR+"hollywood"+OR+"segredo"+OR+"proibido"+OR+"vazou"+OR+"escândalo"+OR+"indústria+farmacêutica"+OR+"médicos"+OR+"truque")&hl=pt-BR&gl=BR',
    es_latam: 'https://news.google.com/rss/search?q=(perder+peso+OR+adelgazar+OR+grasa+abdominal+OR+ozempic)+AND+(secreto+OR+revelado+OR+milagro)&hl=es&gl=MX'
  },
  "Diabetes": {
    US: 'https://news.google.com/rss/search?q=("diabetes"+OR+"blood+sugar")+AND+("reverse"+OR+"natural+cure"+OR+"scandal"+OR+"big+pharma"+OR+"metformin"+OR+"hidden"+OR+"doctors"+OR+"banned"+OR+"leaked")&hl=en-US&gl=US',
    BR: 'https://news.google.com/rss/search?q=("diabetes"+OR+"glicose"+OR+"açúcar+no+sangue")+AND+("reverter"+OR+"cura+natural"+OR+"escândalo"+OR+"indústria+farmacêutica"+OR+"médicos"+OR+"escondido"+OR+"vazou"+OR+"proibido")&hl=pt-BR&gl=BR',
    es_latam: 'https://news.google.com/rss/search?q=(diabetes+OR+insulina+OR+glucosa+alta)+AND+(remedio+OR+secreto+OR+cientificos)&hl=es&gl=MX'
  },
  "Memória": {
    US: 'https://news.google.com/rss/search?q=("memory+loss"+OR+"brain+fog"+OR+"dementia")+AND+("reversal"+OR+"breakthrough"+OR+"hidden+cause"+OR+"root"+OR+"herb"+OR+"secret"+OR+"doctors"+OR+"big+pharma")&hl=en-US&gl=US',
    BR: 'https://news.google.com/rss/search?q=("perda+de+memória"+OR+"névoa+mental"+OR+"esquecimento")+AND+("reverter"+OR+"descoberta"+OR+"causa+oculta"+OR+"erva"+OR+"raiz"+OR+"segredo"+OR+"médicos"+OR+"vazou")&hl=pt-BR&gl=BR',
    es_latam: 'https://news.google.com/rss/search?q=(memoria+OR+alzheimer+OR+olvido+OR+cerebro)+AND+(truco+OR+descubrimiento+OR+oculto)&hl=es&gl=MX'
  },
  "Disfunção Erétil": {
    US: 'https://news.google.com/rss/search?q=("erectile+dysfunction"+OR+"low+testosterone"+OR+"low+t")+AND+("natural+remedy"+OR+"trick"+OR+"blue+pill"+OR+"danger"+OR+"warning"+OR+"secret"+OR+"hormone"+OR+"doctors")&hl=en-US&gl=US',
    BR: 'https://news.google.com/rss/search?q=("disfunção+erétil"+OR+"impotência"+OR+"testosterona+baixa")+AND+("remédio+natural"+OR+"truque"+OR+"pílula+azul"+OR+"perigo"+OR+"alerta"+OR+"segredo"+OR+"médicos"+OR+"vazou")&hl=pt-BR&gl=BR',
    es_latam: 'https://news.google.com/rss/search?q=(disfuncion+erectil+OR+testosterona+OR+vigor+masculino)+AND+(secreto+OR+natural+OR+impotencia)&hl=es&gl=MX'
  }
};

const REDDIT_QUERIES = {
  "Emagrecimento": {
    US: 'https://www.reddit.com/search.rss?q=(weight+loss+OR+fat+loss+OR+ozempic+OR+belly+fat)+AND+(secret+OR+exposed+OR+hack+OR+scandal+OR+conspiracy+OR+celebrity)&sort=hot&t=day',
    BR: 'https://www.reddit.com/search.rss?q=(emagrecer+OR+perder+peso+OR+secar+barriga)+AND+(segredo+OR+revelado+OR+fofoca+OR+farsa+OR+truque+OR+escondido)&sort=hot&t=day',
    es_latam: 'https://www.reddit.com/search.rss?q=(perder+peso+OR+adelgazar+OR+ozempic)+AND+(secreto+OR+escandalo+OR+farsa+OR+truco)&sort=hot&t=day'
  },
  "Diabetes": {
    US: 'https://www.reddit.com/search.rss?q=(diabetes+OR+insulin+OR+blood+sugar)+AND+(reverse+OR+cure+OR+hidden+OR+scandal+OR+doctor+OR+secret)&sort=hot&t=day',
    BR: 'https://www.reddit.com/search.rss?q=(diabetes+OR+insulina+OR+glicose+alta)+AND+(reparar+OR+cura+OR+escondido+OR+segredo+OR+medicos+proibiram)&sort=hot&t=day',
    es_latam: 'https://www.reddit.com/search.rss?q=(diabetes+OR+insulina+OR+glucosa)+AND+(secreto+OR+remedio+OR+oculto+OR+cura)&sort=hot&t=day'
  },
  "Memória": {
    US: 'https://www.reddit.com/search.rss?q=(memory+OR+brain+fog+OR+alzheimer+OR+cognitive)+AND+(secret+OR+exposed+OR+hack+OR+scandal+OR+cure+OR+reverse+OR+hidden)&sort=hot&t=day',
    BR: 'https://www.reddit.com/search.rss?q=(memoria+OR+esquecimento+OR+alzheimer+OR+cerebro)+AND+(segredo+OR+revelado+OR+truque+OR+escondido+OR+remedio+OR+cura)&sort=hot&t=day',
    es_latam: 'https://www.reddit.com/search.rss?q=(memoria+OR+alzheimer+OR+cerebro)+AND+(secreto+OR+truco+OR+revelado+OR+escondido)&sort=hot&t=day'
  },
  "Disfunção Erétil": {
    US: 'https://www.reddit.com/search.rss?q=(erectile+dysfunction+OR+testosterone+OR+ed+OR+libido)+AND+(secret+OR+exposed+OR+hack+OR+scandal+OR+cure+OR+hidden)&sort=hot&t=day',
    BR: 'https://www.reddit.com/search.rss?q=(disfuncao+eretil+OR+testosterona+OR+impotencia+OR+libido)+AND+(segredo+OR+revelado+OR+truque+OR+escondido+OR+remedio+natural)&sort=hot&t=day',
    es_latam: 'https://www.reddit.com/search.rss?q=(disfuncion+erectil+OR+testosterona+OR+impotencia)+AND+(secreto+OR+truco+OR+remedio+OR+natural)&sort=hot&t=day'
  }
};

const TWITTER_QUERIES = {
  "Emagrecimento": {
    US: "weight loss OR ozempic OR mounjaro -is:retweet min_faves:50",
    es_latam: "(perder peso OR adelgazar OR ozempic) (secreto OR truco OR revelado) lang:es"
  },
  "Diabetes": {
    US: "diabetes OR blood sugar reverse -is:retweet min_faves:50",
    es_latam: "(diabetes OR insulina OR glucosa) (secreto OR cura OR medicos) lang:es"
  },
  "Memória": {
    US: "memory loss OR dementia cure -is:retweet min_faves:50",
    es_latam: "(memoria OR alzheimer OR niebla mental) (truco OR secreto OR hack) lang:es"
  },
  "Disfunção Erétil": {
    US: "erectile dysfunction OR low testosterone -is:retweet min_faves:50",
    es_latam: "(disfuncion erectil OR testosterona OR libido) (secreto OR remedio OR natural) lang:es"
  }
};

const BLACKLIST_TITULOS = [
  "lula", "trump", "guerra", "eleições", "bolsa de valores", "ações da empresa", 
  "ministério da saúde", "campanha de vacinação", "reforma", "prefeitura", "biden"
];

function passaFiltroBlacklist(titulo) {
  const tituloLower = titulo.toLowerCase();
  return !BLACKLIST_TITULOS.some(termo => tituloLower.includes(termo));
}

// ======= 2. ENGINE DE CAPTURA BRUTA (onSchedule) =======
// Executa pontualmente às 06:00 e 18:00 (Tempo de Brasília)
exports.jornalDoDrEngine = onSchedule({
  schedule: "0 6,18 * * *",
  timeZone: "America/Sao_Paulo"
}, async (event) => {
  console.log("Iniciando varredura automatizada de RSS...");
  
  for (const [nicho, mercados] of Object.entries(NICHOS_CONFIG)) {
    for (const [mercado, urlRss] of Object.entries(mercados)) {
      try {
        const feed = await parser.parseURL(urlRss);
        
        const itensValidos = feed.items
          .filter(item => passaFiltroBlacklist(item.title))
          .slice(0, 5);

        for (const item of itensValidos) {
          // Gerar ID seguro transformando barras e encoding
          const docId = Buffer.from(item.link).toString('base64').replace(/\//g, '_').substring(0, 50);
          const docRef = db.collection("noticias").doc(docId);
          
          const docSnap = await docRef.get();
          if (docSnap.exists) continue; 

          const dataPub = item.pubDate ? admin.firestore.Timestamp.fromDate(new Date(item.pubDate)) : admin.firestore.Timestamp.now();
          const randomHype = `+${Math.floor(Math.random() * (900 - 250 + 1)) + 250}% HYPE`;

          // Tentar extrair URL de imagem
          let thumbnailUrl = "";
          if (item.enclosure && item.enclosure.url) {
            thumbnailUrl = item.enclosure.url;
          } else if (item.content) {
            const imgMatch = item.content.match(/<img[^>]+src="([^">]+)"/);
            if (imgMatch) thumbnailUrl = imgMatch[1];
          }

          await docRef.set({
            id: docId,
            data_publicacao: dataPub,
            publishedAt: dataPub,
            nicho: nicho,
            mercado: mercado,
            noticia_titulo: item.title,
            noticia_url: item.link,
            originalUrl: item.link,
            thumbnailUrl: thumbnailUrl,
            title_pt: "",
            hypeScore: 0,
            trends_keywords: [nicho, mercado === 'US' ? 'trending' : 'tendências'],
            trends_porcentagem: randomHype,
            copy_angulo: "", 
            copy_ganchos: [],
            gargalo: ""
          });
        }
      } catch (err) {
        console.error(`Erro no nicho ${nicho} (${mercado}):`, err.message);
      }
    }
  }
  console.log("Varredura concluída com sucesso.");
});

// ======= 3. FETCH TWITTER TRENDS (onSchedule) =======
// Executa apenas de segunda a sexta, às 10:00, 1 vez ao dia para salvar créditos.
exports.fetchTwitterTrends = onSchedule({
  schedule: "0 10 * * 1-5", 
  timeZone: "America/Sao_Paulo"
}, async (event) => {
  console.log("Iniciando garimpo de Trends do Twitter (X)...");
  
  for (const [nicho, mercados] of Object.entries(TWITTER_QUERIES)) {
    for (const [mercado, queryStr] of Object.entries(mercados)) {
      try {
        const encodedQuery = encodeURIComponent(queryStr);
        
        const response = await fetch(`https://twitter303.p.rapidapi.com/search/timeline?query=${encodedQuery}&search_type=Latest`, {
          method: 'GET',
          headers: {
            'x-rapidapi-host': 'twitter303.p.rapidapi.com',
            'x-rapidapi-key': '3d9953b3d0mshe452878ba263cffp169816jsn8033a9d9b69a'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Erro na API do Twitter: ${response.statusText}`);
        }
        
        const data = await response.json();
        const tweets = data.timeline || data.results || data.data || [];
        const validTweets = tweets.slice(0, 5); // Teto de segurança, pegamos 5 recentes

        for (const t of validTweets) {
          const tweetText = t.text || t.full_text || "";
          if (!tweetText || !passaFiltroBlacklist(tweetText)) continue;
          
          const docId = `twitter_${t.tweet_id || t.id_str || t.id || Buffer.from(tweetText.substring(0,20)).toString('base64')}`;
          const docRef = db.collection("trends_twitter").doc(docId);
          
          const docSnap = await docRef.get();
          if (docSnap.exists) continue;

          let authorName = "Desconhecido";
          if (t.user && t.user.name) authorName = t.user.name;
          else if (t.author && t.author.name) authorName = t.author.name;

          // Mandar pro Gemini antes de salvar!
          console.log(`[Twitter - Gemini] Traduzindo e gerando hooks para: ${tweetText.substring(0, 50)}...`);
          
          const userContent = `Nicho: ${nicho}\nTweet Original (${authorName}): "${tweetText}"\n\nInstruções Obrigatórias:\n1. Você deve traduzir o texto do tweet original diretamente para o Português do Brasil (PT-BR) com foco em fluidez de leitura.\n2. Gerar "angulo_comercial" (Resumo) explicando como utilizar esse fato como gancho em VSL e Tráfego seguindo o padrão de Markdown exigido.\n3. Atribuir um "hypeScore" entre 0 e 10.`;
          
          const baseSystemInstruction = `Você é um Copy Chief Sênior de Direct Response focado em alto CTR, ganchos de curiosidade extrema e narrativas de mecanismo único. Se o texto for em espanhol, destaque os gatilhos psicológicos mais explorados pelo público hispânico.
Para o campo 'angulo_comercial' (Resumo), você DEVE obrigatoriamente gerar um texto longo e rico em formatação Markdown (parágrafos, negritos e tópicos), dividido nas seguintes seções:
## ANÁLISE MACRO
Explique os detalhes ocultos da notícia/tweet, o comportamento do público e por que essa informação é um estopim psicológico agora.
## APLICAÇÃO EM TRAFEGO & VSL
Explique cirurgicamente como o usuário pode transformar essa notícia/tweet em um ângulo de anúncio (Meta Ads/Native) para tracionar tráfego frio e, principalmente, como usar esse fato como elemento de prova, quebra de padrão ou "Mecanismo Único".`;

          const responseSchema = {
            type: Type.OBJECT,
            properties: {
              texto_traduzido: { type: Type.STRING },
              hypeScore: { type: Type.INTEGER },
              gargalo_resolvido: { type: Type.STRING },
              angulo_comercial: { 
                type: Type.STRING,
                description: "Texto longo rico em Markdown, contento obrigatoriamente as seções ## ANÁLISE MACRO e ## APLICAÇÃO EM TRAFEGO & VSL"
              }
            },
            required: ["texto_traduzido", "hypeScore", "gargalo_resolvido", "angulo_comercial"]
          };

          const aiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userContent,
            config: {
              systemInstruction: baseSystemInstruction,
              responseMimeType: "application/json",
              responseSchema: responseSchema,
              temperature: 0.7,
            }
          });

          const aiResult = JSON.parse(aiResponse.text);

          await docRef.set({
            id_tweet: docId,
            nicho: nicho,
            regiao: mercado,
            author: authorName,
            texto_original: tweetText,
            texto_traduzido: aiResult.texto_traduzido || tweetText,
            publishedAt: t.created_at ? admin.firestore.Timestamp.fromDate(new Date(t.created_at)) : admin.firestore.Timestamp.now(),
            data_publicacao: t.created_at ? admin.firestore.Timestamp.fromDate(new Date(t.created_at)) : admin.firestore.Timestamp.now(),
            hypeScore: aiResult.hypeScore || 5,
            copy_angulo: aiResult.angulo_comercial || "",
            gargalo: aiResult.gargalo_resolvido || ""
          });
        }

      } catch (err) {
        console.error(`Erro no niche Twitter ${nicho} (${mercado}):`, err.message);
      }
    }
  }
  console.log("Garimpo de Twitter Trends concluído.");
});

// ======= 3.5 FETCH REDDIT TRENDS (onSchedule) =======
// Executa todos os dias da semana para arbitragem em tempo real
exports.fetchRedditTrends = onSchedule({
  schedule: "0 8,20 * * *", 
  timeZone: "America/Sao_Paulo"
}, async (event) => {
  console.log("Iniciando garimpo de Trends do Reddit...");
  
  for (const [nicho, mercados] of Object.entries(REDDIT_QUERIES)) {
    for (const [mercado, urlRss] of Object.entries(mercados)) {
      try {
        const feed = await parser.parseURL(urlRss);
        
        // Reddit feed returns items sorted by hotness
        const itensValidos = feed.items
          .filter(item => passaFiltroBlacklist(item.title))
          .slice(0, 5);

        for (const item of itensValidos) {
          const rawText = item.contentSnippet || item.content || item.title;
          const originalText = `Título: ${item.title}\n\nConteúdo: ${rawText}`;
          const docId = `reddit_${Buffer.from(item.link).toString('base64').replace(/\//g, '_').substring(0, 50)}`;
          const docRef = db.collection("trends_reddit").doc(docId);
          
          const docSnap = await docRef.get();
          if (docSnap.exists) continue;

          console.log(`[Reddit - Gemini] Traduzindo e gerando hooks para: ${item.title.substring(0, 50)}...`);
          
          const userContent = `Nicho: ${nicho}\nTexto Original do Reddit: "${originalText}"\n\nInstruções Obrigatórias:\n1. Traduzir o texto bruto para Português Brasileiro (PT-BR), focando em fluidez e extraindo a dor visceral/fofoca do post.\n2. Gerar "angulo_comercial" (analise_copy) seguindo as seções obrigatórias.\n3. Atribuir um "hypeScore" entre 0 e 10.`;
          
          const baseSystemInstruction = `Você é um Copy Chief Sênior de Direct Response focado em alto CTR. Se o texto original for em espanhol, destaque os gatilhos psicológicos mais explorados pelo público hispânico.
Para o campo 'angulo_comercial' (analise_copy), você DEVE obrigatoriamente gerar um texto longo e rico em formatação Markdown, dividido exata e rigorosamente nas seguintes seções:
## ANÁLISE MACRO DO HYPE
Explique os detalhes ocultos da fofoca/relato, a dor visceral presente no post original, o comportamento do público e por que essa informação é um estopim psicológico agora.
## APLICAÇÃO EM TRAFEGO & VSL (SUPERESTRUTURA)
Explique cirurgicamente como o usuário pode transformar essa fofoca/relato em um ângulo de anúncio para tracionar tráfego frio e, principalmente, como usar esse fato como elemento de prova, quebra de padrão ou "Mecanismo Único" dentro de uma VSL.`;

          const responseSchema = {
            type: Type.OBJECT,
            properties: {
              texto_traduzido: { type: Type.STRING },
              hypeScore: { type: Type.INTEGER },
              angulo_comercial: { 
                type: Type.STRING,
                description: "Texto com as seções ## ANÁLISE MACRO DO HYPE e ## APLICAÇÃO EM TRAFEGO & VSL (SUPERESTRUTURA)"
              }
            },
            required: ["texto_traduzido", "hypeScore", "angulo_comercial"]
          };

          const aiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: userContent,
            config: {
              systemInstruction: baseSystemInstruction,
              responseMimeType: "application/json",
              responseSchema: responseSchema,
              temperature: 0.7,
            }
          });

          const aiResult = JSON.parse(aiResponse.text);

          await docRef.set({
            id_post: docId,
            nicho: nicho,
            regiao: mercado,
            texto_original: originalText,
            texto_traduzido: aiResult.texto_traduzido || item.title,
            publishedAt: item.pubDate ? admin.firestore.Timestamp.fromDate(new Date(item.pubDate)) : admin.firestore.Timestamp.now(),
            data_publicacao: item.pubDate ? admin.firestore.Timestamp.fromDate(new Date(item.pubDate)) : admin.firestore.Timestamp.now(),
            hypeScore: aiResult.hypeScore || 5,
            analise_copy: aiResult.angulo_comercial || "",
            originalUrl: item.link
          });
        }
      } catch (err) {
        console.error(`Erro no nicho Reddit ${nicho} (${mercado}):`, err.message);
      }
    }
  }
  console.log("Garimpo de Reddit concluído.");
});

// ======= 4. AGENTE GEMINI COPYWRITER (RSS/Firestore Trigger) =======
// Reage exclusivamente no Projeto Específico quando um novo registro puro é inserido em 'noticias'
exports.geminiCopywriterAgent = onDocumentCreated({
  document: "noticias/{docId}"
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const docData = snapshot.data();
  const titulo = docData.noticia_titulo;
  const nicho = docData.nicho;
  const mercado = docData.mercado;

  console.log(`[Gemini Copywriter] Lapidando HYPE para: ${titulo}`);

  // Fetch configs from Firestore
  let baseSystemInstruction = `Você é um Copy Chief Sênior de Direct Response focado em alto CTR, ganchos de curiosidade extrema e narrativas de mecanismo único. Se o texto for em espanhol, destaque os gatilhos psicológicos mais explorados pelo público hispânico.
Para o campo 'angulo_comercial' (Resumo), você DEVE obrigatoriamente gerar um texto longo e rico em formatação Markdown (parágrafos, negritos e tópicos), dividido nas seguintes seções:

## ANÁLISE MACRO
Explique os detalhes ocultos da notícia, o comportamento do público e por que essa informação é um estopim psicológico agora.

## APLICAÇÃO EM TRAFEGO & VSL
Explique cirurgicamente como o usuário pode transformar essa notícia em um ângulo de anúncio (Meta Ads/Native) para tracionar tráfego frio e, principalmente, como usar esse fato como elemento de prova, quebra de padrão ou "Mecanismo Único" dentro de uma VSL (Video Sales Letter) para explodir a conversão.`;

  let finalSystemInstruction = baseSystemInstruction;
  let regrasCompliance = "";
  let exemplosVencedores = "";

  try {
    const configDoc = await db.collection("config_agente").doc("copywriter").get();
    if (configDoc.exists) {
      const configData = configDoc.data();
      if (configData.system_instruction) {
        finalSystemInstruction += `\n\n[DIRETRIZES PERSONALIZADAS DO USUÁRIO - INCORPORE AO SEU TOM DE VOZ E ANÁLISE]:\n${configData.system_instruction}`;
      }
      if (configData.regras_compliance) {
        regrasCompliance = configData.regras_compliance;
      }
      if (configData.exemplos_vencedores) {
        exemplosVencedores = configData.exemplos_vencedores;
      }
    }
  } catch (err) {
    console.error("[Gemini Copywriter] Erro ao buscar configurações, usando defaults:", err);
  }

  let userContent = `Nicho: ${nicho}\nMercado: ${mercado}\nManchete Original: "${titulo}"\n\nInstruções Obrigatórias:\n1. Traduza o título e o lead imediatamente para o Português do Brasil com foco em legibilidade de mercado (title_pt).\n2. Infira uma nota (hypeScore) de 0 a 10 baseada na velocidade do hype da notícia e seu potencial de monetização no tráfego direto.\n3. Defina um angulo_comercial extenso como "Resumo", aplicando Markdown e as seções ordenadas.`;
  
  if (regrasCompliance) {
    userContent += `\n\nRegras de Compliance Adicionais (Evite infrações no Meta Ads):\n${regrasCompliance}`;
  }
  
  if (exemplosVencedores) {
    userContent += `\n\nExemplos Vencedores de Referência:\n${exemplosVencedores}`;
  }

  try {
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        title_pt: { type: Type.STRING },
        hypeScore: { type: Type.INTEGER },
        gargalo_resolvido: { type: Type.STRING },
        angulo_comercial: { 
          type: Type.STRING,
          description: "Texto longo rico em Markdown, contento obrigatoriamente as seções ## ANÁLISE MACRO e ## APLICAÇÃO EM TRAFEGO & VSL"
        },
        ganchos_meta_ads: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
      required: ["title_pt", "hypeScore", "gargalo_resolvido", "angulo_comercial", "ganchos_meta_ads"]
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userContent,
      config: {
        systemInstruction: finalSystemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.7,
      }
    });

    const aiResult = JSON.parse(response.text);

    return snapshot.ref.update({
      title_pt: aiResult.title_pt || "",
      hypeScore: aiResult.hypeScore || 0,
      copy_angulo: aiResult.angulo_comercial || "",
      copy_ganchos: aiResult.ganchos_meta_ads || [],
      gargalo: aiResult.gargalo_resolvido || ""
    });

  } catch (error) {
    console.error("[Gemini Copywriter] Erro de IA de Processamento:", error);
    return null;
  }
});

