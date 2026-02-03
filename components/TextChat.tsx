import React, { useState, useRef, useEffect } from 'react';

export interface ChatMessage {
    role: 'user' | 'ai';
    content: string;
    timestamp: number;
}

interface TextChatProps {
    messages: ChatMessage[];
    onSendMessage: (message: string) => void;
    isTyping: boolean;
    tutorName: string;
    placeholder?: string;
}

export const TextChat: React.FC<TextChatProps> = ({
    messages,
    onSendMessage,
    isTyping,
    tutorName,
    placeholder = "Type your message here..."
}) => {
    const [inputValue, setInputValue] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = () => {
        if (inputValue.trim() && !isTyping) {
            onSendMessage(inputValue.trim());
            setInputValue('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-900/40 backdrop-blur-md rounded-xl border border-gray-700 overflow-hidden shadow-2xl">
            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
            >
                {messages.length === 0 && !isTyping && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 italic text-center p-6">
                        <div className="text-4xl mb-3">💬</div>
                        <p>Start your conversation with {tutorName}!</p>
                        <p className="text-sm mt-1">You can speak in English or try the target language.</p>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                    >
                        <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm ${msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-gray-800 text-gray-100 border border-gray-700 rounded-bl-none'
                            }`}>
                            <div className="text-xs opacity-50 mb-1 font-medium">
                                {msg.role === 'user' ? 'You' : tutorName}
                            </div>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            <div className="text-[10px] opacity-40 text-right mt-1">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="flex justify-start animate-fade-in">
                        <div className="bg-gray-800 text-gray-100 border border-gray-700 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                <span className="ml-2 text-xs text-gray-400">{tutorName} is thinking...</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-gray-800/50 border-t border-gray-700">
                <div className="flex items-end gap-2 bg-gray-900 border border-gray-600 rounded-xl focus-within:border-blue-500 transition-colors p-2 shadow-inner">
                    <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        rows={1}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-gray-100 text-sm py-2 px-2 resize-none max-h-32 custom-scrollbar"
                        style={{ minHeight: '40px' }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isTyping}
                        className={`p-2.5 rounded-lg transition-all ${!inputValue.trim() || isTyping
                                ? 'text-gray-600 cursor-not-allowed'
                                : 'text-white bg-blue-600 hover:bg-blue-500 hover:scale-105 active:scale-95 shadow-lg shadow-blue-900/20'
                            }`}
                        title="Send Message"
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                    </button>
                </div>
                <div className="mt-2 flex justify-between items-center text-[10px] text-gray-500 px-1">
                    <span>Press Enter to send, Shift+Enter for new line</span>
                    <span>Powered by Gemini 2.0 Flash</span>
                </div>
            </div>
        </div>
    );
};
