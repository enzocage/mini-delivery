/***************************************************************************
 * 10. UNIFIED INPUT & HIGH-END INVISIBLE MOBILE TOUCH CONTROLS
 * - Dynamic fat-finger hit expansion & zoom-compensated magnetic snap
 * - Finger-occlusion lift when dragging dock tokens on touchscreens
 * - Multi-touch 2-finger pinch-to-zoom & 2-finger pan with elastic auto-return
 * - Invisible 2-finger tap anywhere to toggle Pause / Play
 * - 1-finger empty-canvas pan & double-tap on empty map to re-center camera
 * - Long-press (420ms) on stations for quick inspection & line focus
 * - Horizontal swipe on the bottom line bar to cycle lines
 * - Subtle Web Vibration haptics (navigator.vibrate)
 ***************************************************************************/

const activePointers = new Map();
let twoFingerGesture = {
    active: false,
    startTime: 0,
    moved: false,
    startDist: 1,
    startZoomMult: 1,
    prevMidX: 0,
    prevMidY: 0
};
let lastEmptyTap = { time: 0, x: 0, y: 0 };
let longPressTimer = null;
let lastSnapNodeId = null;

function triggerHaptic(pattern = 10) {
    try {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            navigator.vibrate(pattern);
        }
    } catch (err) {
        // Ignore on unsupported browsers/devices
    }
}

function getTouchBoost(isTouch = state.drag.isTouch) {
    const zoomCompensation = 1 / Math.min(1.25, Math.max(0.62, state.cam.zoom));
    return (isTouch ? 1.75 : 1.0) * zoomCompensation;
}

function clearLongPressTimer() {
    if (longPressTimer !== null) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
}

function findNodeAtWorld(wx, wy, hitPadding = 12, isTouch = state.drag.isTouch) {
    const pad = hitPadding * getTouchBoost(isTouch);
    let bestNode = null;
    let bestDist = Infinity;
    for (let i = state.nodes.length - 1; i >= 0; i--) {
        const n = state.nodes[i];
        const d = dist(wx, wy, n.x, n.y);
        if (d <= n.radius + pad && d < bestDist) {
            bestDist = d;
            bestNode = n;
        }
    }
    return bestNode;
}

function findLineTerminalAtWorld(wx, wy, isTouch = state.drag.isTouch) {
    const maxR = 17 * getTouchBoost(isTouch);
    let bestHit = null;
    let bestDist = maxR;

    for (let i = 0; i < state.unlockedLines; i++) {
        const line = state.lines[i];
        if (!line || line.nodeIds.length < 2) continue;

        const ends = [
            { node: state.nodes.find(n => n.id === line.nodeIds[0]), neighbor: state.nodes.find(n => n.id === line.nodeIds[1]), idx: 0 },
            { node: state.nodes.find(n => n.id === line.nodeIds[line.nodeIds.length - 1]), neighbor: state.nodes.find(n => n.id === line.nodeIds[line.nodeIds.length - 2]), idx: line.nodeIds.length - 1 }
        ];
        for (const end of ends) {
            if (!end.node || !end.neighbor) continue;
            const tbar = getTerminalTBarPoint(end.node, end.neighbor, 0);
            if (tbar) {
                const d = dist(wx, wy, tbar.x, tbar.y);
                if (d <= bestDist) {
                    bestDist = d;
                    bestHit = { line, node: end.node, neighbor: end.neighbor, nodeIndex: end.idx };
                }
            }
        }
    }
    return bestHit;
}

function findLineConnectorAtWorld(wx, wy, isTouch = state.drag.isTouch) {
    let bestHit = null;
    let bestDist = 17.5 * getTouchBoost(isTouch);

    const order = [];
    for (let i = 0; i < state.unlockedLines; i++) {
        if (i === state.selectedLineId) order.unshift(i);
        else order.push(i);
    }

    for (const li of order) {
        const line = state.lines[li];
        if (!line || line.nodeIds.length < 2) continue;

        for (let i = 0; i < line.nodeIds.length - 1; i++) {
            const n1 = state.nodes.find(n => n.id === line.nodeIds[i]);
            const n2 = state.nodes.find(n => n.id === line.nodeIds[i + 1]);
            if (!n1 || !n2) continue;

            const laneOffset = getSegmentParallelOffset(line.id, n1.id, n2.id);
            const c1 = getConnectorPoint(n1, n2, laneOffset);
            const c2 = getConnectorPoint(n2, n1, -laneOffset);

            if (c2) {
                const d2 = dist(wx, wy, c2.x, c2.y);
                if (d2 < bestDist) {
                    bestDist = d2;
                    bestHit = { line, node: n2, neighborNode: n1, nodeIndex: i + 1, x: c2.x, y: c2.y };
                }
            }
            if (c1) {
                const d1 = dist(wx, wy, c1.x, c1.y);
                if (d1 < bestDist) {
                    bestDist = d1;
                    bestHit = { line, node: n1, neighborNode: n2, nodeIndex: i, x: c1.x, y: c1.y };
                }
            }
        }
    }
    return bestHit;
}

