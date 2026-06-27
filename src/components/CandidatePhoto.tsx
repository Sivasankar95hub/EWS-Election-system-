import React from 'react';
import { 
  Crown, GraduationCap, Trophy, Rocket, Shield, Star, 
  Zap, Palette, User, BookOpen, Briefcase, Award
} from 'lucide-react';

export interface PlaceholderAvatar {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  colorClass: string;
}

export const PLACEHOLDER_AVATARS: PlaceholderAvatar[] = [
  { id: 'avatar:student', name: 'Default Student', icon: User, colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'avatar:crown', name: 'Leader Crown', icon: Crown, colorClass: 'text-amber-600 bg-amber-50 border-amber-200' },
  { id: 'avatar:grad', name: 'Academic Cap', icon: GraduationCap, colorClass: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { id: 'avatar:trophy', name: 'Golden Trophy', icon: Trophy, colorClass: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  { id: 'avatar:rocket', name: 'Rising Rocket', icon: Rocket, colorClass: 'text-rose-600 bg-rose-50 border-rose-200' },
  { id: 'avatar:shield', name: 'Guard Shield', icon: Shield, colorClass: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'avatar:star', name: 'Shining Star', icon: Star, colorClass: 'text-amber-500 bg-amber-50 border-amber-200' },
  { id: 'avatar:zap', name: 'Electric Zap', icon: Zap, colorClass: 'text-violet-600 bg-violet-50 border-violet-200' },
  { id: 'avatar:palette', name: 'Artistic Palette', icon: Palette, colorClass: 'text-fuchsia-600 bg-fuchsia-50 border-fuchsia-200' },
  { id: 'avatar:book', name: 'Open Book', icon: BookOpen, colorClass: 'text-teal-600 bg-teal-50 border-teal-200' },
  { id: 'avatar:briefcase', name: 'Briefcase', icon: Briefcase, colorClass: 'text-slate-600 bg-slate-50 border-slate-200' },
  { id: 'avatar:award', name: 'Achievement Award', icon: Award, colorClass: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
];

interface CandidatePhotoProps {
  photoUrl: string | undefined;
  name: string;
  className?: string;
  iconClassName?: string;
}

export const CandidatePhoto: React.FC<CandidatePhotoProps> = ({ 
  photoUrl, 
  name, 
  className = "w-12 h-12 rounded-xl", 
  iconClassName = "h-6 w-6" 
}) => {
  // If we have a custom base64 or hosted image
  if (photoUrl && !photoUrl.startsWith('avatar:')) {
    return (
      <div className={`${className} overflow-hidden border border-slate-200 bg-slate-50 relative`}>
        <img 
          src={photoUrl} 
          alt={name} 
          className="w-full h-full object-cover" 
          referrerPolicy="no-referrer" 
        />
      </div>
    );
  }

  // Find placeholder avatar configuration
  const avatarId = photoUrl || 'avatar:student';
  const avatar = PLACEHOLDER_AVATARS.find(a => a.id === avatarId) || PLACEHOLDER_AVATARS[0];
  const IconComponent = avatar.icon;

  // Compute initials as fallback
  const initials = name
    ? name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  return (
    <div className={`${className} flex items-center justify-center border transition-colors relative font-extrabold text-xs ${avatar.colorClass}`}>
      <IconComponent className={iconClassName} />
      {/* Small badge with initials on the corner */}
      {initials && initials !== '?' && (
        <span className="absolute -bottom-1 -right-1 bg-slate-800 text-white text-[8px] px-1 py-0.5 rounded-full scale-90 border border-white font-black">
          {initials}
        </span>
      )}
    </div>
  );
};
