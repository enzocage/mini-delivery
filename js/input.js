/***************************************************************************
 * 10. UNIFIED INPUT: LINE DRAWING, CONNECTOR UNPLUGGING & DOCK DRAG-AND-DROP
 ***************************************************************************/
function findNodeAtWorld(wx, wy, hitPadding = 12) {
    for (let i = state.nodes.length - 1; i >= 0; i--) {
        const n = state.nodes[i];
        if (dist(wx, wy, n.x, n.y) <= n.radius + hitPadding) return n;
    }
    return null;
}

function findLineTerminalAtWorld(wx, wy) {
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
            if (tbar && dist(wx, wy, tbar.x, tbar.y) <= 17) {
                return { line, node: end.node, neighbor: end.neighbor, nodeIndex: end.idx };
            }
        }
    }
    return null;
}

function findLineConnectorAtWorld(wx, wy) {
    let bestHit = null;
    let bestDist = 17.5;

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

function findLineSegmentDetailAtWorld(wx, wy, maxDist = 16) {
    let best = null;
    let bestD = maxDist;

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

function findLineAtWorld(wx, wy, maxDist = 15) {
    const hit = findLineSegmentDetailAtWorld(wx, wy, maxDist);
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
            sfx.playDisconnect();
            updateAllUI();
            return true;
        }
        if (line.nodeIds[0] === nodeA.id && line.nodeIds[1] === nodeB.id) {
            line.nodeIds.shift();
            recalculateLineBridges(line);
            nodeB.scaleVel = 1.8;
            sfx.playDisconnect();
            updateAllUI();
            return true;
        }
    }

    const crossesWater = doesMetroCorridorCrossWater(nodeA.x, nodeA.y, nodeB.x, nodeB.y, city);

    if (crossesWater && state.inventory.bridges <= 0) {
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

function applyTokenAtWorld(tokenType, wx, wy) {
    const clickedNode = findNodeAtWorld(wx, wy, 16);
    const clickedLine = findLineAtWorld(wx, wy, 20);

    if (tokenType.startsWith('depot_')) {
        const depotClass = tokenType.split('_')[1];
        if (state.inventory[tokenType] <= 0) return false;
        if (isPointInWater(wx, wy, currentCity(), 12)) {
            showFloatingText(wx, wy, t('msg_land_only'), '#EF4444');
            return false;
        }
        if (clickedNode) {
            showFloatingText(wx, wy, t('msg_too_close'), '#F59E0B');
            return false;
        }
        state.inventory[tokenType]--;
        const newDepot = createDepotNode(depotClass, wx, wy);
        state.nodes.push(newDepot);
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
        if (clickedNode && clickedNode.kind === 'DEPOT') {
            stationDroneAtNode(clickedNode, false);
            openNodeInspector(clickedNode);
            setActiveTool('route');
            return true;
        }
        showFloatingText(wx, wy, t('msg_drag_to_depot'), '#06B6D4');
        return false;
    }

    if (tokenType === 'bike' || tokenType === 'car') {
        const targetLine = clickedLine || state.lines[state.selectedLineId];
        if (targetLine && targetLine.nodeIds.length >= 2) {
            if (addVehicleToLine(targetLine, tokenType, false, wx, wy)) {
                setActiveTool('route');
                return true;
            }
        } else {
            showFloatingText(wx, wy, t('msg_drag_to_line'), '#F59E0B');
        }
        return false;
    }
    return false;
}

canvas.addEventListener('pointerdown', (e) => {
    sfx.init();
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const w = screenToWorld(sx, sy);

    state.drag.currWorldX = w.x;
    state.drag.currWorldY = w.y;
    state.drag.snapNode = null;
    state.drag.detachedNode = null;

    if (state.activeTool !== 'route') {
        if (applyTokenAtWorld(state.activeTool, w.x, w.y)) return;
        setActiveTool('route');
    }

    // 1. PRIORITY 1: Grabbing a Connector Plug ("Verbindungsstelle") immediately unplugs the line from that station!
    const connectorHit = findLineConnectorAtWorld(w.x, w.y);
    if (connectorHit) {
        document.getElementById('nodeInspector').classList.add('hidden');
        unplugStationFromLine(connectorHit.line, connectorHit.nodeIndex, w.x, w.y);
        return;
    }

    // 2. PRIORITY 2: Grabbing a Mini Metro T-Bar terminal cap
    const terminalHit = findLineTerminalAtWorld(w.x, w.y);
    if (terminalHit) {
        state.selectedLineId = terminalHit.line.id;
        state.drag.active = true;
        state.drag.mode = 'draw_line';
        state.drag.startNode = terminalHit.node;
        state.drag.canPullBackUnplug = true;
        state.drag.pullBackNodeIndex = terminalHit.nodeIndex;
        state.drag.pullBackNeighbor = terminalHit.neighbor;
        canvas.classList.add('dragging-active');
        updateAllUI();
        return;
    }

    const clickedNode = findNodeAtWorld(w.x, w.y, 10);
    const segHit = findLineSegmentDetailAtWorld(w.x, w.y, 15);

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
        canvas.classList.add('dragging-active');
        updateAllUI();
        return;
    }

    // 4. PRIORITY 4: Clicking/Dragging from a Station Node
    if (clickedNode) {
        if (clickedNode.kind === 'DEPOT') {
            openNodeInspector(clickedNode);
        } else {
            document.getElementById('nodeInspector').classList.add('hidden');
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

        canvas.classList.add('dragging-active');
        updateAllUI();
        return;
    }

    state.inspectedNodeId = null;
    document.getElementById('nodeInspector').classList.add('hidden');
});

window.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const w = screenToWorld(sx, sy);

    state.hover.worldX = w.x;
    state.hover.worldY = w.y;

    if (!state.drag.active) {
        const conn = findLineConnectorAtWorld(w.x, w.y);
        const term = !conn ? findLineTerminalAtWorld(w.x, w.y) : null;
        const hn = findNodeAtWorld(w.x, w.y, 8);
        const hl = (!hn && !term && !conn) ? findLineAtWorld(w.x, w.y, 12) : null;

        state.hover.connector = conn;
        state.hover.nodeId = hn ? hn.id : null;
        state.hover.lineId = conn ? conn.line.id : (term ? term.line.id : (hl ? hl.id : null));
        canvas.classList.toggle('hover-interactive', Boolean(conn || term || hn || hl));
        return;
    }

    state.drag.currWorldX = w.x;
    state.drag.currWorldY = w.y;
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
        const hoverNode = findNodeAtWorld(w.x, w.y, 14);
        if (hoverNode && hoverNode.id !== state.drag.anchorNode.id && !line.nodeIds.includes(hoverNode.id)) {
            state.drag.snapNode = hoverNode;
        } else {
            state.drag.snapNode = null;
        }
        return;
    }

    if (state.drag.mode === 'reroute_mid' && state.drag.prevNode && state.drag.nextNode) {
        const hoverNode = findNodeAtWorld(w.x, w.y, 14);
        if (hoverNode && !line.nodeIds.includes(hoverNode.id)) {
            state.drag.snapNode = hoverNode;
        } else {
            state.drag.snapNode = null;
        }
        return;
    }

    if (state.drag.mode === 'draw_line' && state.drag.startNode) {
        const hoverNode = findNodeAtWorld(w.x, w.y, 13);
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

window.addEventListener('pointerup', (e) => {
    if (!state.drag.active) return;
    const line = state.lines[state.selectedLineId];
    const city = currentCity();

    if (state.drag.mode === 'dock_token' && state.drag.tokenType) {
        const rect = canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        if (sy < window.innerHeight - 95) {
            const w = screenToWorld(sx, sy);
            applyTokenAtWorld(state.drag.tokenType, w.x, w.y);
        }
    } else if (state.drag.mode === 'reroute_end' && line) {
        const target = state.drag.snapNode;
        const anchor = state.drag.anchorNode;
        if (target && anchor && target.id !== anchor.id && !line.nodeIds.includes(target.id)) {
            const crossesWater = doesMetroCorridorCrossWater(anchor.x, anchor.y, target.x, target.y, city);
            if (crossesWater && state.inventory.bridges <= 0) {
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
                showFloatingText(target.x, target.y - 18, t('msg_no_bridge'), '#EF4444');
            } else {
                target.scaleVel = 2.8;
                state.ripples.push({ x: target.x, y: target.y, r: target.radius, maxR: 42, color: line.color, alpha: 0.9 });
                sfx.playConnect(false, line.id);
            }
        } else {
            recalculateLineBridges(line);
            if (state.inventory.bridges < 0 && state.drag.detachedNode) {
                line.nodeIds.splice(state.drag.insertIndex, 0, state.drag.detachedNode.id);
                recalculateLineBridges(line);
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
    canvas.classList.remove('dragging-active');
});

document.querySelectorAll('.dock-item').forEach(btn => {
    btn.addEventListener('pointerdown', (e) => {
        const tool = btn.dataset.tool;
        if (!tool || (state.inventory[tool] !== undefined && state.inventory[tool] <= 0)) return;
        e.stopPropagation();
        sfx.init();

        setActiveTool(tool);
        const rect = canvas.getBoundingClientRect();
        const w = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
        state.drag.active = true;
        state.drag.mode = 'dock_token';
        state.drag.tokenType = tool;
        state.drag.currWorldX = w.x;
        state.drag.currWorldY = w.y;
    });
});

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        setGameSpeed(state.gameSpeed === 0 ? 1 : 0);
    } else if (e.key === 'Escape') {
        setActiveTool('route');
        document.getElementById('cityModal').classList.add('hidden');
        document.getElementById('helpModal').classList.add('hidden');
        document.getElementById('nodeInspector').classList.add('hidden');
    }
});

window.addEventListener('resize', resizeCanvas);
