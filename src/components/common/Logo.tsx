import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';

export interface LogoProps {
  variant?: 'sidebar' | 'login' | 'header' | 'icon' | 'print' | 'compact';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'sidebar',
  size = 'md',
  showText = true,
  className = '',
  onClick,
}) => {
  const { systemSettings } = useData();
  const [imageError, setImageError] = useState(false);

  const customLogoUrl = systemSettings?.logoUrl;
  const companyName = systemSettings?.companyName || 'TRUONG PHAT REAL';
  const slogan = systemSettings?.companySlogan || (variant === 'sidebar' ? 'Bất Động Sản Chuyên Nghiệp' : 'Hệ thống quản lý bất động sản nội bộ');

  // Reset error flag if logo URL changes
  useEffect(() => {
    setImageError(false);
  }, [customLogoUrl]);

  // Size mapping for the icon box
  const sizeClasses = {
    xs: 'w-7 h-7 text-xs rounded-lg',
    sm: 'w-8 h-8 text-sm rounded-lg',
    md: 'w-10 h-10 text-base rounded-xl',
    lg: 'w-12 h-12 text-xl rounded-xl',
    xl: 'w-16 h-16 text-2xl sm:text-3xl rounded-2xl',
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.md;

  // Icon emblem render (Custom uploaded image OR default TP Gold emblem)
  const renderEmblem = (overrideSizeClass?: string) => {
    const boxClass = overrideSizeClass || currentSizeClass;

    if (customLogoUrl && !imageError) {
      return (
        <div
          className={`${boxClass} bg-white flex items-center justify-center overflow-hidden border border-[#D4AF37]/50 shadow-md shrink-0`}
        >
          <img
            src={customLogoUrl}
            alt={companyName}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-contain p-0.5"
          />
        </div>
      );
    }

    return (
      <div
        className={`${boxClass} bg-gradient-to-br from-[#D4AF37] via-[#e5c158] to-[#b38e22] flex items-center justify-center text-[#00172e] font-black tracking-tight shadow-md shadow-amber-950/20 border border-[#D4AF37]/60 shrink-0 select-none`}
      >
        TP
      </div>
    );
  };

  // 1. Sidebar Variant
  if (variant === 'sidebar') {
    return (
      <div
        onClick={onClick}
        className={`flex items-center gap-3 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      >
        {renderEmblem('w-10 h-10 text-lg rounded-xl')}
        {showText && (
          <div className="min-w-0">
            <div className="text-white font-black text-base tracking-tight leading-tight truncate">
              {companyName}
            </div>
            <p className="text-[11px] text-[#D4AF37] font-medium truncate">
              {slogan}
            </p>
          </div>
        )}
      </div>
    );
  }

  // 2. Login Variant (Big, Centered & Distinctive)
  if (variant === 'login') {
    return (
      <div
        className={`text-center flex flex-col items-center select-none ${className}`}
      >
        <div className="mb-3.5 transition-transform duration-300 hover:scale-105">
          {renderEmblem('w-16 h-16 sm:w-20 sm:h-20 text-3xl sm:text-4xl rounded-2xl')}
        </div>
        {showText && (
          <>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-wider uppercase">
              {companyName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
              {slogan}
            </p>
          </>
        )}
      </div>
    );
  }

  // 3. Print / Report Variant (High Contrast & Clear)
  if (variant === 'print') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {renderEmblem('w-10 h-10 text-base rounded-lg')}
        <div>
          <div className="font-black text-[#001f3f] text-base leading-tight uppercase tracking-tight">
            {companyName}
          </div>
          <div className="text-[11px] text-[#b38e22] font-semibold">
            {slogan}
          </div>
        </div>
      </div>
    );
  }

  // 4. Header / Navbar Variant
  if (variant === 'header') {
    return (
      <div
        onClick={onClick}
        className={`flex items-center gap-2.5 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      >
        {renderEmblem('w-9 h-9 text-sm rounded-lg')}
        {showText && (
          <div className="min-w-0">
            <span className="font-black text-sm text-[#001f3f] tracking-tight truncate block">
              {companyName}
            </span>
          </div>
        )}
      </div>
    );
  }

  // 5. Icon Only or Compact
  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center justify-center ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {renderEmblem()}
    </div>
  );
};
