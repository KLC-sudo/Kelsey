import React, { useState, useRef } from 'react';

// Tooltip state
interface TooltipState {
    visible: boolean;
    text: string;
    x: number;
    y: number;
}

// Component props
interface HoverToTranslateProps {
    text: string;
    translations: Map<string, string>;
}

export const HoverToTranslate: React.FC<HoverToTranslateProps> = ({ text, translations }) => {
    const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, text: '', x: 0, y: 0 });
    const hoverTimeoutRef = useRef<number | null>(null);
    const leaveTimeoutRef = useRef<number | null>(null);

    const getTranslation = (word: string): string => {
        // Normalize word for better matching: lowercase, remove non-letter characters.
        // Use Unicode property escapes to correctly handle letters from various languages.
        const cleanWord = word.toLowerCase().replace(/[^\p{L}\p{M}]/gu, '');
        if (!cleanWord) return '';

        // Only check pre-fetched translations from props.
        if (translations.has(cleanWord)) {
            return translations.get(cleanWord)!;
        }

        return '';
    };

    const handleMouseEnter = (e: React.MouseEvent<HTMLSpanElement>, word: string) => {
        if (leaveTimeoutRef.current) {
            clearTimeout(leaveTimeoutRef.current);
            leaveTimeoutRef.current = null;
        }

        const targetElement = e.currentTarget;

        // Set a delay before showing the tooltip to feel less intrusive
        hoverTimeoutRef.current = window.setTimeout(() => {
            const translation = getTranslation(word);
            if (translation && targetElement) {
                const rect = targetElement.getBoundingClientRect();
                setTooltip({
                    visible: true,
                    text: translation,
                    x: rect.left + rect.width / 2, // Center tooltip above the word
                    y: rect.top, // Position tooltip at the top of the word
                });
            }
        }, 300);
    };

    const handleMouseLeave = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        leaveTimeoutRef.current = window.setTimeout(() => {
            setTooltip({ visible: false, text: '', x: 0, y: 0 });
        }, 100);
    };

    // Split text by spaces and punctuation while preserving them for proper rendering
    const segments = text.split(/(\s+|[.,!?])/);

    return (
        <div onMouseLeave={handleMouseLeave}>
            {tooltip.visible && (
                <div
                    className="fixed px-2 py-1 bg-gray-800 border border-gray-600 text-white text-sm rounded-md shadow-lg z-50 pointer-events-none"
                    style={{
                        left: `${tooltip.x}px`,
                        top: `${tooltip.y}px`,
                        transform: 'translate(-50%, -110%)',
                    }}
                    onMouseEnter={() => {
                        if (leaveTimeoutRef.current) {
                            clearTimeout(leaveTimeoutRef.current);
                            leaveTimeoutRef.current = null;
                        }
                    }}
                    onMouseLeave={handleMouseLeave}
                >
                    {tooltip.text}
                </div>
            )}
            {segments.map((segment, index) => {
                // Check if segment is a word (not just whitespace or punctuation)
                if (/\p{L}/u.test(segment)) {
                    return (
                        <span
                            key={index}
                            className="cursor-help underline decoration-dotted decoration-gray-400 hover:text-blue-300 transition-colors"
                            onMouseEnter={(e) => handleMouseEnter(e, segment)}
                        >
                            {segment}
                        </span>
                    );
                }
                // Return whitespace or punctuation as is
                return <span key={index}>{segment}</span>;
            })}
        </div>
    );
};