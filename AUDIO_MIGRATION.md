# AudioWorklet Migration Guide

## Current Issue

The application currently uses `ScriptProcessorNode` for audio input processing, which is deprecated:

```
[Deprecation] The ScriptProcessorNode is deprecated. Use AudioWorkletNode instead.
```

**Location**: `App.tsx` line 384

## Why Migrate?

1. **Performance**: AudioWorklet runs on a separate thread, preventing audio glitches
2. **Future-proof**: ScriptProcessorNode will be removed from browsers eventually
3. **Lower latency**: Better real-time audio processing

## Migration Steps

### 1. Create AudioWorklet Processor

Create a new file: `audio-processor.worklet.js`

```javascript
class AudioInputProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    if (input.length > 0) {
      const inputChannel = input[0];
      
      // Convert Float32Array to Int16Array for PCM encoding
      const pcmBuffer = new Int16Array(inputChannel.length);
      for (let i = 0; i < inputChannel.length; i++) {
        pcmBuffer[i] = inputChannel[i] * 32768;
      }
      
      // Send to main thread
      this.port.postMessage({
        audioData: pcmBuffer.buffer
      }, [pcmBuffer.buffer]); // Transfer ownership for efficiency
    }
    
    return true; // Keep processor alive
  }
}

registerProcessor('audio-input-processor', AudioInputProcessor);
```

### 2. Update App.tsx

Replace the ScriptProcessorNode code (lines 384-402) with:

```typescript
// In startConversation function, replace the onopen callback:

onopen: async () => {
    setStatus(`You're live with ${tutorName}.`);
    
    // Load the AudioWorklet module
    await inputAudioContext.audioWorklet.addModule('/audio-processor.worklet.js');
    
    // Create AudioWorklet node
    const workletNode = new AudioWorkletNode(inputAudioContext, 'audio-input-processor');
    
    // Handle messages from the worklet
    workletNode.port.onmessage = (event) => {
        if (!isRecording) return;
        
        const pcmBuffer = new Uint8Array(event.data.audioData);
        const pcmBlob: Blob = {
            data: encode(pcmBuffer),
            mimeType: 'audio/pcm;rate=16000',
        };
        
        sessionPromiseRef.current?.then(s => {
            try { 
                s.sendRealtimeInput({ media: pcmBlob }); 
            } catch (err) { 
                console.error("Error sending audio:", err); 
            }
        });
    };
    
    // Connect: source -> analyser -> worklet -> destination
    analyser.connect(workletNode);
    workletNode.connect(inputAudioContext.destination);
    
    // Store reference for cleanup
    processorNodeRef.current = workletNode as any;
},
```

### 3. Update Cleanup Logic

The cleanup in `cleanupConversation()` should work the same way since we're storing the worklet node in `processorNodeRef`.

### 4. Update Vite Config

Add the worklet file to public assets so it can be loaded:

```typescript
// vite.config.ts
export default defineConfig(({ mode }) => {
    // ... existing config
    return {
        // ... existing config
        publicDir: 'public', // Ensure public directory is served
        // ... rest of config
    };
});
```

Then create a `public` directory and move `audio-processor.worklet.js` there, or configure Vite to serve it from the root.

### 5. Testing

1. Start the dev server
2. Open browser console
3. Start a conversation
4. Verify no deprecation warning appears
5. Verify audio input still works correctly
6. Check that audio visualizer still functions

## Benefits After Migration

- ✅ No deprecation warnings
- ✅ Better performance (separate thread)
- ✅ Lower latency
- ✅ Future-proof code
- ✅ More efficient memory usage (transferable buffers)

## Potential Issues

1. **Browser Support**: AudioWorklet requires HTTPS or localhost (already satisfied in dev)
2. **Debugging**: Harder to debug worklet code (runs in separate context)
3. **Module Loading**: Worklet file must be served as a separate file (can't be inlined)

## When to Migrate

This migration is **not urgent** since:
- ScriptProcessorNode still works in all browsers
- The deprecation is a warning, not an error
- The current implementation is functional

However, it's recommended to migrate when:
- You have time for thorough testing
- You're preparing for production deployment
- You notice audio performance issues
- Browser vendors announce removal timeline

## References

- [MDN: AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet)
- [Web Audio API: AudioWorkletNode](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletNode)
- [Google Developers: Enter Audio Worklet](https://developers.google.com/web/updates/2017/12/audio-worklet)