function findLineSegmentDetailAtWorld(wx, wy, maxDist = 16, isTouch = state.drag.isTouch) {
    let best = null;
    let bestD = maxDist * getTouchBoost(isTouch);

    for (let i = 0; i < state.unlockedLines; i++) {
        const line = state.lines[i];
        if (!line || line.nodeIds.length < 2) continue;
        for (let j = 0; j < line.nodeIds.length - 1; j++) {
            const n1 = state.nodes.find(n => n.id === line.nodeIds[j]);
            const n2 = state.nodes.find(n => n.id === line.nodeIds[j + 1]);
            if (!n1 || !n2) continue;
            const laneOffset = getSegmentParallelOffset(line.id, n1.id, n2.id);
            const pts = computeMetroWaypoints(n1.x, n1.y, n2.x, n2.y, laneOffset);
            for (let k = 0; k < pts.length - 1; k++) {
                const d = distToSegment(wx, wy, pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1]);
                if (d <= bestD) {
                    bestD = d;
                    best = {
                        line,
                        segIndex: j,
                        n1, n2,
                        distToN1: dist(wx, wy, n1.x, n1.y),
                        distToN2: dist(wx, wy, n2.x, n2.y),
                        segLen: dist(n1.x, n1.y, n2.x, n2.y)
                    };
                }
            }
        }
    }
    return best;
}

function findLineAtWorld(wx, wy, maxDist = 15, isTouch = state.drag.isTouch) {
    const hit = findLineSegmentDetailAtWorld(wx, wy, maxDist, isTouch);
    return hit ? hit.line : null;
}

function unplugStationFromLine(line, nodeIndex, wx, wy) {
    if (!line || nodeIndex < 0 || nodeIndex >= line.nodeIds.length) return false;
    const detachedId = line.nodeIds[nodeIndex];
    const detachedNode = state.nodes.find(n => n.id === detachedId);

    state.selectedLineId = line.id;
    state.drag.active = true;
    state.drag.currWorldX = wx;
    state.drag.currWorldY = wy;
    state.drag.snapNode = null;
    state.drag.detachedNode = detachedNode || null;
    canvas.classList.add('dragging-active');

    if (nodeIndex === line.nodeIds.length - 1) {
        const anchorId = line.nodeIds[line.nodeIds.length - 2];
        const anchorNode = state.nodes.find(n => n.id === anchorId);
        line.nodeIds.pop();
        recalculateLineBridges(line);

        state.drag.mode = 'reroute_end';
        state.drag.endSide = 'tail';
        state.drag.anchorNode = anchorNode;
    } else if (nodeIndex === 0) {
        const anchorId = line.nodeIds[1];
        const anchorNode = state.nodes.find(n => n.id === anchorId);
        line.nodeIds.shift();
        recalculateLineBridges(line);

        state.drag.mode = 'reroute_end';
        state.drag.endSide = 'head';
        state.drag.anchorNode = anchorNode;
    } else {
        const prevNode = state.nodes.find(n => n.id === line.nodeIds[nodeIndex - 1]);
        const nextNode = state.nodes.find(n => n.id === line.nodeIds[nodeIndex + 1]);
        line.nodeIds.splice(nodeIndex, 1);
        recalculateLineBridges(line);

        state.drag.mode = 'reroute_mid';
        state.drag.insertIndex = nodeIndex;
        state.drag.prevNode = prevNode;
        state.drag.nextNode = nextNode;
    }

    if (detachedNode) {
        detachedNode.scaleVel = 2.2;
        state.ripples.push({ x: detachedNode.x, y: detachedNode.y, r: detachedNode.radius, maxR: 36, color: line.color, alpha: 0.75 });
    }
    triggerHaptic([10, 24, 10]);
    sfx.playDisconnect();
    updateAllUI();
    return true;
}

