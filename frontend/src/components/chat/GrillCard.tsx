import React, { useState } from 'react';
import { Send, CheckCircle2, Sliders, Edit3 } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';

export interface GrillQuestion {
  id: string;
  title: string;
  suggestions: string[];
}

/**
 * Clean markdown symbols, bold tags, and prefixes
 */
function cleanText(s: string): string {
  if (!s) return '';
  return s
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/\((?:disyorkan|recommended)\)/gi, '')
    .replace(/^(?:cadangan saya|my recommendation|pilihan)\s*[:\*\-]*/i, '')
    .replace(/^[\s\*\#\-\?\_:]+|[\s\*\#\-\?\_:]+$/g, '')
    .trim();
}

/**
 * Parses grilling / alignment questions from message content.
 * Supports:
 * 1. [QUESTION 1: Title] ... 1. Option 2. Option 3. Option
 * 2. Q1 - Title: ... -> Recommendation: ...
 */
export function parseGrillQuestions(text: string): GrillQuestion[] {
  if (!text) return [];

  const questions: GrillQuestion[] = [];

  // Pattern 1: [QUESTION/SOALAN/问题/質問 1: Title] ... 1. Option 2. Option 3. Option
  const sectionRegex = /\[\s*(?:SOALAN|QUESTION|问题|質問|PREGUNTA|FRAGE)?\s*(\d+)?:?\s*([^\]]+)\]([\s\S]*?)(?=\[\s*(?:SOALAN|QUESTION|问题|質問|PREGUNTA|FRAGE)?\s*\d*[:\s-]*[^\]]+\]|$)/gi;
  let match: RegExpExecArray | null;

  while ((match = sectionRegex.exec(text)) !== null) {
    const rawTitle = cleanText(match[2]);
    const body = match[3].trim();

    const options: string[] = [];
    const lines = body.split('\n');
    for (const line of lines) {
      const cleanLine = line.trim();
      const optMatch = /^(?:\d+[\.\)]|\-|\*)\s*(.+)$/.exec(cleanLine);
      if (optMatch && optMatch[1].trim()) {
        const cleanedOpt = cleanText(optMatch[1]);
        if (cleanedOpt) {
          options.push(cleanedOpt);
        }
      }
    }

    if (options.length >= 2) {
      questions.push({
        id: `q-${questions.length + 1}`,
        title: rawTitle,
        suggestions: options.slice(0, 3),
      });
    }
  }

  // Pattern 2 fallback: Q1 - Title: ... -> Recommendation: ...
  if (questions.length === 0) {
    const legacyRegex = /(?:[\?❓]?\s*)?(?:Q|Soalan)\s*(\d+)\s*[-:]\s*([^:]+):\s*([\s\S]*?)(?:->|➡️|Cadangan saya:)\s*([^\n\?]+)/gi;
    let legacyMatch: RegExpExecArray | null;

    while ((legacyMatch = legacyRegex.exec(text)) !== null) {
      const title = cleanText(legacyMatch[2]);
      const desc = legacyMatch[3].trim();
      const recommendation = cleanText(legacyMatch[4]);

      const alternatives: string[] = [recommendation];
      const orMatch = /(?:gunakan|adakah|pilihan)?\s*([A-Za-z0-9_\+\-\.\s]+)\s+atau\s+([A-Za-z0-9_\+\-\.\s\(\)]+)/i.exec(desc);
      if (orMatch) {
        const alt1 = cleanText(orMatch[1]);
        const alt2 = cleanText(orMatch[2]);
        if (alt1 && !alternatives.some((a) => a.toLowerCase().includes(alt1.toLowerCase()))) {
          alternatives.push(alt1);
        }
        if (alt2 && !alternatives.some((a) => a.toLowerCase().includes(alt2.toLowerCase()))) {
          alternatives.push(alt2);
        }
      }

      if (alternatives.length < 2) {
        alternatives.push('Pilihan alternatif standard');
      }
      if (alternatives.length < 3) {
        alternatives.push('Pilihan alternatif tersuai');
      }

      questions.push({
        id: `legacy-q-${questions.length + 1}`,
        title,
        suggestions: alternatives.slice(0, 3),
      });
    }
  }

  return questions;
}

interface GrillCardProps {
  questions: GrillQuestion[];
  isLatest: boolean;
}

