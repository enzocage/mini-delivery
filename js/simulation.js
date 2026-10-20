/***************************************************************************
 * 7. MULTI-MODAL LOGISTICS SIMULATION & PROGRESSION TICK
 ***************************************************************************/
function canNodeReachCustomerViaDrones(depotNode, customerNode, size) {
    if (size !== 'S') return false;
    const hasDrone = state.drones.some(d => d.homeNodeId === depotNode.id);
    if (!hasDrone) return false;
    return dist(depotNode.x, depotNode.y, customerNode.x, customerNode.y) <= depotNode.droneRange;
}

function canOtherLineDeliverFromDepot(depotNode, customerNode, size, excludeLineId) {
    for (const l of state.lines) {
        if (l.id === excludeLineId || l.nodeIds.length < 2) continue;
        if (!l.nodeIds.includes(depotNode.id)) continue;
        const hasCapableVehicle = l.vehicles.some(v =>
            (size === 'S') ||
            (size === 'L' && (v.type === 'bike' || v.type === 'car')) ||
            (size === 'XL' && v.type === 'car')
        );
        if (!hasCapableVehicle) continue;
        if (l.nodeIds.includes(customerNode.id)) return true;
        for (const nid of l.nodeIds) {
            const subNode = state.nodes.find(n => n.id === nid);
            if (subNode && subNode.kind === 'DEPOT' && canNodeReachCustomerViaDrones(subNode, customerNode, size)) {
                return true;
            }
        }
    }
    return false;
}

function completeDelivery(customerNode, pkg, fromX = null, fromY = null) {
    const idx = customerNode.waitingOrders.findIndex(o => o.id === pkg.id || o.size === pkg.size);
    if (idx !== -1) {
        customerNode.waitingOrders.splice(idx, 1);
    }
    if (pkg.targetCustomerId && pkg.targetCustomerId !== customerNode.id) {
        for (const n of state.nodes) {
            if (n.kind === 'DEPOT') {
                const orphan = n.storage.find(p => p.targetCustomerId === customerNode.id && p.size === pkg.size);
                if (orphan) {
                    orphan.targetCustomerId = pkg.targetCustomerId;
                    break;
                }
            }
        }
    }
    customerNode.overloadTimer = Math.max(0, customerNode.overloadTimer - 0.38);
    customerNode.scaleVel = 2.4;

    if (fromX !== null && fromY !== null) {
        spawnFlyingPackageArc(fromX, fromY, customerNode.x, customerNode.y, pkg.size);
    }

    state.score++;
    state.scoreBySize[pkg.size] = (state.scoreBySize[pkg.size] || 0) + 1;

    const scoreEl = document.getElementById('uiScore');
    scoreEl.textContent = state.score;
    scoreEl.classList.remove('score-pop');
    void scoreEl.offsetWidth;
    scoreEl.classList.add('score-pop');

    const col = pkg.size === 'S' ? '#0EA5E9' : (pkg.size === 'L' ? '#F59E0B' : '#F43F5E');
    state.ripples.push({ x: customerNode.x, y: customerNode.y, r: customerNode.radius * 0.6, maxR: 44, color: col, alpha: 0.85 });
    sfx.playPackageDelivered(pkg.size);
}

