import React from 'react';

export const WelcomeScreen: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full text-center select-none animate-in fade-in duration-300">
      {/* Mascot Logo */}
      <div className="w-20 h-20 rounded-3xl overflow-hidden shadow-lg mb-6 border border-neutral-300 dark:border-neutral-800 bg-black">
        <img
          src="/logo.png"
          alt="CIESGPT Mascot"
          className="w-full h-full object-cover"
        />
      </div>

      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-black dark:text-white mb-2">
        CIESGPT
      </h1>

      <p className="text-base sm:text-lg font-medium text-neutral-800 dark:text-neutral-200 mb-2.5">
        Where curiosity meets real-time intelligence.
      </p>

      <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-lg mx-auto leading-relaxed">
        Empowering your conversations with instant live web search, uninterrupted session memory, and high-performance neural reasoning across multiple languages.
      </p>
    </div>
  );
};
