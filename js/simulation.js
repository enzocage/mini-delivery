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
    let idx = customerNode.waitingOrders.findIndex(o => o.id === pkg.id);
    if (idx === -1) {
        idx = customerNode.waitingOrders.findIndex(o => o.size === pkg.size);
    }
    let removedOrder = null;
    if (idx !== -1) {
        removedOrder = customerNode.waitingOrders.splice(idx, 1)[0];
    }
    if (removedOrder && removedOrder.id !== pkg.id) {
        // Rebind the package that was originally created for 'removedOrder.id' so it now fulfills 'pkg.id' (no phantom duplicates!)
        let rebound = false;
        for (const n of state.nodes) {
            if (n.kind === 'DEPOT') {
                const orphan = n.storage.find(p => p.id === removedOrder.id);
                if (orphan) {
                    orphan.id = pkg.id;
                    orphan.targetCustomerId = pkg.targetCustomerId;
                    rebound = true;
                    break;
                }
            }
        }
        if (!rebound) {
            for (const l of state.lines) {
                for (const v of l.vehicles) {
                    const orphan = v.cargo.find(p => p.id === removedOrder.id);
                    if (orphan) {
                        orphan.id = pkg.id;
                        orphan.targetCustomerId = pkg.targetCustomerId;
                        rebound = true;
                        break;
                    }
                }
                if (rebound) break;
            }
        }
        if (!rebound) {
            for (const d of state.drones) {
                if (d.cargo && d.cargo.id === removedOrder.id) {
                    d.cargo.id = pkg.id;
                    d.cargo.targetCustomerId = pkg.targetCustomerId;
                    break;
                }
            }
        }
    }
    const dSpec = getDifficultySpec();
    const targets = getStarTargets();
    customerNode.overloadTimer = Math.max(0, customerNode.overloadTimer - dSpec.deliveryRelief);
    customerNode.scaleVel = 2.4;

    if (fromX !== null && fromY !== null) {
        spawnFlyingPackageArc(fromX, fromY, customerNode.x, customerNode.y, pkg.size);
    }

    state.score++;
    state.scoreBySize[pkg.size] = (state.scoreBySize[pkg.size] || 0) + 1;

    // Check 3-Act City Mastery Milestones (★ / ★★ / ★★★ scaled by Difficulty)
    const city = currentCity();
    if (state.score >= targets[0] && state.starsEarned < 1) {
        state.starsEarned = 1;
        saveCityRecord(city.id, state.score, 1);
        sfx.playWeeklyChord();
        showFloatingText(customerNode.x, customerNode.y - 26, `★☆☆ (${targets[0]})!`, '#F59E0B');
    }
    if (state.score >= targets[1] && state.starsEarned < 2) {
        state.starsEarned = 2;
        saveCityRecord(city.id, state.score, 2);
        sfx.playWeeklyChord();
        showFloatingText(customerNode.x, customerNode.y - 26, `★★☆ (${targets[1]})!`, '#F59E0B');
    }
    if (state.score >= targets[2] && state.starsEarned < 3) {
        state.starsEarned = 3;
        saveCityRecord(city.id, state.score, 3);
        if (!state.victoryReached && !state.endlessMode) {
            state.victoryReached = true;
            triggerVictoryModal();
        }
    } else if (!state.isFastSimSubStep) {
        saveCityRecord(city.id, state.score, state.starsEarned);
    }

    if (!state.isFastSimSubStep) {
        const scoreEl = document.getElementById('uiScore');
        if (scoreEl) {
            scoreEl.textContent = state.score;
            scoreEl.classList.remove('score-pop');
            void scoreEl.offsetWidth;
            scoreEl.classList.add('score-pop');
        }
        if (typeof updateGoalUI === 'function') updateGoalUI();
    }

    if (!state.isFastSimSubStep || state.ripples.length < 18) {
        const col = pkg.size === 'S' ? '#0EA5E9' : (pkg.size === 'L' ? '#F59E0B' : '#F43F5E');
        state.ripples.push({ x: customerNode.x, y: customerNode.y, r: customerNode.radius * 0.6, maxR: 44, color: col, alpha: 0.85 });
    }
    sfx.playPackageDelivered(pkg.size);
}

