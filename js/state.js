/***************************************************************************
 * 4. CORE GAME STATE, AUTO-ZOOM CAMERA & ENTITY MANAGEMENT
 ***************************************************************************/
const DIFFICULTY_SPECS = {
    joke: {
        id: 'joke',
        badge: 'JOKE',
        color: '#10B981',
        starTargets: [30, 60, 100],
        maxOrdersSL: 7,
        maxOrdersXL: 6,
        overloadSpeedMult: 0.35,
        deliveryRelief: 0.45,
        depotCapMult: 3.0,
        depotGridlockRatio: 0.98,
        spawnRateMult: 0.72,
        startLines: 4,
        startInv: { depot_S: 2, depot_L: 1, depot_XL: 0, drone: 3, bike: 4, car: 1, bridges: 5 }
    },
    easy: {
        id: 'easy',
        badge: 'EASY',
        color: '#0EA5E9',
        starTargets: [75, 160, 260],
        maxOrdersSL: 5,
        maxOrdersXL: 4,
        overloadSpeedMult: 0.68,
        deliveryRelief: 0.24,
        depotCapMult: 1.5,
        depotGridlockRatio: 0.92,
        spawnRateMult: 0.85,
        startLines: 3,
        startInv: { depot_S: 1, depot_L: 0, depot_XL: 0, drone: 1, bike: 3, car: 0, bridges: 3 }
    },
    hard: {
        id: 'hard',
        badge: 'HARD',
        color: '#F59E0B',
        starTargets: [100, 220, 350],
        maxOrdersSL: 4,
        maxOrdersXL: 3,
        overloadSpeedMult: 1.0,
        deliveryRelief: 0.14,
        depotCapMult: 1.0,
        depotGridlockRatio: 0.85,
        spawnRateMult: 1.0,
        startLines: 2,
        startInv: { depot_S: 0, depot_L: 0, depot_XL: 0, drone: 1, bike: 2, car: 0, bridges: 1 }
    },
    hardcore: {
        id: 'hardcore',
        badge: 'HARDCORE',
        color: '#F43F5E',
        starTargets: [150, 320, 500],
        maxOrdersSL: 3,
        maxOrdersXL: 2,
        overloadSpeedMult: 1.45,
        deliveryRelief: 0.09,
        depotCapMult: 0.78,
        depotGridlockRatio: 0.80,
        spawnRateMult: 1.28,
        startLines: 2,
        startInv: { depot_S: 0, depot_L: 0, depot_XL: 0, drone: 0, bike: 2, car: 0, bridges: 1 }
    },
    chuck: {
        id: 'chuck',
        badge: 'CHUCK NORRIS',
        color: '#8B5CF6',
        starTargets: [250, 500, 777],
        maxOrdersSL: 2,
        maxOrdersXL: 2,
        overloadSpeedMult: 2.15,
        deliveryRelief: 0.06,
        depotCapMult: 0.62,
        depotGridlockRatio: 0.74,
        spawnRateMult: 1.62,
        startLines: 2,
        startInv: { depot_S: 0, depot_L: 0, depot_XL: 0, drone: 0, bike: 1, car: 0, bridges: 1 }
    }
};

function getDifficultySpec() {
    return DIFFICULTY_SPECS[state.difficulty] || DIFFICULTY_SPECS.hard;
}

function getStarTargets() {
    return getDifficultySpec().starTargets;
}

const STAR_TARGETS = [100, 220, 350];

function getCityRecord(cityId) {
    try {
        const raw = localStorage.getItem('miniDelivery_cityRecords');
        const map = raw ? JSON.parse(raw) : {};
        return map[cityId] || { bestScore: 0, stars: 0 };
    } catch (e) {
        return { bestScore: 0, stars: 0 };
    }
}

