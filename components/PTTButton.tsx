import React, { useState, useEffect } from 'react';
import { useLocalParticipant } from '@livekit/components-react';

export const PTTButton: React.FC = () => {
    const { localParticipant } = useLocalParticipant();
    const [isTalking, setIsTalking] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input field
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
            
            if (e.code === 'Space' && !e.repeat && !isTalking) {
                e.preventDefault();
                setIsTalking(true);
                localParticipant?.setMicrophoneEnabled(true).catch(err => console.warn('Failed to enable mic', err));
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

            if (e.code === 'Space') {
                e.preventDefault();
                setIsTalking(false);
                localParticipant?.setMicrophoneEnabled(false).catch(err => console.warn('Failed to disable mic', err));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        
        // Ensure mic is initially disabled for PTT users
        if (localParticipant?.isMicrophoneEnabled) {
            localParticipant.setMicrophoneEnabled(false).catch(err => console.warn('Failed to disable mic initially', err));
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [localParticipant, isTalking]);

    const handleMouseDown = () => {
        setIsTalking(true);
        localParticipant?.setMicrophoneEnabled(true).catch(err => console.warn('Failed to enable mic', err));
    };

    const handleMouseUp = () => {
        setIsTalking(false);
        localParticipant?.setMicrophoneEnabled(false).catch(err => console.warn('Failed to disable mic', err));
    };

    return (
        <button
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchEnd={handleMouseUp}
            className={`
                px-6 py-3 rounded-full font-bold text-lg shadow-lg
                transition-all duration-200 select-none
                ${isTalking 
                    ? 'bg-red-500 text-white scale-105 shadow-red-500/50' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }
            `}
        >
            <div className="flex items-center space-x-2">
                <span className="text-xl">{isTalking ? '🎙️' : '🎤'}</span>
                <span>{isTalking ? 'TALKING' : 'HOLD SPACE'}</span>
            </div>
        </button>
    );
};