function updateDrones(dt) {
    for (const d of state.drones) {
        d.rotorPhase += dt * 30;
        d.scale = damp(d.scale, 1.0, 12, dt);

        if (state.drag.active && state.drag.mode === 'move_vehicle' && state.drag.movingVehicle === d) {
            continue;
        }

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

function getStopsUntilCustomerAlongVehiclePath(vehicle, line, fromDepotNode, customerId) {
    const N = line.nodeIds.length;
    if (N < 2) return 999;

    // Simulate up to 2*N steps of the vehicle's upcoming path starting from its next segment
    let segIdx = vehicle.segIndex;
    let dir = vehicle.dir;
    const segCount = getLineSegmentCount(line);
    if (segCount < 1) return 999;

    let passedDepotAgain = false;
    for (let step = 1; step <= N * 2; step++) {
        const [idA, idB] = getLineSegmentNodeIds(line, segIdx);
        const nextNodeId = dir === 1 ? idB : idA;

        if (nextNodeId === customerId) {
            return passedDepotAgain ? (step + 100) : step;
        }
        if (nextNodeId === fromDepotNode.id) {
            passedDepotAgain = true;
        }

        if (line.isLoop && N >= 3) {
            segIdx = dir === 1 ? (segIdx + 1) % segCount : (segIdx - 1 + segCount) % segCount;
        } else {
            if (dir === 1) {
                if (segIdx < segCount - 1) segIdx++;
                else dir = -1;
            } else {
                if (segIdx > 0) segIdx--;
                else dir = 1;
            }
        }
    }
    return 999;
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

    // 2. LOAD (Prioritize packages on the upcoming branch ahead of the vehicle & highest urgency!)
    if (node.kind === 'DEPOT' && node.storage.length > 0) {
        for (let i = node.storage.length - 1; i >= 0; i--) {
            const c = state.nodes.find(n => n.id === node.storage[i].targetCustomerId);
            if (!c || c.waitingOrders.length === 0) {
                node.storage.splice(i, 1);
            }
        }

        // If a Cybercar stops at a Depot with an XL package waiting (or a Cyberbike stops with an urgent L package waiting),
        // and partial S/L cargo is blocking the full-trunk package (XL=4u on car, L=2u on bike), swap partial cargo back to load the heavy package!
        if (vehicle.cargo.length > 0) {
            if (vehicle.type === 'car' && !vehicle.cargo.some(p => p.size === 'XL')) {
                const hasWaitingXLForLine = node.storage.some(pkg => pkg.size === 'XL' && line.nodeIds.includes(pkg.targetCustomerId));
                if (hasWaitingXLForLine) {
                    while (vehicle.cargo.length > 0 && node.storage.length < node.capacity) {
                        node.storage.push(vehicle.cargo.pop());
                    }
                }
            } else if (vehicle.type === 'bike' && !vehicle.cargo.some(p => p.size === 'L')) {
                const hasUrgentLForLine = node.storage.some(pkg => {
                    if (pkg.size !== 'L' || !line.nodeIds.includes(pkg.targetCustomerId)) return false;
                    const c = state.nodes.find(x => x.id === pkg.targetCustomerId);
                    return c && (c.waitingOrders.length >= 2 || (c.overloadTimer || 0) > 0.05);
                });
                if (hasUrgentLForLine) {
                    while (vehicle.cargo.length > 0 && node.storage.length < node.capacity) {
                        node.storage.push(vehicle.cargo.pop());
                    }
                }
            }
        }

        node.storage.sort((a, b) => {
            const ca = state.nodes.find(n => n.id === a.targetCustomerId);
            const cb = state.nodes.find(n => n.id === b.targetCustomerId);
            const critA = ca && (ca.overloadTimer || 0) >= 0.40 ? 1 : 0;
            const critB = cb && (cb.overloadTimer || 0) >= 0.40 ? 1 : 0;
            if (critA !== critB) return critB - critA;

            // Cybercars MUST prioritize XL packages first (since XL requires 4/4 units and bikes/drones cannot carry XL!)
            if (vehicle.type === 'car') {
                const isXLA = a.size === 'XL' ? 1 : 0;
                const isXLB = b.size === 'XL' ? 1 : 0;
                if (isXLA !== isXLB) return isXLB - isXLA;
            }
            const stopsA = getStopsUntilCustomerAlongVehiclePath(vehicle, line, node, a.targetCustomerId);
            const stopsB = getStopsUntilCustomerAlongVehiclePath(vehicle, line, node, b.targetCustomerId);
            const onUpcomingBranchA = stopsA < 100 ? 1 : 0;
            const onUpcomingBranchB = stopsB < 100 ? 1 : 0;
            if (onUpcomingBranchA !== onUpcomingBranchB) {
                return onUpcomingBranchB - onUpcomingBranchA;
            }
            const urgA = ca ? (ca.overloadTimer * 12 + ca.waitingOrders.length) : 0;
            const urgB = cb ? (cb.overloadTimer * 12 + cb.waitingOrders.length) : 0;
            if (Math.abs(urgB - urgA) > 0.25) return urgB - urgA;
            return stopsA - stopsB;
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

function chooseSmartVehicleDirectionAtNode(vehicle, line, atNode) {
    const N = line.nodeIds.length;
    if (N < 2) return null;
    const atIdx = line.nodeIds.indexOf(atNode.id);
    if (atIdx === -1) return null;

    // Identify target node indices on this line
    let targetIndices = [];
    if (vehicle.cargo.length > 0) {
        // Head toward the most urgent customer matching our current cargo
        let bestUrg = -1;
        for (let i = 0; i < N; i++) {
            if (i === atIdx) continue;
            const cand = state.nodes.find(n => n.id === line.nodeIds[i]);
            if (!cand) continue;
            const matchesCargo = vehicle.cargo.some(pkg =>
                (cand.kind === 'CUSTOMER' && (cand.id === pkg.targetCustomerId || cand.waitingOrders.some(o => o.size === pkg.size)))
            );
            if (matchesCargo) {
                const urg = (cand.overloadTimer || 0) * 10 + (cand.waitingOrders ? cand.waitingOrders.length : 0);
                if (urg > bestUrg + 0.3) {
                    bestUrg = urg;
                    targetIndices = [i];
                } else if (Math.abs(urg - bestUrg) <= 0.3) {
                    targetIndices.push(i);
                }
            }
        }
    } else {
        // Empty vehicle: head straight back to the nearest Depot on this line to reload!
        for (let i = 0; i < N; i++) {
            if (i === atIdx) continue;
            const cand = state.nodes.find(n => n.id === line.nodeIds[i]);
            if (cand && cand.kind === 'DEPOT' && (cand.storage.length > 0 || cand.depotType === 'MAIN')) {
                targetIndices.push(i);
            }
        }
    }

    if (targetIndices.length === 0) return null;

    let bestDir = null;
    let bestHops = Infinity;

    for (const tIdx of targetIndices) {
        if (line.isLoop && N >= 3) {
            const fwdHops = (tIdx - atIdx + N) % N;
            const bwdHops = (atIdx - tIdx + N) % N;
            if (fwdHops <= bwdHops && fwdHops < bestHops) {
                bestHops = fwdHops;
                bestDir = 1;
            } else if (bwdHops < fwdHops && bwdHops < bestHops) {
                bestHops = bwdHops;
                bestDir = -1;
            }
        } else {
            const hops = Math.abs(tIdx - atIdx);
            if (hops < bestHops) {
                bestHops = hops;
                bestDir = tIdx > atIdx ? 1 : -1;
            }
        }
    }

    if (bestDir === 1 && (line.isLoop || atIdx < N - 1)) {
        return { segIndex: atIdx, dir: 1 };
    }
    if (bestDir === -1 && (line.isLoop || atIdx > 0)) {
        return { segIndex: (atIdx - 1 + N) % N, dir: -1 };
    }
    return null;
}

function updateLineVehicles(dt) {
    for (const line of state.lines) {
        const segCount = getLineSegmentCount(line);
        if (segCount < 1) continue;

        for (const v of line.vehicles) {
            v.scale = damp(v.scale, 1.0, 12, dt);
            v.bounceScale = damp(v.bounceScale, 1.0, 14, dt);

            for (const c of v.cargo) {
                c.scale = damp(c.scale || 1, 1.0, 14, dt);
            }

            if (state.drag.active && state.drag.mode === 'move_vehicle' && state.drag.movingVehicle === v) {
                continue;
            }

            if (v.dwellTimer > 0) {
                v.dwellTimer -= dt;
                continue;
            }

            if (v.segIndex >= segCount || v.segIndex < 0) {
                v.segIndex = Math.max(0, segCount - 1);
                v.progress = 0;
            }

            const [idA, idB] = getLineSegmentNodeIds(line, v.segIndex);
            const nA = state.nodes.find(n => n.id === idA);
            const nB = state.nodes.find(n => n.id === idB);
            if (!nA || !nB) continue;

            v.segNodeA = nA.id;
            v.segNodeB = nB.id;

            const toNode = v.dir === 1 ? nB : nA;

            // Always compute the exact rendered corridor (nA -> nB) and reverse the point list when v.dir === -1
            const laneOffset = getSegmentParallelOffset(line.id, nA.id, nB.id);
            const rawPts = computeMetroWaypoints(nA.x, nA.y, nB.x, nB.y, laneOffset);
            const smoothPts = expandSmoothWaypoints(rawPts, 22);
            const pts = v.dir === 1 ? smoothPts : smoothPts.slice().reverse();

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
                const endPt = pts[pts.length - 1];
                v.x = endPt[0];
                v.y = endPt[1];
                v.dwellTimer = 0.09;

                // Advance segment/direction FIRST so handleVehicleStopAtNode knows which branch the vehicle is about to enter!
                if (line.isLoop && line.nodeIds.length >= 3) {
                    if (v.dir === 1) {
                        v.segIndex = (v.segIndex + 1) % segCount;
                    } else {
                        v.segIndex = (v.segIndex - 1 + segCount) % segCount;
                    }
                } else {
                    if (v.dir === 1) {
                        if (v.segIndex < segCount - 1) {
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
                }

                handleVehicleStopAtNode(v, line, toNode);

                // If the vehicle just emptied its last package at a customer on an open branch and there is no depot ahead on this branch,
                // turn back toward the depot immediately instead of driving empty to the dead end!
                if (!line.isLoop && v.cargo.length === 0 && toNode.kind === 'CUSTOMER') {
                    const smartMove = chooseSmartVehicleDirectionAtNode(v, line, toNode);
                    if (smartMove) {
                        v.segIndex = smartMove.segIndex;
                        v.dir = smartMove.dir;
                    }
                }
                const [nextIdA, nextIdB] = getLineSegmentNodeIds(line, v.segIndex);
                v.segNodeA = nextIdA;
                v.segNodeB = nextIdB;
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
 * 8. MAIN SIMULATION TICK & ULTRA-SPEED SUB-STEPPING (100% TO 1,000,000%)
 ***************************************************************************/
function stepSimulationTick(dt, rawDtForAudio = 0.016) {
    state.timeOfDay += dt * (24 / 16);
    if (state.timeOfDay >= 24) {
        state.timeOfDay -= 24;
        state.dayCount++;

        if (state.dayCount === 22) {
            const city = currentCity();
            const main0 = state.nodes.find(n => n.kind === 'DEPOT' && n.depotType === 'MAIN');
            const pos = findProgressiveLandSpot(city, main0 ? main0.x : 500, main0 ? main0.y : 325, 270, 440, 85, false);
            const extraMain = createDepotNode('MAIN', pos.x, pos.y);
            state.nodes.push(extraMain);
            sfx.playPlaceDepot('XL');
            showFloatingText(pos.x, pos.y - 24, t('msg_new_main_depot'), '#F59E0B');
            if (state.simulatorMode) {
                state.aiDecisionTimer = 99;
            }
        }

        if ((state.dayCount - 1) % 7 === 0) {
            state.weekCount++;
            triggerWeeklyUpgradeModal();
            if (state.simulatorMode) {
                aiPickBestWeeklyUpgrade();
            } else {
                return;
            }
        }
    }
    if (!state.isFastSimSubStep) {
        updateClockUI();
    }

    const dSpec = getDifficultySpec();
    state.spawnTimer += dt * dSpec.spawnRateMult;
    const spawnInterval = Math.max(4.8, 12.8 - state.weekCount * 1.55);
    const maxCustomers = Math.min(44, 6 + state.weekCount * 6);
    const currentCustomers = state.nodes.filter(n => n.kind === 'CUSTOMER').length;

    if (state.spawnTimer >= spawnInterval && currentCustomers < maxCustomers) {
        state.spawnTimer = 0;
        const city = currentCity();
        const mainDepot = state.nodes.find(n => n.kind === 'DEPOT' && n.depotType === 'MAIN') || { x: 500, y: 325 };

        let demandType = 'S';
        const r = Math.random();
        if (state.difficulty === 'chuck' && state.dayCount >= 3) {
            demandType = r < 0.35 ? 'S' : (r < 0.68 ? 'L' : 'XL');
        } else if (state.dayCount >= 3 && state.weekCount === 1) {
            demandType = r < 0.56 ? 'S' : 'L';
        } else if (state.weekCount === 2) {
            demandType = r < 0.44 ? 'S' : (r < 0.78 ? 'L' : 'XL');
        } else if (state.weekCount >= 3) {
            demandType = r < 0.36 ? 'S' : (r < 0.68 ? 'L' : 'XL');
        }

        const minR = Math.min(230, 80 + state.dayCount * 7);
        const maxR = Math.min(485, 160 + state.dayCount * 15);
        const preferDry = (state.dayCount <= 2);
        const pos = findProgressiveLandSpot(city, mainDepot.x, mainDepot.y, minR, maxR, 56, preferDry);

        if (demandType === 'XL' && !state.everUnlocked.car) {
            state.everUnlocked.car = true;
            state.inventory.car += 1;
            showFloatingText(mainDepot.x, mainDepot.y - 28, t('msg_xl_spawn_car'), '#8B5CF6');
        }

        // If a station spawns on a brand-new river bank that has no existing dry-land connection and bridges are 0, grant +1 Bridge!
        const hasDryNeighbor = state.nodes.some(n => !doesMetroCorridorCrossWater(n.x, n.y, pos.x, pos.y, city));
        if (!hasDryNeighbor && state.inventory.bridges <= 0) {
            state.inventory.bridges += 1;
            showFloatingText(pos.x, pos.y - 24, t('msg_new_bank_bridge'), '#0EA5E9');
        }

        const cust = createCustomerNode(demandType, pos.x, pos.y);
        state.nodes.push(cust);
        spawnOrderForCustomer(cust);
        if (state.simulatorMode) {
            state.aiDecisionTimer = 99;
        }
        if (!state.isFastSimSubStep) {
            updateAllUI();
        }
    }

    state.packageTimer += dt * dSpec.spawnRateMult;
    const isRushHour = state.timeOfDay >= 16 && state.timeOfDay <= 20;
    const rushMultiplier = isRushHour ? (1.35 + state.weekCount * 0.18) : 1.0;
    const baseOrderInterval = Math.max(0.48, (3.45 - currentCustomers * 0.095 - state.weekCount * 0.24) / rushMultiplier);

    if (state.packageTimer >= baseOrderInterval) {
        state.packageTimer = 0;
        const customers = state.nodes.filter(n => n.kind === 'CUSTOMER');
        if (customers.length > 0) {
            const c = customers[Math.floor(Math.random() * customers.length)];
            spawnOrderForCustomer(c);
            const extraBurstChance = (isRushHour ? 0.35 : 0.14) + Math.max(0, state.weekCount - 2) * 0.10;
            if ((state.weekCount >= 2 || state.difficulty === 'chuck') && Math.random() < extraBurstChance) {
                const c2 = customers[Math.floor(Math.random() * customers.length)];
                spawnOrderForCustomer(c2);
            }
        }
    }

    if (state.simulatorMode) {
        updateAISimulator(dt);
    }

    syncMainDepotSupply();
    updateDrones(dt);
    updateLineVehicles(dt);

    // DUAL LOSE CONDITIONS (Scaled by Difficulty: Joke / Easy / Hard / Hardcore / Chuck Norris):
    let maxUrgency = 0;
    for (const n of state.nodes) {
        if (n.kind === 'CUSTOMER') {
            const threshold = n.demandType === 'XL' ? dSpec.maxOrdersXL : dSpec.maxOrdersSL;
            n.maxOrders = threshold;
            if (n.waitingOrders.length >= threshold) {
                const excess = (n.waitingOrders.length - threshold) + 1;
                const weekScale = 1 + (state.weekCount - 1) * 0.10;
                const rate = (0.036 + excess * excess * 0.0085) * weekScale * dSpec.overloadSpeedMult;
                n.overloadTimer += dt * rate;
                if (n.overloadTimer > maxUrgency) maxUrgency = n.overloadTimer;

                if (n.overloadTimer >= 1.0) {
                    if (state.endlessMode) {
                        n.waitingOrders.splice(0, 3);
                        n.overloadTimer = 0.2;
                        n.scaleVel = 2.0;
                    } else {
                        triggerGameOver(n);
                        return;
                    }
                }
            } else {
                n.overloadTimer = Math.max(0, n.overloadTimer - dt * 0.065);
            }
        } else if (n.kind === 'DEPOT') {
            const critCount = Math.ceil(n.capacity * dSpec.depotGridlockRatio);
            if (n.storage.length >= critCount) {
                const fillRatio = n.storage.length / Math.max(1, n.capacity);
                const rate = (0.034 + Math.max(0, fillRatio - dSpec.depotGridlockRatio) * 0.22) * dSpec.overloadSpeedMult;
                n.overloadTimer = (n.overloadTimer || 0) + dt * rate;
                if (n.overloadTimer > maxUrgency) maxUrgency = n.overloadTimer;

                if (n.overloadTimer >= 1.0) {
                    if (state.endlessMode) {
                        n.storage.splice(0, Math.ceil(n.capacity * 0.35));
                        n.overloadTimer = 0.2;
                        n.scaleVel = 2.0;
                    } else {
                        triggerGameOver(n);
                        return;
                    }
                }
            } else {
                n.overloadTimer = Math.max(0, (n.overloadTimer || 0) - dt * 0.08);
            }
        }
    }

    if (!state.isFastSimSubStep && maxUrgency > 0.08) {
        state.warningTickTimer += rawDtForAudio;
        const tickInterval = Math.max(0.22, 0.65 - maxUrgency * 0.40);
        if (state.warningTickTimer >= tickInterval) {
            state.warningTickTimer = 0;
            sfx.playWarningTick(maxUrgency);
        }
    }
}

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

    // Normal speed (<= 4x) runs a single direct tick
    if (state.gameSpeed <= 4) {
        state.isFastSimSubStep = false;
        stepSimulationTick(rawDt * state.gameSpeed, rawDt);
        if (state.simulatorMode && typeof updateSimulatorHudUI === 'function') {
            updateSimulatorHudUI();
        }
        return;
    }

    // High-speed Simulator Mode (up to 1,000,000% = 10,000x):
    // Sub-step with bounded dt so vehicles stop accurately at every station and AI reacts in real game-time
    let remainingSimDt = rawDt * state.gameSpeed;
    const maxStepDt = state.gameSpeed >= 250 ? 0.14 : 0.09;
    const frameStartMs = performance.now();
    const maxWallBudgetMs = 14.0;
    let stepsRun = 0;

    state.isFastSimSubStep = true;
    while (remainingSimDt > 0.0001 && state.gameSpeed > 0) {
        const stepDt = Math.min(remainingSimDt, maxStepDt);
        stepSimulationTick(stepDt, 0);
        remainingSimDt -= stepDt;
        stepsRun++;
        if (stepsRun >= 12 && (performance.now() - frameStartMs) >= maxWallBudgetMs) {
            break;
        }
    }
    state.isFastSimSubStep = false;

    const city = currentCity();
    saveCityRecord(city.id, state.score, state.starsEarned);
    updateClockUI();
    updateAllUI();
    if (typeof updateSimulatorHudUI === 'function') {
        updateSimulatorHudUI();
    }
}

/***************************************************************************
 * 9. INTELLIGENT AI SIMULATOR (AUTONOMOUS NETWORK ARCHITECT & FLEET PLANNER)
 ***************************************************************************/
function aiPickBestWeeklyUpgrade() {
    if (typeof getWeeklyUpgradeChoices !== 'function') return;
    const choices = getWeeklyUpgradeChoices();
    if (!choices || choices.length === 0) return;

    const customers = state.nodes.filter(n => n.kind === 'CUSTOMER');
    const xlCount = customers.filter(c => c.demandType === 'XL').length;
    const lCount = customers.filter(c => c.demandType === 'L').length;

    let totalCars = state.inventory.car;
    let activeLines = 0;
    for (let i = 0; i < state.unlockedLines; i++) {
        const l = state.lines[i];
        if (l.nodeIds.length >= 2) activeLines++;
        totalCars += l.vehicles.filter(v => v.type === 'car').length;
    }

    const activeLList = state.lines.filter(l => l.id < state.unlockedLines && l.nodeIds.length >= 2);
    const unservedCount = customers.filter(c => !activeLList.some(l => l.nodeIds.includes(c.id))).length;

    let bestChoice = choices[0];
    let bestScore = -Infinity;

    for (const c of choices) {
        let s = 10;
        if (c.iconText === 'CAR') {
            // Cybercar carries 4 units (1xXL, 2xL, 4xS) + gives an L-Hub (Week 2) or XL Mega-Hub + Bridge (Week 3+)
            if (totalCars <= 1 && state.weekCount >= 3) s += 175;
            else if (xlCount > 0 && totalCars < Math.max(2, activeLines - 1)) s += 165;
            else if (totalCars === 0 && state.weekCount >= 2) s += 155;
            else if (totalCars < activeLines) s += 115;
            else s += 75;
        } else if (c.iconText === '+LINE') {
            // Unlocking a new line gives +1 Line, +1 Cyberbike AND +1 Bridge!
            if (state.unlockedLines <= 2) s += 160;
            else if (state.unlockedLines <= 4 && totalCars >= 2) s += 140;
            else s += 105;
        } else if (c.iconText === '2×BIKE') {
            s += 95;
        } else if (c.iconText === 'AIR+BR') {
            if (unservedCount > 0 && state.inventory.bridges <= 0 && state.unlockedLines >= 7) s += 130;
            else s += 20;
        }
        if (s > bestScore) {
            bestScore = s;
            bestChoice = c;
        }
    }

    if (typeof pendingWeeklyUpgrade !== 'undefined') {
        pendingWeeklyUpgrade = null;
    }
    bestChoice.apply();
    const upgBar = document.getElementById('inlineUpgradeBar');
    if (upgBar) {
        upgBar.classList.add('hidden');
        upgBar.innerHTML = '';
    }
    state.aiLastAction = `W${state.weekCount}: ${bestChoice.iconText}`;
    state.aiDecisionTimer = 99;
    state.aiRebalanceTimer = 99;
}

function aiCountBridgesForPath(nodeIdArray, isLoop, city) {
    if (!nodeIdArray || nodeIdArray.length < 2) return 0;
    let bridges = 0;
    const segCount = (isLoop && nodeIdArray.length >= 3) ? nodeIdArray.length : nodeIdArray.length - 1;
    for (let i = 0; i < segCount; i++) {
        const id1 = nodeIdArray[i % nodeIdArray.length];
        const id2 = nodeIdArray[(i + 1) % nodeIdArray.length];
        const n1 = state.nodes.find(n => n.id === id1);
        const n2 = state.nodes.find(n => n.id === id2);
        if (n1 && n2 && doesMetroCorridorCrossWater(n1.x, n1.y, n2.x, n2.y, city)) {
            bridges++;
        }
    }
    return bridges;
}

function aiDeployHubsAndDrones() {
    const city = currentCity();
    const depots = state.nodes.filter(n => n.kind === 'DEPOT');
    const customers = state.nodes.filter(n => n.kind === 'CUSTOMER');

    // 1. Place XL or L Regional Hubs near distant customer clusters
    for (const hubType of ['XL', 'L', 'S']) {
        const invKey = `depot_${hubType}`;
        if (state.inventory[invKey] <= 0) continue;
        if (customers.length < 4) continue;

        let bestSpot = null;
        let bestScore = 0;

        for (const cust of customers) {
            const nearestDepotDist = Math.min(...depots.map(d => dist(d.x, d.y, cust.x, cust.y)));
            if (nearestDepotDist < 95) continue;

            const spot = findProgressiveLandSpot(city, cust.x, cust.y, 44, 96, 52, true);
            if (!spot || isPointInWater(spot.x, spot.y, city, 14)) continue;

            let clusterScore = 0.5;
            for (const c2 of customers) {
                const d = dist(spot.x, spot.y, c2.x, c2.y);
                if (d <= DEPOT_SPECS[hubType].droneRange) {
                    clusterScore += (c2.demandType === 'S' ? 2.0 : 1.5) + c2.waitingOrders.length * 0.5;
                }
            }
            if (clusterScore > bestScore) {
                bestScore = clusterScore;
                bestSpot = spot;
            }
        }

        if (bestSpot) {
            state.inventory[invKey]--;
            const newHub = createDepotNode(hubType, bestSpot.x, bestSpot.y);
            newHub.scale = state.isFastSimSubStep ? 1.0 : 0.1;
            state.nodes.push(newHub);
            depots.push(newHub);
            state.aiLastAction = `+${getDepotLabel(hubType)}`;
            if (state.inventory.drone > 0) {
                stationDroneAtNode(newHub, false);
            }
        }
    }

    // 2. Station available Cargo Drones at Depots with the best S-customer air coverage
    while (state.inventory.drone > 0) {
        let bestDepot = null;
        let bestUtility = -1;

        for (const dep of depots) {
            const existingDrones = state.drones.filter(d => d.homeNodeId === dep.id).length;
            if (existingDrones >= 4) continue;

            let sInRange = 0;
            let waterCrossedS = 0;
            for (const c of customers) {
                if (c.waitingOrders.some(o => o.size === 'S') || c.demandType === 'S') {
                    if (dist(dep.x, dep.y, c.x, c.y) <= dep.droneRange) {
                        sInRange++;
                        if (doesMetroCorridorCrossWater(dep.x, dep.y, c.x, c.y, city)) {
                            waterCrossedS++;
                        }
                    }
                }
            }
            const utility = (sInRange * 2.5 + waterCrossedS * 3.5 + (dep.depotType === 'MAIN' ? 2.0 : 1.2)) / (existingDrones + 1);
            if (utility > bestUtility) {
                bestUtility = utility;
                bestDepot = dep;
            }
        }

        if (bestDepot) {
            stationDroneAtNode(bestDepot, false);
            state.aiLastAction = `+Drone @ ${bestDepot.depotType}`;
        } else {
            break;
        }
    }
}

function aiUncrossLine2Opt(line, city) {
    if (!line || line.nodeIds.length < 4) return;
    const ids = line.nodeIds.slice();
    const n = ids.length;
    const currentBridges = line.bridgesUsed;
    const maxAllowedBridges = currentBridges + state.inventory.bridges;

    const getPos = (id) => state.nodes.find(x => x.id === id);

    let improved = false;
    for (let i = 1; i < n - 2; i++) {
        for (let j = i + 1; j < n - 1; j++) {
            const A = getPos(ids[i - 1]);
            const B = getPos(ids[i]);
            const C = getPos(ids[j]);
            const D = getPos(ids[j + 1]);
            if (!A || !B || !C || !D) continue;

            const curCost = dist(A.x, A.y, B.x, B.y) + dist(C.x, C.y, D.x, D.y);
            const newCost = dist(A.x, A.y, C.x, C.y) + dist(B.x, B.y, D.x, D.y);
            if (newCost + 18 < curCost) {
                const candidate = ids.slice(0, i).concat(ids.slice(i, j + 1).reverse(), ids.slice(j + 1));
                const candBridges = aiCountBridgesForPath(candidate, line.isLoop, city);
                if (candBridges <= maxAllowedBridges) {
                    line.nodeIds = candidate;
                    recalculateLineBridges(line);
                    improved = true;
                    return;
                }
            }
        }
    }
    return improved;
}

function aiTryCloseLoop(line, city) {
    if (!line || line.isLoop || line.nodeIds.length < 4) return;
    const firstNode = state.nodes.find(n => n.id === line.nodeIds[0]);
    const lastNode = state.nodes.find(n => n.id === line.nodeIds[line.nodeIds.length - 1]);
    if (!firstNode || !lastNode) return;

    const closeDist = dist(firstNode.x, firstNode.y, lastNode.x, lastNode.y);
    if (closeDist > 340) return;

    const extraBridge = doesMetroCorridorCrossWater(lastNode.x, lastNode.y, firstNode.x, firstNode.y, city) ? 1 : 0;
    // Never spend our last bridge just to close a loop — save bridges for connecting cross-river stations!
    if (extraBridge === 0 || state.inventory.bridges >= extraBridge + 2) {
        line.isLoop = true;
        recalculateLineBridges(line);
        state.aiLastAction = `⟳ Loop ${line.name}`;
    }
}

function aiConsolidateLineBridges(line, city) {
    if (!line || line.nodeIds.length < 3 || line.bridgesUsed <= 1) return false;
    const anchorNode = state.nodes.find(n => n.id === line.nodeIds[0]);
    if (!anchorNode) return false;

    // Partition nodes into dry-from-anchor vs across-water-from-anchor so the line crosses the river at most once!
    const sameBank = [anchorNode];
    const farBank = [];
    for (let i = 1; i < line.nodeIds.length; i++) {
        const n = state.nodes.find(x => x.id === line.nodeIds[i]);
        if (!n) continue;
        if (!doesMetroCorridorCrossWater(anchorNode.x, anchorNode.y, n.x, n.y, city)) {
            sameBank.push(n);
        } else {
            farBank.push(n);
        }
    }

    const orderGroupNearest = (group, startPt) => {
        const rem = group.slice();
        const out = [];
        let cur = startPt;
        while (rem.length > 0) {
            rem.sort((a, b) => dist(cur.x, cur.y, a.x, a.y) - dist(cur.x, cur.y, b.x, b.y));
            const next = rem.shift();
            out.push(next);
            cur = next;
        }
        return out;
    };

    const orderedSame = orderGroupNearest(sameBank.slice(1), anchorNode).reverse().concat([anchorNode]);
    const lastSame = orderedSame[orderedSame.length - 1];
    const orderedFar = orderGroupNearest(farBank, lastSame);
    const candidateIds = orderedSame.concat(orderedFar).map(n => n.id);

    const newBr = aiCountBridgesForPath(candidateIds, false, city);
    if (newBr < line.bridgesUsed) {
        line.nodeIds = candidateIds;
        line.isLoop = false;
        recalculateLineBridges(line);
        return true;
    }
    return false;
}

function aiConnectUnservedNodes() {
    const city = currentCity();
    const mainDepots = state.nodes.filter(n => n.kind === 'DEPOT' && n.depotType === 'MAIN');
    if (mainDepots.length === 0) return;

    const targetNodes = state.nodes.filter(n =>
        n.kind === 'CUSTOMER' ||
        (n.kind === 'DEPOT' && (n.depotType === 'L' || n.depotType === 'XL'))
    );

    targetNodes.sort((a, b) => {
        const wA = (a.demandType === 'XL' ? 30 : (a.demandType === 'L' ? 15 : 5)) + (a.overloadTimer || 0) * 50;
        const wB = (b.demandType === 'XL' ? 30 : (b.demandType === 'L' ? 15 : 5)) + (b.overloadTimer || 0) * 50;
        return wB - wA;
    });

    for (const node of targetNodes) {
        const isConnected = state.lines.some(l => l.id < state.unlockedLines && l.nodeIds.length >= 2 && l.nodeIds.includes(node.id));
        if (isConnected) continue;

        const nearestMain = mainDepots.slice().sort((a, b) => dist(a.x, a.y, node.x, node.y) - dist(b.x, b.y, node.x, node.y))[0];

        // 1. Check if we should open a fresh unlocked line for this station
        const unusedLine = state.lines.find(l => l.id < state.unlockedLines && l.nodeIds.length < 2);
        const activeLines = state.lines.filter(l => l.id < state.unlockedLines && l.nodeIds.length >= 2);
        const avgLen = activeLines.length > 0
            ? activeLines.reduce((acc, l) => acc + l.nodeIds.length, 0) / activeLines.length
            : 0;
        const hasSpareVeh = (state.inventory.bike + state.inventory.car) > 0 ||
            activeLines.some(l => l.vehicles.length >= 2);

        if (unusedLine && (activeLines.length === 0 || (avgLen >= 3.8 && hasSpareVeh))) {
            const bridgeNeeded = doesMetroCorridorCrossWater(nearestMain.x, nearestMain.y, node.x, node.y, city) ? 1 : 0;
            if (bridgeNeeded <= state.inventory.bridges) {
                unusedLine.nodeIds = [nearestMain.id, node.id];
                unusedLine.isLoop = false;
                recalculateLineBridges(unusedLine);

                const vType = (node.demandType === 'XL' && state.inventory.car > 0)
                    ? 'car'
                    : (state.inventory.bike > 0 ? 'bike' : (state.inventory.car > 0 ? 'car' : null));
                if (vType) {
                    addVehicleToLine(unusedLine, vType, false);
                } else {
                    const donor = activeLines.slice().sort((a, b) => b.vehicles.length - a.vehicles.length)[0];
                    if (donor && donor.vehicles.length >= 2) {
                        const movedVeh = donor.vehicles.pop();
                        state.inventory[movedVeh.type]++;
                        addVehicleToLine(unusedLine, movedVeh.type, false);
                    }
                }
                state.aiLastAction = `${unusedLine.name} → ${node.demandType || node.depotType}`;
                continue;
            }
        }

        // 2. If bridges are 0, first try consolidating any active line that uses >= 2 bridges down to 1 bridge
        if (state.inventory.bridges <= 0) {
            for (const l of activeLines) {
                if (l.isLoop && l.bridgesUsed > 0) {
                    const openBr = aiCountBridgesForPath(l.nodeIds, false, city);
                    if (openBr < l.bridgesUsed) {
                        l.isLoop = false;
                        recalculateLineBridges(l);
                    }
                }
                if (l.bridgesUsed >= 2) {
                    aiConsolidateLineBridges(l, city);
                }
            }
        }

        // 3. Evaluate inserting 'node' at ANY index (0 .. N, including before MAIN!) across all active lines
        let bestLine = null;
        let bestCandidateIds = null;
        let bestLoopFlag = false;
        let bestCost = Infinity;

        for (const line of activeLines) {
            if (line.nodeIds.length >= 16) continue;

            const lineHasCar = line.vehicles.some(v => v.type === 'car');
            const xlBonus = (node.demandType === 'XL' && (lineHasCar || state.inventory.car > 0)) ? -260 : (node.demandType === 'XL' ? 320 : 0);
            const maxBridgesForLine = line.bridgesUsed + state.inventory.bridges;
            const N = line.nodeIds.length;

            const loopOptions = line.isLoop ? [true, false] : [false];
            for (const tryLoop of loopOptions) {
                for (let idx = 0; idx <= N; idx++) {
                    const candidateIds = line.nodeIds.slice(0, idx).concat([node.id], line.nodeIds.slice(idx));
                    const candBridges = aiCountBridgesForPath(candidateIds, tryLoop, city);
                    if (candBridges > maxBridgesForLine) continue;

                    const prevId = idx > 0 ? line.nodeIds[idx - 1] : (tryLoop ? line.nodeIds[N - 1] : null);
                    const nextId = idx < N ? line.nodeIds[idx] : (tryLoop ? line.nodeIds[0] : null);
                    const prevNode = prevId ? state.nodes.find(n => n.id === prevId) : null;
                    const nextNode = nextId ? state.nodes.find(n => n.id === nextId) : null;

                    let detour = 160;
                    if (prevNode && nextNode) {
                        detour = dist(prevNode.x, prevNode.y, node.x, node.y) +
                                 dist(node.x, node.y, nextNode.x, nextNode.y) -
                                 dist(prevNode.x, prevNode.y, nextNode.x, nextNode.y);
                    } else if (prevNode) {
                        detour = dist(prevNode.x, prevNode.y, node.x, node.y);
                    } else if (nextNode) {
                        detour = dist(node.x, node.y, nextNode.x, nextNode.y);
                    }

                    const netBridgeDelta = candBridges - line.bridgesUsed;
                    const lengthPenalty = line.nodeIds.length * 36;
                    const unloopPenalty = (line.isLoop && !tryLoop) ? 45 : 0;
                    const totalCost = detour + netBridgeDelta * 210 + lengthPenalty + unloopPenalty + xlBonus;

                    if (totalCost < bestCost) {
                        bestCost = totalCost;
                        bestLine = line;
                        bestCandidateIds = candidateIds;
                        bestLoopFlag = tryLoop;
                    }
                }
            }
        }

        if (bestLine && bestCandidateIds) {
            bestLine.nodeIds = bestCandidateIds;
            bestLine.isLoop = bestLoopFlag;
            recalculateLineBridges(bestLine);
            aiTryCloseLoop(bestLine, city);
            state.aiLastAction = `+Station → ${bestLine.name}`;
        }
    }
}

function aiSplitLongestLineIntoNewLine() {
    const city = currentCity();
    const mainDepots = state.nodes.filter(n => n.kind === 'DEPOT' && n.depotType === 'MAIN');
    if (mainDepots.length === 0) return;

    const emptyLine = state.lines.find(l => l.id < state.unlockedLines && l.nodeIds.length < 2);
    if (!emptyLine) return;

    const activeLines = state.lines.filter(l => l.id < state.unlockedLines && l.nodeIds.length >= 5);
    if (activeLines.length === 0) return;

    activeLines.sort((a, b) => b.nodeIds.length - a.nodeIds.length);
    const longest = activeLines[0];

    // Extract 2-3 customer nodes from the longest line to form a dedicated express corridor
    const removableIds = longest.nodeIds.filter(id => {
        const n = state.nodes.find(x => x.id === id);
        return n && n.kind === 'CUSTOMER';
    });
    if (removableIds.length < 3) return;

    const takeCount = Math.min(3, Math.floor(removableIds.length / 2));
    const splitIds = removableIds.slice(-takeCount);
    const anchorMain = mainDepots[mainDepots.length - 1];
    const newPath = [anchorMain.id, ...splitIds];
    const remainingPath = longest.nodeIds.filter(id => !splitIds.includes(id));

    const oldBridges = longest.bridgesUsed;
    const newBridges = aiCountBridgesForPath(newPath, false, city) + aiCountBridgesForPath(remainingPath, longest.isLoop, city);

    if (newBridges <= oldBridges + state.inventory.bridges) {
        longest.nodeIds = remainingPath;
        if (longest.nodeIds.length < 3) longest.isLoop = false;
        recalculateLineBridges(longest);

        emptyLine.nodeIds = newPath;
        emptyLine.isLoop = newPath.length >= 4 && aiCountBridgesForPath(newPath, true, city) <= state.inventory.bridges + emptyLine.bridgesUsed;
        recalculateLineBridges(emptyLine);

        if (state.inventory.car > 0) {
            addVehicleToLine(emptyLine, 'car', false);
        } else if (state.inventory.bike > 0) {
            addVehicleToLine(emptyLine, 'bike', false);
        } else if (longest.vehicles.length >= 2) {
            const moved = longest.vehicles.pop();
            state.inventory[moved.type]++;
            addVehicleToLine(emptyLine, moved.type, false);
        }
        state.aiLastAction = `Split → ${emptyLine.name}`;
    }
}

function aiBalanceAndTriageLines() {
    const city = currentCity();
    const activeLines = state.lines.filter(l => l.id < state.unlockedLines && l.nodeIds.length >= 2);
    if (activeLines.length === 0) return;

    // 1. Ensure second MAIN depot (spawned on Day 22) is anchored into at least half of the lines
    const mainDepots = state.nodes.filter(n => n.kind === 'DEPOT' && n.depotType === 'MAIN');
    if (mainDepots.length >= 2) {
        const secondMain = mainDepots[1];
        for (const l of activeLines) {
            if (!l.nodeIds.includes(secondMain.id) && l.nodeIds.length <= 10) {
                const cand = l.nodeIds.concat([secondMain.id]);
                if (aiCountBridgesForPath(cand, l.isLoop, city) <= l.bridgesUsed + state.inventory.bridges) {
                    l.nodeIds.push(secondMain.id);
                    recalculateLineBridges(l);
                }
            }
        }
    }

    // 2. Connect L and XL Regional Hubs onto all lines that can reach them without extra bridges so every line helps drain them!
    const relayHubs = state.nodes.filter(n => n.kind === 'DEPOT' && (n.depotType === 'L' || n.depotType === 'XL'));
    for (const hub of relayHubs) {
        for (const l of activeLines) {
            if (l.nodeIds.includes(hub.id) || l.nodeIds.length >= 13) continue;
            const mainIdx = l.nodeIds.findIndex(id => {
                const n = state.nodes.find(x => x.id === id);
                return n && n.kind === 'DEPOT' && n.depotType === 'MAIN';
            });
            if (mainIdx !== -1) {
                const cand = l.nodeIds.slice();
                cand.splice(mainIdx + 1, 0, hub.id);
                if (aiCountBridgesForPath(cand, l.isLoop, city) <= l.bridgesUsed) {
                    l.nodeIds = cand;
                    recalculateLineBridges(l);
                }
            }
        }
    }

    // 3. Rebalance station count if one line is much longer than another (>= 4 stations difference)
    if (activeLines.length >= 2) {
        const sorted = activeLines.slice().sort((a, b) => b.nodeIds.length - a.nodeIds.length);
        const longest = sorted[0];
        const shortest = sorted[sorted.length - 1];
        if (longest.nodeIds.length - shortest.nodeIds.length >= 4 && shortest.vehicles.length >= 1) {
            for (let i = longest.nodeIds.length - 1; i >= 0; i--) {
                const nid = longest.nodeIds[i];
                const node = state.nodes.find(x => x.id === nid);
                if (!node || node.kind !== 'CUSTOMER') continue;
                if (node.demandType === 'XL' && !shortest.vehicles.some(v => v.type === 'car')) continue;

                const remLong = longest.nodeIds.filter(id => id !== nid);
                const addShort = shortest.nodeIds.concat([nid]);
                const oldBr = longest.bridgesUsed + shortest.bridgesUsed;
                const newBr = aiCountBridgesForPath(remLong, longest.isLoop && remLong.length >= 3, city) +
                              aiCountBridgesForPath(addShort, shortest.isLoop, city);
                if (newBr <= oldBr + state.inventory.bridges) {
                    longest.nodeIds = remLong;
                    if (longest.nodeIds.length < 3) longest.isLoop = false;
                    recalculateLineBridges(longest);
                    shortest.nodeIds = addShort;
                    recalculateLineBridges(shortest);
                    break;
                }
            }
        }
    }
}

function aiManageFleetAndEmergencies() {
    const activeLines = state.lines.filter(l => l.id < state.unlockedLines && l.nodeIds.length >= 2);
    if (activeLines.length === 0) return;

    // Helper: compute line urgency and XL need
    const getLineMetrics = (line) => {
        let xlNodes = 0;
        let lNodes = 0;
        let waitingTotal = 0;
        let maxOverload = 0;
        let urgentNode = null;

        for (const id of line.nodeIds) {
            const n = state.nodes.find(x => x.id === id);
            if (!n || n.kind !== 'CUSTOMER') continue;
            if (n.demandType === 'XL' || n.waitingOrders.some(o => o.size === 'XL')) xlNodes++;
            if (n.demandType === 'L' || n.waitingOrders.some(o => o.size === 'L')) lNodes++;
            waitingTotal += n.waitingOrders.length;
            if ((n.overloadTimer || 0) > maxOverload) {
                maxOverload = n.overloadTimer || 0;
                urgentNode = n;
            }
        }
        const cars = line.vehicles.filter(v => v.type === 'car').length;
        const bikes = line.vehicles.filter(v => v.type === 'bike').length;
        return { line, xlNodes, lNodes, waitingTotal, maxOverload, urgentNode, cars, bikes, totalVeh: line.vehicles.length };
    };

    // 1. Deploy all Cybercars in inventory first to XL lines, then to highest-demand lines
    while (state.inventory.car > 0) {
        const metrics = activeLines.map(getLineMetrics);
        metrics.sort((a, b) => {
            const aNeedsXLCar = (a.xlNodes > 0 && a.cars === 0) ? 1000 : 0;
            const bNeedsXLCar = (b.xlNodes > 0 && b.cars === 0) ? 1000 : 0;
            if (bNeedsXLCar !== aNeedsXLCar) return bNeedsXLCar - aNeedsXLCar;
            const scoreA = a.xlNodes * 25 + a.lNodes * 10 + a.waitingTotal * 6 + a.maxOverload * 80 - a.totalVeh * 18;
            const scoreB = b.xlNodes * 25 + b.lNodes * 10 + b.waitingTotal * 6 + b.maxOverload * 80 - b.totalVeh * 18;
            return scoreB - scoreA;
        });
        const target = metrics[0];
        if (!target || target.line.vehicles.length >= 6) break;
        const spawnNode = target.urgentNode || state.nodes.find(n => n.id === target.line.nodeIds[0]);
        addVehicleToLine(target.line, 'car', false, spawnNode ? spawnNode.x : null, spawnNode ? spawnNode.y : null);
    }

    // 2. Deploy all Cyberbikes in inventory to lines with lowest vehicle density or highest backlog
    while (state.inventory.bike > 0) {
        const metrics = activeLines.map(getLineMetrics);
        metrics.sort((a, b) => {
            const aEmpty = a.totalVeh === 0 ? 1000 : 0;
            const bEmpty = b.totalVeh === 0 ? 1000 : 0;
            if (bEmpty !== aEmpty) return bEmpty - aEmpty;
            const scoreA = (a.line.nodeIds.length * 8 + a.waitingTotal * 7 + a.maxOverload * 75) / Math.max(1, a.totalVeh);
            const scoreB = (b.line.nodeIds.length * 8 + b.waitingTotal * 7 + b.maxOverload * 75) / Math.max(1, b.totalVeh);
            return scoreB - scoreA;
        });
        const target = metrics[0];
        if (!target || target.line.vehicles.length >= 6) break;
        const spawnNode = target.urgentNode || state.nodes.find(n => n.id === target.line.nodeIds[0]);
        addVehicleToLine(target.line, 'bike', false, spawnNode ? spawnNode.x : null, spawnNode ? spawnNode.y : null);
    }

    // 3. Rebalance Cybercars if an XL line has 0 cars while another line has a spare car (or lower XL urgency!)
    const metrics = activeLines.map(getLineMetrics);
    const starvingXLLine = metrics
        .filter(m => m.xlNodes > 0 && m.cars === 0)
        .sort((a, b) => b.maxOverload - a.maxOverload)[0];
    if (starvingXLLine) {
        let donor = metrics.find(m => m.line.id !== starvingXLLine.line.id && m.cars >= 1 && (m.xlNodes === 0 || m.cars >= 2));
        if (!donor && starvingXLLine.maxOverload >= 0.25) {
            // Lend the car from another XL line whose urgency is significantly lower!
            donor = metrics.find(m => m.line.id !== starvingXLLine.line.id && m.cars >= 1 && m.maxOverload + 0.20 < starvingXLLine.maxOverload);
        }
        if (donor) {
            const carIdx = donor.line.vehicles.findIndex(v => v.type === 'car' && v.cargo.length === 0);
            const fallbackIdx = carIdx !== -1 ? carIdx : donor.line.vehicles.findIndex(v => v.type === 'car');
            if (fallbackIdx !== -1) {
                donor.line.vehicles.splice(fallbackIdx, 1);
                state.inventory.car++;
                // If starving line has a bike and donor was left with 0 vehicles, swap a bike back to donor
                if (donor.line.vehicles.length === 0 && starvingXLLine.bikes > 0) {
                    const bIdx = starvingXLLine.line.vehicles.findIndex(v => v.type === 'bike');
                    if (bIdx !== -1) {
                        starvingXLLine.line.vehicles.splice(bIdx, 1);
                        state.inventory.bike++;
                        addVehicleToLine(donor.line, 'bike', false);
                    }
                }
                addVehicleToLine(starvingXLLine.line, 'car', false);
                state.aiLastAction = `Swap Car → ${starvingXLLine.line.name}`;
            }
        } else {
            // If no car can be swapped because another line owns the only car, also link the XL node into the car's line!
            const carLineMetric = metrics.find(m => m.cars >= 1);
            if (carLineMetric) {
                const city = currentCity();
                const cLine = carLineMetric.line;
                const maxBr = cLine.bridgesUsed + state.inventory.bridges;
                for (const nid of starvingXLLine.line.nodeIds.slice()) {
                    const n = state.nodes.find(x => x.id === nid);
                    if (n && n.kind === 'CUSTOMER' && n.demandType === 'XL' && !cLine.nodeIds.includes(n.id)) {
                        // Find best insertion index on the car line that respects bridge budget
                        let bestCand = null;
                        let bestCost = Infinity;
                        for (let idx = 0; idx <= cLine.nodeIds.length; idx++) {
                            const cand = cLine.nodeIds.slice(0, idx).concat([n.id], cLine.nodeIds.slice(idx));
                            const br = aiCountBridgesForPath(cand, cLine.isLoop, city);
                            if (br <= maxBr) {
                                const cost = (br - cLine.bridgesUsed) * 180 + idx * 10;
                                if (cost < bestCost) {
                                    bestCost = cost;
                                    bestCand = cand;
                                }
                            }
                        }
                        if (bestCand) {
                            cLine.nodeIds = bestCand;
                            recalculateLineBridges(cLine);
                            if (starvingXLLine.line.nodeIds.length > 2) {
                                starvingXLLine.line.nodeIds = starvingXLLine.line.nodeIds.filter(id => id !== n.id);
                                if (starvingXLLine.line.nodeIds.length < 3) starvingXLLine.line.isLoop = false;
                                recalculateLineBridges(starvingXLLine.line);
                            }
                            state.aiLastAction = `XL Link → ${cLine.name}`;
                            break;
                        }
                    }
                }
            }
        }
    }

    // 4. Tactical Emergency Repositioning: When a station or MAIN depot reaches critical overload (>= 0.52),
    // reposition an available vehicle onto the depot/corridor (using the same mechanic as player vehicle drag & drop!)
    const mainDepot = state.nodes.find(n => n.kind === 'DEPOT' && n.depotType === 'MAIN');
    if (!mainDepot) return;

    for (const line of activeLines) {
        if (line.vehicles.length === 0) continue;

        // Check if any customer on this line is in critical overload danger
        let critCust = null;
        let maxUrg = 0.50;
        for (const nid of line.nodeIds) {
            const c = state.nodes.find(x => x.id === nid);
            if (c && c.kind === 'CUSTOMER' && (c.overloadTimer || 0) > maxUrg) {
                maxUrg = c.overloadTimer;
                critCust = c;
            }
        }

        if (critCust) {
            const reqCar = critCust.waitingOrders.some(o => o.size === 'XL') || critCust.demandType === 'XL';
            // If this line needs a car for an XL emergency and has none, borrow one from another line immediately
            if (reqCar && !line.vehicles.some(v => v.type === 'car')) {
                const donorLine = activeLines.find(l => l.id !== line.id && l.vehicles.some(v => v.type === 'car'));
                if (donorLine) {
                    const cIdx = donorLine.vehicles.findIndex(v => v.type === 'car');
                    const [movedCar] = donorLine.vehicles.splice(cIdx, 1);
                    movedCar.lineId = line.id;
                    line.vehicles.push(movedCar);
                    if (donorLine.vehicles.length === 0 && line.vehicles.some(v => v.type === 'bike')) {
                        const bIdx = line.vehicles.findIndex(v => v.type === 'bike');
                        const [movedBike] = line.vehicles.splice(bIdx, 1);
                        movedBike.lineId = donorLine.id;
                        donorLine.vehicles.push(movedBike);
                    }
                }
            }

            let rescueVeh = line.vehicles.find(v =>
                (!reqCar || v.type === 'car') &&
                v.cargo.some(p => p.targetCustomerId === critCust.id || critCust.waitingOrders.some(o => o.size === p.size))
            );

            if (!rescueVeh) {
                rescueVeh = line.vehicles.find(v => (!reqCar || v.type === 'car') && v.cargo.length === 0) ||
                            line.vehicles.find(v => !reqCar || v.type === 'car');
                const allDepots = state.nodes.filter(n => n.kind === 'DEPOT');
                const sourceDep = allDepots.find(d => d.storage.some(p => p.targetCustomerId === critCust.id)) || mainDepot;
                if (rescueVeh && sourceDep) {
                    while (rescueVeh.cargo.length > 0 && sourceDep.storage.length < sourceDep.capacity) {
                        sourceDep.storage.push(rescueVeh.cargo.pop());
                    }
                    const pIdx = sourceDep.storage.findIndex(p =>
                        (p.targetCustomerId === critCust.id || critCust.waitingOrders.some(o => o.size === p.size)) &&
                        canVehicleLoadPackage(rescueVeh, p.size)
                    );
                    if (pIdx !== -1) {
                        rescueVeh.cargo.push(sourceDep.storage.splice(pIdx, 1)[0]);
                    } else {
                        handleVehicleStopAtNode(rescueVeh, line, sourceDep);
                    }
                }
            }

            if (rescueVeh && rescueVeh.cargo.some(p => p.targetCustomerId === critCust.id || critCust.waitingOrders.some(o => o.size === p.size))) {
                const proj = projectWorldPointToLine(line, critCust.x, critCust.y);
                if (proj) {
                    rescueVeh.segIndex = proj.segIndex;
                    rescueVeh.segNodeA = proj.segNodeA;
                    rescueVeh.segNodeB = proj.segNodeB;
                    rescueVeh.dir = 1;
                    rescueVeh.progress = Math.max(0, proj.progress - 0.08);
                    rescueVeh.x = critCust.x;
                    rescueVeh.y = critCust.y;
                }
                handleVehicleStopAtNode(rescueVeh, line, critCust);
                state.aiLastAction = `⚡ Express-Rettung (${line.name})`;
            }
        }
    }

    // 5. If ANY Depot (MAIN, XL, L, S) is approaching storage gridlock, have vehicles on its lines load immediately
    for (const dep of state.nodes) {
        if (dep.kind !== 'DEPOT' || (dep.overloadTimer || 0) < 0.32) continue;
        for (const line of activeLines) {
            if (!line.nodeIds.includes(dep.id)) continue;
            for (const v of line.vehicles) {
                if (v.cargo.length === 0) {
                    handleVehicleStopAtNode(v, line, dep);
                }
            }
        }
    }
}

function updateAISimulator(dt) {
    state.aiDecisionTimer = (state.aiDecisionTimer || 0) + dt;
    state.aiRebalanceTimer = (state.aiRebalanceTimer || 0) + dt;

    // 1. If a weekly upgrade is waiting, pick the smartest option immediately
    if (typeof pendingWeeklyUpgrade !== 'undefined' && pendingWeeklyUpgrade) {
        aiPickBestWeeklyUpgrade();
    }

    // 2. Run tactical network & fleet planner every ~0.70s of game time
    if (state.aiDecisionTimer >= 0.70) {
        state.aiDecisionTimer = 0;
        aiDeployHubsAndDrones();
        aiConnectUnservedNodes();
        aiSplitLongestLineIntoNewLine();
        aiBalanceAndTriageLines();
        aiManageFleetAndEmergencies();
    }

    // 3. Periodic 2-opt loop refinement every ~3.5s of game time
    if (state.aiRebalanceTimer >= 3.5) {
        state.aiRebalanceTimer = 0;
        const city = currentCity();
        for (let i = 0; i < state.unlockedLines; i++) {
            const line = state.lines[i];
            if (line && line.nodeIds.length >= 4) {
                aiUncrossLine2Opt(line, city);
                aiTryCloseLoop(line, city);
            }
        }
        if (!state.tutorialCompleted && state.lines.some(l => l.nodeIds.length >= 2 && l.vehicles.length >= 1)) {
            state.tutorialCompleted = true;
            const hintPill = document.getElementById('uiHintPill');
            if (hintPill) hintPill.classList.add('hidden');
        }
    }
}