function connectNodesOnLine(line, nodeA, nodeB) {
    if (!line || !nodeA || !nodeB || nodeA.id === nodeB.id) return false;
    const city = currentCity();

    if (line.nodeIds.length >= 2) {
        if (line.nodeIds[line.nodeIds.length - 1] === nodeA.id && line.nodeIds[line.nodeIds.length - 2] === nodeB.id) {
            line.nodeIds.pop();
            recalculateLineBridges(line);
            nodeB.scaleVel = 1.8;
            triggerHaptic(10);
            sfx.playDisconnect();
            updateAllUI();
            return true;
        }
        if (line.nodeIds[0] === nodeA.id && line.nodeIds[1] === nodeB.id) {
            line.nodeIds.shift();
            recalculateLineBridges(line);
            nodeB.scaleVel = 1.8;
            triggerHaptic(10);
            sfx.playDisconnect();
            updateAllUI();
            return true;
        }
    }

    const crossesWater = doesMetroCorridorCrossWater(nodeA.x, nodeA.y, nodeB.x, nodeB.y, city);

    if (crossesWater && state.inventory.bridges <= 0) {
        triggerHaptic([18, 30, 18]);
        showFloatingText((nodeA.x + nodeB.x) / 2, (nodeA.y + nodeB.y) / 2, t('msg_no_bridge_drone'), '#EF4444');
        return false;
    }

    let modified = false;
    if (line.nodeIds.length === 0) {
        line.nodeIds.push(nodeA.id, nodeB.id);
        modified = true;
    } else if (line.nodeIds.length === 1 && line.nodeIds[0] === nodeA.id) {
        line.nodeIds.push(nodeB.id);
        modified = true;
    } else if (line.nodeIds[line.nodeIds.length - 1] === nodeA.id && !line.nodeIds.includes(nodeB.id)) {
        line.nodeIds.push(nodeB.id);
        modified = true;
    } else if (line.nodeIds[0] === nodeA.id && !line.nodeIds.includes(nodeB.id)) {
        line.nodeIds.unshift(nodeB.id);
        modified = true;
    } else if (line.nodeIds.includes(nodeA.id) && !line.nodeIds.includes(nodeB.id)) {
        const idx = line.nodeIds.indexOf(nodeA.id);
        line.nodeIds.splice(idx + 1, 0, nodeB.id);
        modified = true;
    } else if (!line.nodeIds.includes(nodeA.id) && line.nodeIds.includes(nodeB.id)) {
        const idx = line.nodeIds.indexOf(nodeB.id);
        line.nodeIds.splice(idx + 1, 0, nodeA.id);
        modified = true;
    }

    if (modified) {
        recalculateLineBridges(line);
        nodeB.scaleVel = 2.6;
        triggerHaptic(crossesWater ? [12, 20, 14] : 12);
        sfx.playConnect(crossesWater, line.id);

        if (!state.tutorialCompleted) {
            state.tutorialCompleted = true;
            document.getElementById('uiHintBanner').classList.add('opacity-0');
        }

        const needsXL = (nodeB.demandType === 'XL' || nodeA.demandType === 'XL');
        if (line.vehicles.length === 0) {
            if (state.inventory.car > 0 && needsXL) {
                addVehicleToLine(line, 'car', false);
            } else if (state.inventory.bike > 0) {
                addVehicleToLine(line, 'bike', false);
            } else if (state.inventory.car > 0) {
                addVehicleToLine(line, 'car', false);
            }
        } else if (needsXL && !line.vehicles.some(v => v.type === 'car') && state.inventory.car > 0) {
            addVehicleToLine(line, 'car', false);
            showFloatingText(nodeB.x, nodeB.y - 22, t('msg_car_assigned_xl'), '#8B5CF6');
        }
        updateAllUI();
    }
    return modified;
}

function applyTokenAtWorld(tokenType, wx, wy, isTouch = state.drag.isTouch) {
    const clickedNode = findNodeAtWorld(wx, wy, isTouch ? 24 : 16, isTouch);
    const clickedLine = findLineAtWorld(wx, wy, isTouch ? 28 : 20, isTouch);

    if (tokenType.startsWith('depot_')) {
        const depotClass = tokenType.split('_')[1];
        if (state.inventory[tokenType] <= 0) return false;
        if (isPointInWater(wx, wy, currentCity(), 12)) {
            triggerHaptic([15, 25, 15]);
            showFloatingText(wx, wy, t('msg_land_only'), '#EF4444');
            return false;
        }
        if (findNodeAtWorld(wx, wy, 16, false)) {
            triggerHaptic([15, 25, 15]);
            showFloatingText(wx, wy, t('msg_too_close'), '#F59E0B');
            return false;
        }
        state.inventory[tokenType]--;
        const newDepot = createDepotNode(depotClass, wx, wy);
        state.nodes.push(newDepot);
        triggerHaptic(16);
        sfx.playPlaceDepot(depotClass);

        if (state.inventory.drone > 0) {
            stationDroneAtNode(newDepot, false);
        }
        openNodeInspector(newDepot);
        setActiveTool('route');
        updateAllUI();
        return true;
    }

    if (tokenType === 'drone') {
        // Magnetic search for nearest depot if touch-dropped slightly beside one
        let targetDepot = (clickedNode && clickedNode.kind === 'DEPOT') ? clickedNode : null;
        if (!targetDepot && isTouch) {
            let bestD = 46 / Math.min(1.2, state.cam.zoom);
            for (const n of state.nodes) {
                if (n.kind === 'DEPOT') {
                    const d = dist(wx, wy, n.x, n.y);
                    if (d < bestD) {
                        bestD = d;
                        targetDepot = n;
                    }
                }
            }
        }
        if (targetDepot) {
            stationDroneAtNode(targetDepot, false);
            triggerHaptic(14);
            openNodeInspector(targetDepot);
            setActiveTool('route');
            return true;
        }
        triggerHaptic([15, 25, 15]);
        showFloatingText(wx, wy, t('msg_drag_to_depot'), '#06B6D4');
        return false;
    }

    if (tokenType === 'bike' || tokenType === 'car') {
        const targetLine = clickedLine || state.lines[state.selectedLineId];
        if (targetLine && targetLine.nodeIds.length >= 2) {
            if (addVehicleToLine(targetLine, tokenType, false, wx, wy)) {
                triggerHaptic(14);
                setActiveTool('route');
                return true;
            }
        } else {
            triggerHaptic([15, 25, 15]);
            showFloatingText(wx, wy, t('msg_drag_to_line'), '#F59E0B');
        }
        return false;
    }
    return false;
}

