import express from 'express';
import { AccessToken } from 'livekit-server-sdk';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get a token to join a room
router.get('/token', requireAuth, async (req, res) => {
    const { roomId } = req.query;
    
    if (!roomId) {
        return res.status(400).json({ error: 'roomId is required' });
    }

    const roomName = roomId;
    const participantName = req.user.display_name;
    const participantId = req.user.id;
    
    // Using environment variables for LiveKit config
    const apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
    const apiSecret = process.env.LIVEKIT_API_SECRET || 'secret';

    const at = new AccessToken(apiKey, apiSecret, {
        identity: participantId,
        name: participantName,
    });
    
    // Set permissions based on role
    // Tutor has open mic, student uses PTT (handled client-side)
    at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canPublishData: true,
        canSubscribe: true,
    });

    try {
        const token = await at.toJwt();
        res.json({ token, wsUrl: process.env.LIVEKIT_URL || 'ws://localhost:7880' });
    } catch (err) {
        console.error('Failed to generate token', err);
        res.status(500).json({ error: 'Failed to generate token' });
    }
});

export default router;
