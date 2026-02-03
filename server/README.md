# Signaling Server

WebRTC signaling server for Language Tutor AI human connectivity feature.

## Setup

```bash
cd server
npm install
npm run dev
```

## Environment Variables

Create a `.env` file:

```
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

## API Endpoints

### HTTP
- `GET /health` - Health check and stats

### WebSocket Events

**Client → Server:**
- `create-room` - Tutor creates a session
- `join-room` - Student joins a session
- `webrtc-offer` - WebRTC offer
- `webrtc-answer` - WebRTC answer
- `ice-candidate` - ICE candidate
- `state-update` - Tutor sends state change

**Server → Client:**
- `room-created` - Room ready with code
- `room-joined` - Successfully joined room
- `join-error` - Failed to join room
- `peer-joined` - Other peer joined
- `peer-left` - Other peer disconnected
- `webrtc-offer` - Forwarded offer
- `webrtc-answer` - Forwarded answer
- `ice-candidate` - Forwarded ICE candidate
- `state-update` - Forwarded state change

## Testing

```bash
# Check server health
curl http://localhost:3001/health
```
