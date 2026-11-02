import React from 'react';

interface SvgProps {
  className?: string;
  size?: number;
}

export const AnimatedSearchSvg: React.FC<SvgProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <span className={`inline-flex items-center justify-center relative select-none align-middle ${className}`}>
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="anim-search-sweep overflow-visible"
    >
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2.2" className="text-blue-500 dark:text-blue-400" />
      <path
        d="M15.5 15.5L21 21"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="text-blue-600 dark:text-blue-300"
      />
      {/* Radar pulse wave */}
      <circle
        cx="10"
        cy="10"
        r="4"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="currentColor"
        fillOpacity="0.15"
        className="text-blue-400 anim-radar-wave"
      />
    </svg>
  </span>
);

export const AnimatedGlobeSvg: React.FC<SvgProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <span className={`inline-flex items-center justify-center relative select-none align-middle ${className}`}>
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="overflow-visible"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="1.8"
        className="text-cyan-500 dark:text-cyan-400 opacity-80"
      />
      <ellipse
        cx="12"
        cy="12"
        rx="4.5"
        ry="9"
        stroke="currentColor"
        strokeWidth="1.6"
        className="text-blue-500 dark:text-blue-300 anim-spin-slow"
      />
      <line
        x1="3"
        y1="12"
        x2="21"
        y2="12"
        stroke="currentColor"
        strokeWidth="1.6"
        className="text-cyan-600 dark:text-cyan-300"
      />
      <line
        x1="5"
        y1="7.5"
        x2="19"
        y2="7.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeDasharray="1.5 1.5"
        className="text-blue-400/70"
      />
      <line
        x1="5"
        y1="16.5"
        x2="19"
        y2="16.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeDasharray="1.5 1.5"
        className="text-blue-400/70"
      />
    </svg>
  </span>
);

export const AnimatedWarningSvg: React.FC<SvgProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <span className={`inline-flex items-center justify-center relative select-none align-middle ${className}`}>
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="anim-bounce"
    >
      <path
        d="M12 2.5L1.8 20.2C1.4 20.9 1.9 21.8 2.8 21.8H21.2C22.1 21.8 22.6 20.9 22.2 20.2L12 2.5Z"
        fill="#FEF08A"
        stroke="#EAB308"
        strokeWidth="1.8"
        strokeLinejoin="round"
        className="dark:fill-yellow-950/60 dark:stroke-yellow-500"
      />
      <line x1="12" y1="9" x2="12" y2="14" stroke="#854D0E" strokeWidth="2" strokeLinecap="round" className="dark:stroke-yellow-300" />
      <circle cx="12" cy="17.5" r="1.2" fill="#854D0E" className="dark:fill-yellow-300" />
    </svg>
  </span>
);

export const AnimatedSparkleSvg: React.FC<SvgProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <span className={`inline-flex items-center justify-center relative select-none align-middle ${className}`}>
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="anim-sparkle"
    >
      <path
        d="M12 2L14.2 8.8L21 11L14.2 13.2L12 20L9.8 13.2L3 11L9.8 8.8L12 2Z"
        fill="url(#sparkleGradient)"
      />
      <circle cx="19" cy="5" r="1.5" fill="#FBBF24" />
      <circle cx="5" cy="18" r="1" fill="#F59E0B" />
      <defs>
        <linearGradient id="sparkleGradient" x1="3" y1="2" x2="21" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE047" />
          <stop offset="0.5" stopColor="#F59E0B" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
      </defs>
    </svg>
  </span>
);

export const AnimatedFireSvg: React.FC<SvgProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <span className={`inline-flex items-center justify-center relative select-none align-middle ${className}`}>
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="anim-flame"
    >
      <path
        d="M12 2C9.5 5 11 8 8.5 10.5C6 13 5 15.5 6 18C7 20.5 9 22 12 22C16 22 19 19 19 14.5C19 9.5 14.5 7.5 14.5 4.5C14.5 3 13.5 2.5 12 2Z"
        fill="url(#fireOuterGradient)"
      />
      <path
        d="M12 11C10.5 12.5 10 14 10.5 15.5C11 17 12 18 13.5 18C15 18 16 16.5 16 14.5C16 12.5 13.5 12 12 11Z"
        fill="#FEF08A"
      />
      <defs>
        <linearGradient id="fireOuterGradient" x1="6" y1="2" x2="19" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EF4444" />
          <stop offset="0.6" stopColor="#F97316" />
          <stop offset="1" stopColor="#FBBF24" />
        </linearGradient>
      </defs>
    </svg>
  </span>
);

