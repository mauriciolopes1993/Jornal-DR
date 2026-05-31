import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ExternalLink, Flame } from 'lucide-react';
import type { Noticia } from '../types';

interface NewsCardProps {
  noticia: Noticia;
  onClick: (noticia: Noticia) => void;
}

export default function NewsCard({ noticia, onClick }: NewsCardProps) {
  // Timestamp logic using publishedAt with fallback to data_publicacao
  let pubDate: Date | null = null;
  const dateField = noticia.publishedAt || noticia.data_publicacao;
  
  if (dateField) {
    if (typeof dateField.toDate === 'function') {
      pubDate = dateField.toDate();
    } else if (dateField.seconds) {
      pubDate = new Date(dateField.seconds * 1000);
    } else {
      pubDate = new Date(dateField);
    }
  }

  // Location Badge logic
  const getLocationBadge = (mercado: string) => {
    if (mercado === 'US' || mercado.includes('EUA')) return '🇺🇸 EUA';
    if (mercado === 'BR' || mercado.includes('BR')) return '🇧🇷 BR';
    return mercado;
  };

  // Hype Score coloring logic
  const score = noticia.hypeScore || 0;
  let scoreColorClass = 'bg-slate-100 text-slate-500';
  if (score >= 7) {
    scoreColorClass = 'bg-orange-100 text-orange-600 border border-orange-200';
  } else if (score >= 4) {
    scoreColorClass = 'bg-yellow-100 text-yellow-700 border border-yellow-200';
  }

  const verNoticiaUrl = noticia.originalUrl || noticia.noticia_url;

  return (
    <div 
      onClick={() => onClick(noticia)}
      className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden opacity-90 hover:opacity-100 hover:shadow-md transition-all cursor-pointer group h-full"
    >
      {/* Thumbnail */}
      <div className="w-full aspect-video bg-gradient-to-br from-slate-200 to-slate-300 relative overflow-hidden flex-shrink-0">
        {noticia.thumbnailUrl ? (
          <img 
            src={noticia.thumbnailUrl} 
            alt={noticia.title_pt || noticia.noticia_titulo} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-50">
            <span className="text-slate-400 font-medium text-sm">Sem imagem</span>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-grow gap-3">
        <div className="flex justify-between items-start">
          <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded uppercase font-bold tracking-wide">
            {getLocationBadge(noticia.mercado)}
          </span>
          
          <a
            href={verNoticiaUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[10px] font-bold bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-600 px-2 py-1 rounded flex items-center gap-1 transition-colors z-10"
          >
            Ver Notícia <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <h3 className="text-sm font-bold leading-tight text-slate-800 flex-grow group-hover:text-orange-600 transition-colors">
          {noticia.title_pt || noticia.noticia_titulo}
        </h3>

        <div className="flex justify-between items-end mt-2">
          {/* Hype Score Badge */}
          {noticia.hypeScore !== undefined && (
            <div className={`text-[10px] font-black px-2 py-1 rounded flex items-center gap-1 ${scoreColorClass}`}>
              <Flame className="w-3 h-3" />
              SCORE: {score}/10
            </div>
          )}

          <div className="flex flex-col items-end text-[10px] text-slate-400">
            <span className="uppercase font-semibold truncate max-w-[120px]">
              Fonte: {new URL(verNoticiaUrl || 'https://google.com').hostname.replace('www.', '')}
            </span>
            <span className="capitalize text-slate-500 font-medium mt-0.5">
              {pubDate ? formatDistanceToNow(pubDate, { addSuffix: true, locale: ptBR }) : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
