/* Camera Management */

import { V_W, V_H } from './config.js';

export function updateCamera(cam, players, myId, viewScaleRef, canvas, V_W, V_H) {
    if (!players[myId]) return;
    const p = players[myId].body.position;
    const maxX = V_W * viewScaleRef.current - canvas.width;
    const maxY = V_H * viewScaleRef.current - canvas.height;
    const targetX = p.x * viewScaleRef.current - canvas.width / 2;
    const targetY = p.y * viewScaleRef.current - canvas.height / 2;
    cam.x = Math.max(0, Math.min(maxX, targetX));
    cam.y = Math.max(0, Math.min(maxY, targetY));
}

