import React, { useState } from 'react';

/**
 * Extracts initials from Vietnamese or international names
 * Example: "Nguyễn Văn Thành Đạt" -> "NT"
 * Example: "Trần Thị Thu Hà" -> "TH"
 * Example: "Lê Hoàng Nam" -> "LN"
 * Example: "Phạm Minh Đức" -> "PĐ"
 */
export function getUserInitials(name?: string): string {
  if (!name || !name.trim()) return 'TP';
  const clean = name.trim().replace(/\s+/g, ' ');
  const words = clean.split(' ').filter(Boolean);
  if (words.length === 0) return 'TP';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  // Special rule for 4-word Vietnamese names like "Nguyễn Văn Thành Đạt" -> NT
  if (
    words.length >= 4 &&
    (words[1].toLowerCase() === 'văn' || words[1].toLowerCase() === 'thị' || words[1].toLowerCase() === 'hữu' || words[1].toLowerCase() === 'đức')
  ) {
    return (words[0][0] + words[2][0]).toUpperCase();
  }

  // General 2-4 words: First letter of first word + First letter of last word
  const first = words[0][0];
  const last = words[words.length - 1][0];
  return (first + last).toUpperCase();
}

export interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  status?: 'ACTIVE' | 'LOCKED';
  showStatusDot?: boolean;
  theme?: 'navy' | 'gold' | 'auto';
  className?: string;
  onClick?: () => void;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name = 'Nhân sự',
  size = 'md',
  status = 'ACTIVE',
  showStatusDot = false,
  theme = 'auto',
  className = '',
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-xs sm:text-sm font-bold',
    lg: 'w-12 h-12 text-sm font-black',
    xl: 'w-16 h-16 text-lg sm:text-xl font-black',
    '2xl': 'w-20 h-20 text-2xl font-black',
  };

  const dotSizeClasses = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-3.5 h-3.5',
    '2xl': 'w-4 h-4',
  };

  const isLocked = status === 'LOCKED';
  const initials = getUserInitials(name);

  // Background color selection for initials: navy `#001f3f` or gold `#D4AF37`
  const bgThemeClass =
    theme === 'gold'
      ? 'bg-[#D4AF37] text-[#00172e]'
      : theme === 'navy'
      ? 'bg-[#001f3f] text-[#D4AF37]'
      : // Auto: pick navy with gold text
        'bg-[#001f3f] text-[#D4AF37]';

  const currentSize = sizeClasses[size] || sizeClasses.md;
  const currentDotSize = dotSizeClasses[size] || dotSizeClasses.md;

  const hasValidImage = Boolean(src && src.trim() && !imageError);

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex shrink-0 select-none ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''} ${className}`}
    >
      {hasValidImage ? (
        <img
          src={src as string}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
          className={`${currentSize} rounded-full object-cover ${
            isLocked ? 'border-2 border-rose-400 grayscale' : 'border-2 border-[#D4AF37] shadow-xs'
          }`}
        />
      ) : (
        <div
          className={`${currentSize} rounded-full ${bgThemeClass} flex items-center justify-center tracking-wider uppercase ${
            isLocked ? 'border-2 border-rose-400 opacity-80' : 'border-2 border-[#D4AF37] shadow-xs'
          }`}
        >
          {initials}
        </div>
      )}

      {/* Online / Active / Locked Status Dot */}
      {showStatusDot && (
        <span
          className={`absolute bottom-0 right-0 ${currentDotSize} rounded-full border-2 border-white dark:border-[#001f3f] ${
            isLocked ? 'bg-rose-500' : 'bg-emerald-500'
          }`}
        />
      )}
    </div>
  );
};
