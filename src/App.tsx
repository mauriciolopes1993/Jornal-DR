import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, logout } from './lib/firebase';
import { handleFirestoreError, OperationType } from './lib/error';
import type { Noticia } from './types';
import LoginScreen from './components/LoginScreen';
import NewsCard from './components/NewsCard';
import NewsDetail from './components/NewsDetail';
import { LogOut, Newspaper, Flame } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';

const NICHOS = ['🔥 Emagrecimento', '🩸 Diabetes', '🧠 Memória', '⚡ Disfunção Erétil'];

const MOCK_DATA = [
  {
    "id": "mock_real_1",
    "data_publicacao": new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    "nicho": "🔥 Emagrecimento",
    "mercado": "US",
    "noticia_titulo": "Hollywood Insiders Leak Natural Peptide Enzyme That Replaces Injectable Shortages",
    "noticia_url": "https://example.com",
    "trends_keywords": ["Natural GLP-1", "Hollywood weight secret"],
    "trends_porcentagem": "+850%",
    "gargalo_resolvido": "Frustração com o preço alto e agulhas dos injetáveis tradicionais.",
    "copy_angulo": "A indústria de injetáveis tentou abafar essa descoberta para proteger suas margens de lucro de bilhões de dólares. O público sênior americano descobriu que esse composto de raiz purificada ativa os mesmos receptores de saciedade antes do café da manhã. Foque na narrativa de 'Segredo de Hollywood vs Big Pharma'.",
    "copy_ganchos": [
      "O que as clínicas de Los Angeles tentaram apagar da internet esta manhã...",
      "O truque natural de 5 segundos que substitui as picadas semanais de R$ 800.",
      "A enzima secreta que faz o corpo produzir o hormônio da saciedade naturalmente."
    ]
  }
];

export default function App() {
  const [user, setUser] = useState<any>(undefined);
  const [noticias, setNoticias] = useState<Noticia[]>(MOCK_DATA as any);
  const [loading, setLoading] = useState(true);
  const [activeNicho, setActiveNicho] = useState(NICHOS[0]);
  const [selectedNoticia, setSelectedNoticia] = useState<Noticia | null>(null);

  useEffect(() => {
    // Bypass de login temporário para preview no AI Studio
    setUser({ uid: 'mock-admin', email: 'admin@jornaldodr.com', displayName: 'Maurício (Admin)' });
    
    // Auth real comentado temporariamente
    // const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    //   setUser(currentUser);
    // });
    // return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setNoticias(MOCK_DATA as any);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'noticias'),
      orderBy('data_publicacao', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const news: Noticia[] = [];
      snapshot.forEach((doc) => {
        news.push({ id: doc.id, ...doc.data() } as Noticia);
      });
      if (news.length === 0) {
        setNoticias(MOCK_DATA as any);
      } else {
        setNoticias(news);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'noticias');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Seed mock data for demonstration
  const handleSeedMockData = async () => {
    try {
      const mockData = {
        nicho: NICHOS[0], // Emagrecimento
        mercado: "EUA 🇺🇸",
        noticia_titulo: "Ozempic shortages hit record high as millions seek weight loss solutions",
        noticia_url: "https://example.com/ozempic-shortage",
        trends_keywords: ["ozempic alternative", "weight loss peptides", "berberine"],
        trends_porcentagem: "+850%",
        copy_angulo: "O ângulo principal deve focar no DESESPERO da falta de estoque das farmácias. Mostre que Hollywood e os bilionários estão esgotando os recursos e oferte a sua solução como o 'Plano de Fuga' natural que não depende de prescrição e nunca faltará.",
        copy_ganchos: [
          "As farmácias estão escondendo isso de você? O real motivo das prateleiras vazias nesta semana...",
          "Bilionários estão esgotando o estoque. Veja o 'truque' de 5 segundos que eles querem que você ignore.",
          "Sem receita e sem filas: A substância alternativa que secou meu abdômen em 21 dias."
        ]
      };
      await addDoc(collection(db, 'noticias'), {
        ...mockData,
        data_publicacao: serverTimestamp()
      });
    } catch (e) {
      console.error(e);
      alert('Erro ao semear dados: Você provavelmente não tem permissão de escrita, o que é esperado e seguro!');
    }
  };

  if (user === undefined) {
    return <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center">
       <span className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></span>
    </div>;
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (selectedNoticia) {
    return <NewsDetail noticia={selectedNoticia} onBack={() => setSelectedNoticia(null)} />;
  }

  const filteredNoticias = noticias.filter(n => n.nicho === activeNicho);

  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-12 font-sans text-slate-900">
      {/* Navbar Minimalista */}
      <nav className="bg-slate-900 border-b border-slate-800 text-slate-300 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center text-white font-bold">DR</div>
            <h1 className="text-xl font-bold text-white tracking-tight italic">JORNAL DO DR</h1>
          </div>
          <button 
            onClick={logout}
            className="text-slate-400 hover:text-white transition-colors flex items-center text-sm font-medium"
          >
            <LogOut className="w-4 h-4 mr-1.5" />
            Sair
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 mt-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard de Tendências</h1>
            <p className="text-sm text-slate-500 mt-1">Sinais sociais e notícias em tempo real.</p>
          </div>
          
          {/* Mock Button for Devs only (would normally be hidden in prod, keeping it for the requested MVP UX test) */}
          <button 
            onClick={handleSeedMockData} 
            className="hidden sm:flex px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-orange-600 rounded shadow-sm hover:bg-orange-700 transition-colors items-center"
            title="Injeta dados fictícios para teste. Falhará intencionalmente se as regras Firestore bloquearem gravação do lado cliente (como exigido)."
          >
            <Flame className="w-3.5 h-3.5 mr-1.5" />
            Sincronizar Agora
          </button>
        </div>

        {/* Tabs de Nicho */}
        <div className="flex overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 mb-8 space-x-2">
          {NICHOS.map((nicho) => (
            <button
              key={nicho}
              onClick={() => setActiveNicho(nicho)}
              className={`whitespace-nowrap flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeNicho === nicho
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-sm">{nicho.split(' ')[0]}</span>
              <span>{nicho.split(' ').slice(1).join(' ')}</span>
            </button>
          ))}
        </div>

        {/* Feed de Notícias (Grid) */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-white rounded-xl border border-slate-200 p-5 h-40">
                <div className="flex justify-between mb-4">
                  <div className="h-5 w-16 bg-slate-200 rounded-md"></div>
                  <div className="h-4 w-12 bg-slate-200 rounded"></div>
                </div>
                <div className="h-5 bg-slate-200 rounded mb-2"></div>
                <div className="h-5 bg-slate-200 rounded w-4/5 mb-6"></div>
                <div className="flex justify-between mt-auto">
                  <div className="h-3 w-20 bg-slate-200 rounded"></div>
                  <div className="h-3 w-24 bg-slate-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredNoticias.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
            <Newspaper className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-base font-medium text-slate-900 mb-1">Nenhum insight disponível</h3>
            <p className="text-sm pb-4">Os bots ainda não detectaram anomalias hiper-relevantes para <strong>{activeNicho}</strong> hoje.</p>
            <p className="text-xs text-slate-400">Verifique novamente no próximo ciclo de sincronização.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNoticias.map((noticia) => (
              <NewsCard 
                key={noticia.id} 
                noticia={noticia} 
                onClick={setSelectedNoticia} 
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
