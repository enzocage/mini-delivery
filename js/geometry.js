/***************************************************************************
 * 3. GEOMETRY, SMOOTH INTERPOLATION & METRO CORRIDOR MATH
 ***************************************************************************/
function dist(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function damp(current, target, lambda, dt) {
    return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

function lerpAngle(a, b, t) {
    let diff = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    return a + diff * t;
}

function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function distToSegment(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return dist(px, py, x1, y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return dist(px, py, x1 + t * (x2 - x1), y1 + t * (y2 - y1));
}

function pointInPolygon(px, py, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i][0], yi = poly[i][1];
        const xj = poly[j][0], yj = poly[j][1];
        const intersect = ((yi > py) !== (yj > py)) &&
            (px < (xj - xi) * (py - yi) / ((yj - yi) || 0.0001) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function isPointInWater(x, y, city, margin = 0) {
    for (const r of city.rivers) {
        const halfW = (r.width * 0.5) + margin;
        for (let i = 0; i < r.pts.length - 1; i++) {
            const d = distToSegment(x, y, r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]);
            if (d <= halfW) return true;
        }
    }
    for (const poly of city.waterPolys) {
        if (pointInPolygon(x, y, poly)) return true;
        if (margin > 0) {
            for (let i = 0; i < poly.length; i++) {
                const p1 = poly[i], p2 = poly[(i + 1) % poly.length];
                if (distToSegment(x, y, p1[0], p1[1], p2[0], p2[1]) < margin) return true;
            }
        }
    }
    return false;
}

function doesSegmentCrossWater(x1, y1, x2, y2, city) {
    const steps = Math.max(8, Math.ceil(dist(x1, y1, x2, y2) / 9));
    for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const px = x1 + (x2 - x1) * t;
        const py = y1 + (y2 - y1) * t;
        if (isPointInWater(px, py, city, -2)) return true;
    }
    return false;
}

// Generate sleek 45-degree Metro/Motorways knee point between two points, with optional parallel lane offset!
// Canonicalized so (x1,y1 -> x2,y2, +offset) and (x2,y2 -> x1,y1, -offset) always share the exact same knee!
function computeMetroWaypoints(x1, y1, x2, y2, offsetPx = 0) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    // Normal vector for parallel corridor separation (like Mini Metro shared tracks)
    const nx = (-dy / len) * offsetPx;
    const ny = (dx / len) * offsetPx;

    const sx1 = x1 + nx, sy1 = y1 + ny;
    const sx2 = x2 + nx, sy2 = y2 + ny;

    // Canonical endpoint ordering so the 45° knee never flips when reversing travel direction
    const isCanon = (x1 < x2) || (x1 === x2 && y1 <= y2);
    const lax = isCanon ? sx1 : sx2;
    const lay = isCanon ? sy1 : sy2;
    const lbx = isCanon ? sx2 : sx1;
    const lby = isCanon ? sy2 : sy1;

    const adx = Math.abs(lbx - lax);
    const ady = Math.abs(lby - lay);
    if (adx < 10 || ady < 10 || Math.abs(adx - ady) < 10) {
        return [[sx1, sy1], [sx2, sy2]];
    }
    const diag = Math.min(adx, ady);
    let kx, ky;
    if (adx > ady) {
        kx = lax + Math.sign(lbx - lax) * (adx - diag);
        ky = lay;
    } else {
        kx = lax;
        ky = lay + Math.sign(lby - lay) * (ady - diag);
    }
    return [[sx1, sy1], [kx, ky], [sx2, sy2]];
}

// Expand a 3-point Metro polyline with the exact circular arc used by drawSmoothPolyline(ctx, pts, cornerRadius)
function expandSmoothWaypoints(pts, cornerRadius = 22) {
    if (!pts || pts.length <= 2) return pts;
    const out = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
        const p0 = pts[i - 1];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const v1x = p0[0] - p1[0], v1y = p0[1] - p1[1];
        const v2x = p2[0] - p1[0], v2y = p2[1] - p1[1];
        const d1 = Math.hypot(v1x, v1y);
        const d2 = Math.hypot(v2x, v2y);
        if (d1 < 1e-3 || d2 < 1e-3) {
            out.push(p1);
            continue;
        }
        const u1x = v1x / d1, u1y = v1y / d1;
        const u2x = v2x / d2, u2y = v2y / d2;
        const dot = Math.max(-1, Math.min(1, u1x * u2x + u1y * u2y));
        const angle = Math.acos(dot);
        const halfTan = Math.tan(angle * 0.5);
        if (angle < 0.05 || halfTan < 1e-4) {
            out.push(p1);
            continue;
        }
        const r = Math.min(cornerRadius, d1 * 0.48, d2 * 0.48);
        const tanDist = Math.min(d1 * 0.49, d2 * 0.49, r / halfTan);
        const t0x = p1[0] + u1x * tanDist, t0y = p1[1] + u1y * tanDist;
        const t2x = p1[0] + u2x * tanDist, t2y = p1[1] + u2y * tanDist;

        const steps = 6;
        for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const omt = 1 - t;
            // Smooth quadratic approximation tightly matching the circular arc between T0 and T2
            const qx = omt * omt * t0x + 2 * omt * t * p1[0] + t * t * t2x;
            const qy = omt * omt * t0y + 2 * omt * t * p1[1] + t * t * t2y;
            out.push([qx, qy]);
        }
    }
    out.push(pts[pts.length - 1]);
    return out;
}