function saveCityRecord(cityId, score, stars) {
    try {
        const raw = localStorage.getItem('miniDelivery_cityRecords');
        const map = raw ? JSON.parse(raw) : {};
        const prev = map[cityId] || { bestScore: 0, stars: 0 };
        map[cityId] = {
            bestScore: Math.max(prev.bestScore || 0, score),
            stars: Math.max(prev.stars || 0, stars)
        };
        localStorage.setItem('miniDelivery_cityRecords', JSON.stringify(map));
    } catch (e) {
        // Ignore storage errors
    }
}

const state = {
    cityIndex: 0,
    difficulty: 'hard',
    nightMode: false,
    endlessMode: false,
    victoryReached: false,
    starsEarned: 0,
    gameSpeed: 1,
    simulatorMode: false,
    simSpeedPercent: 100,
    aiDecisionTimer: 0,
    aiRebalanceTimer: 0,
    aiLastAction: '',
    isFastSimSubStep: false,
    score: 0,
    scoreBySize: { S: 0, L: 0, XL: 0 },

    // Time: 1 day = 16 seconds at 1x speed, 7 days = 1 week
    timeOfDay: 8.0,
    dayCount: 1,
    weekCount: 1,
    rushHourPulse: 0,

    // Progressive Unlocks (Starts minimalist with 2 lines on Day 1, expands up to 7!)
    unlockedLines: 2,
    everUnlocked: {
        bike: true,
        drone: true,
        bridges: true,
        depot_S: false,
        car: false,
        depot_L: false,
        depot_XL: false
    },

    // Tight, strategic Day 1 Inventory
    inventory: {
        depot_S: 0,
        depot_L: 0,
        depot_XL: 0,
        drone: 1,
        bike: 2,
        car: 0,
        bridges: 1
    },

    // Active Tool & Selection
    activeTool: 'route',
    selectedLineId: 0,
    hoveredLineId: null,
    inspectedNodeId: null,
    tutorialCompleted: false,

    // Entities
    nodes: [],
    lines: [],
    drones: [],
    ripples: [],
    floatingTexts: [],
    flyingPackages: [],

    // Automatic Director Camera + Invisible Touch Pan/Pinch Override
    cam: {
        x: 500, y: 325, zoom: 1.75,
        targetX: 500, targetY: 325, targetZoom: 1.75,
        userOffsetX: 0,
        userOffsetY: 0,
        userZoomMult: 1.0,
        manualHoldTimer: 0
    },

    // Unified Pointer & High-End Invisible Touch State
    drag: {
        active: false,
        isTouch: false,
        mode: null,
        tokenType: null,
        startNode: null,
        anchorNode: null,
        snapNode: null,
        detachedNode: null,
        magneticTarget: null,
        canPullBackUnplug: false,
        currWorldX: 500,
        currWorldY: 325,
        rawWorldX: 500,
        rawWorldY: 325,
        screenX: 0,
        screenY: 0
    },
    hover: {
        worldX: 500,
        worldY: 325,
        nodeId: null,
        lineId: null,
        terminalLineId: null,
        connector: null
    },

    spawnTimer: 0,
    packageTimer: 0,
    warningTickTimer: 0,
    nextId: 1
};

function getUID() {
    return state.nextId++;
}

function currentCity() {
    return CITIES[state.cityIndex];
}

function showFloatingText(x, y, text, color = '#F59E0B') {
    if (state.floatingTexts.length > 24) state.floatingTexts.shift();
    state.floatingTexts.push({ x, y, text, color, alpha: 1.0 });
}

/***************************************************************************
 * 5. AUTOMATIC CAMERA ZOOM & FRAMING ("zoom macht das spiel automatisch")
 ***************************************************************************/
function resetCameraToAuto() {
    state.cam.userOffsetX = 0;
    state.cam.userOffsetY = 0;
    state.cam.userZoomMult = 1.0;
    state.cam.manualHoldTimer = 0;
}

