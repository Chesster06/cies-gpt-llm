import React, { useState } from 'react';
import { Check, Copy, FileCode } from 'lucide-react';

interface CodeBlockProps {
  language?: string;
  meta?: string;
  value: string;
}

export function extractFileInfo(rawLang: string = '', meta: string = '', code: string = ''): {
  fileName: string;
  displayLang: string;
} {
  let lang = rawLang.trim().toLowerCase();
  let candidateName = '';

  // 1. Check if language has embedded filename (e.g., "php:User.php" or "python:server.py")
  if (lang.includes(':')) {
    const parts = lang.split(':');
    lang = parts[0].trim();
    candidateName = parts.slice(1).join(':').trim();
  }

  // 2. Check meta string (e.g., filename="User.php" or title="User.php" or "User.php")
  if (!candidateName && meta) {
    const titleMatch = /(?:filename|title)=["']?([^"'\s]+)["']?/i.exec(meta);
    if (titleMatch) {
      candidateName = titleMatch[1];
    } else {
      const firstToken = meta.trim().split(/\s+/)[0];
      if (firstToken && firstToken.includes('.')) {
        candidateName = firstToken;
      }
    }
  }

  // 3. Check first 3 lines of code for explicit filename comments
  if (!candidateName && code) {
    const lines = code.slice(0, 300).split('\n');
    for (let i = 0; i < Math.min(lines.length, 3); i++) {
      const line = lines[i].trim();
      // Match patterns like: // User.php, # server.py, /* styles.css */, <!-- index.html -->, // File: User.php
      const match = /^(?:\/\/|#|\/\*|<!--|--)\s*(?:file(?:name|path)?:\s*)?([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+)\s*(?:\*\/|-->)?$/i.exec(line);
      if (match) {
        candidateName = match[1].split('/').pop() || match[1];
        break;
      }
    }
  }

  // Normalize language name
  const langAliases: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    py: 'python',
    sh: 'bash',
    shell: 'bash',
    golang: 'go',
    cs: 'csharp',
    rb: 'ruby',
    yml: 'yaml',
  };
  const normalizedLang = langAliases[lang] || lang || 'text';

  // 4. Intelligent inference based on language and code syntax
  if (!candidateName) {
    switch (normalizedLang) {
      case 'php': {
        const classMatch = /class\s+([A-Za-z0-9_]+)/.exec(code);
        candidateName = classMatch ? `${classMatch[1]}.php` : 'index.php';
        break;
      }
      case 'python': {
        const classMatch = /class\s+([A-Za-z0-9_]+)/.exec(code);
        if (classMatch) {
          candidateName = `${classMatch[1].toLowerCase()}.py`;
        } else if (code.includes('FastAPI') || code.includes('Flask') || code.includes('app =')) {
          candidateName = 'app.py';
        } else if (code.includes('def main') || code.includes('__main__')) {
          candidateName = 'main.py';
        } else {
          candidateName = 'script.py';
        }
        break;
      }
      case 'tsx':
      case 'jsx': {
        const compMatch = /(?:export\s+(?:default\s+)?(?:function|const))\s+([A-Z][A-Za-z0-9_]+)/.exec(code);
        candidateName = compMatch ? `${compMatch[1]}.${normalizedLang}` : `App.${normalizedLang}`;
        break;
      }
      case 'typescript': {
        if (code.includes('interface ') || code.includes('type ')) {
          candidateName = 'types.ts';
        } else {
          const classMatch = /class\s+([A-Za-z0-9_]+)/.exec(code);
          candidateName = classMatch ? `${classMatch[1]}.ts` : 'index.ts';
        }
        break;
      }
      case 'javascript': {
        if (code.includes('express()') || code.includes('createServer')) {
          candidateName = 'server.js';
        } else {
          const classMatch = /class\s+([A-Za-z0-9_]+)/.exec(code);
          candidateName = classMatch ? `${classMatch[1]}.js` : 'index.js';
        }
        break;
      }
      case 'html': {
        candidateName = 'index.html';
        break;
      }
      case 'css': {
        candidateName = 'styles.css';
        break;
      }
      case 'go': {
        const pkgMatch = /package\s+([A-Za-z0-9_]+)/.exec(code);
        const pkg = pkgMatch ? pkgMatch[1] : 'main';
        candidateName = `${pkg === 'main' ? 'main' : pkg}.go`;
        break;
      }
      case 'sql': {
        candidateName = code.toUpperCase().includes('CREATE TABLE') ? 'schema.sql' : 'query.sql';
        break;
      }
      case 'json': {
        candidateName = code.includes('"dependencies"') ? 'package.json' : 'data.json';
        break;
      }
      case 'yaml': {
        candidateName = code.includes('services:') ? 'docker-compose.yml' : 'config.yaml';
        break;
      }
      case 'bash': {
        candidateName = 'script.sh';
        break;
      }
      case 'rust': {
        candidateName = 'main.rs';
        break;
      }
      case 'c': {
        candidateName = 'main.c';
        break;
      }
      case 'cpp': {
        candidateName = 'main.cpp';
        break;
      }
      case 'java': {
        const classMatch = /(?:public\s+)?class\s+([A-Za-z0-9_]+)/.exec(code);
        candidateName = classMatch ? `${classMatch[1]}.java` : 'Main.java';
        break;
      }
      case 'csharp': {
        const classMatch = /(?:public\s+)?class\s+([A-Za-z0-9_]+)/.exec(code);
        candidateName = classMatch ? `${classMatch[1]}.cs` : 'Program.cs';
        break;
      }
      case 'dockerfile': {
        candidateName = 'Dockerfile';
        break;
      }
      default: {
        candidateName = normalizedLang !== 'text' ? `code.${normalizedLang}` : 'snippet.txt';
        break;
      }
    }
  }

  return {
    fileName: candidateName,
    displayLang: (normalizedLang !== 'text' ? normalizedLang : (candidateName.split('.').pop() || 'CODE')).toUpperCase(),
  };
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language = 'text', meta = '', value }) => {
  const [copied, setCopied] = useState(false);
  const { fileName, displayLang } = extractFileInfo(language, meta, value);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-4 rounded-xl overflow-hidden border border-neutral-300 dark:border-[#2f2f2f] bg-[#f8f9fa] dark:bg-[#161616] shadow-xs">
      {/* CodeBlock Header with File Name, Language Badge and Copy Button */}
      <div className="flex items-center justify-between px-4 py-2 bg-neutral-200/90 dark:bg-[#232323] border-b border-neutral-300 dark:border-[#2f2f2f] text-xs font-mono select-none">
        <div className="flex items-center gap-2 overflow-hidden mr-2">
          <FileCode className="w-3.5 h-3.5 text-neutral-800 dark:text-neutral-200 flex-shrink-0" />
          <span className="font-semibold text-neutral-800 dark:text-neutral-100 truncate tracking-tight text-[13px]">
            {fileName}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-300/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold uppercase tracking-wider flex-shrink-0">
            {displayLang}
          </span>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-neutral-300/60 dark:hover:bg-neutral-700/60 transition-colors cursor-pointer flex-shrink-0"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-black dark:text-white" />
              <span className="text-black dark:text-white font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>

      {/* Code Editor Preview */}
      <div className="p-4 overflow-x-auto text-[13px] font-mono text-[#24292e] dark:text-[#e6edf3] leading-relaxed bg-[#f8f9fa] dark:bg-[#161616]">
        <pre className="whitespace-pre">
          <code>{value}</code>
        </pre>
      </div>
    </div>
  );
};

