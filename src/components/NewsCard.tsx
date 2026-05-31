import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp } from 'lucide-react';
import type { Noticia } from '../types';

interface NewsCardProps {
  noticia: Noticia;
  onClick: (noticia: Noticia) => void;
}

export default function NewsCard({ noticia, onClick }: NewsCardProps) {
  const isAltTrending = noticia.trends_porcentagem.startsWith('+');

  let pubDate: Date | null = null;
  if (noticia.data_publicacao) {
    if (typeof noticia.data_publicacao.toDate === 'function') {
      pubDate = noticia.data_publicacao.toDate();
    } else if (noticia.data_publicacao.seconds) {
      pubDate = new Date(noticia.data_publicacao.seconds * 1000);
    } else {
      pubDate = new Date(noticia.data_publicacao);
    }
  }

  return (
    <div 
      onClick={() => onClick(noticia)}
      className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-3 opacity-90 hover:opacity-100 transition-opacity cursor-pointer group h-full"
    >
      <div className="flex justify-between items-start">
        <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded uppercase font-bold">
          {noticia.mercado}
        </span>
        
        {noticia.trends_porcentagem && (
          <span className={`text-xs font-bold ${isAltTrending ? 'text-green-600' : 'text-orange-600'}`}>
            <span>{noticia.trends_porcentagem}</span>
          </span>
        )}
      </div>

      <h3 className="text-sm font-bold leading-tight text-slate-800 flex-grow group-hover:text-orange-600 transition-colors">
        {noticia.noticia_titulo}
      </h3>

      <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2">
        <span className="uppercase font-semibold truncate max-w-[120px]">
          Fonte: {new URL(noticia.noticia_url || 'https://google.com').hostname.replace('www.', '')}
        </span>
        <span className="capitalize">
          {pubDate ? formatDistanceToNow(pubDate, { addSuffix: true, locale: ptBR }) : ''}
        </span>
      </div>
    </div>
  );
}