function getPointerWorldCoords(clientX, clientY, isTouch, mode) {
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const rawW = screenToWorld(sx, sy);

    // Invisible Finger-Occlusion Lift: when dragging a dock token on touch, lift target above the thumb
    const liftScreenPx = (isTouch && mode === 'dock_token') ? -36 : 0;
    const liftedW = liftScreenPx !== 0 ? screenToWorld(sx, sy + liftScreenPx) : rawW;

    return {
        sx, sy,
        rawX: rawW.x,
        rawY: rawW.y,
        x: liftedW.x,
        y: liftedW.y
    };
}

canvas.addEventListener('pointerdown', (e) => {
    sfx.init();
    const isTouch = e.pointerType === 'touch';
    state.drag.isTouch = isTouch;
    clearLongPressTimer();

    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    activePointers.set(e.pointerId, {
        id: e.pointerId,
        sx, sy,
        startX: sx,
        startY: sy,
        isTouch
    });

    // MULTI-TOUCH (2 FINGERS): Invisible Pinch-to-Zoom, 2-Finger Pan & 2-Finger Tap to Pause
    if (activePointers.size === 2) {
        const pts = Array.from(activePointers.values());
        const d = Math.hypot(pts[1].sx - pts[0].sx, pts[1].sy - pts[0].sy);
        const midX = (pts[0].sx + pts[1].sx) * 0.5;
        const midY = (pts[0].sy + pts[1].sy) * 0.5;

        twoFingerGesture.active = true;
        twoFingerGesture.startTime = performance.now();
        twoFingerGesture.moved = false;
        twoFingerGesture.startDist = Math.max(24, d);
        twoFingerGesture.startZoomMult = state.cam.userZoomMult;
        twoFingerGesture.prevMidX = midX;
        twoFingerGesture.prevMidY = midY;

        // Cancel single-finger drag if it was only panning or starting a line
        state.drag.active = true;
        state.drag.mode = 'pinch_camera';
        state.drag.snapNode = null;
        state.drag.startNode = null;
        state.drag.anchorNode = null;
        state.cam.manualHoldTimer = 5.0;
        return;
    }

    if (activePointers.size > 2) return;

    const coords = getPointerWorldCoords(e.clientX, e.clientY, isTouch, state.drag.mode);
    const w = { x: coords.x, y: coords.y };

    state.drag.rawWorldX = coords.rawX;
    state.drag.rawWorldY = coords.rawY;
    state.drag.currWorldX = w.x;
    state.drag.currWorldY = w.y;
    state.drag.screenX = sx;
    state.drag.screenY = sy;
    state.drag.snapNode = null;
    state.drag.detachedNode = null;
    lastSnapNodeId = null;

    if (state.activeTool !== 'route') {
        if (applyTokenAtWorld(state.activeTool, w.x, w.y, isTouch)) return;
        setActiveTool('route');
    }

    // 1. PRIORITY 1: Grabbing a Connector Plug ("Verbindungsstelle") immediately unplugs the line from that station!
    const connectorHit = findLineConnectorAtWorld(w.x, w.y, isTouch);
    if (connectorHit) {
        document.getElementById('nodeInspector').classList.add('hidden');
        unplugStationFromLine(connectorHit.line, connectorHit.nodeIndex, w.x, w.y);
        return;
    }

    // 2. PRIORITY 2: Grabbing a Mini Metro T-Bar terminal cap
    const terminalHit = findLineTerminalAtWorld(w.x, w.y, isTouch);
    if (terminalHit) {
        state.selectedLineId = terminalHit.line.id;
        state.drag.active = true;
        state.drag.mode = 'draw_line';
        state.drag.startNode = terminalHit.node;
        state.drag.canPullBackUnplug = true;
        state.drag.pullBackNodeIndex = terminalHit.nodeIndex;
        state.drag.pullBackNeighbor = terminalHit.neighbor;
        triggerHaptic(8);
        canvas.classList.add('dragging-active');
        updateAllUI();
        return;
    }

    const clickedNode = findNodeAtWorld(w.x, w.y, 10, isTouch);
    const segHit = findLineSegmentDetailAtWorld(w.x, w.y, 15, isTouch);

    // 3. PRIORITY 3: Grabbing a Line Segment
    if (segHit && !clickedNode) {
        const line = segHit.line;
        state.selectedLineId = line.id;
        document.getElementById('nodeInspector').classList.add('hidden');

        const isFirstSeg = segHit.segIndex === 0;
        const isLastSeg  = segHit.segIndex === line.nodeIds.length - 2;

        if (isLastSeg && (segHit.distToN2 < 52 || segHit.distToN2 < segHit.distToN1 * 0.95)) {
            unplugStationFromLine(line, line.nodeIds.length - 1, w.x, w.y);
            return;
        }
        if (isFirstSeg && (segHit.distToN1 < 52 || (line.nodeIds.length > 2 && segHit.distToN1 < segHit.distToN2 * 0.85))) {
            unplugStationFromLine(line, 0, w.x, w.y);
            return;
        }
        if (segHit.distToN1 < 36 && segHit.segIndex > 0) {
            unplugStationFromLine(line, segHit.segIndex, w.x, w.y);
            return;
        }
        if (segHit.distToN2 < 36 && segHit.segIndex + 1 < line.nodeIds.length - 1) {
            unplugStationFromLine(line, segHit.segIndex + 1, w.x, w.y);
            return;
        }

        state.drag.active = true;
        state.drag.mode = 'reroute_mid';
        state.drag.insertIndex = segHit.segIndex + 1;
        state.drag.prevNode = segHit.n1;
        state.drag.nextNode = segHit.n2;
        state.drag.detachedNode = null;
        triggerHaptic(8);
        canvas.classList.add('dragging-active');
        updateAllUI();
        return;
    }

    // 4. PRIORITY 4: Clicking/Dragging from a Station Node (+ Long-Press Inspector on Touch)
    if (clickedNode) {
        if (clickedNode.kind === 'DEPOT') {
            openNodeInspector(clickedNode);
        } else {
            document.getElementById('nodeInspector').classList.add('hidden');
        }

        if (isTouch) {
            longPressTimer = setTimeout(() => {
                triggerHaptic([12, 20, 14]);
                state.ripples.push({ x: clickedNode.x, y: clickedNode.y, r: clickedNode.radius, maxR: 54, color: '#F59E0B', alpha: 0.9 });
                if (clickedNode.kind === 'DEPOT') {
                    openNodeInspector(clickedNode);
                } else {
                    const servingLine = state.lines.slice(0, state.unlockedLines).find(l => l.nodeIds.includes(clickedNode.id));
                    if (servingLine) {
                        state.selectedLineId = servingLine.id;
                        updateAllUI();
                    }
                }
            }, 420);
        }

        let targetLine = state.lines[state.selectedLineId];
        if (targetLine.nodeIds.length >= 2 && !targetLine.nodeIds.includes(clickedNode.id)) {
            const lineOnNode = state.lines.slice(0, state.unlockedLines).find(l =>
                l.nodeIds[0] === clickedNode.id || l.nodeIds[l.nodeIds.length - 1] === clickedNode.id
            );
            const emptyLine = state.lines.slice(0, state.unlockedLines).find(l => l.nodeIds.length === 0);
            if (lineOnNode) {
                state.selectedLineId = lineOnNode.id;
                targetLine = lineOnNode;
            } else if (emptyLine) {
                state.selectedLineId = emptyLine.id;
                targetLine = emptyLine;
            }
        }

        state.drag.active = true;
        state.drag.mode = 'draw_line';
        state.drag.startNode = clickedNode;

        if (targetLine.nodeIds.length >= 2 &&
            (targetLine.nodeIds[0] === clickedNode.id || targetLine.nodeIds[targetLine.nodeIds.length - 1] === clickedNode.id)) {
            const isHead = targetLine.nodeIds[0] === clickedNode.id;
            state.drag.canPullBackUnplug = true;
            state.drag.pullBackNodeIndex = isHead ? 0 : targetLine.nodeIds.length - 1;
            state.drag.pullBackNeighbor = state.nodes.find(n => n.id === (isHead ? targetLine.nodeIds[1] : targetLine.nodeIds[targetLine.nodeIds.length - 2]));
        } else {
            state.drag.canPullBackUnplug = false;
        }

        triggerHaptic(8);
        canvas.classList.add('dragging-active');
        updateAllUI();
        return;
    }

    // 5. PRIORITY 5: Empty Space Touch -> Double-Tap to Re-Center Camera OR 1-Finger Smooth Map Pan
    state.inspectedNodeId = null;
    document.getElementById('nodeInspector').classList.add('hidden');

    const now = performance.now();
    if (now - lastEmptyTap.time < 310 && Math.hypot(sx - lastEmptyTap.x, sy - lastEmptyTap.y) < 30) {
        const hadManualOffset = Math.hypot(state.cam.userOffsetX, state.cam.userOffsetY) > 8 || Math.abs(state.cam.userZoomMult - 1.0) > 0.05;
        resetCameraToAuto();
        triggerHaptic(12);
        state.ripples.push({ x: w.x, y: w.y, r: 4, maxR: 48, color: '#F59E0B', alpha: 0.75 });
        if (hadManualOffset) {
            showFloatingText(w.x, w.y - 12, t('msg_camera_reset'), '#F59E0B');
        }
        lastEmptyTap.time = 0;
        return;
    }
    lastEmptyTap = { time: now, x: sx, y: sy };

    if (isTouch) {
        state.drag.active = true;
        state.drag.mode = 'pan_camera';
        state.drag.panPrevScreenX = sx;
        state.drag.panPrevScreenY = sy;
        state.cam.manualHoldTimer = 4.5;
    }
});

