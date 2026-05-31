export interface Noticia {
  id?: string;
  data_publicacao?: any; // Firestore Timestamp
  nicho: string;
  mercado: string;
  noticia_titulo: string;
  noticia_url: string;
  trends_keywords: string[];
  trends_porcentagem: string;
  copy_angulo: string;
  copy_ganchos: string[];
  
  // Novas Extensões de Schema
  title_pt?: string;
  thumbnailUrl?: string;
  originalUrl?: string;
  publishedAt?: any;
  hypeScore?: number;
}