export const GrillCard: React.FC<GrillCardProps> = ({ questions, isLatest }) => {
  const { sendMessage, isLoading, isStreaming } = useChatStore();

  // Selected option index per question: 0, 1, 2 for suggestions, 3 for 'Other'
  const [selections, setSelections] = useState<{ [qId: string]: number }>(() => {
    const initial: { [qId: string]: number } = {};
    questions.forEach((q) => {
      initial[q.id] = 0; // Default to first (recommended) AI suggestion
    });
    return initial;
  });

  // Custom text for 'Other' option
  const [customInputs, setCustomInputs] = useState<{ [qId: string]: string }>({});
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleSelectOption = (qId: string, index: number) => {
    if (submitted) return;
    setSelections((prev) => ({
      ...prev,
      [qId]: index,
    }));
  };

  const handleCustomInputChange = (qId: string, value: string) => {
    setCustomInputs((prev) => ({
      ...prev,
      [qId]: value,
    }));
  };

  const handleSubmit = async () => {
    if (submitted || isLoading || isStreaming) return;

    const answerLines: string[] = ['Pilihan saya untuk projek ini:'];
    questions.forEach((q, idx) => {
      const selIndex = selections[q.id] ?? 0;
      let chosenText = '';
      if (selIndex === 3) {
        chosenText = (customInputs[q.id] || '').trim() || 'Pilihan tersuai pengguna';
      } else {
        chosenText = q.suggestions[selIndex] || q.suggestions[0] || 'Disyorkan';
      }
      answerLines.push(`${idx + 1}. ${q.title}: ${chosenText}`);
    });

    answerLines.push('Sila teruskan dengan penulisan kod berdasarkan pilihan di atas.');
    const fullAnswer = answerLines.join('\n');

    setSubmitted(true);
    await sendMessage(fullAnswer);
  };

  if (!questions || questions.length === 0) return null;

  return (
    <div className="my-5 rounded-2xl border border-neutral-300 dark:border-neutral-800 bg-neutral-50/80 dark:bg-[#151515] shadow-md overflow-hidden transition-all text-neutral-900 dark:text-neutral-100">
      {/* Header - Monochrome */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-neutral-200/60 dark:bg-[#1f1f1f] border-b border-neutral-300 dark:border-neutral-800 text-xs select-none">
        <div className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100">
          <Sliders className="w-4 h-4 text-neutral-900 dark:text-neutral-100" />
          <span className="text-sm tracking-tight">Penyelarasan Seni Bina (Grill Me)</span>
        </div>
      </div>

      {/* Questions Form */}
      <div className="p-5 space-y-6">
        {questions.map((q, qIndex) => {
          const currentSel = selections[q.id] ?? 0;
          return (
            <div key={q.id} className="space-y-3">
              <div className="flex items-start gap-2.5">
                <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-black text-white dark:bg-white dark:text-black text-[11px] font-mono font-bold mt-0.5">
                  {qIndex + 1}
                </span>
                <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 leading-snug">
                  {q.title}
                </h4>
              </div>

              {/* 4 Radio Options (3 AI Suggestions + 1 Other) */}
              <div className="grid grid-cols-1 gap-2.5 pl-7">
                {/* 3 AI Suggestions */}
                {q.suggestions.map((suggestion, sIndex) => {
                  const isChecked = currentSel === sIndex;
                  return (
                    <div
                      key={sIndex}
                      onClick={() => handleSelectOption(q.id, sIndex)}
                      className={`relative flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all select-none ${
                        isChecked
                          ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-200/70 dark:bg-[#242424] text-neutral-950 dark:text-white font-medium shadow-xs ring-1 ring-neutral-900/15 dark:ring-neutral-100/20'
                          : 'border-neutral-200 dark:border-neutral-800/80 bg-white/70 dark:bg-[#191919] text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-700'
                      } ${submitted ? 'cursor-default opacity-85' : ''}`}
                    >
                      {/* Monochrome Custom Radio Indicator */}
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                          isChecked
                            ? 'border-neutral-900 dark:border-neutral-100 bg-transparent'
                            : 'border-neutral-400 dark:border-neutral-600'
                        }`}
                      >
                        {isChecked && (
                          <div className="w-2 h-2 rounded-full bg-neutral-900 dark:bg-neutral-100" />
                        )}
                      </div>

                      <span className="flex-1 leading-relaxed text-xs">{suggestion}</span>
                    </div>
                  );
                })}

                {/* Option 4: Other / Lain-lain with Text Input */}
                {(() => {
                  const isChecked = currentSel === 3;
                  return (
                    <div
                      className={`p-3 rounded-xl border text-xs transition-all ${
                        isChecked
                          ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-200/70 dark:bg-[#242424] shadow-xs ring-1 ring-neutral-900/15 dark:ring-neutral-100/20'
                          : 'border-neutral-200 dark:border-neutral-800/80 bg-white/70 dark:bg-[#191919] hover:border-neutral-400 dark:hover:border-neutral-700'
                      } ${submitted ? 'opacity-85' : ''}`}
                    >
                      <div
                        onClick={() => handleSelectOption(q.id, 3)}
                        className="flex items-center gap-3 cursor-pointer select-none"
                      >
                        {/* Monochrome Custom Radio Indicator */}
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                            isChecked
                              ? 'border-neutral-900 dark:border-neutral-100 bg-transparent'
                              : 'border-neutral-400 dark:border-neutral-600'
                          }`}
                        >
                          {isChecked && (
                            <div className="w-2 h-2 rounded-full bg-neutral-900 dark:bg-neutral-100" />
                          )}
                        </div>

                        <span className="font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                          <Edit3 className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
                          Lain-lain (Pilihan Sendiri)
                        </span>
                      </div>

                      {isChecked && (
                        <div className="mt-2.5 pl-7">
                          <input
                            type="text"
                            disabled={submitted}
                            value={customInputs[q.id] || ''}
                            onChange={(e) => handleCustomInputChange(q.id, e.target.value)}
                            placeholder="Taip pilihan spesifik anda sendiri di sini..."
                            className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#101010] text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 text-xs font-mono"
                          />
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}

        {/* Submit Actions - Pure Black/White Button */}
        {isLatest && !submitted && (
          <div className="pt-2 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={isLoading || isStreaming}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black hover:bg-neutral-800 active:bg-neutral-900 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200 dark:active:bg-neutral-300 text-xs font-semibold shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Hantar Pilihan & Mulakan Kod</span>
            </button>
          </div>
        )}

        {submitted && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-200/80 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-black dark:text-white" />
            <span>Pilihan anda telah dihantar. Kod sedang disediakan mengikut spesifikasi anda.</span>
          </div>
        )}
      </div>
    </div>
  );
};
