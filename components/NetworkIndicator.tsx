import React from 'react';
import { SignalIcon } from './icons';

interface NetworkIndicatorProps {
  latency: number | null;
}

export const NetworkIndicator: React.FC<NetworkIndicatorProps> = ({ latency }) => {
  // If latency is null, it's the start of the conversation, show a "pinging" state
  if (latency === null) {
    return (
      <div className="flex items-center space-x-2 animate-pulse">
        <SignalIcon className="w-5 h-5 text-gray-500" />
        <span className="text-sm font-mono text-gray-500">Pinging...</span>
      </div>
    );
  }

  let status: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  let colorClass = '';
  let description = '';

  if (latency <= 300) {
    status = 'Excellent';
    colorClass = 'text-green-400';
    description = "Your connection is great. Expect a seamless conversation.";
  } else if (latency <= 700) {
    status = 'Good';
    colorClass = 'text-amber-400';
    description = "Your connection is solid. The conversation should be smooth.";
  } else if (latency <= 1500) {
    status = 'Fair';
    colorClass = 'text-orange-500';
    description = "You might experience some minor delays in the AI's responses.";
  } else {
    status = 'Poor';
    colorClass = 'text-red-500';
    description = "Your connection is slow. The AI's responses may be noticeably delayed.";
  }

  return (
    <div className="flex items-center space-x-2 group relative">
      <SignalIcon className={`w-5 h-5 ${colorClass}`} />
      <span className={`text-sm font-mono ${colorClass}`}>{Math.round(latency)}ms</span>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs p-2 bg-gray-700 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <p className="font-bold">{status} Connection</p>
        <p>{description}</p>
      </div>
    </div>
  );
};