import React, { useEffect, useRef, useState } from 'react';

interface AudioIndicatorProps {
    stream: MediaStream | null;
    label: string;
}

export const AudioIndicator: React.FC<AudioIndicatorProps> = ({ stream, label }) => {
    const [volume, setVolume] = useState(0);
    const animationFrameRef = useRef<number>();
    const analyserRef = useRef<AnalyserNode>();
    const audioContextRef = useRef<AudioContext>();

    useEffect(() => {
        if (!stream) {
            setVolume(0);
            return;
        }

        // Create audio context and analyser
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);

        source.connect(analyser);
        analyser.fftSize = 256;

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateVolume = () => {
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            setVolume(Math.min(100, (average / 255) * 100));
            animationFrameRef.current = requestAnimationFrame(updateVolume);
        };

        updateVolume();

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            source.disconnect();
            audioContext.close();
        };
    }, [stream]);

    const bars = 5;
    const activeBarCount = Math.ceil((volume / 100) * bars);

    return (
        <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-2 rounded-lg border border-gray-700">
            <span className="text-xs text-gray-400 font-medium min-w-[60px]">{label}</span>
            <div className="flex items-center gap-1">
                {Array.from({ length: bars }).map((_, i) => (
                    <div
                        key={i}
                        className={`w-1 rounded-full transition-all duration-75 ${i < activeBarCount
                                ? 'bg-green-400 h-4'
                                : 'bg-gray-600 h-2'
                            }`}
                    />
                ))}
            </div>
            {stream && volume > 5 && (
                <span className="text-xs text-green-400">🎤</span>
            )}
        </div>
    );
};