function updateAutoCamera(rawDt, instant = false) {
    if (state.nodes.length === 0) return;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const n of state.nodes) {
        const pad = n.kind === 'DEPOT' ? 42 : 34;
        if (n.x - pad < minX) minX = n.x - pad;
        if (n.x + pad > maxX) maxX = n.x + pad;
        if (n.y - pad < minY) minY = n.y - pad;
        if (n.y + pad > maxY) maxY = n.y + pad;
    }

    if (state.drag.active && state.drag.mode !== 'pan_camera') {
        const cx = Math.max(40, Math.min(WORLD_W - 40, state.drag.currWorldX));
        const cy = Math.max(40, Math.min(WORLD_H - 40, state.drag.currWorldY));
        minX = Math.min(minX, cx - 45);
        maxX = Math.max(maxX, cx + 45);
        minY = Math.min(minY, cy - 45);
        maxY = Math.max(maxY, cy + 45);
    }

    const spanW = Math.max(240, maxX - minX);
    const spanH = Math.max(170, maxY - minY);

    const marginX = Math.min(130, window.innerWidth * 0.14);
    const marginTop = 88;
    const marginBottom = 138;

    const availW = Math.max(280, window.innerWidth - marginX * 2);
    const availH = Math.max(220, window.innerHeight - marginTop - marginBottom);

    const zoomX = availW / (spanW + 90);
    const zoomY = availH / (spanH + 80);

    const idealZoom = Math.max(0.58, Math.min(1.76, Math.min(zoomX, zoomY)));

    const centerX = (minX + maxX) * 0.5;
    const centerY = (minY + maxY) * 0.5 + (marginBottom - marginTop) * 0.22 / idealZoom;

    // Gentle elastic return of manual touch pan/pinch back to the auto-director camera
    if (state.cam.manualHoldTimer > 0) {
        if (!state.drag.active) {
            state.cam.manualHoldTimer = Math.max(0, state.cam.manualHoldTimer - rawDt);
        }
    } else if (!state.drag.active) {
        state.cam.userOffsetX = damp(state.cam.userOffsetX, 0, 1.4, rawDt);
        state.cam.userOffsetY = damp(state.cam.userOffsetY, 0, 1.4, rawDt);
        state.cam.userZoomMult = damp(state.cam.userZoomMult, 1.0, 1.4, rawDt);
    }

    state.cam.targetX = Math.max(80, Math.min(WORLD_W - 80, centerX + state.cam.userOffsetX));
    state.cam.targetY = Math.max(60, Math.min(WORLD_H - 60, centerY + state.cam.userOffsetY));
    state.cam.targetZoom = Math.max(0.46, Math.min(2.65, idealZoom * state.cam.userZoomMult));

    if (instant) {
        state.cam.x = state.cam.targetX;
        state.cam.y = state.cam.targetY;
        state.cam.zoom = state.cam.targetZoom;
    } else {
        const camSpeed = state.drag.mode === 'pan_camera' || state.drag.mode === 'pinch_camera'
            ? 14.0
            : (state.drag.active ? 2.2 : 1.65);
        state.cam.x = damp(state.cam.x, state.cam.targetX, camSpeed, rawDt);
        state.cam.y = damp(state.cam.y, state.cam.targetY, camSpeed, rawDt);
        state.cam.zoom = damp(state.cam.zoom, state.cam.targetZoom, camSpeed * 0.88, rawDt);
    }
}

/***************************************************************************
 * 6. INITIALIZATION & ENTITY CREATION
 ***************************************************************************/
