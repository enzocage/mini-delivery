/***************************************************************************
 * 9. HIGH-DPI VECTOR RENDERER (AUTHENTIC MINI METRO / MOTORWAYS GFX)
 ***************************************************************************/
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    updateAutoCamera(1.0, true);
}

function screenToWorld(sx, sy) {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    return {
        x: (sx - cx) / state.cam.zoom + state.cam.x,
        y: (sy - cy) / state.cam.zoom + state.cam.y
    };
}

function drawRoundedPolygon(ctx, pts) {
    if (pts.length < 3) return;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i][0], pts[i][1]);
    }
    ctx.closePath();
    ctx.fill();
}

function drawSmoothPolyline(ctx, pts, cornerRadius = 22) {
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
        const p0 = pts[i - 1];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const d1 = dist(p0[0], p0[1], p1[0], p1[1]);
        const d2 = dist(p1[0], p1[1], p2[0], p2[1]);
        const r = Math.min(cornerRadius, d1 * 0.48, d2 * 0.48);
        ctx.arcTo(p1[0], p1[1], p2[0], p2[1], r);
    }
    ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    ctx.stroke();
}

function drawLineTerminalTBar(ctx, node, neighborNode, color, isHovered) {
    const tbar = getTerminalTBarPoint(node, neighborNode, 0);
    if (!tbar) return;
    const stemDist = node.radius + (isHovered ? 12.5 : 9.5);
    const barHalf = isHovered ? 9.5 : 7.5;

    ctx.save();
    ctx.translate(node.x, node.y);
    ctx.rotate(tbar.angle);
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineWidth = isHovered ? 6.5 : 5.0;

    ctx.beginPath();
    ctx.moveTo(node.radius * 0.6, 0);
    ctx.lineTo(stemDist, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(stemDist, -barHalf);
    ctx.lineTo(stemDist, barHalf);
    ctx.stroke();
    ctx.restore();
}

function drawLineLoopCap(ctx, node, neighborA, neighborB, color, isHovered) {
    const cap = getLoopCapPoint(node, neighborA, neighborB);
    if (!cap) return;
    const ringDist = node.radius + (isHovered ? 13.5 : 11.5);
    const ringR = isHovered ? 6.2 : 5.0;

    ctx.save();
    ctx.translate(node.x, node.y);
    ctx.rotate(cap.angle);

    if (isHovered) {
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.arc(ringDist, 0, ringR + 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineWidth = isHovered ? 5.2 : 4.2;
    ctx.beginPath();
    ctx.moveTo(node.radius * 0.6, 0);
    ctx.lineTo(ringDist - ringR, 0);
    ctx.stroke();

    ctx.fillStyle = state.nightMode ? '#182232' : '#F4F1EA';
    ctx.beginPath();
    ctx.arc(ringDist, 0, ringR, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = isHovered ? 3.4 : 2.8;
    ctx.beginPath();
    ctx.arc(ringDist, 0, ringR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(ringDist, 0, isHovered ? 2.2 : 1.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawConnectorPlug(ctx, x, y, color, isHovered = false) {
    ctx.save();
    ctx.translate(x, y);
    const r = isHovered ? 7.2 : 5.2;
    if (isHovered) {
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.28;
        ctx.beginPath();
        ctx.arc(0, 0, r + 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, isHovered ? 2.8 : 2.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawPackagePip(ctx, x, y, size, r = 5.2, scale = 1.0) {
    if (scale <= 0.02) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    if (size === 'S') {
        ctx.fillStyle = '#0EA5E9';
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
    } else if (size === 'L') {
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.roundRect(-r, -r, r * 2, r * 2, r * 0.38);
        ctx.fill();
    } else {
        ctx.fillStyle = '#F43F5E';
        ctx.rotate(Math.PI / 4);
        ctx.beginPath();
        ctx.roundRect(-r * 0.95, -r * 0.95, r * 1.9, r * 1.9, r * 0.25);
        ctx.fill();
    }
    ctx.restore();
}

function drawRegularPolygon(ctx, x, y, radius, sides, rotation = 0) {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
        const a = rotation + (i * 2 * Math.PI) / sides;
        const px = x + Math.cos(a) * radius;
        const py = y + Math.sin(a) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
}

function renderGame() {
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.scale(dpr, dpr);

    const city = currentCity();
    const pal = state.nightMode ? city.night : city.day;

    // 1. Paper / Night-Slate Background Fill
    ctx.fillStyle = pal.land;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    // Apply Smooth Auto-Camera Transform
    ctx.translate(window.innerWidth / 2, window.innerHeight / 2);
    ctx.scale(state.cam.zoom, state.cam.zoom);
    ctx.translate(-state.cam.x, -state.cam.y);

    // 2. Ultra-Subtle Cartographic Grid
    ctx.strokeStyle = state.nightMode ? 'rgba(255,255,255,0.022)' : 'rgba(0,0,0,0.025)';
    ctx.lineWidth = 1;
    const gridStep = 50;
    ctx.beginPath();
    for (let gx = -100; gx <= WORLD_W + 100; gx += gridStep) {
        ctx.moveTo(gx, -100); ctx.lineTo(gx, WORLD_H + 100);
    }
    for (let gy = -100; gy <= WORLD_H + 100; gy += gridStep) {
        ctx.moveTo(-100, gy); ctx.lineTo(WORLD_W + 100, gy);
    }
    ctx.stroke();

    // 3. Authentic Water Polygons & Smooth Rivers
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.strokeStyle = state.nightMode ? 'rgba(56, 189, 248, 0.08)' : 'rgba(0, 0, 0, 0.04)';
    for (const r of city.rivers) {
        ctx.lineWidth = r.width + 5;
        drawSmoothPolyline(ctx, r.pts, 40);
    }

    ctx.fillStyle = pal.water;
    ctx.strokeStyle = pal.water;
    for (const poly of city.waterPolys) {
        drawRoundedPolygon(ctx, poly);
    }
    for (const r of city.rivers) {
        ctx.lineWidth = r.width;
        drawSmoothPolyline(ctx, r.pts, 40);
    }

    // 4. Week 1 Onboarding Guide Wave
    if (!state.tutorialCompleted && state.lines.every(l => l.nodeIds.length < 2)) {
        const mainDepot = state.nodes.find(n => n.kind === 'DEPOT');
        const firstCust = state.nodes.find(n => n.kind === 'CUSTOMER');
        if (mainDepot && firstCust) {
            const pts = computeMetroWaypoints(mainDepot.x, mainDepot.y, firstCust.x, firstCust.y, 0);
            ctx.save();
            ctx.strokeStyle = '#F59E0B';
            ctx.globalAlpha = 0.45 + Math.sin(performance.now() * 0.005) * 0.2;
            ctx.lineWidth = 6;
            ctx.setLineDash([10, 10]);
            ctx.lineDashOffset = -performance.now() * 0.035;
            drawSmoothPolyline(ctx, pts, 20);
            ctx.restore();
        }
    }

    // 5. Subtle Drone Air-Zone Rings
    const showAllDroneRings = state.activeTool === 'drone' || (state.drag.active && state.drag.tokenType === 'drone');
    for (const n of state.nodes) {
        if (n.kind !== 'DEPOT') continue;
        const droneCount = state.drones.filter(d => d.homeNodeId === n.id).length;
        if (droneCount > 0 || state.inspectedNodeId === n.id || showAllDroneRings) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.droneRange * n.scale, 0, Math.PI * 2);
            ctx.strokeStyle = state.nightMode ? 'rgba(14, 165, 233, 0.20)' : 'rgba(14, 165, 233, 0.24)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([6, 6]);
            ctx.stroke();
            ctx.restore();
        }
    }

    // 6. Shockwave Ripples
    for (const rp of state.ripples) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
        ctx.strokeStyle = rp.color;
        ctx.globalAlpha = Math.max(0, rp.alpha);
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
    }

    // 7. Logistics Corridors (Lines), Parallel Offsets, Bridges, T-Bar / Loop-Cap Terminals & Connector Plugs
    for (const line of state.lines) {
        if (line.nodeIds.length < 2) continue;
        const isSelected = line.id === state.selectedLineId || line.id === state.hoveredLineId || line.id === state.hover.lineId;

        const firstNode = state.nodes.find(n => n.id === line.nodeIds[0]);
        const secondNode = state.nodes.find(n => n.id === line.nodeIds[1]);
        const lastNode = state.nodes.find(n => n.id === line.nodeIds[line.nodeIds.length - 1]);
        const prevLastNode = state.nodes.find(n => n.id === line.nodeIds[line.nodeIds.length - 2]);

        const draggingThisLine = state.drag.active && state.selectedLineId === line.id;
        if (line.isLoop && line.nodeIds.length >= 3) {
            drawLineLoopCap(ctx, firstNode, secondNode, lastNode, line.color, isSelected);
        } else {
            if (!(draggingThisLine && state.drag.mode === 'reroute_end' && state.drag.endSide === 'head')) {
                drawLineTerminalTBar(ctx, firstNode, secondNode, line.color, isSelected);
            }
            if (!(draggingThisLine && state.drag.mode === 'reroute_end' && state.drag.endSide === 'tail')) {
                drawLineTerminalTBar(ctx, lastNode, prevLastNode, line.color, isSelected);
            }
        }

        const segCount = getLineSegmentCount(line);
        for (let i = 0; i < segCount; i++) {
            if (draggingThisLine && state.drag.mode === 'reroute_mid' && state.drag.insertIndex === i + 1) {
                continue;
            }

            const [id1, id2] = getLineSegmentNodeIds(line, i);
            const n1 = state.nodes.find(n => n.id === id1);
            const n2 = state.nodes.find(n => n.id === id2);
            if (!n1 || !n2) continue;

            const laneOffset = getSegmentParallelOffset(line.id, n1.id, n2.id);
            const pts = computeMetroWaypoints(n1.x, n1.y, n2.x, n2.y, laneOffset);
            const isBridge = pts.some((p, idx) => idx < pts.length - 1 && doesSegmentCrossWater(p[0], p[1], pts[idx + 1][0], pts[idx + 1][1], city));

            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (isBridge) {
                ctx.strokeStyle = state.nightMode ? '#334155' : '#FFFFFF';
                ctx.lineWidth = isSelected ? 15.5 : 13.5;
                drawSmoothPolyline(ctx, pts, 22);
            }

            if (isSelected) {
                ctx.strokeStyle = line.color;
                ctx.globalAlpha = 0.22;
                ctx.lineWidth = 15;
                drawSmoothPolyline(ctx, pts, 22);
                ctx.globalAlpha = 1.0;
            }

            ctx.strokeStyle = line.color;
            ctx.lineWidth = isSelected ? 9.2 : 7.4;
            drawSmoothPolyline(ctx, pts, 22);
            ctx.restore();

            const c1 = getConnectorPoint(n1, n2, laneOffset);
            const c2 = getConnectorPoint(n2, n1, -laneOffset);
            if (c1) {
                const hov1 = state.hover.connector && state.hover.connector.line.id === line.id && state.hover.connector.node.id === n1.id && state.hover.connector.segIndex === i;
                drawConnectorPlug(ctx, c1.x, c1.y, line.color, hov1);
            }
            if (c2) {
                const hov2 = state.hover.connector && state.hover.connector.line.id === line.id && state.hover.connector.node.id === n2.id && state.hover.connector.segIndex === i;
                drawConnectorPlug(ctx, c2.x, c2.y, line.color, hov2);
            }
        }
    }

    // 8. Active Rubber-Band Line Drawing & Unplug/Reroute Preview
    if (state.drag.active && (state.drag.mode === 'draw_line' || state.drag.mode === 'reroute_end' || state.drag.mode === 'reroute_mid')) {
        const line = state.lines[state.selectedLineId];
        const snapNode = state.drag.snapNode;
        const targetX = snapNode ? snapNode.x : state.drag.currWorldX;
        const targetY = snapNode ? snapNode.y : state.drag.currWorldY;

        ctx.save();
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 8.8;
        ctx.globalAlpha = 0.88;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (state.drag.mode === 'reroute_mid' && state.drag.prevNode && state.drag.nextNode) {
            const pts1 = computeMetroWaypoints(state.drag.prevNode.x, state.drag.prevNode.y, targetX, targetY, 0);
            const pts2 = computeMetroWaypoints(targetX, targetY, state.drag.nextNode.x, state.drag.nextNode.y, 0);
            drawSmoothPolyline(ctx, pts1, 22);
            drawSmoothPolyline(ctx, pts2, 22);
        } else {
            const anchor = state.drag.mode === 'reroute_end' ? state.drag.anchorNode : state.drag.startNode;
            if (anchor) {
                const pts = computeMetroWaypoints(anchor.x, anchor.y, targetX, targetY, 0);
                drawSmoothPolyline(ctx, pts, 22);
            }
        }

        if (snapNode) {
            const willCloseLoop = !line.isLoop && line.nodeIds.length >= 3 &&
                (snapNode.id === line.nodeIds[0] || snapNode.id === line.nodeIds[line.nodeIds.length - 1]);

            ctx.beginPath();
            ctx.arc(snapNode.x, snapNode.y, snapNode.radius + 9, 0, Math.PI * 2);
            ctx.strokeStyle = line.color;
            ctx.lineWidth = 3.5;
            ctx.stroke();

            if (willCloseLoop) {
                ctx.beginPath();
                ctx.arc(snapNode.x, snapNode.y, snapNode.radius + 15, 0, Math.PI * 2);
                ctx.strokeStyle = line.color;
                ctx.setLineDash([5, 4]);
                ctx.lineWidth = 2.5;
                ctx.stroke();
                ctx.setLineDash([]);
            } else if (state.drag.isTouch) {
                ctx.beginPath();
                ctx.arc(snapNode.x, snapNode.y, snapNode.radius + 15, 0, Math.PI * 2);
                ctx.strokeStyle = line.color;
                ctx.globalAlpha = 0.28;
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.globalAlpha = 0.88;
            }
        } else if (state.drag.isTouch) {
            // Subtle Dinosaur Polo Club translucent touch halo around the finger
            ctx.beginPath();
            ctx.arc(targetX, targetY, 20 / Math.min(1.3, state.cam.zoom), 0, Math.PI * 2);
            ctx.fillStyle = line.color;
            ctx.globalAlpha = 0.14;
            ctx.fill();
            ctx.globalAlpha = 0.88;
        }

        drawConnectorPlug(ctx, targetX, targetY, line.color, true);
        ctx.restore();
    }

    // 9. Ghost Preview when dragging a Depot, Drone or Vehicle Token from the Bottom Dock
    if (state.drag.active && state.drag.mode === 'dock_token' && state.drag.tokenType) {
        const tType = state.drag.tokenType;
        const wx = state.drag.currWorldX;
        const wy = state.drag.currWorldY;
        const hitPad = state.drag.isTouch ? 34 : 20;
        ctx.save();

        // If touch-lifted above the thumb, draw a delicate dotted tether to the finger contact point
        if (state.drag.isTouch && (Math.abs(wx - state.drag.rawWorldX) > 2 || Math.abs(wy - state.drag.rawWorldY) > 2)) {
            ctx.beginPath();
            ctx.moveTo(state.drag.rawWorldX, state.drag.rawWorldY);
            ctx.lineTo(wx, wy);
            ctx.strokeStyle = state.nightMode ? 'rgba(248,250,252,0.35)' : 'rgba(35,39,46,0.28)';
            ctx.lineWidth = 1.8;
            ctx.setLineDash([3, 4]);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.beginPath();
            ctx.arc(state.drag.rawWorldX, state.drag.rawWorldY, 6, 0, Math.PI * 2);
            ctx.fillStyle = state.nightMode ? 'rgba(248,250,252,0.25)' : 'rgba(35,39,46,0.2)';
            ctx.fill();
        }

        if (tType.startsWith('depot_')) {
            const dClass = tType.split('_')[1];
            const spec = DEPOT_SPECS[dClass];
            const valid = !isPointInWater(wx, wy, city, 12) && !findNodeAtWorld(wx, wy, 20);
            ctx.beginPath();
            ctx.arc(wx, wy, spec.droneRange, 0, Math.PI * 2);
            ctx.strokeStyle = valid ? spec.color : '#EF4444';
            ctx.globalAlpha = 0.35;
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 6]);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.globalAlpha = 0.88;
            ctx.fillStyle = valid ? spec.color : '#EF4444';
            ctx.beginPath();
            ctx.arc(wx, wy, spec.radius, 0, Math.PI * 2);
            ctx.fill();
        } else if (tType === 'drone') {
            const targetDepot = findNodeAtWorld(wx, wy, hitPad);
            const valid = targetDepot && targetDepot.kind === 'DEPOT';
            if (valid) {
                ctx.beginPath();
                ctx.arc(targetDepot.x, targetDepot.y, targetDepot.radius + 10, 0, Math.PI * 2);
                ctx.strokeStyle = '#06B6D4';
                ctx.lineWidth = 3.5;
                ctx.stroke();
            }
            ctx.strokeStyle = valid ? '#06B6D4' : '#94A3B8';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(valid ? targetDepot.x : wx, valid ? targetDepot.y : wy, 14, 0, Math.PI * 2);
            ctx.stroke();
        } else if (tType === 'bike' || tType === 'car') {
            const targetLine = findLineAtWorld(wx, wy, hitPad);
            ctx.fillStyle = targetLine ? targetLine.color : '#64748B';
            ctx.globalAlpha = 0.9;
            ctx.beginPath();
            ctx.roundRect(wx - 14, wy - 7.5, 28, 15, 5);
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.restore();
    }

    // 10. Render Nodes: Hauptdepots, Zwischenlager (S/L/XL) & Customer Stations
    for (const n of state.nodes) {
        ctx.save();
        ctx.translate(n.x, n.y);

        const isHovered = state.hover.nodeId === n.id;
        const hoverBoost = isHovered ? 1.08 : 1.0;
        ctx.scale(n.scale * hoverBoost, n.scale * hoverBoost);

        if (n.kind === 'DEPOT') {
            const spec = DEPOT_SPECS[n.depotType];
            const r = n.radius;

            if (n.overloadTimer > 0.01) {
                ctx.save();
                const pulse = 1 + Math.sin(performance.now() * 0.014) * (0.04 + n.overloadTimer * 0.08);
                ctx.scale(pulse, pulse);

                ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.arc(0, 0, r + 15, -Math.PI / 2, -Math.PI / 2 + n.overloadTimer * Math.PI * 2);
                ctx.closePath();
                ctx.fill();

                ctx.beginPath();
                ctx.arc(0, 0, r + 12, -Math.PI / 2, -Math.PI / 2 + n.overloadTimer * Math.PI * 2);
                ctx.strokeStyle = '#EF4444';
                ctx.lineWidth = 4.4;
                ctx.lineCap = 'round';
                ctx.stroke();
                ctx.restore();
            }

            ctx.fillStyle = 'rgba(0,0,0,0.14)';
            ctx.beginPath();
            ctx.arc(0, 3, r + 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = state.nightMode ? '#1E293B' : '#FFFFFF';
            ctx.strokeStyle = spec.color;
            ctx.lineWidth = 4.2;

            if (n.depotType === 'MAIN') {
                drawRegularPolygon(ctx, 0, 0, r + 3, 8, Math.PI / 8);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = spec.color;
                drawRegularPolygon(ctx, 0, 0, r - 5, 8, Math.PI / 8);
                ctx.fill();
            } else if (n.depotType === 'XL') {
                drawRegularPolygon(ctx, 0, 0, r + 2, 6, 0);
                ctx.fill();
                ctx.stroke();
            } else if (n.depotType === 'L') {
                ctx.beginPath();
                ctx.roundRect(-r, -r, r * 2, r * 2, 7);
                ctx.fill();
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }

            ctx.fillStyle = n.depotType === 'MAIN' ? '#FFFFFF' : (state.nightMode ? '#F8FAFC' : '#1E293B');
            ctx.font = `800 ${n.depotType === 'MAIN' ? 11 : 12}px "Plus Jakarta Sans"`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(n.depotType === 'MAIN' ? 'HQ' : n.depotType, 0, 0.5);

            const numDrones = state.drones.filter(d => d.homeNodeId === n.id).length;
            if (numDrones > 0) {
                ctx.fillStyle = '#0891B2';
                ctx.beginPath();
                ctx.arc(r * 0.78, -r * 0.78, 7.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '800 9px "JetBrains Mono"';
                ctx.fillText(`${numDrones}`, r * 0.78, -r * 0.78 + 0.5);
            }

            const maxShow = Math.min(n.storage.length, 12);
            for (let i = 0; i < maxShow; i++) {
                const pkg = n.storage[i];
                const a = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(6, maxShow);
                const px = Math.cos(a) * (r + 8.5);
                const py = Math.sin(a) * (r + 8.5);
                drawPackagePip(ctx, px, py, pkg.size, 3.8, pkg.scale || 1);
            }
        } else if (n.kind === 'CUSTOMER') {
            const r = n.radius;
            const col = n.demandType === 'S' ? '#0EA5E9' : (n.demandType === 'L' ? '#F59E0B' : '#F43F5E');

            if (n.overloadTimer > 0.01) {
                ctx.save();
                const pulse = 1 + Math.sin(performance.now() * 0.014) * (0.04 + n.overloadTimer * 0.08);
                ctx.scale(pulse, pulse);

                ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.arc(0, 0, r + 13, -Math.PI / 2, -Math.PI / 2 + n.overloadTimer * Math.PI * 2);
                ctx.closePath();
                ctx.fill();

                ctx.beginPath();
                ctx.arc(0, 0, r + 10, -Math.PI / 2, -Math.PI / 2 + n.overloadTimer * Math.PI * 2);
                ctx.strokeStyle = '#EF4444';
                ctx.lineWidth = 4.2;
                ctx.lineCap = 'round';
                ctx.stroke();
                ctx.restore();
            }

            ctx.fillStyle = 'rgba(0,0,0,0.13)';
            ctx.beginPath();
            ctx.arc(0, 2.5, r + 1.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = state.nightMode ? '#0F172A' : '#FFFFFF';
            ctx.strokeStyle = state.nightMode ? '#F8FAFC' : '#23272E';
            ctx.lineWidth = 4.0;

            if (n.demandType === 'S') {
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            } else if (n.demandType === 'L') {
                ctx.beginPath();
                ctx.roundRect(-r, -r, r * 2, r * 2, 5.5);
                ctx.fill();
                ctx.stroke();
            } else {
                drawRegularPolygon(ctx, 0, 0, r + 2.5, 4, 0);
                ctx.fill();
                ctx.stroke();
            }

            ctx.fillStyle = col;
            ctx.font = '800 9.5px "Plus Jakarta Sans"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(n.demandType, 0, 0.5);

            for (let i = 0; i < n.waitingOrders.length; i++) {
                const ord = n.waitingOrders[i];
                const ring = i < 6 ? 0 : 1;
                const idxInRing = i % 6;
                const a = -Math.PI / 2 + (idxInRing * (Math.PI * 2)) / 6 + (ring * 0.35);
                const orbitR = r + 9.5 + ring * 8.5;
                const px = Math.cos(a) * orbitR;
                const py = Math.sin(a) * orbitR;
                drawPackagePip(ctx, px, py, ord.size, 4.5, ord.scale || 1);
            }
        }

        ctx.restore();
    }

    // 11. Render Smooth Flying Package Transfer Arcs
    for (const fp of state.flyingPackages) {
        const t = easeInOutQuad(Math.min(1, fp.t));
        const x = lerp(fp.fromX, fp.toX, t);
        const arcLift = Math.sin(t * Math.PI) * 18;
        const y = lerp(fp.fromY, fp.toY, t) - arcLift;
        drawPackagePip(ctx, x, y, fp.size, 5.2, 1.15);
    }

    // 12. Render Ground Vehicles: Cyberbikes & Cybercars
    for (const line of state.lines) {
        for (const v of line.vehicles) {
            ctx.save();
            ctx.translate(v.x, v.y);
            ctx.rotate(v.angle);
            const s = (v.scale || 1) * (v.bounceScale || 1);
            ctx.scale(s, s);

            if (v.type === 'bike') {
                ctx.fillStyle = 'rgba(0,0,0,0.16)';
                ctx.beginPath();
                ctx.roundRect(-9.5, -4, 19, 10, 5);
                ctx.fill();

                ctx.fillStyle = line.color;
                ctx.beginPath();
                ctx.roundRect(-9.5, -5, 19, 10, 5);
                ctx.fill();

                ctx.fillStyle = state.nightMode ? '#0F172A' : '#FFFFFF';
                ctx.beginPath();
                ctx.roundRect(-5.5, -3, 11, 6, 3);
                ctx.fill();

                for (let i = 0; i < v.cargo.length; i++) {
                    drawPackagePip(ctx, -2.5 + i * 5, 0, v.cargo[i].size, 2.8, v.cargo[i].scale || 1);
                }
            } else {
                ctx.fillStyle = 'rgba(0,0,0,0.20)';
                ctx.beginPath();
                ctx.roundRect(-14, -6.5, 28, 15, 4.5);
                ctx.fill();

                ctx.fillStyle = line.color;
                ctx.beginPath();
                ctx.roundRect(-14, -7.5, 28, 15, 4.5);
                ctx.fill();

                ctx.fillStyle = state.nightMode ? '#0F172A' : '#FFFFFF';
                ctx.beginPath();
                ctx.roundRect(-10.5, -5, 21, 10, 3);
                ctx.fill();

                for (let i = 0; i < v.cargo.length; i++) {
                    const p = v.cargo[i];
                    const offset = -6.5 + i * 4.5;
                    drawPackagePip(ctx, offset, 0, p.size, p.size === 'XL' ? 4.0 : 3.1, p.scale || 1);
                }
            }
            ctx.restore();
        }
    }

    // 13. Render Flugdrohnen
    for (const d of state.drones) {
        for (const tr of d.trail) {
            ctx.save();
            ctx.fillStyle = '#06B6D4';
            ctx.globalAlpha = Math.max(0, tr.alpha * 0.45);
            ctx.beginPath();
            ctx.arc(tr.x, tr.y, 2.0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
        ctx.beginPath();
        ctx.arc(d.x + 4, d.y + 7, 6 * (d.scale || 1), 0, Math.PI * 2);
        ctx.fill();

        ctx.translate(d.x, d.y);
        ctx.scale(d.scale || 1, d.scale || 1);

        ctx.strokeStyle = state.nightMode ? '#E2E8F0' : '#23272E';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-6, -6); ctx.lineTo(6, 6);
        ctx.moveTo(6, -6);  ctx.lineTo(-6, 6);
        ctx.stroke();

        const rotCorners = [[-6, -6], [6, -6], [-6, 6], [6, 6]];
        ctx.fillStyle = 'rgba(6, 182, 212, 0.30)';
        ctx.strokeStyle = '#06B6D4';
        ctx.lineWidth = 1.2;
        for (const [rx, ry] of rotCorners) {
            ctx.beginPath();
            ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        if (d.cargo) {
            drawPackagePip(ctx, 0, 0, 'S', 4.3, 1);
        } else {
            ctx.fillStyle = '#06B6D4';
            ctx.beginPath();
            ctx.arc(0, 0, 3.0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // 14. Floating Feedback Whispers
    for (const ft of state.floatingTexts) {
        ctx.save();
        ctx.font = '800 12px "Plus Jakarta Sans"';
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
    }

    ctx.restore();
}

function renderMiniMapPreview(miniCanvas, city) {
    const mctx = miniCanvas.getContext('2d');
    const pal = state.nightMode ? city.night : city.day;
    mctx.fillStyle = pal.land;
    mctx.fillRect(0, 0, miniCanvas.width, miniCanvas.height);

    mctx.save();
    mctx.scale(miniCanvas.width / WORLD_W, miniCanvas.height / WORLD_H);
    mctx.fillStyle = pal.water;
    mctx.strokeStyle = pal.water;
    mctx.lineCap = 'round';
    mctx.lineJoin = 'round';

    for (const poly of city.waterPolys) {
        drawRoundedPolygon(mctx, poly);
    }
    for (const r of city.rivers) {
        mctx.lineWidth = r.width * 1.15;
        drawSmoothPolyline(mctx, r.pts, 30);
    }
    mctx.restore();
}
