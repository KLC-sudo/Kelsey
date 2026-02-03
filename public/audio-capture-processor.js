// Audio Worklet Processor - Runs on separate audio thread (not main thread)
// This replaces the deprecated ScriptProcessorNode

class AudioCaptureProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 2048; // Larger buffer = less frequent processing
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];

        // If no input, return
        if (!input || !input[0]) {
            return true;
        }

        const inputChannel = input[0]; // Mono channel

        // Fill buffer
        for (let i = 0; i < inputChannel.length; i++) {
            this.buffer[this.bufferIndex++] = inputChannel[i];

            // When buffer is full, send to main thread
            if (this.bufferIndex >= this.bufferSize) {
                // Send copy of buffer to main thread
                this.port.postMessage({
                    audioData: this.buffer.slice(0)
                });

                // Reset buffer
                this.bufferIndex = 0;
            }
        }

        // Keep processor alive
        return true;
    }
}

// Register the processor
registerProcessor('audio-capture-processor', AudioCaptureProcessor);