function updateDrones(dt) {
    for (const d of state.drones) {
        d.rotorPhase += dt * 30;
        d.scale = damp(d.scale, 1.0, 12, dt);

        const home = state.nodes.find(n => n.id === d.homeNodeId);
        if (!home) continue;

        if (d.state !== 'IDLE' && Math.random() < 0.65) {
            d.trail.push({ x: d.x, y: d.y, alpha: 0.5 });
            if (d.trail.length > 14) d.trail.shift();
        }
        for (let i = d.trail.length - 1; i >= 0; i--) {
            d.trail[i].alpha -= dt * 1.5;
            if (d.trail[i].alpha <= 0) d.trail.splice(i, 1);
        }

        const speed = VEHICLE_SPECS.drone.speed * (home.depotType === 'L' || home.depotType === 'XL' ? 1.15 : 1.0);

        if (d.state === 'IDLE') {
            const angle = d.rotorPhase * 0.07 + (d.id % 7);
            const tx = home.x + Math.cos(angle) * (home.radius + 7);
            const ty = home.y + Math.sin(angle) * (home.radius + 7);
            d.x = damp(d.x, tx, 7, dt);
            d.y = damp(d.y, ty, 7, dt);

            let chosenPkgIdx = -1;
            let targetNode = null;

            for (let i = 0; i < home.storage.length; i++) {
                const p = home.storage[i];
                if (p.size !== 'S') continue;
                const cust = state.nodes.find(n => n.id === p.targetCustomerId);
                if (!cust || cust.waitingOrders.length === 0) continue;

                if (dist(home.x, home.y, cust.x, cust.y) <= home.droneRange) {
                    chosenPkgIdx = i;
                    targetNode = cust;
                    break;
                }
                for (const relay of state.nodes) {
                    if (relay.kind === 'DEPOT' && relay.id !== home.id &&
                        relay.storage.length < relay.capacity &&
                        dist(home.x, home.y, relay.x, relay.y) <= home.droneRange &&
                        dist(relay.x, relay.y, cust.x, cust.y) < dist(home.x, home.y, cust.x, cust.y) - 40) {
                        chosenPkgIdx = i;
                        targetNode = relay;
                        break;
                    }
                }
                if (targetNode) break;
            }

            if (chosenPkgIdx !== -1 && targetNode) {
                d.cargo = home.storage.splice(chosenPkgIdx, 1)[0];
                d.dropNodeId = targetNode.id;
                d.state = 'TO_DROP';
                sfx.playPickupPip();
                continue;
            }

            if (home.depotType !== 'MAIN' && home.storage.length < home.capacity) {
                const sourceHub = state.nodes.find(n =>
                    n.kind === 'DEPOT' && n.id !== home.id &&
                    dist(home.x, home.y, n.x, n.y) <= home.droneRange &&
                    n.storage.some(p => {
                        if (p.size !== 'S') return false;
                        const c = state.nodes.find(cu => cu.id === p.targetCustomerId);
                        return c && dist(home.x, home.y, c.x, c.y) < dist(n.x, n.y, c.x, c.y);
                    })
                );
                if (sourceHub) {
                    d.pickupNodeId = sourceHub.id;
                    d.state = 'TO_PICKUP';
                }
            }
        } else if (d.state === 'TO_PICKUP') {
            const src = state.nodes.find(n => n.id === d.pickupNodeId);
            if (!src) { d.state = 'RETURNING'; continue; }
            const rem = dist(d.x, d.y, src.x, src.y);
            if (rem < 9) {
                const pIdx = src.storage.findIndex(p => p.size === 'S');
                if (pIdx !== -1) {
                    d.cargo = src.storage.splice(pIdx, 1)[0];
                    d.dropNodeId = home.id;
                    d.state = 'TO_DROP';
                    sfx.playPickupPip();
                } else {
                    d.state = 'RETURNING';
                }
            } else {
                d.x += ((src.x - d.x) / rem) * speed * dt;
                d.y += ((src.y - d.y) / rem) * speed * dt;
            }
        } else if (d.state === 'TO_DROP') {
            const dropTarget = state.nodes.find(n => n.id === d.dropNodeId);
            if (!dropTarget || !d.cargo) {
                d.state = 'RETURNING';
                continue;
            }
            const rem = dist(d.x, d.y, dropTarget.x, dropTarget.y);
            if (rem < 11) {
                if (dropTarget.kind === 'CUSTOMER') {
                    completeDelivery(dropTarget, d.cargo, d.x, d.y);
                } else if (dropTarget.kind === 'DEPOT') {
                    if (dropTarget.storage.length < dropTarget.capacity) {
                        d.cargo.scale = 0.1;
                        dropTarget.storage.push(d.cargo);
                        spawnFlyingPackageArc(d.x, d.y, dropTarget.x, dropTarget.y, d.cargo.size);
                    }
                }
                d.cargo = null;
                d.state = 'RETURNING';
            } else {
                d.x += ((dropTarget.x - d.x) / rem) * speed * dt;
                d.y += ((dropTarget.y - d.y) / rem) * speed * dt;
            }
        } else if (d.state === 'RETURNING') {
            const rem = dist(d.x, d.y, home.x, home.y);
            if (rem < 14) {
                d.state = 'IDLE';
            } else {
                d.x += ((home.x - d.x) / rem) * speed * dt;
                d.y += ((home.y - d.y) / rem) * speed * dt;
            }
        }
    }
}