function initCity(cityIdx) {
    state.cityIndex = cityIdx;
    const city = currentCity();

    resetCameraToAuto();
    state.endlessMode = false;
    state.victoryReached = false;
    state.starsEarned = 0;
    state.gameSpeed = 1;
    state.score = 0;
    state.scoreBySize = { S: 0, L: 0, XL: 0 };
    state.timeOfDay = 8.0;
    state.dayCount = 1;
    state.weekCount = 1;
    state.rushHourPulse = 0;

    const dSpec = getDifficultySpec();
    state.unlockedLines = dSpec.startLines;
    state.everUnlocked = {
        bike: true,
        drone: true,
        bridges: true,
        depot_S: dSpec.startInv.depot_S > 0,
        car: dSpec.startInv.car > 0,
        depot_L: dSpec.startInv.depot_L > 0,
        depot_XL: dSpec.startInv.depot_XL > 0
    };
    state.inventory = { ...dSpec.startInv };

    state.activeTool = 'route';
    state.selectedLineId = 0;
    state.hoveredLineId = null;
    state.inspectedNodeId = null;
    state.tutorialCompleted = false;

    state.nodes = [];
    state.drones = [];
    state.ripples = [];
    state.floatingTexts = [];
    state.flyingPackages = [];
    state.spawnTimer = 0;
    state.packageTimer = 0;
    state.aiDecisionTimer = 0;
    state.aiRebalanceTimer = 0;
    state.aiLastAction = '';
    state.isFastSimSubStep = false;
    state.nextId = 1;

    state.lines = LINE_COLORS.map(c => ({
        id: c.id,
        name: c.name,
        color: c.hex,
        nodeIds: [],
        isLoop: false,
        bridgesUsed: 0,
        vehicles: []
    }));

    // 1. Spawn Central Hauptdepot in a cozy central spot near the river
    const mainPos = findValidLandSpot(city, 80, 160, true);
    const mainDepot = createDepotNode('MAIN', mainPos.x, mainPos.y);
    state.nodes.push(mainDepot);

    // 2. Spawn 2 nearby S-Customer Stations on the same side of the river (no bridge forced on Day 1!)
    for (let i = 0; i < 2; i++) {
        const pos = findProgressiveLandSpot(city, mainDepot.x, mainDepot.y, 85, 145, 68, true);
        const cust = createCustomerNode('S', pos.x, pos.y);
        state.nodes.push(cust);
        spawnOrderForCustomer(cust);
    }

    document.getElementById('uiCityName').textContent = city.name;
    document.getElementById('uiCityRiver').textContent = city.riverName.split('&')[0].split(',')[0].trim();
    document.getElementById('nodeInspector').classList.add('hidden');
    const vicModal = document.getElementById('victoryModal');
    if (vicModal) vicModal.classList.add('hidden');
    const upgBar = document.getElementById('inlineUpgradeBar');
    if (upgBar) { upgBar.classList.add('hidden'); upgBar.innerHTML = ''; }
    const statusBar = document.getElementById('inlineStatusBar');
    if (statusBar) { statusBar.classList.add('hidden'); statusBar.innerHTML = ''; }

    const hintBanner = document.getElementById('uiHintBanner');
    if (hintBanner) hintBanner.classList.remove('opacity-0');
    const hintPill = document.getElementById('uiHintPill');
    if (hintPill) hintPill.classList.toggle('hidden', Boolean(state.simulatorMode));
    document.getElementById('uiHintText').textContent = t('hint_initial');

    applyThemeColors();
    updateAutoCamera(1.0, true);
    setGameSpeed(1);
    updateAllUI();
}

function createDepotNode(depotType, x, y) {
    const spec = DEPOT_SPECS[depotType];
    const dSpec = getDifficultySpec();
    const scaledCap = Math.max(4, Math.round(spec.cap * dSpec.depotCapMult));
    const node = {
        id: getUID(),
        kind: 'DEPOT',
        depotType,
        label: getDepotLabel(depotType),
        x, y,
        radius: spec.radius,
        capacity: scaledCap,
        allowedSizes: spec.allowed,
        droneRange: spec.droneRange,
        storage: [],
        overloadTimer: 0,
        scale: 0.05,
        scaleVel: 0,
        pulsePhase: Math.random() * Math.PI * 2
    };
    if (state.ripples.length > 35) state.ripples.shift();
    state.ripples.push({ x, y, r: 4, maxR: 68, color: spec.color, alpha: 0.95 });
    return node;
}

