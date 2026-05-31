export interface Noticia {
  id?: string;
  data_publicacao?: any; // Firestore Timestamp
  nicho: string;
  mercado: string; // Ex: "EUA \ud83c\uddfa\ud83c\uddf8" or "BR \ud83c\udde7\ud83c\uddf7"
  noticia_titulo: string;
  noticia_url: string;
  trends_keywords: string[];
  trends_porcentagem: string;
  copy_angulo: string;
  copy_ganchos: string[];
}
