import React from 'react';

// Logo LC Performance: segue il tema (chiaro in modalità chiara, scuro in modalità scura).
// Usa le stesse icone della scheda del browser (già salvate in cache dall'app).
const BrandLogo = ({ size = 36, showName = false, subtitle = null, className = '' }) => (
  <div className={`flex items-center gap-2.5 min-w-0 ${className}`}>
    <img src="/favicon-light.svg" alt="LC Performance" width={size} height={size}
      className="block dark:hidden flex-shrink-0 rounded-[22%]" style={{ width: size, height: size }} />
    <img src="/favicon-dark.svg" alt="LC Performance" width={size} height={size}
      className="hidden dark:block flex-shrink-0 rounded-[22%]" style={{ width: size, height: size }} />
    {showName && (
      <div className="min-w-0 leading-tight">
        <p className="font-bold tracking-tight text-[15px] truncate">LC Performance</p>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>
    )}
  </div>
);

export default BrandLogo;