function createCustomerNode(demandType, x, y) {
    const dSpec = getDifficultySpec();
    const node = {
        id: getUID(),
        kind: 'CUSTOMER',
        demandType,
        x, y,
        radius: demandType === 'XL' ? 16.5 : (demandType === 'L' ? 14.5 : 13),
        waitingOrders: [],
        maxOrders: demandType === 'XL' ? dSpec.maxOrdersXL : dSpec.maxOrdersSL,
        overloadTimer: 0,
        scale: state.isFastSimSubStep ? 1.0 : 0.05,
        scaleVel: 0,
        pulsePhase: Math.random() * Math.PI * 2
    };
    const col = demandType === 'S' ? '#0EA5E9' : (demandType === 'L' ? '#F59E0B' : '#F43F5E');
    if (state.ripples.length > 35) state.ripples.shift();
    state.ripples.push({ x, y, r: 3, maxR: 52, color: col, alpha: 0.9 });
    sfx.playSpawnBuilding(demandType);
    return node;
}

function spawnOrderForCustomer(customer) {
    if (customer.waitingOrders.length >= 10) return;
    let size = customer.demandType;
    if (customer.demandType === 'L' && Math.random() < 0.25) size = 'S';
    if (customer.demandType === 'XL' && Math.random() < 0.20) size = 'L';

    const orderId = getUID();
    customer.waitingOrders.push({
        id: orderId,
        size,
        customerId: customer.id,
        scale: 0.05
    });

    const supplyDepots = state.nodes.filter(n =>
        n.kind === 'DEPOT' &&
        n.allowedSizes.includes(size) &&
        n.storage.length < n.capacity &&
        (n.depotType === 'MAIN' ||
         state.lines.some(l => l.nodeIds.includes(n.id) && l.nodeIds.includes(customer.id) && l.vehicles.length > 0))
    );
    if (supplyDepots.length > 0) {
        supplyDepots.sort((a, b) => {
            const fillA = a.storage.length / Math.max(1, a.capacity);
            const fillB = b.storage.length / Math.max(1, b.capacity);
            if (Math.abs(fillA - fillB) > 0.25) return fillA - fillB;
            return dist(a.x, a.y, customer.x, customer.y) - dist(b.x, b.y, customer.x, customer.y);
        });
        const sourceDepot = supplyDepots[0];
        sourceDepot.storage.push({
            id: orderId,
            size,
            targetCustomerId: customer.id,
            scale: state.isFastSimSubStep ? 1.0 : 0.05
        });
    }
}

