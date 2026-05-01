// src/data/userProfile.ts

export interface FavoriteItem {
  keyword: string;   // lowercase, used for matching (e.g. 'coffee')
  name: string;      // display name, can include emoji
  color: string;     // planet colour
}

export const FAVORITES: FavoriteItem[] = [
  { keyword: 'coffee',  name: 'Coffee ☕', color: '#c0a080' },
  { keyword: 'music',   name: 'Music 🎵',  color: '#ff66aa' },
  { keyword: 'reading', name: 'Reading 📚',color: '#a0d2db' },
];