export const AnimatedRocketSvg: React.FC<SvgProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <span className={`inline-flex items-center justify-center relative select-none align-middle ${className}`}>
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="anim-float"
    >
      <path
        d="M14.5 3C9 3.5 6 8.5 6 13.5L4 15.5V17L7 16.5L8.5 19H10L12 17C17 17 21.5 14 22 8.5C22 8.5 22 3 14.5 3Z"
        fill="#3B82F6"
        stroke="#1D4ED8"
        strokeWidth="1.2"
      />
      <circle cx="14.5" cy="8.5" r="2" fill="#E0F2FE" stroke="#0284C7" strokeWidth="1" />
      <path d="M4 20L6 17" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" className="anim-flame" />
    </svg>
  </span>
);

export const AnimatedBotSvg: React.FC<SvgProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <span className={`inline-flex items-center justify-center relative select-none align-middle ${className}`}>
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="anim-bounce"
    >
      <rect x="4" y="6" width="16" height="14" rx="4" fill="#E0E7FF" stroke="#6366F1" strokeWidth="1.8" className="dark:fill-indigo-950 dark:stroke-indigo-400" />
      <line x1="12" y1="2" x2="12" y2="6" stroke="#6366F1" strokeWidth="1.8" className="dark:stroke-indigo-400" />
      <circle cx="12" cy="2" r="1.5" fill="#EF4444" className="animate-pulse" />
      <circle cx="9" cy="12" r="1.5" fill="#4F46E5" className="dark:fill-indigo-300" />
      <circle cx="15" cy="12" r="1.5" fill="#4F46E5" className="dark:fill-indigo-300" />
      <line x1="8" y1="16" x2="16" y2="16" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round" className="dark:stroke-indigo-400" />
    </svg>
  </span>
);

export const AnimatedIdeaSvg: React.FC<SvgProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <span className={`inline-flex items-center justify-center relative select-none align-middle ${className}`}>
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="anim-sparkle"
    >
      <path
        d="M12 2C8.1 2 5 5.1 5 9C5 11.4 6.2 13.5 8 14.7V17C8 17.6 8.4 18 9 18H15C15.6 18 16 17.6 16 17V14.7C17.8 13.5 19 11.4 19 9C19 5.1 15.9 2 12 2Z"
        fill="#FEF08A"
        stroke="#EAB308"
        strokeWidth="1.5"
        className="dark:fill-amber-950/60 dark:stroke-amber-400"
      />
      <line x1="9" y1="21" x2="15" y2="21" stroke="#CA8A04" strokeWidth="2" strokeLinecap="round" />
    </svg>
  </span>
);

export const AnimatedCheckSvg: React.FC<SvgProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <span className={`inline-flex items-center justify-center relative select-none align-middle ${className}`}>
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="anim-bounce"
    >
      <circle cx="12" cy="12" r="10" fill="#DCFCE7" stroke="#22C55E" strokeWidth="1.8" className="dark:fill-emerald-950/70 dark:stroke-emerald-400" />
      <path d="M7.5 12L10.5 15L16.5 9" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="dark:stroke-emerald-300" />
    </svg>
  </span>
);

export const AnimatedCrossSvg: React.FC<SvgProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <span className={`inline-flex items-center justify-center relative select-none align-middle ${className}`}>
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="10" fill="#FEE2E2" stroke="#EF4444" strokeWidth="1.8" className="dark:fill-rose-950/70 dark:stroke-rose-400" />
      <path d="M9 9L15 15M15 9L9 15" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" className="dark:stroke-rose-300" />
    </svg>
  </span>
);

export const AnimatedPinSvg: React.FC<SvgProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <span className={`inline-flex items-center justify-center relative select-none align-middle ${className}`}>
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="anim-bounce"
    >
      <path
        d="M12 2C8.1 2 5 5.1 5 9C5 14.2 12 22 12 22C12 22 19 14.2 19 9C19 5.1 15.9 2 12 2Z"
        fill="#F87171"
        stroke="#DC2626"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="9" r="2.5" fill="#FFFFFF" />
    </svg>
  </span>
);

