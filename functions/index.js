const { onSchedule } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const Parser = require("rss-parser");
const { GoogleGenAI, Type } = require("@google/genai");

// Inicialização Firebase com Vínculo Explícito
admin.initializeApp({
  projectId: "637642955718"
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
    BR: 'https://news.google.com/rss/search?q=("emagrecer"+OR+"perder+peso"+OR+"ozempic")+AND+("famosa"+OR+"celebridade"+OR+"hollywood"+OR+"segredo"+OR+"proibido"+OR+"vazou"+OR+"escândalo"+OR+"indústria+farmacêutica"+OR+"médicos"+OR+"truque")&hl=pt-BR&gl=BR'
  },
  "Diabetes": {
    US: 'https://news.google.com/rss/search?q=("diabetes"+OR+"blood+sugar")+AND+("reverse"+OR+"natural+cure"+OR+"scandal"+OR+"big+pharma"+OR+"metformin"+OR+"hidden"+OR+"doctors"+OR+"banned"+OR+"leaked")&hl=en-US&gl=US',
    BR: 'https://news.google.com/rss/search?q=("diabetes"+OR+"glicose"+OR+"açúcar+no+sangue")+AND+("reverter"+OR+"cura+natural"+OR+"escândalo"+OR+"indústria+farmacêutica"+OR+"médicos"+OR+"escondido"+OR+"vazou"+OR+"proibido")&hl=pt-BR&gl=BR'
  },
  "Memória": {
    US: 'https://news.google.com/rss/search?q=("memory+loss"+OR+"brain+fog"+OR+"dementia")+AND+("reversal"+OR+"breakthrough"+OR+"hidden+cause"+OR+"root"+OR+"herb"+OR+"secret"+OR+"doctors"+OR+"big+pharma")&hl=en-US&gl=US',
    BR: 'https://news.google.com/rss/search?q=("perda+de+memória"+OR+"névoa+mental"+OR+"esquecimento")+AND+("reverter"+OR+"descoberta"+OR+"causa+oculta"+OR+"erva"+OR+"raiz"+OR+"segredo"+OR+"médicos"+OR+"vazou")&hl=pt-BR&gl=BR'
  },
  "Disfunção Erétil": {
    US: 'https://news.google.com/rss/search?q=("erectile+dysfunction"+OR+"low+testosterone"+OR+"low+t")+AND+("natural+remedy"+OR+"trick"+OR+"blue+pill"+OR+"danger"+OR+"warning"+OR+"secret"+OR+"hormone"+OR+"doctors")&hl=en-US&gl=US',
    BR: 'https://news.google.com/rss/search?q=("disfunção+erétil"+OR+"impotência"+OR+"testosterona+baixa")+AND+("remédio+natural"+OR+"truque"+OR+"pílula+azul"+OR+"perigo"+OR+"alerta"+OR+"segredo"+OR+"médicos"+OR+"vazou")&hl=pt-BR&gl=BR'
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

// ======= 3. AGENTE GEMINI COPYWRITER (onDocumentCreated) =======
// Reage exclusivamente no Projeto Específico quando um novo registro puro é inserido
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
  let baseSystemInstruction = `Você é um Copy Chief Sênior de Direct Response focado em alto CTR, ganchos de curiosidade extrema e narrativas de mecanismo único.
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