function canVehicleLoadPackage(vehicle, pkgSize) {
    if (vehicle.type === 'bike' && pkgSize === 'XL') return false;
    const maxUnits = vehicle.type === 'car' ? 4 : 2;
    const usedUnits = vehicle.cargo.reduce((acc, p) => acc + (p.size === 'XL' ? 4 : (p.size === 'L' ? 2 : 1)), 0);
    const reqUnits = pkgSize === 'XL' ? 4 : (pkgSize === 'L' ? 2 : 1);
    return (usedUnits + reqUnits) <= maxUnits;
}

function handleVehicleStopAtNode(vehicle, line, node) {
    let didAction = false;

    // 1. UNLOAD
    for (let i = vehicle.cargo.length - 1; i >= 0; i--) {
        const pkg = vehicle.cargo[i];
        if (node.kind === 'CUSTOMER' && (node.id === pkg.targetCustomerId || node.waitingOrders.some(o => o.size === pkg.size))) {
            vehicle.cargo.splice(i, 1);
            completeDelivery(node, pkg, vehicle.x, vehicle.y);
            didAction = true;
        } else if (node.kind === 'DEPOT' && node.depotType !== 'MAIN') {
            const cust = state.nodes.find(n => n.id === pkg.targetCustomerId);
            if (cust && !line.nodeIds.includes(cust.id) &&
                node.allowedSizes.includes(pkg.size) &&
                node.storage.length < node.capacity) {
                if (canNodeReachCustomerViaDrones(node, cust, pkg.size) ||
                    canOtherLineDeliverFromDepot(node, cust, pkg.size, line.id)) {
                    vehicle.cargo.splice(i, 1);
                    pkg.scale = 0.1;
                    node.storage.push(pkg);
                    node.scaleVel = 1.8;
                    spawnFlyingPackageArc(vehicle.x, vehicle.y, node.x, node.y, pkg.size);
                    didAction = true;
                }
            }
        }
    }

    // 2. LOAD (Prioritize packages for the most urgent/overloaded customer stations first!)
    if (node.kind === 'DEPOT' && node.storage.length > 0) {
        for (let i = node.storage.length - 1; i >= 0; i--) {
            const c = state.nodes.find(n => n.id === node.storage[i].targetCustomerId);
            if (!c || c.waitingOrders.length === 0) {
                node.storage.splice(i, 1);
            }
        }

        node.storage.sort((a, b) => {
            const ca = state.nodes.find(n => n.id === a.targetCustomerId);
            const cb = state.nodes.find(n => n.id === b.targetCustomerId);
            const urgA = ca ? (ca.overloadTimer * 10 + ca.waitingOrders.length) : 0;
            const urgB = cb ? (cb.overloadTimer * 10 + cb.waitingOrders.length) : 0;
            if (Math.abs(urgB - urgA) > 0.2) return urgB - urgA;
            return a.id - b.id;
        });

        for (let i = 0; i < node.storage.length; i++) {
            const pkg = node.storage[i];
            if (!canVehicleLoadPackage(vehicle, pkg.size)) continue;

            const cust = state.nodes.find(n => n.id === pkg.targetCustomerId);
            if (!cust || cust.waitingOrders.length === 0) continue;

            const lineVisitsCustomer = line.nodeIds.some(nid => {
                const cn = state.nodes.find(x => x.id === nid);
                return cn && cn.kind === 'CUSTOMER' && (cn.id === cust.id || cn.waitingOrders.some(o => o.size === pkg.size));
            });

            let lineVisitsTransferHub = false;
            if (!lineVisitsCustomer) {
                for (const nid of line.nodeIds) {
                    if (nid === node.id) continue;
                    const hub = state.nodes.find(x => x.id === nid);
                    if (hub && hub.kind === 'DEPOT' && hub.allowedSizes.includes(pkg.size) && hub.storage.length < hub.capacity) {
                        if (canNodeReachCustomerViaDrones(hub, cust, pkg.size) ||
                            canOtherLineDeliverFromDepot(hub, cust, pkg.size, line.id)) {
                            lineVisitsTransferHub = true;
                            break;
                        }
                    }
                }
            }

            if (lineVisitsCustomer || lineVisitsTransferHub) {
                const loaded = node.storage.splice(i, 1)[0];
                i--;
                loaded.scale = 0.1;
                vehicle.cargo.push(loaded);
                spawnFlyingPackageArc(node.x, node.y, vehicle.x, vehicle.y, loaded.size);
                didAction = true;
            }
        }
    }

    if (didAction) {
        vehicle.bounceScale = 1.28;
        vehicle.dwellTimer = 0.20;
        sfx.playPickupPip();
    }
}