function syncMainDepotSupply() {
    const mainDepots = state.nodes.filter(n => n.kind === 'DEPOT' && n.depotType === 'MAIN');
    if (mainDepots.length === 0) return;

    // 1. Collect all valid active waitingOrder IDs across all customer stations
    const validOrderIds = new Set();
    for (const n of state.nodes) {
        if (n.kind === 'CUSTOMER') {
            for (const ord of n.waitingOrders) {
                validOrderIds.add(ord.id);
            }
        }
    }

    // 2. Purge any stale/orphan packages in Depots whose order was already fulfilled
    for (const n of state.nodes) {
        if (n.kind === 'DEPOT') {
            for (let i = n.storage.length - 1; i >= 0; i--) {
                if (!validOrderIds.has(n.storage[i].id)) {
                    n.storage.splice(i, 1);
                }
            }
        }
    }

    // If any MAIN depot is above 65% capacity, offload compatible packages to connected S/L/XL buffer hubs on the same line
    const bufferHubs = state.nodes.filter(n =>
        n.kind === 'DEPOT' && n.depotType !== 'MAIN' &&
        n.storage.length < Math.floor(n.capacity * 0.75)
    );
    if (bufferHubs.length > 0) {
        for (const m of mainDepots) {
            while (m.storage.length > Math.floor(m.capacity * 0.65)) {
                let moved = false;
                for (let i = m.storage.length - 1; i >= 0; i--) {
                    const pkg = m.storage[i];
                    const hub = bufferHubs.find(h =>
                        h.allowedSizes.includes(pkg.size) &&
                        h.storage.length < Math.floor(h.capacity * 0.75) &&
                        state.lines.some(l => l.nodeIds.includes(h.id) && l.nodeIds.includes(pkg.targetCustomerId) && l.vehicles.length > 0)
                    );
                    if (hub) {
                        m.storage.splice(i, 1);
                        hub.storage.push(pkg);
                        moved = true;
                        break;
                    }
                }
                if (!moved) break;
            }
        }
    }

    const existingIds = new Set();
    for (const n of state.nodes) {
        if (n.kind === 'DEPOT') {
            for (const p of n.storage) existingIds.add(p.id);
        }
    }
    for (const d of state.drones) {
        if (d.cargo) existingIds.add(d.cargo.id);
    }
    for (const line of state.lines) {
        for (const v of line.vehicles) {
            for (const p of v.cargo) existingIds.add(p.id);
        }
    }

    for (const n of state.nodes) {
        if (n.kind === 'CUSTOMER') {
            for (const ord of n.waitingOrders) {
                if (!existingIds.has(ord.id)) {
                    mainDepots.sort((a, b) => dist(a.x, a.y, n.x, n.y) - dist(b.x, b.y, n.x, n.y));
                    const targetMain = mainDepots[0];
                    if (targetMain.storage.length < targetMain.capacity) {
                        targetMain.storage.push({
                            id: ord.id,
                            size: ord.size,
                            targetCustomerId: n.id,
                            scale: 0.1
                        });
                        existingIds.add(ord.id);
                    }
                }
            }
        }
    }
}

function spawnFlyingPackageArc(fromX, fromY, toX, toY, size) {
    if (state.isFastSimSubStep && state.flyingPackages.length > 16) return;
    state.flyingPackages.push({
        fromX, fromY,
        toX, toY,
        size,
        t: 0,
        duration: 0.22
    });
}

function stationDroneAtNode(depotNode, freeFromStarter = false) {
    if (!depotNode || depotNode.kind !== 'DEPOT') return false;
    if (!freeFromStarter && state.inventory.drone <= 0) {
        showFloatingText(depotNode.x, depotNode.y - 20, t('msg_no_drone'), '#EF4444');
        return false;
    }
    if (!freeFromStarter) state.inventory.drone--;

    depotNode.scaleVel = 3.2;

    const countAtHub = state.drones.filter(d => d.homeNodeId === depotNode.id).length;
    const orbitAngle = countAtHub * 2.1;
    state.drones.push({
        id: getUID(),
        homeNodeId: depotNode.id,
        x: depotNode.x + Math.cos(orbitAngle) * 16,
        y: depotNode.y + Math.sin(orbitAngle) * 16,
        vx: 0, vy: 0,
        state: 'IDLE',
        cargo: null,
        pickupNodeId: null,
        dropNodeId: null,
        rotorPhase: Math.random() * 10,
        scale: state.isFastSimSubStep ? 1.0 : 0.1,
        trail: []
    });
    sfx.playPlaceDepot('S');
    if (!state.isFastSimSubStep) updateAllUI();
    return true;
}

