import React from 'react';
import { 
  Flame, Sun, Crown, Shield, Zap, Star, Anchor, Bird, Flower, Award, Compass, Heart,
  Activity, Aperture, Atom, Badge, Bell, Book, Briefcase, Camera, Cloud, Code, Coffee, 
  Cpu, Diamond, Eye, Feather, Fish, Flag, Gift, Globe, GraduationCap, Key, Laptop, 
  Leaf, Lock, Mail, Map, Moon, Music, Package, PenTool, Phone, Pocket, Power, 
  Radio, Rocket, Scissors, Smile, Speaker, Target, Telescope, Terminal, Trophy, 
  Umbrella, Wrench, Sparkles, Cherry, Orbit, Swords, ShieldAlert
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
  { id: 'activity', name: 'Pulse (Activity)', icon: Activity, color: 'text-red-500 bg-red-50 border-red-200' },
  { id: 'aperture', name: 'Aperture Lens', icon: Aperture, color: 'text-slate-600 bg-slate-50 border-slate-200' },
  { id: 'atom', name: 'Atom Science', icon: Atom, color: 'text-sky-500 bg-sky-50 border-sky-200' },
  { id: 'badge', name: 'Sheriff Badge', icon: Badge, color: 'text-amber-600 bg-amber-50 border-amber-300' },
  { id: 'bell', name: 'Bell', icon: Bell, color: 'text-yellow-600 bg-yellow-50 border-yellow-300' },
  { id: 'book', name: 'Open Book', icon: Book, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { id: 'briefcase', name: 'Briefcase', icon: Briefcase, color: 'text-stone-600 bg-stone-50 border-stone-200' },
  { id: 'camera', name: 'Camera', icon: Camera, color: 'text-zinc-600 bg-zinc-50 border-zinc-200' },
  { id: 'cloud', name: 'Rain Cloud', icon: Cloud, color: 'text-blue-400 bg-blue-50 border-blue-200' },
  { id: 'code', name: 'Code Brackets', icon: Code, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'coffee', name: 'Coffee Cup', icon: Coffee, color: 'text-amber-800 bg-amber-50 border-amber-200' },
  { id: 'cpu', name: 'CPU Microchip', icon: Cpu, color: 'text-violet-600 bg-violet-50 border-violet-200' },
  { id: 'diamond', name: 'Sparkling Diamond', icon: Diamond, color: 'text-cyan-400 bg-cyan-50/50 border-cyan-200' },
  { id: 'eye', name: 'Vision Eye', icon: Eye, color: 'text-teal-600 bg-teal-50 border-teal-200' },
  { id: 'feather', name: 'Feather', icon: Feather, color: 'text-orange-400 bg-orange-50 border-orange-200' },
  { id: 'fish', name: 'Fish', icon: Fish, color: 'text-sky-600 bg-sky-50 border-sky-200' },
  { id: 'flag', name: 'Victory Flag', icon: Flag, color: 'text-red-600 bg-red-50 border-red-200' },
  { id: 'gift', name: 'Gift Box', icon: Gift, color: 'text-pink-600 bg-pink-50 border-pink-200' },
  { id: 'globe', name: 'Planet Globe', icon: Globe, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'gradcap', name: 'Graduation Cap', icon: GraduationCap, color: 'text-violet-700 bg-violet-50 border-violet-300' },
  { id: 'key', name: 'Golden Key', icon: Key, color: 'text-yellow-500 bg-yellow-50 border-yellow-200' },
  { id: 'laptop', name: 'Laptop', icon: Laptop, color: 'text-slate-700 bg-slate-100 border-slate-300' },
  { id: 'leaf', name: 'Green Leaf', icon: Leaf, color: 'text-lime-600 bg-lime-50 border-lime-200' },
  { id: 'lock', name: 'Safe Lock', icon: Lock, color: 'text-rose-700 bg-rose-50 border-rose-200' },
  { id: 'mail', name: 'Letter Envelope', icon: Mail, color: 'text-blue-500 bg-blue-50 border-blue-200' },
  { id: 'map', name: 'Adventures Map', icon: Map, color: 'text-emerald-500 bg-emerald-50 border-emerald-200' },
  { id: 'moon', name: 'Crescent Moon', icon: Moon, color: 'text-indigo-400 bg-indigo-950/10 border-indigo-200' },
  { id: 'music', name: 'Music Note', icon: Music, color: 'text-fuchsia-500 bg-fuchsia-50 border-fuchsia-200' },
  { id: 'package', name: 'Box Package', icon: Package, color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { id: 'pentool', name: 'Pen Tool', icon: PenTool, color: 'text-indigo-500 bg-indigo-50 border-indigo-200' },
  { id: 'phone', name: 'Telephone', icon: Phone, color: 'text-green-500 bg-green-50 border-green-200' },
  { id: 'pocket', name: 'Pocket Shield', icon: Pocket, color: 'text-teal-700 bg-teal-50 border-teal-200' },
  { id: 'power', name: 'Power Switch', icon: Power, color: 'text-red-500 bg-red-50 border-red-100' },
  { id: 'radio', name: 'Radio Antenna', icon: Radio, color: 'text-zinc-700 bg-zinc-50 border-zinc-200' },
  { id: 'rocket', name: 'Space Rocket', icon: Rocket, color: 'text-rose-600 bg-rose-50 border-rose-300' },
  { id: 'scissors', name: 'Scissors', icon: Scissors, color: 'text-stone-500 bg-stone-50 border-stone-200' },
  { id: 'smile', name: 'Happy Face', icon: Smile, color: 'text-yellow-500 bg-yellow-50 border-yellow-200' },
  { id: 'speaker', name: 'Mega Speaker', icon: Speaker, color: 'text-violet-500 bg-violet-50 border-violet-200' },
  { id: 'target', name: 'Bullseye Target', icon: Target, color: 'text-rose-500 bg-rose-50 border-rose-200' },
  { id: 'telescope', name: 'Telescope', icon: Telescope, color: 'text-indigo-500 bg-indigo-50 border-indigo-200' },
  { id: 'terminal', name: 'Command Terminal', icon: Terminal, color: 'text-green-600 bg-zinc-900 border-zinc-700' },
  { id: 'trophy', name: 'Golden Trophy', icon: Trophy, color: 'text-amber-500 bg-amber-50 border-amber-200' },
  { id: 'umbrella', name: 'Umbrella', icon: Umbrella, color: 'text-sky-500 bg-sky-50 border-sky-200' },
  { id: 'wrench', name: 'Handy Wrench', icon: Wrench, color: 'text-slate-600 bg-slate-50 border-slate-200' },
  { id: 'sparkles', name: 'Magic Sparkles', icon: Sparkles, color: 'text-purple-400 bg-purple-50 border-purple-200' },
  { id: 'cherry', name: 'Cherry Fruit', icon: Cherry, color: 'text-rose-600 bg-rose-50 border-rose-150' },
  { id: 'orbit', name: 'Orbit Path', icon: Orbit, color: 'text-blue-500 bg-blue-50 border-blue-150' },
  { id: 'swords', name: 'Crossed Swords', icon: Swords, color: 'text-amber-700 bg-amber-50 border-amber-150' },
  { id: 'shieldalert', name: 'Guard Shield', icon: ShieldAlert, color: 'text-red-500 bg-red-50 border-red-150' }
];

export function getSymbolIcon(id: string) {
  const sym = PREDEFINED_SYMBOLS.find(s => s.id === id);
  return sym ? sym.icon : Star;
}

export function getSymbolColor(id: string) {
  const sym = PREDEFINED_SYMBOLS.find(s => s.id === id);
  return sym ? sym.color : 'text-rose-500 bg-rose-50 border-rose-200';
}

