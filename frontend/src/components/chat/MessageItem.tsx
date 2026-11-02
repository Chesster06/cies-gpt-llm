import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, RotateCw, Edit3, User } from 'lucide-react';
import type { Message } from '../../types';
import { CodeBlock } from './CodeBlock';
import { useChatStore } from '../../stores/chatStore';
import { GrillCard, parseGrillQuestions } from './GrillCard';
import { AnimatedSearchSvg, AnimatedGlobeSvg } from './AnimatedEmoji';

const cleanMessageContent = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*$/gi, '')
    .trimStart();
};

interface MessageItemProps {
  message: Message;
  isLastAssistant: boolean;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, isLastAssistant }) => {
  const { regenerateMessage, editMessage, isStreaming } = useChatStore();
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(message.content);

  const cleanContent = cleanMessageContent(message.content || '');
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanContent || message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (editedText.trim() && editedText !== message.content) {
      editMessage(message.id, editedText);
    }
    setIsEditing(false);
  };

  return (
    <div
      className={`group w-full py-6 transition-colors ${
        isUser
          ? 'bg-transparent'
          : 'bg-neutral-50 dark:bg-[#1c1c1c] border-y border-neutral-200 dark:border-[#2b2b2b]'
      }`}
    >
      <div className="max-w-3xl mx-auto px-4 flex gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-black dark:text-white border border-neutral-300 dark:border-neutral-700">
              <User className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full overflow-hidden bg-black flex items-center justify-center border border-neutral-300 dark:border-neutral-800 shadow-xs">
              <img
                src="/logo.png"
                alt="CiesGPT Avatar"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden min-w-0">
          <div className="font-semibold text-xs text-neutral-500 dark:text-neutral-400 mb-1">
            {isUser ? 'You' : 'CiesGPT'}
          </div>

          {isEditing ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full p-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-black dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white resize-y min-h-[90px]"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 text-xs rounded-lg bg-black dark:bg-white text-white dark:text-black font-semibold hover:opacity-85"
                >
                  Save & Submit
                </button>
              </div>
            </div>
          ) : (
            <div className="prose dark:prose-invert max-w-none text-sm text-black dark:text-neutral-100 leading-relaxed break-words">
              {message.isStreaming && !cleanContent ? (
                <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 py-1 select-none not-prose">
                  <span className="text-sm font-medium tracking-wide">Thinking</span>
                  <span className="inline-flex items-center gap-1.5 pt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500 thinking-dot-1" />
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500 thinking-dot-2" />
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500 thinking-dot-3" />
                  </span>
                </div>
              ) : (
                (() => {
                  const renderCursor = (node: any) => {
                    if (!message.isStreaming) return null;
                    const isLast = (node?.position?.end?.offset ?? 0) >= (cleanContent?.trimEnd()?.length ?? 0);
                    if (!isLast) return null;
                    return (
                      <span
                        className="inline-block w-2 h-4 bg-black dark:bg-white animate-pulse ml-1 align-middle"
                        aria-hidden="true"
                      />
                    );
                  };

                  const stripEmojis = (str: string): string => {
                    return str.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{FE00}-\u{FE0F}]/gu, '');
                  };

                  const urlRegex = /(https?:\/\/[^\s<>]+)/g;

                  const linkifyText = (text: string): React.ReactNode => {
                    const cleaned = stripEmojis(text);
                    if (!cleaned.includes('http')) return cleaned;
                    const parts = cleaned.split(urlRegex);
                    return parts.map((part, i) => {
                      if (part.match(urlRegex)) {
                        return (
                          <a
                            key={i}
                            href={part}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline font-medium break-all cursor-pointer"
                          >
                            {part}
                          </a>
                        );
                      }
                      return part;
                    });
                  };

                  const processNodeChildren = (children: React.ReactNode): React.ReactNode => {
                    if (typeof children === 'string') {
                      return linkifyText(children);
                    }
                    if (Array.isArray(children)) {
                      return React.Children.map(children, (child) => processNodeChildren(child));
                    }
                    if (React.isValidElement(children)) {
                      const childProps = children.props as { children?: React.ReactNode };
                      if (childProps && childProps.children) {
                        return React.cloneElement(children, {
                          ...childProps,
                          children: processNodeChildren(childProps.children),
                        } as any);
                      }
                    }
                    return children;
                  };

                  return (
                    <>
                      {cleanContent ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                        p({ node, children, ...props }: any) {
                          // Extract text to check for search status or sources heading
                          const rawText = React.Children.toArray(children)
                            .map((c) => (typeof c === 'string' ? c : (c as any)?.props?.children || ''))
                            .join('');

                          if (
                            rawText.includes('Mencari maklumat terkini di internet') ||
                            rawText.includes('Searching the web for latest')
                          ) {
                            const cleanText = rawText.replace(/[🔍🔎*]/g, '').trim();
                            return (
                              <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 text-xs font-medium my-2 select-none shadow-xs font-mono">
                                <AnimatedSearchSvg className="w-4 h-4 text-neutral-800 dark:text-neutral-200" />
                                <span className="animate-pulse">{cleanText}</span>
                              </div>
                            );
                          }

                          if (
                            rawText.includes('Sumber Rujukan Terkini') ||
                            rawText.includes('Latest Sources')
                          ) {
                            const cleanText = rawText.replace(/[🌐*:]/g, '').trim() + ':';
                            return (
                              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200 mt-4 mb-2 select-none pb-1.5 border-b border-neutral-200 dark:border-neutral-800">
                                <AnimatedGlobeSvg className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                                <span>{cleanText}</span>
                              </div>
                            );
                          }

                          return (
                            <p className="mb-3 last:mb-0 leading-relaxed" {...props}>
                              {processNodeChildren(children)}
                              {renderCursor(node)}
                            </p>
                          );
                        },
                        li({ node, children, ...props }: any) {
                          return (
                            <li className="my-1" {...props}>
                              {processNodeChildren(children)}
                              {renderCursor(node)}
                            </li>
                          );
                        },
                        a({ node, children, href, ...props }: any) {
                          return (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline font-medium break-all cursor-pointer"
                              {...props}
                            >
                              {processNodeChildren(children)}
                            </a>
                          );
                        },
                        h1({ node, children, ...props }: any) {
                          return (
                            <h1 className="text-xl font-bold mt-4 mb-2" {...props}>
                              {processNodeChildren(children)}
                              {renderCursor(node)}
                            </h1>
                          );
                        },
                        h2({ node, children, ...props }: any) {
                          return (
                            <h2 className="text-lg font-bold mt-3 mb-2" {...props}>
                              {processNodeChildren(children)}
                              {renderCursor(node)}
                            </h2>
                          );
                        },
                        h3({ node, children, ...props }: any) {
                          return (
                            <h3 className="text-base font-semibold mt-2 mb-1" {...props}>
                              {processNodeChildren(children)}
                              {renderCursor(node)}
                            </h3>
                          );
                        },
                        blockquote({ node, children, ...props }: any) {
                          return (
                            <blockquote className="border-l-2 border-neutral-400 pl-4 my-2 italic" {...props}>
                              {processNodeChildren(children)}
                              {renderCursor(node)}
                            </blockquote>
                          );
                        },
                        code({ node, inline, className, children, ...props }: any) {
                          const match = /language-([^\s]+)/.exec(className || '');
                          const rawLang = match ? match[1] : '';
                          const meta = (node?.data?.meta as string) || '';
                          const content = String(children).replace(/\n$/, '');
                          return !inline && (rawLang || content.includes('\n')) ? (
                            <CodeBlock language={rawLang} meta={meta} value={content} />
                          ) : (
                            <code
                              className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-black dark:text-white font-mono text-xs border border-neutral-300 dark:border-neutral-700"
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        },
                        table({ children }) {
                          return (
                            <div className="overflow-x-auto my-3 border border-neutral-300 dark:border-neutral-800 rounded-lg">
                              <table className="min-w-full divide-y divide-neutral-300 dark:divide-neutral-800 text-xs">
                                {children}
                              </table>
                            </div>
                          );
                        },
                      }}
                    >
                      {cleanContent}
                    </ReactMarkdown>
                  ) : null}
                  {!isUser && (() => {
                    const grillQuestions = parseGrillQuestions(cleanContent);
                    return grillQuestions.length > 0 ? (
                      <GrillCard questions={grillQuestions} isLatest={isLastAssistant} />
                    ) : null;
                  })()}
                </>
              );
            })()
              )}
            </div>
          )}

          {/* Action Toolbar */}
          {!isEditing && (
            <div className="flex items-center gap-2 mt-3 pt-1 text-neutral-400 dark:text-neutral-500 text-xs">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 p-1 hover:text-black dark:hover:text-white rounded transition-colors"
                title="Copy message"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-black dark:text-white" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              {isUser ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1 p-1 hover:text-black dark:hover:text-white rounded transition-colors"
                  title="Edit message"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              ) : (
                isLastAssistant &&
                !isStreaming && (
                  <button
                    onClick={regenerateMessage}
                    className="flex items-center gap-1 p-1 hover:text-black dark:hover:text-white rounded transition-colors"
                    title="Regenerate response"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
