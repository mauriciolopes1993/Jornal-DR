const admin = require("firebase-admin");
const Parser = require("rss-parser");
const { GoogleGenAI, Type } = require("@google/genai");

// Inicialização segura do Firebase na Netlify usando a variável de ambiente
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const parser = new Parser();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AQ.Ab8RN6LAvYZBO43T6MCAlo6r2jHbDsS63t_zOugRe41ztoJJIg";
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY }); 

const NICHOS_CONFIG = {
  "Emagrecimento": {
    US: 'https://news.google.com/rss/search?q=("weight+loss"+OR+"fat+burn"+OR+"ozempic"+OR+"mounjaro")+AND+("hollywood"+OR+"celebrity"+OR+"popstar"+OR+"secret"+OR+"banned"+OR+"scandal"+OR+"big+pharma"+OR+"enzyme"+OR+"trick"+OR+"leaked")&hl=en-US&gl=US',
    BR: 'https://news.google.com/rss/search?q=("emagrecer"+OR+"perder+peso"+OR+"ozempic")+AND+("famosa"+OR+"celebridade"+OR+"hollywood"+OR+"segredo"+OR+"proibido"+OR+"vazou"+OR+"escândalo"+OR+"indústria+farmacêutica"+OR+"médicos"+OR+"truque")&hl=pt-BR&gl=BR'
  },
  "Diabetes": {
    US: 'https://news.google.com/rss/search?q=("diabetes"+OR+"blood+sugar")+AND+("reverse"+OR+"natural+cure"+OR+"scandal"+OR+"big+pharma"+OR+"metformin"+OR+"hidden"+OR+"doctors"+OR+"banned"+OR+"leaked")&hl=en-US&gl=US',
    BR: 'https://news.google.com/rss/search?q=("diabetes"+OR+"glicose"+OR+"açúcar+no+sangue")+AND+("reverter"+OR+"cura+natural"+OR+"escândalo"+OR+"indústria+farmacêutica"+OR+"médicos"+OR+"escondido"+OR+"vazou"+OR+"proibido")&hl=pt-BR&gl=BR'
  }
};

const BLACKLIST_TITULOS = ["lula", "trump", "guerra", "eleições", "bolsa de valores", "biden"];
function passaFiltroBlacklist(titulo) {
  const tLower = titulo.toLowerCase();
  return !BLACKLIST_TITULOS.some(termo => tLower.includes(termo));
}

// Handler de Segundo Plano da Netlify
exports.handler = async (event, context) => {
  console.log("🔥 Motor DR iniciado em segundo plano na Netlify...");
  
  for (const [nicho, mercados] of Object.entries(NICHOS_CONFIG)) {
    for (const [mercado, urlRss] of Object.entries(mercados)) {
      try {
        const feed = await parser.parseURL(urlRss);
        const itensValidos = feed.items.filter(item => passaFiltroBlacklist(item.title)).slice(0, 3);

        for (const item of itensValidos) {
          const docId = Buffer.from(item.link).toString('base64').replace(/\//g, '_').substring(0, 50);
          const docRef = db.collection("noticias").doc(docId);
          const docSnap = await docRef.get();
          
          if (docSnap.exists) continue; 

          console.log(`🤖 IA processando headline de alto impacto: ${item.title}`);

          const baseSystemInstruction = `Você é um Copy Chief Sênior de Direct Response focado em alto CTR, ganchos de curiosidade extrema e narrativas de mecanismo único.
Gere um texto longo rico em Markdown dividido rigidamente nas seções:
## ANÁLISE MACRO
Explique os detalhes ocultos da notícia, o comportamento do público e por que essa informação é um estopim psicológico agora.
## APLICAÇÃO EM TRAFEGO & VSL
Explique cirurgicamente como o usuário pode transformar essa notícia em um ângulo de anúncio (Meta Ads/Native) para tracionar tráfego frio e, principalmente, como usar esse fato como elemento de prova, quebra de padrão ou "Mecanismo Único" dentro de uma VSL (Video Sales Letter).`;

          const responseSchema = {
            type: Type.OBJECT,
            properties: {
              title_pt: { type: Type.STRING },
              hypeScore: { type: Type.INTEGER },
              gargalo_resolvido: { type: Type.STRING },
              angulo_comercial: { type: Type.STRING },
              ganchos_meta_ads: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["title_pt", "hypeScore", "gargalo_resolvido", "angulo_comercial", "ganchos_meta_ads"]
          };

          let aiResult = { title_pt: item.title, hypeScore: 5, angulo_comercial: "Erro ao processar reflexão da IA.", ganchos_meta_ads: [], gargalo_resolvido: "" };
          
          try {
            const aiResponse = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: `Nicho: ${nicho}\nMercado: ${mercado}\nManchete Original: "${item.title}"`,
              config: {
                systemInstruction: baseSystemInstruction,
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.7,
              }
            });
            aiResult = JSON.parse(aiResponse.text);
          } catch (aiErr) {
            console.error("Falha temporária no Gemini:", aiErr.message);
          }

          const dataPub = item.pubDate ? admin.firestore.Timestamp.fromDate(new Date(item.pubDate)) : admin.firestore.Timestamp.now();
          
          await docRef.set({
            id: docId,
            data_publicacao: dataPub,
            publishedAt: dataPub,
            nicho: nicho,
            mercado: mercado,
            noticia_titulo: item.title,
            noticia_url: item.link,
            originalUrl: item.link,
            title_pt: aiResult.title_pt,
            hypeScore: aiResult.hypeScore,
            trends_keywords: [nicho, mercado === 'US' ? 'trending' : 'tendências'],
            trends_porcentagem: `+${Math.floor(Math.random() * 650) + 250}% HYPE`,
            copy_angulo: aiResult.angulo_comercial, 
            copy_ganchos: aiResult.ganchos_meta_ads,
            gargalo: aiResult.gargalo_resolvido
          });
        }
      } catch (err) {
        console.error(`Erro no bloco ${nicho}:`, err.message);
      }
    }
  }
  console.log("✅ Varredura e criação de copys finalizada com sucesso!");
};