function addVehicleToLine(line, vType, freeFromStarter = false, spawnX = null, spawnY = null) {
    if (!line || line.nodeIds.length < 2) {
        showFloatingText(state.cam.x, state.cam.y, t('msg_draw_line_first'), '#F59E0B');
        return false;
    }
    if (!freeFromStarter && state.inventory[vType] <= 0) {
        showFloatingText(state.cam.x, state.cam.y, t('msg_no_veh', { veh: getVehicleLabel(vType) }), '#EF4444');
        return false;
    }
    if (!freeFromStarter) state.inventory[vType]--;

    let segIdx = 0;
    let startProg = 0;
    let startNode = state.nodes.find(n => n.id === line.nodeIds[0]);
    let startX = startNode ? startNode.x : 500;
    let startY = startNode ? startNode.y : 325;
    let startAngle = 0;
    const segCount = getLineSegmentCount(line);
    const startDir = (line.isLoop && line.vehicles.length % 2 === 1) ? -1 : 1;

    if (spawnX !== null && spawnY !== null) {
        const proj = projectWorldPointToLine(line, spawnX, spawnY);
        if (proj) {
            segIdx = proj.segIndex;
            startProg = startDir === 1 ? proj.progress : (1 - proj.progress);
            startX = proj.x;
            startY = proj.y;
            startAngle = startDir === 1 ? proj.forwardAngle : (proj.forwardAngle + Math.PI);
        }
    } else if (startDir === -1 && segCount > 0) {
        const [, id2] = getLineSegmentNodeIds(line, segIdx);
        const n2 = state.nodes.find(n => n.id === id2);
        if (n2) {
            startX = n2.x;
            startY = n2.y;
        }
    }

    const [idA, idB] = getLineSegmentNodeIds(line, segIdx);
    const newVeh = {
        id: getUID(),
        type: vType,
        lineId: line.id,
        segIndex: segIdx,
        segNodeA: idA,
        segNodeB: idB,
        progress: startProg,
        dir: startDir,
        x: startX,
        y: startY,
        angle: startAngle,
        scale: 0.1,
        bounceScale: 1.25,
        cargo: [],
        dwellTimer: 0.08
    };
    line.vehicles.push(newVeh);

    // If dropped directly onto a station on this line, immediately load/unload at that station
    if (spawnX !== null && spawnY !== null && typeof handleVehicleStopAtNode === 'function') {
        const nearNode = state.nodes.find(n => line.nodeIds.includes(n.id) && dist( startX, startY, n.x, n.y ) <= n.radius + 12);
        if (nearNode) {
            handleVehicleStopAtNode(newVeh, line, nearNode);
        }
    }

    sfx.playConnect(false, line.id);
    if (!state.isFastSimSubStep) updateAllUI();
    return true;
}

function reconcileLineVehicles(line) {
    if (!line || !line.vehicles || line.vehicles.length === 0) return;
    const segCount = getLineSegmentCount(line);
    if (segCount < 1) return;

    for (const v of line.vehicles) {
        // 1. If the exact segment (segNodeA, segNodeB) still exists on the line, keep the vehicle on it seamlessly
        if (v.segNodeA !== undefined && v.segNodeB !== undefined) {
            let matched = false;
            for (let i = 0; i < segCount; i++) {
                const [id1, id2] = getLineSegmentNodeIds(line, i);
                if (id1 === v.segNodeA && id2 === v.segNodeB) {
                    v.segIndex = i;
                    matched = true;
                    break;
                } else if (id1 === v.segNodeB && id2 === v.segNodeA) {
                    v.segIndex = i;
                    v.dir = -v.dir;
                    v.segNodeA = id1;
                    v.segNodeB = id2;
                    matched = true;
                    break;
                }
            }
            if (matched) continue;
        }

        // 2. Otherwise (segment was split or detached), project (v.x, v.y) onto the closest point along the updated road
        let bestSeg = 0;
        let bestProg = 0;
        let bestDist = Infinity;

        for (let i = 0; i < segCount; i++) {
            const [id1, id2] = getLineSegmentNodeIds(line, i);
            const n1 = state.nodes.find(n => n.id === id1);
            const n2 = state.nodes.find(n => n.id === id2);
            if (!n1 || !n2) continue;

            const laneOffset = getSegmentParallelOffset(line.id, n1.id, n2.id);
            const rawPts = computeMetroWaypoints(n1.x, n1.y, n2.x, n2.y, laneOffset);
            const smoothPts = expandSmoothWaypoints(rawPts, 22);
            const pts = v.dir === 1 ? smoothPts : smoothPts.slice().reverse();

            let totalLen = 0;
            const segLens = [];
            for (let k = 0; k < pts.length - 1; k++) {
                const l = dist(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1]);
                segLens.push(l);
                totalLen += l;
            }
            totalLen = Math.max(1, totalLen);

            let accum = 0;
            for (let k = 0; k < pts.length - 1; k++) {
                const ax = pts[k][0], ay = pts[k][1];
                const bx = pts[k + 1][0], by = pts[k + 1][1];
                const l2 = (bx - ax) ** 2 + (by - ay) ** 2;
                let t = l2 > 0 ? ((v.x - ax) * (bx - ax) + (v.y - ay) * (by - ay)) / l2 : 0;
                t = Math.max(0, Math.min(1, t));
                const px = ax + t * (bx - ax);
                const py = ay + t * (by - ay);
                const d = dist(v.x, v.y, px, py);
                if (d < bestDist) {
                    bestDist = d;
                    bestSeg = i;
                    bestProg = Math.max(0, Math.min(0.98, (accum + t * segLens[k]) / totalLen));
                }
                accum += segLens[k];
            }
        }

        v.segIndex = bestSeg;
        v.progress = bestProg;
        const [newIdA, newIdB] = getLineSegmentNodeIds(line, bestSeg);
        v.segNodeA = newIdA;
        v.segNodeB = newIdB;
    }
}