window.addEventListener('pointermove', (e) => {
    const isTouch = e.pointerType === 'touch' || state.drag.isTouch;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (activePointers.has(e.pointerId)) {
        const pt = activePointers.get(e.pointerId);
        if (Math.hypot(sx - pt.startX, sy - pt.startY) > 10) {
            clearLongPressTimer();
        }
        pt.sx = sx;
        pt.sy = sy;
    }

    // Handle 2-Finger Pinch-to-Zoom & 2-Finger Pan
    if (twoFingerGesture.active && activePointers.size >= 2) {
        const pts = Array.from(activePointers.values());
        const d = Math.max(20, Math.hypot(pts[1].sx - pts[0].sx, pts[1].sy - pts[0].sy));
        const midX = (pts[0].sx + pts[1].sx) * 0.5;
        const midY = (pts[0].sy + pts[1].sy) * 0.5;

        if (Math.abs(d - twoFingerGesture.startDist) > 10 ||
            Math.hypot(midX - twoFingerGesture.prevMidX, midY - twoFingerGesture.prevMidY) > 8) {
            twoFingerGesture.moved = true;
        }

        const scaleRatio = d / twoFingerGesture.startDist;
        state.cam.userZoomMult = Math.max(0.55, Math.min(2.25, twoFingerGesture.startZoomMult * scaleRatio));

        const dxScreen = midX - twoFingerGesture.prevMidX;
        const dyScreen = midY - twoFingerGesture.prevMidY;
        state.cam.userOffsetX = Math.max(-360, Math.min(360, state.cam.userOffsetX - dxScreen / state.cam.zoom));
        state.cam.userOffsetY = Math.max(-260, Math.min(260, state.cam.userOffsetY - dyScreen / state.cam.zoom));
        state.cam.manualHoldTimer = 5.0;

        twoFingerGesture.prevMidX = midX;
        twoFingerGesture.prevMidY = midY;
        return;
    }

    // Handle 1-Finger Empty-Canvas Pan on Mobile
    if (state.drag.active && state.drag.mode === 'pan_camera') {
        const dxScreen = sx - state.drag.panPrevScreenX;
        const dyScreen = sy - state.drag.panPrevScreenY;
        if (Math.hypot(dxScreen, dyScreen) > 4) {
            lastEmptyTap.time = 0; // Don't count a drag as a tap
        }
        state.cam.userOffsetX = Math.max(-340, Math.min(340, state.cam.userOffsetX - dxScreen / state.cam.zoom));
        state.cam.userOffsetY = Math.max(-240, Math.min(240, state.cam.userOffsetY - dyScreen / state.cam.zoom));
        state.cam.manualHoldTimer = 4.5;
        state.drag.panPrevScreenX = sx;
        state.drag.panPrevScreenY = sy;
        return;
    }

    const coords = getPointerWorldCoords(e.clientX, e.clientY, isTouch, state.drag.mode);
    const w = { x: coords.x, y: coords.y };

    state.hover.worldX = w.x;
    state.hover.worldY = w.y;

    if (!state.drag.active) {
        const conn = findLineConnectorAtWorld(w.x, w.y, false);
        const term = !conn ? findLineTerminalAtWorld(w.x, w.y, false) : null;
        const hn = findNodeAtWorld(w.x, w.y, 8, false);
        const hl = (!hn && !term && !conn) ? findLineAtWorld(w.x, w.y, 12, false) : null;

        state.hover.connector = conn;
        state.hover.nodeId = hn ? hn.id : null;
        state.hover.lineId = conn ? conn.line.id : (term ? term.line.id : (hl ? hl.id : null));
        canvas.classList.toggle('hover-interactive', Boolean(conn || term || hn || hl));
        return;
    }

    state.drag.rawWorldX = coords.rawX;
    state.drag.rawWorldY = coords.rawY;
    state.drag.currWorldX = w.x;
    state.drag.currWorldY = w.y;
    state.drag.screenX = sx;
    state.drag.screenY = sy;

    // Gentle Edge Auto-Pan when dragging near mobile screen borders
    if (isTouch && (state.drag.mode === 'draw_line' || state.drag.mode === 'reroute_end' || state.drag.mode === 'reroute_mid' || state.drag.mode === 'dock_token')) {
        const edgeMargin = 46;
        if (sx < edgeMargin) state.cam.userOffsetX = Math.max(-300, state.cam.userOffsetX - 3.2 / state.cam.zoom);
        if (sx > window.innerWidth - edgeMargin) state.cam.userOffsetX = Math.min(300, state.cam.userOffsetX + 3.2 / state.cam.zoom);
        if (sy > 70 && sy < 70 + edgeMargin) state.cam.userOffsetY = Math.max(-220, state.cam.userOffsetY - 3.2 / state.cam.zoom);
    }

    const line = state.lines[state.selectedLineId];
    if (!line) return;

    if (state.drag.mode === 'draw_line' && state.drag.canPullBackUnplug && state.drag.startNode && state.drag.pullBackNeighbor) {
        const startN = state.drag.startNode;
        const neighN = state.drag.pullBackNeighbor;
        const dFromStart = dist(w.x, w.y, startN.x, startN.y);
        const dToNeigh = dist(w.x, w.y, neighN.x, neighN.y);
        const segLen = dist(startN.x, startN.y, neighN.x, neighN.y);

        if (dFromStart > startN.radius + 9 && dToNeigh < segLen - 8) {
            state.drag.canPullBackUnplug = false;
            unplugStationFromLine(line, state.drag.pullBackNodeIndex, w.x, w.y);
            return;
        }
    }

    if (state.drag.mode === 'reroute_end' && state.drag.anchorNode) {
        const hoverNode = findNodeAtWorld(w.x, w.y, 15, isTouch);
        if (hoverNode && hoverNode.id !== state.drag.anchorNode.id && !line.nodeIds.includes(hoverNode.id)) {
            if (lastSnapNodeId !== hoverNode.id) {
                lastSnapNodeId = hoverNode.id;
                triggerHaptic(8);
            }
            state.drag.snapNode = hoverNode;
        } else {
            lastSnapNodeId = null;
            state.drag.snapNode = null;
        }
        return;
    }

    if (state.drag.mode === 'reroute_mid' && state.drag.prevNode && state.drag.nextNode) {
        const hoverNode = findNodeAtWorld(w.x, w.y, 15, isTouch);
        if (hoverNode && !line.nodeIds.includes(hoverNode.id)) {
            if (lastSnapNodeId !== hoverNode.id) {
                lastSnapNodeId = hoverNode.id;
                triggerHaptic(8);
            }
            state.drag.snapNode = hoverNode;
        } else {
            lastSnapNodeId = null;
            state.drag.snapNode = null;
        }
        return;
    }

    if (state.drag.mode === 'draw_line' && state.drag.startNode) {
        const hoverNode = findNodeAtWorld(w.x, w.y, 14, isTouch);
        state.drag.snapNode = (hoverNode && hoverNode.id !== state.drag.startNode.id) ? hoverNode : null;
        if (hoverNode && hoverNode.id !== state.drag.startNode.id) {
            if (connectNodesOnLine(line, state.drag.startNode, hoverNode)) {
                state.drag.startNode = hoverNode;
                state.drag.canPullBackUnplug = false;
                state.drag.snapNode = null;
            }
        }
    }
});

