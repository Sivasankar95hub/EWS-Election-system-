import React from 'react';
import { 
  Flame, 
  Sun, 
  Crown, 
  Shield, 
  Zap, 
  Star, 
  Anchor, 
  Bird, 
  Flower, 
  Award, 
  Compass, 
  Heart 
} from 'lucide-react';

export interface PredefinedSymbol {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export const PREDEFINED_SYMBOLS: PredefinedSymbol[] = [
  { id: 'phoenix', name: 'Phoenix (Flame)', icon: Flame, color: 'text-amber-500 bg-amber-50 border-amber-200' },
  { id: 'sun', name: 'Sun', icon: Sun, color: 'text-yellow-500 bg-yellow-50 border-yellow-200' },
  { id: 'crown', name: 'Crown', icon: Crown, color: 'text-indigo-500 bg-indigo-50 border-indigo-200' },
  { id: 'shield', name: 'Shield of Honor', icon: Shield, color: 'text-blue-500 bg-blue-50 border-blue-200' },
  { id: 'lightning', name: 'Lightning (Zap)', icon: Zap, color: 'text-purple-500 bg-purple-50 border-purple-200' },
  { id: 'star', name: 'Rising Star', icon: Star, color: 'text-rose-500 bg-rose-50 border-rose-200' },
  { id: 'anchor', name: 'Anchor', icon: Anchor, color: 'text-slate-500 bg-slate-50 border-slate-200' },
  { id: 'eagle', name: 'Eagle (Bird)', icon: Bird, color: 'text-emerald-500 bg-emerald-50 border-emerald-200' },
  { id: 'lotus', name: 'Lotus', icon: Flower, color: 'text-teal-500 bg-teal-50 border-teal-200' },
  { id: 'medal', name: 'Medal', icon: Award, color: 'text-orange-500 bg-orange-50 border-orange-200' },
  { id: 'compass', name: 'Compass', icon: Compass, color: 'text-cyan-500 bg-cyan-50 border-cyan-200' },
  { id: 'heart', name: 'Heart', icon: Heart, color: 'text-pink-500 bg-pink-50 border-pink-200' },
];

export function getSymbolIcon(id: string) {
  const sym = PREDEFINED_SYMBOLS.find(s => s.id === id);
  return sym ? sym.icon : Star;
}

export function getSymbolColor(id: string) {
  const sym = PREDEFINED_SYMBOLS.find(s => s.id === id);
  return sym ? sym.color : 'text-rose-500 bg-rose-50 border-rose-200';
}