function recalculateLineBridges(line) {
    state.inventory.bridges += line.bridgesUsed;
    line.bridgesUsed = 0;

    if (line.nodeIds.length < 3) {
        line.isLoop = false;
    }

    const city = currentCity();
    let needed = 0;
    const segCount = getLineSegmentCount(line);
    for (let i = 0; i < segCount; i++) {
        const [id1, id2] = getLineSegmentNodeIds(line, i);
        const n1 = state.nodes.find(n => n.id === id1);
        const n2 = state.nodes.find(n => n.id === id2);
        if (!n1 || !n2) continue;
        if (doesMetroCorridorCrossWater(n1.x, n1.y, n2.x, n2.y, city)) {
            needed++;
        }
    }
    line.bridgesUsed = needed;
    state.inventory.bridges -= needed;
    reconcileLineVehicles(line);
}

function openLineLoopAtSegment(line, segIdx) {
    if (!line || !line.isLoop || line.nodeIds.length < 3) return false;
    const N = line.nodeIds.length;
    const normSeg = ((segIdx % N) + N) % N;

    // Rotate nodeIds so the broken segment (normSeg -> (normSeg+1)%N) becomes the new open ends:
    // head = oldNodeIds[(normSeg + 1) % N], tail = oldNodeIds[normSeg]
    const rotated = [];
    for (let k = 1; k <= N; k++) {
        rotated.push(line.nodeIds[(normSeg + k) % N]);
    }
    line.nodeIds = rotated;
    line.isLoop = false;

    for (const v of line.vehicles) {
        if (v.segIndex === normSeg) {
            const closerToHead = (v.dir === 1 && v.progress >= 0.5) || (v.dir === -1 && v.progress < 0.5);
            if (closerToHead) {
                v.segIndex = 0;
                v.progress = 0;
                v.dir = 1;
            } else {
                v.segIndex = Math.max(0, N - 2);
                v.progress = 0;
                v.dir = -1;
            }
        } else {
            v.segIndex = (v.segIndex - (normSeg + 1) + N) % N;
        }
    }
    recalculateLineBridges(line);
    return true;
}

function clearLine(line) {
    if (!line) return;
    for (const v of line.vehicles) {
        state.inventory[v.type]++;
    }
    line.vehicles = [];
    line.nodeIds = [];
    line.isLoop = false;
    recalculateLineBridges(line);
    sfx.playDisconnect();
    if (!state.isFastSimSubStep) updateAllUI();
}