function handlePointerEnd(e) {
    clearLongPressTimer();
    activePointers.delete(e.pointerId);

    // Check if a 2-finger quick tap just finished -> toggle Pause / Play!
    if (twoFingerGesture.active) {
        if (activePointers.size === 0) {
            const elapsed = performance.now() - twoFingerGesture.startTime;
            if (!twoFingerGesture.moved && elapsed < 270) {
                const newSpeed = state.gameSpeed === 0 ? 1 : 0;
                setGameSpeed(newSpeed);
                triggerHaptic([10, 24, 10]);
                showFloatingText(
                    state.cam.x,
                    state.cam.y,
                    newSpeed === 0 ? t('msg_paused') : t('msg_resumed'),
                    '#F59E0B'
                );
            }
            twoFingerGesture.active = false;
            state.drag.active = false;
            state.drag.mode = null;
        }
        return;
    }

    if (!state.drag.active) return;
    const isTouch = e.pointerType === 'touch' || state.drag.isTouch;
    const line = state.lines[state.selectedLineId];
    const city = currentCity();

    if (state.drag.mode === 'dock_token' && state.drag.tokenType) {
        const rect = canvas.getBoundingClientRect();
        const sy = e.clientY - rect.top;
        // Cancel smoothly if dropped back into the bottom dock area
        if (sy < window.innerHeight - 92) {
            const coords = getPointerWorldCoords(e.clientX, e.clientY, isTouch, 'dock_token');
            applyTokenAtWorld(state.drag.tokenType, coords.x, coords.y, isTouch);
        }
    } else if (state.drag.mode === 'reroute_end' && line) {
        const target = state.drag.snapNode;
        const anchor = state.drag.anchorNode;
        if (target && anchor && target.id !== anchor.id && !line.nodeIds.includes(target.id)) {
            const crossesWater = doesMetroCorridorCrossWater(anchor.x, anchor.y, target.x, target.y, city);
            if (crossesWater && state.inventory.bridges <= 0) {
                triggerHaptic([16, 28, 16]);
                showFloatingText(target.x, target.y - 18, t('msg_no_bridge'), '#EF4444');
            } else {
                if (state.drag.endSide === 'tail') {
                    line.nodeIds.push(target.id);
                } else {
                    line.nodeIds.unshift(target.id);
                }
                recalculateLineBridges(line);
                target.scaleVel = 2.8;
                state.ripples.push({ x: target.x, y: target.y, r: target.radius, maxR: 42, color: line.color, alpha: 0.9 });
                triggerHaptic(14);
                sfx.playConnect(crossesWater, line.id);

                if (target.demandType === 'XL' && !line.vehicles.some(v => v.type === 'car') && state.inventory.car > 0) {
                    addVehicleToLine(line, 'car', false);
                    showFloatingText(target.x, target.y - 22, t('msg_car_assigned_xl'), '#8B5CF6');
                }
            }
        }
        if (line.nodeIds.length < 2) {
            clearLine(line);
        } else {
            recalculateLineBridges(line);
            updateAllUI();
        }
    } else if (state.drag.mode === 'reroute_mid' && line) {
        const target = state.drag.snapNode;
        const prev = state.drag.prevNode;
        const next = state.drag.nextNode;
        if (target && prev && next && !line.nodeIds.includes(target.id)) {
            line.nodeIds.splice(state.drag.insertIndex, 0, target.id);
            recalculateLineBridges(line);
            if (state.inventory.bridges < 0) {
                line.nodeIds.splice(state.drag.insertIndex, 1);
                if (state.drag.detachedNode) {
                    line.nodeIds.splice(state.drag.insertIndex, 0, state.drag.detachedNode.id);
                }
                recalculateLineBridges(line);
                triggerHaptic([16, 28, 16]);
                showFloatingText(target.x, target.y - 18, t('msg_no_bridge'), '#EF4444');
            } else {
                target.scaleVel = 2.8;
                state.ripples.push({ x: target.x, y: target.y, r: target.radius, maxR: 42, color: line.color, alpha: 0.9 });
                triggerHaptic(14);
                sfx.playConnect(false, line.id);
            }
        } else {
            recalculateLineBridges(line);
            if (state.inventory.bridges < 0 && state.drag.detachedNode) {
                line.nodeIds.splice(state.drag.insertIndex, 0, state.drag.detachedNode.id);
                recalculateLineBridges(line);
                triggerHaptic([16, 28, 16]);
                showFloatingText(prev.x, prev.y - 18, t('msg_no_bridge_direct'), '#EF4444');
            }
        }
        updateAllUI();
    }

    state.drag.active = false;
    state.drag.mode = null;
    state.drag.tokenType = null;
    state.drag.startNode = null;
    state.drag.anchorNode = null;
    state.drag.snapNode = null;
    state.drag.detachedNode = null;
    state.drag.canPullBackUnplug = false;
    lastSnapNodeId = null;
    canvas.classList.remove('dragging-active');
}