function updateLineVehicles(dt) {
    for (const line of state.lines) {
        if (line.nodeIds.length < 2) continue;

        for (const v of line.vehicles) {
            v.scale = damp(v.scale, 1.0, 12, dt);
            v.bounceScale = damp(v.bounceScale, 1.0, 14, dt);

            for (const c of v.cargo) {
                c.scale = damp(c.scale || 1, 1.0, 14, dt);
            }

            if (v.dwellTimer > 0) {
                v.dwellTimer -= dt;
                continue;
            }

            if (v.segIndex >= line.nodeIds.length - 1) {
                v.segIndex = Math.max(0, line.nodeIds.length - 2);
                v.progress = 0;
            }

            const nA = state.nodes.find(n => n.id === line.nodeIds[v.segIndex]);
            const nB = state.nodes.find(n => n.id === line.nodeIds[v.segIndex + 1]);
            if (!nA || !nB) continue;

            const fromNode = v.dir === 1 ? nA : nB;
            const toNode   = v.dir === 1 ? nB : nA;

            const laneOffset = getSegmentParallelOffset(line.id, fromNode.id, toNode.id);
            const pts = computeMetroWaypoints(fromNode.x, fromNode.y, toNode.x, toNode.y, laneOffset);

            let segLengths = [];
            let totalLen = 0;
            for (let i = 0; i < pts.length - 1; i++) {
                const l = dist(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
                segLengths.push(l);
                totalLen += l;
            }
            totalLen = Math.max(1, totalLen);

            const edgeDist = Math.min(v.progress, 1 - v.progress);
            const speedFactor = 0.58 + 0.62 * Math.min(1, edgeDist * 4.5);
            const speed = VEHICLE_SPECS[v.type].speed * speedFactor;

            v.progress += (speed * dt) / totalLen;

            if (v.progress >= 1) {
                v.progress = 0;
                v.x = toNode.x;
                v.y = toNode.y;
                v.dwellTimer = 0.09;

                handleVehicleStopAtNode(v, line, toNode);

                if (v.dir === 1) {
                    if (v.segIndex < line.nodeIds.length - 2) {
                        v.segIndex++;
                    } else {
                        v.dir = -1;
                    }
                } else {
                    if (v.segIndex > 0) {
                        v.segIndex--;
                    } else {
                        v.dir = 1;
                    }
                }
            } else {
                let targetDist = v.progress * totalLen;
                for (let i = 0; i < segLengths.length; i++) {
                    if (targetDist <= segLengths[i] || i === segLengths.length - 1) {
                        const localT = segLengths[i] > 0 ? targetDist / segLengths[i] : 0;
                        const p1 = pts[i], p2 = pts[i + 1];
                        v.x = p1[0] + (p2[0] - p1[0]) * localT;
                        v.y = p1[1] + (p2[1] - p1[1]) * localT;
                        const desiredAngle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
                        v.angle = lerpAngle(v.angle, desiredAngle, Math.min(1, dt * 18));
                        break;
                    }
                    targetDist -= segLengths[i];
                }
            }
        }
    }
}

/***************************************************************************
 * 8. MAIN SIMULATION TICK
 ***************************************************************************/
function updateSimulation(rawDt) {
    updateAutoCamera(rawDt, false);

    for (const n of state.nodes) {
        const force = (1.0 - n.scale) * 38.0;
        n.scaleVel = (n.scaleVel + force * rawDt) * Math.exp(-6.5 * rawDt);
        n.scale = Math.max(0.05, n.scale + n.scaleVel * rawDt);
        n.pulsePhase += rawDt * 2.8;

        if (n.kind === 'CUSTOMER') {
            for (const ord of n.waitingOrders) {
                ord.scale = damp(ord.scale || 0.1, 1.0, 14, rawDt);
            }
        } else if (n.kind === 'DEPOT') {
            for (const p of n.storage) {
                p.scale = damp(p.scale || 0.1, 1.0, 14, rawDt);
            }
        }
    }

    for (let i = state.ripples.length - 1; i >= 0; i--) {
        const rp = state.ripples[i];
        rp.r = damp(rp.r, rp.maxR, 4.5, rawDt);
        rp.alpha -= rawDt * 0.95;
        if (rp.alpha <= 0) state.ripples.splice(i, 1);
    }

    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
        const ft = state.floatingTexts[i];
        ft.y -= rawDt * 26;
        ft.alpha -= rawDt * 0.85;
        if (ft.alpha <= 0) state.floatingTexts.splice(i, 1);
    }

    for (let i = state.flyingPackages.length - 1; i >= 0; i--) {
        const fp = state.flyingPackages[i];
        fp.t += rawDt / fp.duration;
        if (fp.t >= 1) state.flyingPackages.splice(i, 1);
    }

    if (state.gameSpeed === 0) return;
    const dt = rawDt * state.gameSpeed;

    state.timeOfDay += dt * (24 / 16);
    if (state.timeOfDay >= 24) {
        state.timeOfDay -= 24;
        state.dayCount++;

        if (state.dayCount === 15 || state.dayCount === 29) {
            const city = currentCity();
            const main0 = state.nodes.find(n => n.kind === 'DEPOT' && n.depotType === 'MAIN');
            const pos = findProgressiveLandSpot(city, main0 ? main0.x : 500, main0 ? main0.y : 325, 270, 440, 85, false);
            const extraMain = createDepotNode('MAIN', pos.x, pos.y);
            state.nodes.push(extraMain);
            sfx.playPlaceDepot('XL');
            showFloatingText(pos.x, pos.y - 24, t('msg_new_main_depot'), '#F59E0B');
        }

        if ((state.dayCount - 1) % 7 === 0) {
            state.weekCount++;
            triggerWeeklyUpgradeModal();
            return;
        }
    }
    updateClockUI();

    state.spawnTimer += dt;
    const spawnInterval = Math.max(6.4, 16.2 - state.weekCount * 1.85);
    const maxCustomers = Math.min(36, 5 + state.weekCount * 6);
    const currentCustomers = state.nodes.filter(n => n.kind === 'CUSTOMER').length;

    if (state.spawnTimer >= spawnInterval && currentCustomers < maxCustomers) {
        state.spawnTimer = 0;
        const city = currentCity();
        const mainDepot = state.nodes.find(n => n.kind === 'DEPOT' && n.depotType === 'MAIN') || { x: 500, y: 325 };

        let demandType = 'S';
        const r = Math.random();
        if (state.dayCount >= 4 && state.weekCount === 1) {
            demandType = r < 0.65 ? 'S' : 'L';
        } else if (state.weekCount === 2) {
            demandType = r < 0.52 ? 'S' : (r < 0.86 ? 'L' : 'XL');
        } else if (state.weekCount >= 3) {
            demandType = r < 0.44 ? 'S' : (r < 0.78 ? 'L' : 'XL');
        }

        const minR = Math.min(220, 75 + state.dayCount * 6);
        const maxR = Math.min(480, 155 + state.dayCount * 14);
        const preferDry = (state.dayCount <= 2) || (state.inventory.bridges <= 0);
        const pos = findProgressiveLandSpot(city, mainDepot.x, mainDepot.y, minR, maxR, 58, preferDry);

        let reachableWithoutNewBridge = false;
        for (const n of state.nodes) {
            const isConnectedOrDepot = n.kind === 'DEPOT' || state.lines.some(l => l.nodeIds.includes(n.id));
            if (isConnectedOrDepot && !doesMetroCorridorCrossWater(n.x, n.y, pos.x, pos.y, city)) {
                reachableWithoutNewBridge = true;
                break;
            }
        }
        if (!reachableWithoutNewBridge && state.inventory.bridges <= 0) {
            state.inventory.bridges += 1;
            showFloatingText(pos.x, pos.y - 28, t('msg_new_bank_bridge'), '#38BDF8');
        }

        if (demandType === 'XL' && !state.everUnlocked.car) {
            state.everUnlocked.car = true;
            state.inventory.car += 1;
            if (state.inventory.bridges < 1) state.inventory.bridges += 1;
            showFloatingText(mainDepot.x, mainDepot.y - 28, t('msg_xl_spawn_car'), '#8B5CF6');
        }

        const cust = createCustomerNode(demandType, pos.x, pos.y);
        state.nodes.push(cust);
        spawnOrderForCustomer(cust);
        updateAllUI();
    }

    state.packageTimer += dt;
    const isRushHour = state.timeOfDay >= 16 && state.timeOfDay <= 20;
    const rushMultiplier = isRushHour ? (1 + state.weekCount * 0.16) : 1.0;
    const baseOrderInterval = Math.max(0.82, (4.9 - currentCustomers * 0.105 - state.weekCount * 0.22) / rushMultiplier);

    if (state.packageTimer >= baseOrderInterval) {
        state.packageTimer = 0;
        const customers = state.nodes.filter(n => n.kind === 'CUSTOMER');
        if (customers.length > 0) {
            const c = customers[Math.floor(Math.random() * customers.length)];
            spawnOrderForCustomer(c);
            if (state.weekCount >= 4 && Math.random() < 0.32) {
                const c2 = customers[Math.floor(Math.random() * customers.length)];
                spawnOrderForCustomer(c2);
            }
        }
    }

    syncMainDepotSupply();
    updateDrones(dt);
    updateLineVehicles(dt);

    let maxUrgency = 0;
    for (const n of state.nodes) {
        if (n.kind !== 'CUSTOMER') continue;
        if (n.waitingOrders.length > 5) {
            const rate = (n.waitingOrders.length - 4.5) * (0.014 + state.weekCount * 0.0016);
            n.overloadTimer += dt * rate;
            if (n.overloadTimer > maxUrgency) maxUrgency = n.overloadTimer;

            if (n.overloadTimer >= 1.0) {
                if (state.endlessMode) {
                    n.waitingOrders.splice(0, 3);
                    n.overloadTimer = 0.15;
                    n.scaleVel = 2.0;
                } else {
                    triggerGameOver(n);
                    return;
                }
            }
        } else {
            n.overloadTimer = Math.max(0, n.overloadTimer - dt * 0.11);
        }
    }

    if (maxUrgency > 0.08) {
        state.warningTickTimer += rawDt;
        const tickInterval = Math.max(0.22, 0.65 - maxUrgency * 0.40);
        if (state.warningTickTimer >= tickInterval) {
            state.warningTickTimer = 0;
            sfx.playWarningTick(maxUrgency);
        }
    }
}