function doesMetroCorridorCrossWater(x1, y1, x2, y2, city) {
    const pts = computeMetroWaypoints(x1, y1, x2, y2, 0);
    for (let i = 0; i < pts.length - 1; i++) {
        if (doesSegmentCrossWater(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], city)) {
            return true;
        }
    }
    return false;
}

function getLineSegmentCount(line) {
    if (!line || line.nodeIds.length < 2) return 0;
    return (line.isLoop && line.nodeIds.length >= 3) ? line.nodeIds.length : line.nodeIds.length - 1;
}

function getLineSegmentNodeIds(line, segIndex) {
    const n = line.nodeIds.length;
    return [line.nodeIds[segIndex % n], line.nodeIds[(segIndex + 1) % n]];
}

// Compute parallel lane offset when multiple lines share the same pair of stations
function getSegmentParallelOffset(lineId, nodeAId, nodeBId) {
    const minId = Math.min(nodeAId, nodeBId);
    const maxId = Math.max(nodeAId, nodeBId);
    const sharingLines = [];
    for (const l of state.lines) {
        const segCount = getLineSegmentCount(l);
        for (let i = 0; i < segCount; i++) {
            const [a, b] = getLineSegmentNodeIds(l, i);
            if ((a === minId && b === maxId) || (a === maxId && b === minId)) {
                sharingLines.push(l.id);
                break;
            }
        }
    }
    if (sharingLines.length <= 1) return 0;
    const idx = sharingLines.indexOf(lineId);
    if (idx === -1) return 0;
    const centered = idx - (sharingLines.length - 1) / 2;
    const sign = nodeAId < nodeBId ? 1 : -1;
    return centered * 6.5 * sign;
}

// Compute exact Connector Plug ("Verbindungsstelle"), T-Bar & Loop-Cap coordinates on the rendered corridor
function getConnectorPoint(node, neighborNode, laneOffset = 0) {
    if (!node || !neighborNode) return null;
    const pts = computeMetroWaypoints(node.x, node.y, neighborNode.x, neighborNode.y, laneOffset);
    const nextPt = pts[1] || [neighborNode.x, neighborNode.y];
    const angle = Math.atan2(nextPt[1] - node.y, nextPt[0] - node.x);
    const distFromCenter = node.radius + 5.5;
    return {
        x: node.x + Math.cos(angle) * distFromCenter,
        y: node.y + Math.sin(angle) * distFromCenter,
        angle
    };
}

function getTerminalTBarPoint(node, neighborNode, laneOffset = 0) {
    if (!node || !neighborNode) return null;
    const pts = computeMetroWaypoints(node.x, node.y, neighborNode.x, neighborNode.y, laneOffset);
    const nextPt = pts[1] || [neighborNode.x, neighborNode.y];
    const angle = Math.atan2(node.y - nextPt[1], node.x - nextPt[0]);
    const stemDist = node.radius + 10.5;
    return {
        x: node.x + Math.cos(angle) * stemDist,
        y: node.y + Math.sin(angle) * stemDist,
        angle,
        stemDist
    };
}