window.addEventListener('pointerup', handlePointerEnd);
window.addEventListener('pointercancel', handlePointerEnd);

document.querySelectorAll('.dock-item').forEach(btn => {
    btn.addEventListener('pointerdown', (e) => {
        const tool = btn.dataset.tool;
        if (!tool || (state.inventory[tool] !== undefined && state.inventory[tool] <= 0)) return;
        e.stopPropagation();
        sfx.init();

        const isTouch = e.pointerType === 'touch';
        state.drag.isTouch = isTouch;
        triggerHaptic(10);

        setActiveTool(tool);
        const coords = getPointerWorldCoords(e.clientX, e.clientY, isTouch, 'dock_token');
        state.drag.active = true;
        state.drag.mode = 'dock_token';
        state.drag.tokenType = tool;
        state.drag.rawWorldX = coords.rawX;
        state.drag.rawWorldY = coords.rawY;
        state.drag.currWorldX = coords.x;
        state.drag.currWorldY = coords.y;
    });
});

// Invisible Horizontal Swipe on the Bottom Line Selector Pill Bar to cycle lines smoothly
const lineSelectorBar = document.getElementById('lineSelectorBar');
if (lineSelectorBar) {
    let swipeStartX = null;
    lineSelectorBar.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch') {
            swipeStartX = e.clientX;
        }
    });
    lineSelectorBar.addEventListener('pointermove', (e) => {
        if (swipeStartX === null || e.pointerType !== 'touch') return;
        const dx = e.clientX - swipeStartX;
        if (Math.abs(dx) >= 34) {
            const step = dx > 0 ? 1 : -1;
            state.selectedLineId = (state.selectedLineId + step + state.unlockedLines) % state.unlockedLines;
            swipeStartX = e.clientX;
            triggerHaptic(8);
            sfx.playTone(360 + state.selectedLineId * 55, 'sine', 0.08, 0.06);
            updateAllUI();
        }
    });
    lineSelectorBar.addEventListener('pointerup', () => { swipeStartX = null; });
    lineSelectorBar.addEventListener('pointercancel', () => { swipeStartX = null; });
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        setGameSpeed(state.gameSpeed === 0 ? 1 : 0);
    } else if (e.key === 'Escape') {
        setActiveTool('route');
        document.getElementById('cityModal').classList.add('hidden');
        document.getElementById('helpModal').classList.add('hidden');
        document.getElementById('nodeInspector').classList.add('hidden');
        const diffMod = document.getElementById('difficultyModal');
        if (diffMod) diffMod.classList.add('hidden');
    }
});

window.addEventListener('resize', resizeCanvas);
