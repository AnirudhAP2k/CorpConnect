"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface FormattedMarkdownProps {
    content: string;
    className?: string;
}

export function FormattedMarkdown({ content, className = "" }: FormattedMarkdownProps) {
    if (!content) return null;

    return (
        <div className={`prose prose-xs max-w-none text-xs text-gray-800 leading-relaxed font-sans ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // Tables (GFM)
                    table: ({ children }) => (
                        <div className="my-2.5 overflow-x-auto rounded-xl border border-violet-100 shadow-xs bg-white">
                            <table className="w-full text-left text-[11px] border-collapse min-w-[280px]">
                                {children}
                            </table>
                        </div>
                    ),
                    thead: ({ children }) => (
                        <thead className="bg-violet-50/80 text-violet-900 font-semibold border-b border-violet-100">
                            {children}
                        </thead>
                    ),
                    tbody: ({ children }) => (
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {children}
                        </tbody>
                    ),
                    tr: ({ children }) => (
                        <tr className="hover:bg-violet-50/40 transition-colors">
                            {children}
                        </tr>
                    ),
                    th: ({ children }) => (
                        <th className="px-3 py-2 font-semibold text-violet-950 uppercase tracking-wider text-[10px]">
                            {children}
                        </th>
                    ),
                    td: ({ children }) => (
                        <td className="px-3 py-2 text-gray-700 font-normal">
                            {children}
                        </td>
                    ),
                    // Headings
                    h1: ({ children }) => (
                        <h1 className="text-sm font-bold text-gray-900 my-2 tracking-tight">
                            {children}
                        </h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className="text-xs font-bold text-violet-900 my-1.5 tracking-tight">
                            {children}
                        </h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className="text-[11px] font-semibold text-gray-900 my-1">
                            {children}
                        </h3>
                    ),
                    // Lists
                    ul: ({ children }) => (
                        <ul className="my-1.5 ml-4 list-disc space-y-1 text-gray-700">
                            {children}
                        </ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="my-1.5 ml-4 list-decimal space-y-1 text-gray-700">
                            {children}
                        </ol>
                    ),
                    li: ({ children }) => (
                        <li className="leading-normal pl-0.5">
                            {children}
                        </li>
                    ),
                    // Strong & Emphasis
                    strong: ({ children }) => (
                        <strong className="font-semibold text-violet-950">
                            {children}
                        </strong>
                    ),
                    em: ({ children }) => (
                        <em className="italic text-gray-800">
                            {children}
                        </em>
                    ),
                    // Paragraphs
                    p: ({ children }) => (
                        <p className="my-1 text-gray-800 leading-relaxed">
                            {children}
                        </p>
                    ),
                    // Inline Code & Code Blocks
                    code: ({ children }) => (
                        <code className="rounded bg-violet-50 px-1.5 py-0.5 font-mono text-[11px] text-violet-700 border border-violet-100">
                            {children}
                        </code>
                    ),
                    // Blockquotes
                    blockquote: ({ children }) => (
                        <blockquote className="my-2 border-l-2 border-violet-400 pl-3 italic text-gray-600 bg-violet-50/50 py-1 rounded-r-lg">
                            {children}
                        </blockquote>
                    ),
                    // Links
                    a: ({ href, children }) => (
                        <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-violet-600 underline underline-offset-2 hover:text-violet-800 transition-colors"
                        >
                            {children}
                        </a>
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
