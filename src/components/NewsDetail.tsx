import React, { useState } from 'react';
import { ArrowLeft, ExternalLink, Copy, Check } from 'lucide-react';
import type { Noticia } from '../types';

interface NewsDetailProps {
  noticia: Noticia;
  onBack: () => void;
}

export default function NewsDetail({ noticia, onBack }: NewsDetailProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="bg-[#f1f5f9] min-h-screen pb-12 font-sans text-slate-900">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10 text-slate-300">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center">
          <button 
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-slate-800 rounded-full transition-colors flex items-center text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="ml-2 font-medium text-white truncate">Voltar para {noticia.nicho}</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-6">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden">
          
          {/* Bloco 1: O Fato e a Fonte (Origem) */}
          <div className="p-6 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase font-bold">
                {noticia.mercado}
              </span>
              <span className="text-[10px] uppercase font-bold text-slate-400">O Fato</span>
            </div>
            
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-4 leading-tight">
              {noticia.noticia_titulo}
            </h1>

            {noticia.trends_keywords && noticia.trends_keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {noticia.trends_keywords.map((kw, i) => (
                  <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-500 tracking-wider uppercase">
                    #{kw}
                  </span>
                ))}
              </div>
            )}

            <a 
              href={noticia.noticia_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 underline"
            >
              <ExternalLink className="w-4 h-4" />
              VALIDAR FONTE DA NOTÍCIA
            </a>
          </div>

          <div className="p-6 space-y-8">
            {/* Bloco 2: A Direção de Cópia (Inteligência) */}
            <section>
              <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest block mb-3">
                <span className="mr-1">🧠</span> Direção de Cópia (DeepSeek Analysis)
              </label>
              {noticia.copy_angulo ? (
                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
                  <p className="text-sm leading-relaxed text-slate-800 font-medium whitespace-pre-wrap">
                    {noticia.copy_angulo}
                  </p>
                </div>
              ) : (
                <div className="bg-orange-50/50 border-l-4 border-orange-300 p-6 rounded-r-lg flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  <span className="text-orange-500 text-2xl animate-bounce">⚡</span>
                  <p className="text-sm leading-relaxed text-slate-600 font-medium animate-pulse text-center sm:text-left">
                    Inteligência de DR em processamento... Nosso Copywriter está lapidando o ângulo comercial e os ganchos para este Hype.
                  </p>
                </div>
              )}
            </section>

            {/* Bloco 3: Scripts Prontos (Ação) */}
            <section>
              <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-4">
                <span className="mr-1">🔥</span> Ganchos VSL/Anúncio (Pronto para Uso)
              </label>
              <div className="space-y-3">
                {noticia.copy_ganchos && noticia.copy_ganchos.length > 0 ? (
                  noticia.copy_ganchos.map((gancho, i) => (
                    <div key={i} className="group bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                      <div className="pr-4">
                        <p className="text-xs text-slate-500 font-bold mb-1 uppercase tracking-tighter">Hook #{i + 1}</p>
                        <p className="text-sm font-semibold text-slate-900">
                          "{gancho}"
                        </p>
                      </div>
                      <button
                        onClick={() => handleCopy(gancho, i)}
                        className="flex-shrink-0 p-2 text-slate-400 hover:text-blue-600 transition-colors bg-white rounded-lg shadow-sm border border-slate-100"
                        title="Copiar para a Área de Transferência"
                      >
                        {copiedIndex === i ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  ))
                ) : (
                  [1, 2, 3].map((i) => (
                    <div key={i} className="group bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between animate-pulse">
                      <div className="pr-4 w-full">
                        <div className="h-3 w-20 bg-slate-200 rounded mb-3"></div>
                        <div className="h-4 w-full bg-slate-200 rounded mb-2"></div>
                        <div className="h-4 w-3/4 bg-slate-200 rounded"></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