export const AnimatedLinkSvg: React.FC<SvgProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <span className={`inline-flex items-center justify-center relative select-none align-middle ${className}`}>
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="anim-float"
    >
      <path
        d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
        stroke="#3B82F6"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
        stroke="#60A5FA"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  </span>
);

export const AnimatedChatSvg: React.FC<SvgProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <span className={`inline-flex items-center justify-center relative select-none align-middle ${className}`}>
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="anim-float"
    >
      <path
        d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
        fill="#E0E7FF"
        stroke="#4F46E5"
        strokeWidth="1.6"
        className="dark:fill-indigo-950/60 dark:stroke-indigo-400"
      />
      <circle cx="8.5" cy="12" r="1.2" fill="#4F46E5" className="animate-ping" style={{ animationDuration: '2s' }} />
      <circle cx="12" cy="12" r="1.2" fill="#4F46E5" className="animate-ping" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
      <circle cx="15.5" cy="12" r="1.2" fill="#4F46E5" className="animate-ping" style={{ animationDuration: '2s', animationDelay: '0.6s' }} />
    </svg>
  </span>
);

export const AnimatedClockSvg: React.FC<SvgProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <span className={`inline-flex items-center justify-center relative select-none align-middle ${className}`}>
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="anim-bounce"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" className="text-neutral-500" />
      <line x1="12" y1="12" x2="12" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-neutral-700 dark:text-neutral-200" />
      <line x1="12" y1="12" x2="16" y2="12" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  </span>
);

// Map common unicode emojis to custom animated SVGs
export const EMOJI_TO_SVG: Record<string, React.FC<SvgProps>> = {
  '🔍': AnimatedSearchSvg,
  '🔎': AnimatedSearchSvg,
  '🌐': AnimatedGlobeSvg,
  '⚠️': AnimatedWarningSvg,
  '✨': AnimatedSparkleSvg,
  '⭐': AnimatedSparkleSvg,
  '🌟': AnimatedSparkleSvg,
  '🔥': AnimatedFireSvg,
  '🚀': AnimatedRocketSvg,
  '🤖': AnimatedBotSvg,
  '💡': AnimatedIdeaSvg,
  '✅': AnimatedCheckSvg,
  '✔️': AnimatedCheckSvg,
  '❌': AnimatedCrossSvg,
  '✖️': AnimatedCrossSvg,
  '📌': AnimatedPinSvg,
  '📍': AnimatedPinSvg,
  '🔗': AnimatedLinkSvg,
  '💬': AnimatedChatSvg,
  '🗨️': AnimatedChatSvg,
  '💭': AnimatedChatSvg,
  '🕒': AnimatedClockSvg,
  '⏰': AnimatedClockSvg,
  '⏳': AnimatedClockSvg,
};

export const AnimatedEmoji: React.FC<{ emoji: string; className?: string; size?: number }> = ({
  emoji,
  className = 'w-4 h-4 mx-0.5',
  size = 16,
}) => {
  const SvgComponent = EMOJI_TO_SVG[emoji];
  if (SvgComponent) {
    return <SvgComponent className={className} size={size} />;
  }

  // Fallback for any other emoji: wrap in an animated micro-badge
  return (
    <span
      className={`inline-flex items-center justify-center anim-bounce select-none align-middle ${className}`}
      style={{ fontSize: `${size}px`, lineHeight: 1 }}
    >
      {emoji}
    </span>
  );
};

// Comprehensive regex matching emojis
const EMOJI_REGEX = /([\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}])/u;

/**
 * Parses a string and transforms unicode emojis into AnimatedEmoji components
 */
export const renderWithAnimatedEmojis = (text: string): React.ReactNode => {
  if (!text) return text;
  const parts = text.split(EMOJI_REGEX);
  if (parts.length <= 1) return text;

  return parts.map((part, index) => {
    if (EMOJI_REGEX.test(part)) {
      return <AnimatedEmoji key={index} emoji={part} />;
    }
    return part;
  });
};