function getLoopCapPoint(node, neighborA, neighborB) {
    if (!node || !neighborA || !neighborB) return null;
    const ptsA = computeMetroWaypoints(node.x, node.y, neighborA.x, neighborA.y, 0);
    const nextA = ptsA[1] || [neighborA.x, neighborA.y];
    const angA = Math.atan2(nextA[1] - node.y, nextA[0] - node.x);

    const ptsB = computeMetroWaypoints(node.x, node.y, neighborB.x, neighborB.y, 0);
    const nextB = ptsB[1] || [neighborB.x, neighborB.y];
    const angB = Math.atan2(nextB[1] - node.y, nextB[0] - node.x);

    let vx = -(Math.cos(angA) + Math.cos(angB));
    let vy = -(Math.sin(angA) + Math.sin(angB));
    if (Math.hypot(vx, vy) < 0.25) {
        vx = -Math.sin(angA);
        vy = Math.cos(angA);
    }
    const angle = Math.atan2(vy, vx);
    const stemDist = node.radius + 12.0;
    return {
        x: node.x + Math.cos(angle) * stemDist,
        y: node.y + Math.sin(angle) * stemDist,
        angle,
        stemDist
    };
}

// Find a valid land coordinate within a progressive distance band from a reference point
function findProgressiveLandSpot(city, refX, refY, minDist, maxDist, minNodeDist = 64, avoidWaterCrossing = false) {
    for (let pass = 0; pass < (avoidWaterCrossing ? 2 : 1); pass++) {
        const checkWaterCrossing = avoidWaterCrossing && pass === 0;
        for (let attempt = 0; attempt < 260; attempt++) {
            const angle = Math.random() * Math.PI * 2;
            const r = minDist + Math.random() * Math.max(20, maxDist - minDist);
            const x = Math.max(58, Math.min(WORLD_W - 58, refX + Math.cos(angle) * r));
            const y = Math.max(58, Math.min(WORLD_H - 58, refY + Math.sin(angle) * r));

            if (isPointInWater(x, y, city, 17)) continue;
            let tooClose = false;
            for (const n of state.nodes) {
                if (dist(x, y, n.x, n.y) < minNodeDist) {
                    tooClose = true;
                    break;
                }
            }
            if (tooClose) continue;

            if (checkWaterCrossing) {
                let hasDryPath = !doesMetroCorridorCrossWater(refX, refY, x, y, city);
                if (!hasDryPath) {
                    for (const n of state.nodes) {
                        if (!doesMetroCorridorCrossWater(n.x, n.y, x, y, city)) {
                            hasDryPath = true;
                            break;
                        }
                    }
                }
                if (!hasDryPath) continue;
            }
            return { x, y };
        }
    }
    return findValidLandSpot(city, minNodeDist, 60, false);
}

function findValidLandSpot(city, minNodeDist = 62, marginFromEdge = 65, preferCenter = false) {
    for (let attempt = 0; attempt < 300; attempt++) {
        let x, y;
        if (preferCenter) {
            x = WORLD_W * 0.5 + (Math.random() - 0.5) * 240;
            y = WORLD_H * 0.5 + (Math.random() - 0.5) * 180;
        } else {
            x = marginFromEdge + Math.random() * (WORLD_W - marginFromEdge * 2);
            y = marginFromEdge + Math.random() * (WORLD_H - marginFromEdge * 2);
        }
        if (isPointInWater(x, y, city, 18)) continue;
        let tooClose = false;
        for (const n of state.nodes) {
            if (dist(x, y, n.x, n.y) < minNodeDist) {
                tooClose = true;
                break;
            }
        }
        if (!tooClose) return { x, y };
    }
    for (let attempt = 0; attempt < 200; attempt++) {
        const x = 55 + Math.random() * (WORLD_W - 110);
        const y = 55 + Math.random() * (WORLD_H - 110);
        if (!isPointInWater(x, y, city, 8)) return { x, y };
    }
    return { x: 500, y: 325 };
}
