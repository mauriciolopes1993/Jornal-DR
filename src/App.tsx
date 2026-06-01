import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, limit, addDoc, serverTimestamp, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth, logout } from './lib/firebase';
import { handleFirestoreError, OperationType } from './lib/error';
import type { Noticia } from './types';
import LoginScreen from './components/LoginScreen';
import NewsCard from './components/NewsCard';
import NewsDetail from './components/NewsDetail';
import { LogOut, Newspaper, Flame, Heart, Filter, X, User, Edit2, CreditCard, Info, Phone, TrendingUp, Shield, Menu, Activity, Zap, PanelLeft, PanelLeftClose, MessageSquare } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';

const NICHOS = ['🔥 Emagrecimento', '🩸 Diabetes', '🧠 Memória', '⚡ Disfunção Erétil'];

const MOCK_DATA = [
  {
    "id": "mock_real_1",
    "data_publicacao": new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    "nicho": "🔥 Emagrecimento",
    "mercado": "US",
    "noticia_titulo": "Hollywood Insiders Leak Natural Peptide Enzyme That Replaces Injectable Shortages",
    "title_pt": "Vazam Enzima Peptídica Natural de Hollywood Que Substitui Escassez de Injetáveis",
    "thumbnailUrl": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=1000",
    "originalUrl": "https://example.com",
    "noticia_url": "https://example.com",
    "publishedAt": new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    "hypeScore": 9,
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
  const [currentView, setCurrentView] = useState<'home' | 'profile'>('home');
  const [feedType, setFeedType] = useState<'google' | 'twitter' | 'reddit'>('google');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(undefined);
  const [noticias, setNoticias] = useState<Noticia[]>(MOCK_DATA as any);
  const [loading, setLoading] = useState(true);
  const [activeNicho, setActiveNicho] = useState(NICHOS[0]);
  const [selectedNoticia, setSelectedNoticia] = useState<Noticia | null>(null);

  const [filterMarket, setFilterMarket] = useState<'ALL' | 'US' | 'BR' | 'es_latam'>('ALL');
  const [filterPeriod, setFilterPeriod] = useState<'TODOS' | 'HOJE' | '7D' | '30D' | '90D' | 'CUSTOM'>('HOJE');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sortByScore, setSortByScore] = useState(false);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

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
    const collectionName = feedType === 'twitter' ? 'trends_twitter' : feedType === 'reddit' ? 'trends_reddit' : 'noticias';
    const q = query(
      collection(db, collectionName),
      orderBy('data_publicacao', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const news: Noticia[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (feedType === 'twitter') {
          // Adapt twitter data format to Noticia type structure for the card
          news.push({ 
            id: doc.id,
             ...data,
             noticia_titulo: data.texto_traduzido || data.texto_original,
             originalUrl: `https://twitter.com/i/web/status/${data.id_tweet?.replace('twitter_', '')}`,
             noticia_url: `https://twitter.com/i/web/status/${data.id_tweet?.replace('twitter_', '')}`,
             title_pt: data.texto_traduzido,
             author: data.author
          } as any);
        } else if (feedType === 'reddit') {
          // Adapt reddit data format to Noticia type
          const link = doc.id.replace('reddit_', '');
          const originalLink = Buffer.from(link, 'base64').toString('ascii'); // Not exactly accurate if it had slashes replaced, but close enough. The real URL isn't natively available unless we saved it. Wait, link isn't directly usable here if we replaced '/'. But we can use google search link. Wait, we should save originalUrl in the backend!
          news.push({
            id: doc.id,
            ...data,
            noticia_titulo: data.texto_traduzido || data.texto_original,
            originalUrl: data.originalUrl || "",
            noticia_url: data.noticia_url || "",
            copy_angulo: data.analise_copy || "",
            title_pt: data.texto_traduzido,
            mercado: data.regiao
          } as any);
        } else {
          news.push({ id: doc.id, ...data } as Noticia);
        }
      });
      if (news.length === 0) {
        setNoticias(feedType === 'google' ? MOCK_DATA as any : []);
      } else {
        setNoticias(news);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, collectionName);
      setLoading(false);
    });

    const favQuery = query(collection(db, `usuarios/${user.uid}/favoritos`));
    const unsubFavs = onSnapshot(favQuery, (snapshot) => {
      const favMap: Record<string, boolean> = {};
      snapshot.forEach(doc => {
        favMap[doc.id] = true;
      });
      setFavorites(favMap);
    }, (error) => {
        console.error("Erro ao puxar favoritos", error);
    });

    return () => {
      unsubscribe();
      unsubFavs();
    };
  }, [user, feedType]);

  const toggleFavorite = async (noticiaId: string | undefined, isFavorited: boolean) => {
    if (!user || !noticiaId) return;
    try {
      const favRef = doc(db, `usuarios/${user.uid}/favoritos/${noticiaId}`);
      if (isFavorited) {
        await deleteDoc(favRef);
      } else {
        await setDoc(favRef, { savedAt: serverTimestamp() });
      }
    } catch (e) {
      console.error("Erro ao alterar favorito", e);
    }
  };

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

  const filteredNoticias = React.useMemo(() => {
    return noticias.filter(n => {
      if (n.nicho !== activeNicho) return false;
      
      // Filter by market
      if (filterMarket === 'US' && !(n.mercado === 'US' || (n.mercado && n.mercado.includes('EUA')))) return false;
      if (filterMarket === 'BR' && !(n.mercado === 'BR' || (n.mercado && n.mercado.includes('BR')))) return false;
      if (filterMarket === 'es_latam' && n.mercado !== 'es_latam') return false;

      // Filter by favorites
      if (showOnlyFavorites && !favorites[n.id || '']) return false;

      // Filter by period
      if (filterPeriod !== 'TODOS') {
        const dateField = n.publishedAt || n.data_publicacao || 0;
        const time = typeof dateField?.toMillis === 'function' ? dateField.toMillis() : (dateField?.seconds ? dateField.seconds * 1000 : new Date(dateField).getTime());
        const now = Date.now();
        const diffDays = (now - time) / (1000 * 60 * 60 * 24);

        if (filterPeriod === 'HOJE' && diffDays > 1) return false;
        if (filterPeriod === '7D' && diffDays > 7) return false;
        if (filterPeriod === '30D' && diffDays > 30) return false;
        if (filterPeriod === '90D' && diffDays > 90) return false;
        
        if (filterPeriod === 'CUSTOM' && customStartDate && customEndDate) {
          const start = new Date(customStartDate + "T00:00:00").getTime();
          const end = new Date(customEndDate + "T23:59:59").getTime();
          if (time < start || time > end) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortByScore) {
        const scoreA = a.hypeScore || 0;
        const scoreB = b.hypeScore || 0;
        if (scoreA !== scoreB) {
          return scoreB - scoreA; // Descending score
        }
      }
      
      // Default sorting: Chronological descending by publishedAt (fallback to data_publicacao)
      const dateA = a.publishedAt || a.data_publicacao || 0;
      const dateB = b.publishedAt || b.data_publicacao || 0;
      
      const timeA = typeof dateA?.toMillis === 'function' ? dateA.toMillis() : (dateA?.seconds ? dateA.seconds * 1000 : new Date(dateA).getTime());
      const timeB = typeof dateB?.toMillis === 'function' ? dateB.toMillis() : (dateB?.seconds ? dateB.seconds * 1000 : new Date(dateB).getTime());
      
      return timeB - timeA;
    });
  }, [noticias, activeNicho, filterMarket, filterPeriod, customStartDate, customEndDate, sortByScore, showOnlyFavorites, favorites]);

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

  const clearFilters = () => {
    setFilterMarket('ALL');
    setFilterPeriod('HOJE');
    setCustomStartDate('');
    setCustomEndDate('');
    setSortByScore(false);
    setShowOnlyFavorites(false);
  };

  const renderProfileView = () => (
    <>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500">
            <User className="w-5 h-5" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Minha Conta</h1>
        </div>
        <p className="text-slate-500 text-sm pl-[52px]">Gerencie suas informações pessoais e assinatura</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna da Esquerda */}
        <div className="space-y-6">
          {/* Card Informações Pessoais */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Informações Pessoais</h2>
                <p className="text-sm text-slate-500">Seus dados de cadastro</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Nome Completo</p>
                <p className="font-semibold text-slate-900">Maurício Lopes</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Email</p>
                <p className="font-semibold text-slate-900">mauriciolopes130693@gmail.com</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Telefone</p>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900">+5534996337785</p>
                  <Edit2 className="w-3.5 h-3.5 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors" />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Data de Cadastro</p>
                <p className="font-semibold text-slate-900">24/09/2025</p>
              </div>
            </div>
          </div>

          {/* Card Suporte */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
             <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-orange-500" />
              <h2 className="text-xl font-bold text-slate-900">Suporte</h2>
            </div>
            <p className="text-sm text-slate-500 mb-6">Precisa de ajuda? Entre em contato conosco</p>
            
            <a 
              href="https://wa.me/5534996337785" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-lg transition-colors border border-emerald-700"
            >
              <Phone className="w-4 h-4" />
              Chamar Suporte no WhatsApp
            </a>
            <p className="text-xs text-center text-slate-400 mt-3">Clique para abrir o WhatsApp e falar com nosso suporte</p>
          </div>
        </div>

        {/* Coluna da Direita */}
        <div>
          {/* Card Status da Assinatura */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Status da Assinatura</h2>
                <p className="text-sm text-slate-500">Informações sobre sua assinatura</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                  <X className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Status</p>
                  <p className="text-[11px] text-slate-500">Estado atual da assinatura</p>
                </div>
              </div>
              <span className="bg-slate-100 text-slate-800 text-xs font-semibold px-3 py-1 rounded-full border border-slate-200">
                Free
              </span>
            </div>

            <div className="grid grid-cols-2 gap-6 border-b border-slate-100 pb-6 mb-6">
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Plano Atual</p>
                <p className="font-semibold text-slate-900 text-lg">Plano Free</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Valor</p>
                <p className="font-semibold text-slate-900 text-lg">R$ 0,00 / mês</p>
              </div>
            </div>

            <div className="bg-blue-50/50 border border-blue-100/50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-1.5 text-blue-700">
                <Info className="w-4 h-4" />
                <p className="font-semibold text-sm">Assinatura Free</p>
              </div>
              <p className="text-sm text-blue-600/80 leading-relaxed font-medium">
                Você está utilizando o plano gratuito. Para desbloquear todas as funcionalidades e ofertas, considere fazer upgrade para um plano premium.
              </p>
            </div>

            <div className="mt-auto pt-2">
              <button className="w-full flex items-center justify-center gap-2 bg-[#ff5f00] hover:bg-orange-600 text-white font-medium py-3.5 px-4 rounded-lg transition-colors shadow-sm">
                <TrendingUp className="w-5 h-5" />
                Fazer Upgrade para o Premium
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-12 font-sans text-slate-900">
      {/* Navbar Minimalista */}
      <nav className="bg-slate-900 border-b border-slate-800 text-slate-300 sticky top-0 z-10 w-full relative">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center cursor-pointer" onClick={() => setCurrentView('home')}>
            <img 
              src="https://i.ibb.co/YFscctCY/Radar-do-Roi-1.webp" 
              alt="Radar do ROI" 
              className="h-12 w-auto object-contain" 
            />
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden sm:flex items-center space-x-6">
            {currentView === 'profile' && (
              <>
                <button 
                  onClick={() => setCurrentView('home')} 
                  className="text-sm font-medium transition-colors text-slate-400 hover:text-white"
                >
                  Home
                </button>
                <a 
                  href="https://wa.me/5534996337785" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Ajuda
                </a>
              </>
            )}
            <button 
              onClick={() => {
                if (window.confirm('Tem certeza que deseja sair?')) {
                  logout();
                }
              }}
              className="text-slate-400 hover:text-white transition-colors flex items-center text-sm font-medium"
            >
              <LogOut className="w-4 h-4 mr-1.5" />
              Sair
            </button>
            <button
              onClick={() => setCurrentView('profile')}
              className="w-10 h-10 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 font-bold hover:bg-slate-300 transition-colors"
            >
              ML
            </button>
          </div>

          {/* Mobile Nav Toggle */}
          <div className="flex sm:hidden items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-slate-300 hover:text-white transition-colors p-2 -mr-2"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {isMobileMenuOpen && (
          <div className="sm:hidden bg-slate-800 border-t border-slate-700 px-4 py-4 space-y-4 shadow-xl absolute w-full left-0 top-16 z-20">
            <button 
              onClick={() => { setCurrentView('home'); setSelectedNoticia(null); setIsMobileMenuOpen(false); }}
              className={`block w-full text-left text-sm font-medium transition-colors ${currentView === 'home' && !selectedNoticia ? 'text-white' : 'text-slate-400 active:text-white'}`}
            >
              Home
            </button>
            <button 
              onClick={() => { setFeedType('google'); setCurrentView('home'); setSelectedNoticia(null); setIsMobileMenuOpen(false); }}
              className={`block w-full text-left text-sm font-medium transition-colors gap-2 flex items-center ${feedType === 'google' && currentView === 'home' && !selectedNoticia ? 'text-orange-400' : 'text-slate-400 active:text-white'}`}
            >
              Radar de Notícias
            </button>
            <button 
              onClick={() => { setFeedType('twitter'); setCurrentView('home'); setSelectedNoticia(null); setIsMobileMenuOpen(false); }}
              className={`block w-full text-left text-sm font-medium transition-colors gap-2 flex items-center ${feedType === 'twitter' && currentView === 'home' && !selectedNoticia ? 'text-orange-400' : 'text-slate-400 active:text-white'}`}
            >
              Fervura no X (Twitter)
            </button>
            <button 
              onClick={() => { setFeedType('reddit'); setCurrentView('home'); setSelectedNoticia(null); setIsMobileMenuOpen(false); }}
              className={`block w-full text-left text-sm font-medium transition-colors gap-2 flex items-center ${feedType === 'reddit' && currentView === 'home' && !selectedNoticia ? 'text-orange-400' : 'text-slate-400 active:text-white'}`}
            >
              Bastidores do Reddit
            </button>
            <button 
              onClick={() => { setCurrentView('profile'); setIsMobileMenuOpen(false); }}
              className={`block w-full text-left text-sm font-medium transition-colors ${currentView === 'profile' ? 'text-white' : 'text-slate-400 active:text-white'}`}
            >
              Minha Conta
            </button>
            <a 
              href="https://wa.me/5534996337785" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block w-full text-left text-sm font-medium text-slate-400 active:text-white transition-colors"
            >
              Ajuda
            </a>
            <div className="h-px bg-slate-700 my-2 w-full"></div>
            <button 
              onClick={() => {
                if (window.confirm('Tem certeza que deseja sair?')) {
                  logout();
                }
              }}
              className="block w-full text-left text-slate-400 active:text-red-400 transition-colors flex items-center text-sm font-medium"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </button>
          </div>
        )}
      </nav>

      <div className="flex z-0 relative">
        {/* Sidebar */}
        <aside className={`bg-white border-r border-slate-200 min-h-screen transition-all duration-300 flex flex-col pt-6 ${isSidebarOpen ? 'w-64 px-4' : 'w-16 px-2'} hidden sm:flex`}>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="self-end mb-6 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-100"
          >
            <PanelLeft className="w-6 h-6 text-slate-500" />
          </button>
          
          <div className="space-y-2">
            <button
              onClick={() => { setFeedType('google'); setCurrentView('home'); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium text-sm ${feedType === 'google' ? 'bg-orange-50 text-orange-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              title="Radar de Notícias"
            >
              <Activity className="w-5 h-5 flex-shrink-0" />
              {isSidebarOpen && <span>Radar de Notícias</span>}
            </button>
            <button
              onClick={() => { setFeedType('twitter'); setCurrentView('home'); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium text-sm ${feedType === 'twitter' ? 'bg-orange-50 text-orange-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              title="Fervura no X (Twitter)"
            >
              <Zap className="w-5 h-5 flex-shrink-0 text-amber-500" />
              {isSidebarOpen && <span>Fervura no X (Twitter)</span>}
            </button>
            <button
              onClick={() => { setFeedType('reddit'); setCurrentView('home'); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium text-sm ${feedType === 'reddit' ? 'bg-orange-50 text-orange-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
              title="Bastidores do Reddit"
            >
              <MessageSquare className="w-5 h-5 flex-shrink-0 text-rose-500" />
              {isSidebarOpen && <span>Bastidores do Reddit</span>}
            </button>
          </div>
        </aside>

        {/* Dynamic Mobile Toolbar if needed, but per request keeping sidebar desktop mostly, or hidden... */}
        
        <div className="flex-1 w-full min-w-0 pb-12">
          <main className="max-w-5xl mx-auto px-4 mt-8">
            {currentView === 'profile' ? renderProfileView() : (
              <>
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                      O Feed Secreto do Tráfego Direto
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                      {feedType === 'reddit' 
                        ? 'Monitore os escândalos e fofocas virais no Reddit em tempo real.'
                        : feedType === 'twitter' 
                          ? 'Monitore os Post que estão viralizando no X (Twitter) em tempo real.' 
                          : 'Monitore as tendências, novidades e notícias dos EUA e Brasil em tempo real.'}
                    </p>
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
        <div className="flex overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 mb-6 space-x-2">
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
        
        {/* Barra de Filtros Avançados */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <select 
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value as any)}
            className="bg-white border border-slate-200 text-slate-600 text-sm rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-slate-200 transition-shadow appearance-none pr-8 relative cursor-pointer min-w-[140px]"
            style={{ 
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, 
              backgroundPosition: `right 0.5rem center`, 
              backgroundRepeat: `no-repeat`, 
              backgroundSize: `1.2em 1.2em`
            }}
          >
            <option value="TODOS">Período: Todos</option>
            <option value="HOJE">Hoje</option>
            <option value="7D">Últimos 7 dias</option>
            <option value="30D">Últimos 30 dias</option>
            <option value="90D">Últimos 90 dias</option>
            <option value="CUSTOM">Personalizado</option>
          </select>
          
          <select 
            value={filterMarket}
            onChange={(e) => setFilterMarket(e.target.value as any)}
            className="bg-white border border-slate-200 text-slate-600 text-sm rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-slate-200 transition-shadow appearance-none pr-8 cursor-pointer min-w-[130px]"
            style={{ 
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, 
              backgroundPosition: `right 0.5rem center`, 
              backgroundRepeat: `no-repeat`, 
              backgroundSize: `1.2em 1.2em`
            }}
          >
            <option value="ALL">País: Todos</option>
            <option value="US">🇺🇸 Estados Unidos</option>
            <option value="BR">🇧🇷 Brasil</option>
            <option value="es_latam">🇪🇸 Latam</option>
          </select>

          <button
             onClick={() => setSortByScore(!sortByScore)}
             className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors flex items-center gap-1.5
               ${sortByScore ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'}
             `}
          >
            <Flame className="w-4 h-4" /> Maior Score
          </button>

          <button
             onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
             className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors flex items-center gap-1.5
               ${showOnlyFavorites ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-slate-600 border-slate-200 hover:border-red-300'}
             `}
          >
             Meus Favoritos <Heart className="w-4 h-4" fill={showOnlyFavorites ? "currentColor" : "none"} color={showOnlyFavorites ? "currentColor" : "#ef4444"} />
          </button>
          
          {filterPeriod === 'CUSTOM' && (
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-2 py-1.5 ml-2">
              <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="text-sm outline-none text-slate-600 bg-transparent" />
              <span className="text-slate-400 text-sm">até</span>
              <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="text-sm outline-none text-slate-600 bg-transparent" />
            </div>
          )}

          {(filterMarket !== 'ALL' || sortByScore || showOnlyFavorites || filterPeriod !== 'HOJE' || customStartDate || customEndDate) && (
            <button onClick={clearFilters} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-1 text-sm font-medium ml-auto" title="Limpar Filtros">
              <X className="w-4 h-4" /> Limpar Filtros
            </button>
          )}
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
          <div className="flex flex-col items-center justify-center text-center py-12">
            <Newspaper className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800">O mercado está silencioso para {activeNicho} hoje!</h3>
            <p className="text-base text-slate-500 max-w-lg mt-2 leading-relaxed">Não encontramos novos picos de atenção em massa nas fontes globais hoje. Fique tranquilo: nossa central de inteligência continua ativa e, assim que um novo hype estourar, ele aparecerá direto no topo do seu feed.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNoticias.map((noticia) => (
              <NewsCard 
                key={noticia.id} 
                noticia={noticia} 
                onClick={setSelectedNoticia} 
                isFavorited={!!favorites[noticia.id || '']}
                feedType={feedType}
                onToggleFavorite={(e) => {
                  e.stopPropagation();
                  toggleFavorite(noticia.id, !!favorites[noticia.id || '']);
                }}
              />
            ))}
          </div>
        )}
        </>
        )}
      </main>
      </div>
      </div>
    </div>
  );
}
