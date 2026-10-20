/***************************************************************************
 * 11. UI UPDATES, LOCALIZATION SWITCHER, MODALS & MAIN LOOP
 ***************************************************************************/
function setActiveTool(toolName) {
    state.activeTool = state.activeTool === toolName && toolName !== 'route' ? 'route' : toolName;
    document.querySelectorAll('.dock-item').forEach(btn => {
        btn.classList.toggle('active-tool', btn.dataset.tool === state.activeTool);
    });

    const hintBanner = document.getElementById('uiHintBanner');
    const hintEl = document.getElementById('uiHintText');
    if (state.activeTool === 'route') {
        if (state.tutorialCompleted) hintBanner.classList.add('opacity-0');
        else hintEl.textContent = t('hint_initial');
    } else {
        const hintKeys = {
            depot_S:  'hint_depot_s',
            depot_L:  'hint_depot_l',
            depot_XL: 'hint_depot_xl',
            drone:    'hint_drone',
            bike:     'hint_bike',
            car:      'hint_car'
        };
        hintEl.textContent = t(hintKeys[state.activeTool] || 'hint_initial');
        hintBanner.classList.remove('opacity-0');
    }
}

function openNodeInspector(node) {
    // Popup-free design: never open the floating node inspector window
    state.inspectedNodeId = null;
    const panel = document.getElementById('nodeInspector');
    if (panel) panel.classList.add('hidden');
}

function dismantleDepotNode(node) {
    if (!node || node.kind !== 'DEPOT' || node.depotType === 'MAIN') return;
    const nodeIdx = state.nodes.findIndex(n => n.id === node.id);
    if (nodeIdx === -1) return;

    state.inventory[`depot_${node.depotType}`]++;
    for (let i = state.drones.length - 1; i >= 0; i--) {
        if (state.drones[i].homeNodeId === node.id) {
            state.drones.splice(i, 1);
            state.inventory.drone++;
        }
    }
    for (const l of state.lines) {
        const idx = l.nodeIds.indexOf(node.id);
        if (idx !== -1) {
            l.nodeIds.splice(idx, 1);
            if (l.nodeIds.length < 3) l.isLoop = false;
            if (l.nodeIds.length < 2) {
                clearLine(l);
            } else {
                recalculateLineBridges(l);
            }
        }
    }
    state.ripples.push({ x: node.x, y: node.y, r: node.radius, maxR: 42, color: '#F43F5E', alpha: 0.85 });
    showFloatingText(node.x, node.y - 18, `+1 ${getDepotLabel(node.depotType)}`, '#F43F5E');
    state.nodes.splice(nodeIdx, 1);
    state.inspectedNodeId = null;
    document.getElementById('nodeInspector').classList.add('hidden');
    sfx.playDisconnect();
    updateAllUI();
}

document.getElementById('btnCloseInspector').addEventListener('click', () => {
    state.inspectedNodeId = null;
    document.getElementById('nodeInspector').classList.add('hidden');
});

document.getElementById('btnInspAddDrone').addEventListener('click', () => {
    const node = state.nodes.find(n => n.id === state.inspectedNodeId);
    if (node) {
        stationDroneAtNode(node, false);
    }
});

document.getElementById('btnInspRemoveNode').addEventListener('click', () => {
    const node = state.nodes.find(n => n.id === state.inspectedNodeId);
    if (node) dismantleDepotNode(node);
});

document.getElementById('btnClearSelectedLine').addEventListener('click', () => {
    clearLine(state.lines[state.selectedLineId]);
});

function updateTokenUI(toolKey, badgeId) {
    const count = state.inventory[toolKey];
    if (count > 0) state.everUnlocked[toolKey] = true;

    const badge = document.getElementById(badgeId);
    if (badge) badge.textContent = count;

    const btn = document.querySelector(`[data-tool="${toolKey}"]`);
    if (btn) {
        btn.classList.toggle('token-locked', !state.everUnlocked[toolKey]);
        btn.classList.toggle('token-depleted', state.everUnlocked[toolKey] && count <= 0);
    }
}

function updateGoalUI() {
    const score = state.score;
    const targets = getStarTargets();
    const t1 = targets[0];
    const t2 = targets[1];
    const t3 = targets[2];

    const stars = score >= t3 ? '★★★' : (score >= t2 ? '★★☆' : (score >= t1 ? '★☆☆' : '☆☆☆'));
    const nextTarget = score < t1 ? t1 : (score < t2 ? t2 : t3);
    const prevTarget = score < t1 ? 0 : (score < t2 ? t1 : (score < t3 ? t2 : 0));
    const pct = score >= t3
        ? 100
        : Math.min(100, Math.max(0, ((score - prevTarget) / Math.max(1, nextTarget - prevTarget)) * 100));

    const starsEl = document.getElementById('uiStars');
    const targetEl = document.getElementById('uiGoalTarget');
    const barEl = document.getElementById('uiGoalBar');
    if (starsEl) starsEl.textContent = stars;
    if (targetEl) targetEl.textContent = score >= t3 ? ' · MAX' : `/${nextTarget}`;
    if (barEl) barEl.style.width = `${pct.toFixed(1)}%`;

    const dSpec = getDifficultySpec();
    const diffLabel = document.getElementById('uiDiffLabel');
    const diffIcon = document.getElementById('uiDiffIcon');
    if (diffLabel) diffLabel.textContent = t(`diff_${dSpec.id}_short`);
    if (diffIcon) diffIcon.style.color = dSpec.color;
}

function updateAllUI() {
    document.getElementById('uiScore').textContent = state.score;
    updateGoalUI();

    updateTokenUI('bike', 'badgeBike');
    updateTokenUI('car', 'badgeCar');
    updateTokenUI('drone', 'badgeDrone');
    updateTokenUI('depot_S', 'badgeDepotS');
    updateTokenUI('depot_L', 'badgeDepotL');
    updateTokenUI('depot_XL', 'badgeDepotXL');

    document.getElementById('badgeBridges').textContent = state.inventory.bridges;
    document.getElementById('tokenBridgesWrap').classList.toggle('token-depleted', state.inventory.bridges <= 0);

    const container = document.getElementById('linePillsContainer');
    container.innerHTML = '';
    for (let i = 0; i < state.unlockedLines; i++) {
        const line = state.lines[i];
        if (!line) continue;
        const btn = document.createElement('button');
        const isSelected = line.id === state.selectedLineId;
        const isUsed = line.nodeIds.length >= 2;
        btn.className = `line-token font-mono-num text-[11px] font-extrabold text-white ${isSelected ? 'selected' : ''} ${!isUsed ? 'unused' : ''}`;
        btn.style.backgroundColor = line.color;
        btn.style.color = line.color;
        const vehText = line.vehicles.length || '';
        const loopBadge = (line.isLoop && line.nodeIds.length >= 3) ? '⟳' : '';
        btn.innerHTML = `<span class="text-white leading-none">${vehText}${loopBadge}</span>`;
        btn.title = `${getLineName(line.id)}${line.isLoop ? ' (⟳)' : ''} (${t('vehicles_count', { n: line.vehicles.length })})`;

        btn.addEventListener('mouseenter', () => { state.hoveredLineId = line.id; });
        btn.addEventListener('mouseleave', () => { state.hoveredLineId = null; });
        btn.addEventListener('click', () => {
            state.selectedLineId = line.id;
            if (state.activeTool === 'bike' || state.activeTool === 'car') {
                addVehicleToLine(line, state.activeTool, false);
                setActiveTool('route');
            }
            updateAllUI();
        });
        container.appendChild(btn);
    }

    if (state.inspectedNodeId) {
        const n = state.nodes.find(x => x.id === state.inspectedNodeId);
        if (n) openNodeInspector(n);
    }
}

function updateClockUI() {
    const days = t('days');
    const dayIdx = (state.dayCount - 1) % 7;
    document.getElementById('uiDayName').textContent = Array.isArray(days) ? days[dayIdx] : 'MON';

    const weekFraction = (dayIdx + state.timeOfDay / 24) / 7;
    const circumference = 110;
    const offset = circumference * (1 - weekFraction);
    document.getElementById('uiWeekArc').style.strokeDashoffset = `${offset.toFixed(1)}`;

    const hourDeg = ((state.timeOfDay % 12) / 12) * 360;
    const minDeg = ((state.timeOfDay % 1) * 360);
    document.getElementById('clockHandHour').style.transform = `rotate(${hourDeg}deg)`;
    document.getElementById('clockHandMin').style.transform = `rotate(${minDeg}deg)`;
}

function getWeeklyUpgradeChoices() {
    const pool = [];

    if (state.unlockedLines < LINE_COLORS.length) {
        const nextColor = LINE_COLORS[state.unlockedLines];
        const nextLineLabel = getLineName(state.unlockedLines);
        pool.push({
            title: t('upg_new_line_title'),
            subtitle: t('upg_new_line_sub', { line: nextLineLabel }),
            desc: t('upg_new_line_desc'),
            badgeColor: nextColor.hex,
            iconText: '+LINE',
            apply: () => {
                state.unlockedLines = Math.min(LINE_COLORS.length, state.unlockedLines + 1);
                state.inventory.bike += 1;
                state.inventory.bridges += 1;
                state.selectedLineId = state.unlockedLines - 1;
            }
        });
    } else {
        pool.push({
            title: t('upg_express_title'),
            subtitle: t('upg_express_sub'),
            desc: t('upg_express_desc'),
            badgeColor: '#10B981',
            iconText: '2×BIKE',
            apply: () => {
                state.inventory.bike += 2;
                state.inventory.bridges += 1;
            }
        });
    }

    pool.push({
        title: t('upg_heavy_title'),
        subtitle: state.weekCount <= 2 ? t('upg_heavy_sub_early') : t('upg_heavy_sub_late'),
        desc: t('upg_heavy_desc'),
        badgeColor: '#8B5CF6',
        iconText: 'CAR',
        apply: () => {
            state.everUnlocked.car = true;
            if (state.weekCount <= 2) {
                state.inventory.car += 1;
                state.everUnlocked.depot_L = true;
                state.inventory.depot_L += 1;
            } else {
                state.inventory.car += 1;
                state.everUnlocked.depot_XL = true;
                state.inventory.depot_XL += 1;
                state.inventory.bridges += 1;
            }
        }
    });

    pool.push({
        title: t('upg_air_title'),
        subtitle: t('upg_air_sub'),
        desc: t('upg_air_desc'),
        badgeColor: '#06B6D4',
        iconText: 'AIR+BR',
        apply: () => {
            state.everUnlocked.depot_S = true;
            state.inventory.drone += 1;
            state.inventory.depot_S += 1;
            state.inventory.bridges += 2;
        }
    });

    return pool;
}

let pendingWeeklyUpgrade = null;

function triggerWeeklyUpgradeModal() {
    sfx.playWeeklyChord();
    // If a previous weekly upgrade was still unpicked in the inline bar, auto-apply it so the player never loses resources
    if (pendingWeeklyUpgrade) {
        pendingWeeklyUpgrade.apply();
        pendingWeeklyUpgrade = null;
    }

    const choices = getWeeklyUpgradeChoices();
    const upgBar = document.getElementById('inlineUpgradeBar');
    const hintBanner = document.getElementById('uiHintBanner');
    if (hintBanner) hintBanner.classList.remove('opacity-0');

    if (!upgBar) {
        if (choices[0]) choices[0].apply();
        updateAllUI();
        return;
    }

    pendingWeeklyUpgrade = choices[0] || null;
    upgBar.innerHTML = `<span class="text-[11px] font-extrabold uppercase tracking-wider text-amber-500 px-1.5">${t('upg_week', { w: state.weekCount })}:</span>`;

    choices.forEach((pkg) => {
        const btn = document.createElement('button');
        btn.className = 'px-3 py-1 rounded-full text-[11px] font-extrabold text-white shadow-sm hover:scale-105 active:scale-95 transition-transform flex items-center gap-1.5 cursor-pointer';
        btn.style.background = pkg.badgeColor;
        btn.innerHTML = `<span>${pkg.iconText}</span><span class="opacity-90 font-semibold hidden sm:inline">· ${pkg.subtitle}</span>`;
        btn.title = `${pkg.title}: ${pkg.subtitle}`;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            pendingWeeklyUpgrade = null;
            pkg.apply();
            upgBar.classList.add('hidden');
            upgBar.innerHTML = '';
            showFloatingText(state.cam.x, state.cam.y - 24, `✓ ${pkg.subtitle}`, pkg.badgeColor);
            updateAllUI();
        });
        upgBar.appendChild(btn);
    });

    upgBar.classList.remove('hidden');
    updateAllUI();
}

function triggerGameOver(overloadedNode) {
    setGameSpeed(0);
    const city = currentCity();
    saveCityRecord(city.id, state.score, state.starsEarned);

    const statusBar = document.getElementById('inlineStatusBar');
    const hintBanner = document.getElementById('uiHintBanner');
    if (hintBanner) hintBanner.classList.remove('opacity-0');

    if (statusBar) {
        const reason = (overloadedNode && overloadedNode.kind === 'DEPOT')
            ? t('go_sub_depot', { depot: getDepotLabel(overloadedNode.depotType) })
            : t('go_title_city', { city: city.name });
        statusBar.innerHTML = `
            <span class="text-rose-500">⚠️ ${reason} (${state.score})</span>
            <button id="btnInlineEndless" class="px-3 py-1 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-extrabold uppercase tracking-wider shadow transition-transform active:scale-95">${t('go_endless')}</button>
            <button id="btnInlineRestart" class="px-3 py-1 rounded-full bg-black/10 dark:bg-white/15 text-[11px] font-extrabold uppercase tracking-wider transition-transform active:scale-95">${t('go_restart')}</button>
        `;
        statusBar.classList.remove('hidden');
        document.getElementById('btnInlineEndless').addEventListener('click', (e) => {
            e.stopPropagation();
            statusBar.classList.add('hidden');
            document.getElementById('btnContinueEndless').click();
        });
        document.getElementById('btnInlineRestart').addEventListener('click', (e) => {
            e.stopPropagation();
            statusBar.classList.add('hidden');
            openStartScreen(true);
        });
    }
}

function triggerVictoryModal() {
    sfx.playWeeklyChord();
    const city = currentCity();
    const targets = getStarTargets();
    saveCityRecord(city.id, state.score, 3);

    showFloatingText(state.cam.x, state.cam.y - 30, `★★★ ${t('vic_title_city', { city: city.name })}`, '#F59E0B');

    const statusBar = document.getElementById('inlineStatusBar');
    const hintBanner = document.getElementById('uiHintBanner');
    if (hintBanner) hintBanner.classList.remove('opacity-0');

    if (statusBar) {
        statusBar.innerHTML = `
            <span class="text-amber-500">★★★ ${t('vic_title_city', { city: city.name })} (${targets[2]})</span>
            <button id="btnInlineNextCity" class="px-3 py-1 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-extrabold uppercase tracking-wider shadow transition-transform active:scale-95">${t('vic_next_city')}</button>
            <button id="btnInlineDismissVic" class="w-5 h-5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-[11px] opacity-70">✕</button>
        `;
        statusBar.classList.remove('hidden');
        document.getElementById('btnInlineNextCity').addEventListener('click', (e) => {
            e.stopPropagation();
            statusBar.classList.add('hidden');
            state.cityIndex = (state.cityIndex + 1) % CITIES.length;
            openStartScreen(true);
        });
        document.getElementById('btnInlineDismissVic').addEventListener('click', (e) => {
            e.stopPropagation();
            statusBar.classList.add('hidden');
        });
    }
}

let selectedStartCityIndex = 0;
let selectedStartDifficulty = 'hard';
let hasStartedFirstGame = false;
let preScreenGameSpeed = 1;

function updateStartScreenLaunchButton() {
    const btnLabel = document.getElementById('startScreenBtnLabel');
    const city = CITIES[selectedStartCityIndex] || CITIES[0];
    if (!btnLabel || !city) return;
    const isUnchangedRunningGame = hasStartedFirstGame &&
        selectedStartCityIndex === state.cityIndex &&
        selectedStartDifficulty === state.difficulty;
    if (isUnchangedRunningGame) {
        btnLabel.textContent = `${t('help_continue')} (${city.name})`;
    } else {
        btnLabel.textContent = `${t('upg_select')}: ${city.name}`;
    }
}

function renderStartScreenDifficulty() {
    const container = document.getElementById('startDifficultyContainer');
    const summaryEl = document.getElementById('startDiffSummary');
    if (!container) return;
    container.innerHTML = '';

    const tiers = ['joke', 'easy', 'hard', 'hardcore', 'chuck'];
    const icons = { joke: '🤡', easy: '🌱', hard: '⚡', hardcore: '🔥', chuck: '🤠' };

    const activeDiff = selectedStartDifficulty || state.difficulty || 'hard';
    if (summaryEl) {
        summaryEl.textContent = `— ${t(`diff_${activeDiff}_desc`)}`;
    }

    tiers.forEach((tierId) => {
        const spec = DIFFICULTY_SPECS[tierId];
        const isCurrent = activeDiff === tierId;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `rounded-2xl p-2.5 text-left transition-all flex flex-col justify-between cursor-pointer ${
            isCurrent
                ? 'bg-white shadow-md ring-2 ring-amber-500 scale-[1.02]'
                : 'bg-black/5 hover:bg-black/10 opacity-80 hover:opacity-100'
        }`;
        btn.innerHTML = `
            <div class="flex items-center justify-between gap-1.5 mb-1">
                <span class="font-extrabold text-xs flex items-center gap-1">
                    <span>${icons[tierId]}</span>
                    <span>${t(`diff_${tierId}_name`)}</span>
                </span>
                <span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold text-white uppercase" style="background:${spec.color}">
                    ${t(`diff_${tierId}_short`)}
                </span>
            </div>
            <div class="flex items-center justify-between text-[10px] font-mono-num opacity-75">
                <span>★ ${spec.starTargets.join('/')}</span>
                <span class="text-rose-600 font-bold">≥${spec.maxOrdersSL} (${spec.maxOrdersXL} XL)</span>
            </div>
        `;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Difficulty can only be changed on the Start Screen, never during a running game
            if (hasStartedFirstGame) return;
            selectedStartDifficulty = tierId;
            renderStartScreenDifficulty();
            updateStartScreenLaunchButton();
        });
        container.appendChild(btn);
    });
}

function renderStartScreenCities(filterText = '') {
    const container = document.getElementById('startCityGridContainer');
    if (!container) return;
    container.innerHTML = '';
    const q = filterText.trim().toLowerCase();

    CITIES.forEach((city, idx) => {
        if (q && !city.name.toLowerCase().includes(q) &&
            !city.country.toLowerCase().includes(q) &&
            !city.riverName.toLowerCase().includes(q)) {
            return;
        }

        const rec = getCityRecord(city.id);
        const starStr = rec.stars >= 3 ? '★★★' : (rec.stars === 2 ? '★★☆' : (rec.stars === 1 ? '★☆☆' : '☆☆☆'));
        const isSelected = idx === selectedStartCityIndex;

        const card = document.createElement('button');
        card.type = 'button';
        card.className = `rounded-2xl p-2.5 text-left flex items-center gap-3 transition-all cursor-pointer ${
            isSelected
                ? 'bg-white shadow-md ring-2 ring-amber-500 scale-[1.01]'
                : 'bg-black/5 hover:bg-black/10 opacity-90 hover:opacity-100'
        }`;

        const miniCanvas = document.createElement('canvas');
        miniCanvas.width = 110;
        miniCanvas.height = 72;
        miniCanvas.className = 'w-[84px] h-[54px] rounded-xl flex-shrink-0 border border-black/10';
        renderMiniMapPreview(miniCanvas, city);

        const info = document.createElement('div');
        info.className = 'min-w-0 flex-1';
        info.innerHTML = `
            <div class="flex items-center justify-between gap-1">
                <span class="font-extrabold text-xs sm:text-sm truncate">${city.name}</span>
                <span class="text-[10px] font-mono-num text-amber-500 font-extrabold">${starStr}</span>
            </div>
            <div class="text-[10px] opacity-65 truncate mt-0.5">${city.riverName}</div>
            <div class="text-[10px] font-mono-num opacity-50 mt-0.5">${rec.bestScore > 0 ? `Best: ${rec.bestScore} · ${city.country}` : city.country}</div>
        `;

        card.appendChild(miniCanvas);
        card.appendChild(info);

        card.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedStartCityIndex = idx;
            updateStartScreenLaunchButton();
            renderStartScreenCities(filterText);
        });
        card.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            selectedStartCityIndex = idx;
            launchGameFromStartScreen(true);
        });
        container.appendChild(card);
    });

    updateStartScreenLaunchButton();
}

function isStartScreenOpen() {
    const introEl = document.getElementById('introSplash');
    return Boolean(introEl && !introEl.classList.contains('hidden') && introEl.style.display !== 'none');
}

function openStartScreen(asFullStartScreen = false) {
    const introEl = document.getElementById('introSplash');
    if (!introEl) return;
    if (asFullStartScreen) {
        hasStartedFirstGame = false;
    }
    if (!isStartScreenOpen()) {
        preScreenGameSpeed = state.gameSpeed || 1;
    }
    setGameSpeed(0);
    selectedStartCityIndex = state.cityIndex || 0;
    selectedStartDifficulty = state.difficulty || 'hard';

    // During a running game, hide Difficulty & City switching so difficulty can ONLY be changed on the Start Screen
    const diffSec = document.getElementById('startDifficultySection');
    const citySec = document.getElementById('startCitiesSection');
    const closeBtn = document.getElementById('btnCloseStartScreen');
    if (diffSec) diffSec.classList.toggle('hidden', hasStartedFirstGame);
    if (citySec) citySec.classList.toggle('hidden', hasStartedFirstGame);
    if (closeBtn) closeBtn.classList.toggle('hidden', !hasStartedFirstGame);

    const searchInput = document.getElementById('startCitySearchInput');
    if (searchInput) searchInput.value = '';
    renderStartScreenDifficulty();
    renderStartScreenCities('');
    introEl.style.display = 'flex';
    introEl.classList.remove('hidden', 'intro-hide');
}

function hideStartScreenOverlay() {
    const introEl = document.getElementById('introSplash');
    if (!introEl) return;
    introEl.classList.add('intro-hide');
    setTimeout(() => {
        introEl.classList.add('hidden');
        introEl.style.display = 'none';
    }, 360);
}

function closeStartScreenAndResume() {
    if (!hasStartedFirstGame) {
        launchGameFromStartScreen(true);
        return;
    }
    hideStartScreenOverlay();
    setGameSpeed(preScreenGameSpeed || 1);
}

function launchGameFromStartScreen(forceRestart = false) {
    const needsNewGame = !hasStartedFirstGame ||
        forceRestart ||
        selectedStartCityIndex !== state.cityIndex ||
        selectedStartDifficulty !== state.difficulty;

    if (needsNewGame) {
        state.difficulty = selectedStartDifficulty || state.difficulty || 'hard';
        try { localStorage.setItem('miniDelivery_difficulty', state.difficulty); } catch (err) {}
        hasStartedFirstGame = true;
        initCity(selectedStartCityIndex);
        setGameSpeed(1);
    } else {
        setGameSpeed(preScreenGameSpeed || 1);
    }
    hideStartScreenOverlay();
}

document.getElementById('btnVictoryNextCity').addEventListener('click', () => {
    document.getElementById('victoryModal').classList.add('hidden');
    const nextIdx = (state.cityIndex + 1) % CITIES.length;
    initCity(nextIdx);
});

document.getElementById('btnVictoryOvertime').addEventListener('click', () => {
    document.getElementById('victoryModal').classList.add('hidden');
    setGameSpeed(1);
});

document.getElementById('btnContinueEndless').addEventListener('click', () => {
    state.endlessMode = true;
    for (const n of state.nodes) {
        n.overloadTimer = 0;
        if (n.kind === 'CUSTOMER' && n.waitingOrders.length > 2) {
            n.waitingOrders.splice(0, n.waitingOrders.length - 2);
        } else if (n.kind === 'DEPOT' && n.storage.length > Math.floor(n.capacity * 0.5)) {
            n.storage.splice(0, Math.floor(n.capacity * 0.4));
        }
    }
    state.everUnlocked.car = true;
    state.inventory.drone += 1;
    state.inventory.car += 1;
    state.inventory.bridges += 1;
    document.getElementById('gameOverModal').classList.add('hidden');
    updateAllUI();
    setGameSpeed(1);
});

document.getElementById('btnRestartCity').addEventListener('click', () => {
    document.getElementById('gameOverModal').classList.add('hidden');
    initCity(state.cityIndex);
});

/***************************************************************************
 * 12. 30 CITIES MODAL
 ***************************************************************************/
function buildCityModalGrid(filterText = '') {
    const container = document.getElementById('cityGridContainer');
    container.innerHTML = '';
    const q = filterText.trim().toLowerCase();

    CITIES.forEach((city, idx) => {
        if (q && !city.name.toLowerCase().includes(q) &&
            !city.country.toLowerCase().includes(q) &&
            !city.riverName.toLowerCase().includes(q)) {
            return;
        }

        const rec = getCityRecord(city.id);
        const starStr = rec.stars >= 3 ? '★★★' : (rec.stars === 2 ? '★★☆' : (rec.stars === 1 ? '★☆☆' : '☆☆☆'));

        const card = document.createElement('button');
        const isCurrent = idx === state.cityIndex;
        card.className = `dpc-pill rounded-3xl p-3.5 text-left flex items-center gap-3.5 hover:scale-[1.02] active:scale-95 transition-transform ${isCurrent ? 'ring-2 ring-amber-500' : ''}`;

        const miniCanvas = document.createElement('canvas');
        miniCanvas.width = 110;
        miniCanvas.height = 72;
        miniCanvas.className = 'w-[92px] h-[60px] rounded-2xl flex-shrink-0 border border-black/10 dark:border-white/10';
        renderMiniMapPreview(miniCanvas, city);

        const info = document.createElement('div');
        info.className = 'min-w-0 flex-1';
        info.innerHTML = `
            <div class="flex items-center justify-between gap-1">
                <span class="font-extrabold text-sm truncate">${city.name}</span>
                <span class="text-[10px] font-mono-num text-amber-500 font-extrabold">${starStr}</span>
            </div>
            <div class="text-[11px] opacity-65 truncate mt-0.5">${city.riverName}</div>
            <div class="text-[10px] font-mono-num opacity-45 mt-0.5">${rec.bestScore > 0 ? `Best: ${rec.bestScore}` : city.country}</div>
        `;

        card.appendChild(miniCanvas);
        card.appendChild(info);
        card.addEventListener('click', () => {
            document.getElementById('cityModal').classList.add('hidden');
            initCity(idx);
        });
        container.appendChild(card);
    });
}

/***************************************************************************
 * 13. THEME, LANGUAGE, AUDIO CONTROLS & MAIN LOOP
 ***************************************************************************/
function applyThemeColors() {
    const city = currentCity();
    const pal = state.nightMode ? city.night : city.day;
    document.documentElement.style.setProperty('--bg-land', pal.land);
    document.documentElement.style.setProperty('--bg-water', pal.water);
    if (state.nightMode) {
        document.documentElement.style.setProperty('--text-main', '#F1F5F9');
        document.documentElement.style.setProperty('--panel-bg', 'rgba(15, 23, 42, 0.86)');
        document.documentElement.style.setProperty('--panel-border', 'rgba(255, 255, 255, 0.12)');
        document.documentElement.style.setProperty('--token-bg', '#1E293B');
        document.getElementById('iconSun').classList.remove('hidden');
        document.getElementById('iconMoon').classList.add('hidden');
    } else {
        document.documentElement.style.setProperty('--text-main', '#23272E');
        document.documentElement.style.setProperty('--panel-bg', 'rgba(255, 255, 255, 0.88)');
        document.documentElement.style.setProperty('--panel-border', 'rgba(35, 39, 46, 0.08)');
        document.documentElement.style.setProperty('--token-bg', '#FFFFFF');
        document.getElementById('iconSun').classList.add('hidden');
        document.getElementById('iconMoon').classList.remove('hidden');
    }
}

function setGameSpeed(spd) {
    state.gameSpeed = spd;
    document.querySelectorAll('.speed-btn').forEach(btn => {
        const active = Number(btn.dataset.speed) === spd;
        btn.classList.toggle('bg-amber-500', active);
        btn.classList.toggle('text-white', active);
        btn.classList.toggle('shadow-sm', active);
    });
}

function setLanguage(langCode) {
    if (!I18N[langCode]) langCode = 'en';
    currentLang = langCode;
    applyTranslationsToDOM();
    setActiveTool(state.activeTool);
    updateClockUI();
    updateAllUI();
    renderStartScreenDifficulty();
    const searchInput = document.getElementById('startCitySearchInput');
    renderStartScreenCities(searchInput ? searchInput.value : '');
}

function cycleLanguage() {
    const idx = SUPPORTED_LANGS.findIndex(l => l.code === currentLang);
    const next = SUPPORTED_LANGS[(idx + 1) % SUPPORTED_LANGS.length];
    setLanguage(next.code);
    const found = SUPPORTED_LANGS.find(l => l.code === currentLang);
    showFloatingText(state.cam.x, state.cam.y - 24, `🌐 ${found ? found.name : currentLang.toUpperCase()}`, '#F59E0B');
}

document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.addEventListener('click', () => setGameSpeed(Number(btn.dataset.speed)));
});

document.getElementById('btnClockTogglePause').addEventListener('click', () => {
    setGameSpeed(state.gameSpeed === 0 ? 1 : 0);
});

document.getElementById('btnToggleTheme').addEventListener('click', () => {
    state.nightMode = !state.nightMode;
    applyThemeColors();
});

document.getElementById('btnToggleSound').addEventListener('click', () => {
    sfx.enabled = !sfx.enabled;
    document.getElementById('iconSoundOn').classList.toggle('hidden', !sfx.enabled);
    document.getElementById('iconSoundOff').classList.toggle('hidden', sfx.enabled);
});

function updateMusicButtonUI() {
    const btn = document.getElementById('btnToggleMusic');
    const slash = document.getElementById('iconMusicSlash');
    const note = document.getElementById('iconMusicNote');
    if (bgMusicPlaying) {
        slash.classList.add('hidden');
        note.classList.add('text-amber-500');
        btn.classList.add('ring-2', 'ring-amber-500');
        btn.classList.remove('opacity-75');
    } else {
        slash.classList.remove('hidden');
        note.classList.remove('text-amber-500');
        btn.classList.remove('ring-2', 'ring-amber-500');
        btn.classList.add('opacity-75');
    }
}

document.getElementById('btnToggleMusic').addEventListener('click', () => {
    if (!bgMusicPlaying) {
        bgMusic.play().then(() => {
            bgMusicPlaying = true;
            updateMusicButtonUI();
            showFloatingText(state.cam.x, state.cam.y - 25, t('msg_music_on'), '#F59E0B');
        }).catch(() => {
            showFloatingText(state.cam.x, state.cam.y - 25, t('msg_music_err'), '#EF4444');
        });
    } else {
        bgMusic.pause();
        bgMusicPlaying = false;
        updateMusicButtonUI();
        showFloatingText(state.cam.x, state.cam.y - 25, t('msg_music_off'), '#6E7685');
    }
});

document.getElementById('btnToggleLang').addEventListener('click', () => {
    cycleLanguage();
});

let autoFullscreenPending = true;

function isFullscreenActive() {
    return Boolean(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
}

function updateFullscreenButtonUI() {
    const active = isFullscreenActive();
    const enterIcon = document.getElementById('iconFsEnter');
    const exitIcon = document.getElementById('iconFsExit');
    const btn = document.getElementById('btnToggleFullscreen');
    if (enterIcon) enterIcon.classList.toggle('hidden', active);
    if (exitIcon) exitIcon.classList.toggle('hidden', !active);
    if (btn) btn.classList.toggle('ring-2', active);
    if (btn) btn.classList.toggle('ring-amber-500', active);
}

function requestGameFullscreen() {
    const el = document.documentElement;
    try {
        if (el.requestFullscreen) {
            return el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
            return el.webkitRequestFullscreen();
        } else if (el.msRequestFullscreen) {
            return el.msRequestFullscreen();
        }
    } catch (e) {}
    return Promise.reject();
}

function exitGameFullscreen() {
    try {
        if (document.exitFullscreen) {
            return document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            return document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            return document.msExitFullscreen();
        }
    } catch (e) {}
    return Promise.resolve();
}

function toggleFullscreen() {
    autoFullscreenPending = false;
    if (isFullscreenActive()) {
        exitGameFullscreen();
    } else {
        requestGameFullscreen().catch(() => {});
    }
}

const btnFs = document.getElementById('btnToggleFullscreen');
if (btnFs) {
    btnFs.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFullscreen();
    });
}

['fullscreenchange', 'webkitfullscreenchange', 'msfullscreenchange'].forEach(evt => {
    document.addEventListener(evt, () => {
        updateFullscreenButtonUI();
        resizeCanvas();
    });
});

// Automatically enter Fullscreen on the very first user gesture if the browser blocked ungestured startup fullscreen
function handleFirstGestureFullscreen(e) {
    if (!autoFullscreenPending) return;
    if (e && e.target && e.target.closest && e.target.closest('#btnToggleFullscreen')) {
        autoFullscreenPending = false;
        return;
    }
    autoFullscreenPending = false;
    if (!isFullscreenActive()) {
        requestGameFullscreen().catch(() => {});
    }
}
window.addEventListener('pointerdown', handleFirstGestureFullscreen, { once: true, capture: true });
window.addEventListener('keydown', (e) => {
    if (e.key === 'f' || e.key === 'F') {
        if (document.activeElement && document.activeElement.tagName !== 'INPUT') {
            e.preventDefault();
            toggleFullscreen();
            return;
        }
    }
    if (autoFullscreenPending && e.key !== 'Escape' && e.key !== 'F11') {
        handleFirstGestureFullscreen(e);
    }
});

const btnStartGameMain = document.getElementById('btnStartGameMain');
if (btnStartGameMain) {
    btnStartGameMain.addEventListener('click', (e) => {
        e.stopPropagation();
        launchGameFromStartScreen(false);
    });
}

const btnCloseStartScreen = document.getElementById('btnCloseStartScreen');
if (btnCloseStartScreen) {
    btnCloseStartScreen.addEventListener('click', (e) => {
        e.stopPropagation();
        closeStartScreenAndResume();
    });
}

const introSplashEl = document.getElementById('introSplash');
if (introSplashEl) {
    introSplashEl.addEventListener('click', (e) => {
        // Clicking the backdrop outside the card dismisses the screen and resumes/starts the game
        if (e.target === introSplashEl) {
            closeStartScreenAndResume();
        }
    });
}

const startCitySearchInput = document.getElementById('startCitySearchInput');
if (startCitySearchInput) {
    startCitySearchInput.addEventListener('input', (e) => {
        renderStartScreenCities(e.target.value);
    });
}

document.getElementById('btnCloseCityModal').addEventListener('click', () => {
    document.getElementById('cityModal').classList.add('hidden');
});

document.getElementById('citySearchInput').addEventListener('input', (e) => {
    buildCityModalGrid(e.target.value);
});

document.getElementById('btnOpenHelp').addEventListener('click', (e) => {
    e.stopPropagation();
    if (isStartScreenOpen()) {
        closeStartScreenAndResume();
    } else {
        openStartScreen();
    }
});
document.getElementById('btnCloseHelp').addEventListener('click', () => {
    document.getElementById('helpModal').classList.add('hidden');
});
document.getElementById('btnStartFromHelp').addEventListener('click', () => {
    document.getElementById('helpModal').classList.add('hidden');
});

let lastFrameTime = performance.now();
function gameLoop(now) {
    const rawDt = Math.min(0.05, (now - lastFrameTime) / 1000);
    lastFrameTime = now;
    updateSimulation(rawDt);
    renderGame();
    requestAnimationFrame(gameLoop);
}

function populateDemoNetwork(cityIdx, nightMode, week, scoreVal) {
    initCity(cityIdx);
    state.nightMode = nightMode;
    state.weekCount = week;
    state.dayCount = (week - 1) * 7 + 4;
    state.timeOfDay = 14.5;
    state.score = scoreVal;
    state.tutorialCompleted = true;
    document.getElementById('uiHintBanner').classList.add('opacity-0');
    state.unlockedLines = Math.min(7, 2 + week);
    state.everUnlocked.car = true;
    state.everUnlocked.depot_S = true;
    state.everUnlocked.depot_L = true;
    state.everUnlocked.depot_XL = week >= 3;
    state.inventory = { depot_S: 2, depot_L: 1, depot_XL: 1, drone: 2, bike: 3, car: 2, bridges: 9 };

    const city = currentCity();
    const main0 = state.nodes[0];
    const hubLPos = findProgressiveLandSpot(city, main0.x, main0.y, 140, 220, 68, false);
    const hubL = createDepotNode('L', hubLPos.x, hubLPos.y);
    state.nodes.push(hubL);
    stationDroneAtNode(main0, true);
    stationDroneAtNode(hubL, true);

    const numExtra = week >= 4 ? 11 : 6;
    const types = ['S', 'L', 'S', 'XL', 'L', 'S', 'XL', 'S', 'L', 'S', 'XL'];
    for (let i = 0; i < numExtra; i++) {
        const p = findProgressiveLandSpot(city, main0.x, main0.y, 110 + i * 22, 230 + i * 24, 62, false);
        const c = createCustomerNode(types[i % types.length], p.x, p.y);
        state.nodes.push(c);
        spawnOrderForCustomer(c);
        if (i % 2 === 0) spawnOrderForCustomer(c);
        if (week >= 4 && i < 2) {
            for (let k = 0; k < 4; k++) spawnOrderForCustomer(c);
            c.overloadTimer = i === 0 ? 0.68 : 0.42;
        }
    }

    for (const n of state.nodes) n.scale = 1.0;

    // Connect 3–4 vibrant logistics lines across the city
    const custs = state.nodes.filter(n => n.kind === 'CUSTOMER');
    if (custs.length >= 6) {
        state.lines[0].nodeIds = [main0.id, custs[0].id, custs[1].id, hubL.id, custs[2].id];
        recalculateLineBridges(state.lines[0]);
        addVehicleToLine(state.lines[0], 'bike', true);
        addVehicleToLine(state.lines[0], 'car', true);
        state.lines[0].vehicles[0].progress = 0.45;
        state.lines[0].vehicles[1].segIndex = 2;
        state.lines[0].vehicles[1].progress = 0.6;

        state.lines[1].nodeIds = [main0.id, custs[3].id, custs[4].id, custs[5].id];
        recalculateLineBridges(state.lines[1]);
        addVehicleToLine(state.lines[1], 'car', true);
        addVehicleToLine(state.lines[1], 'bike', true);
        state.lines[1].vehicles[0].segIndex = 1;
        state.lines[1].vehicles[0].progress = 0.55;

        state.lines[2].nodeIds = [hubL.id, custs[1].id, custs[4].id, custs[custs.length - 1].id];
        recalculateLineBridges(state.lines[2]);
        addVehicleToLine(state.lines[2], 'bike', true);
        state.lines[2].vehicles[0].progress = 0.35;
    }
    if (custs.length >= 9 && state.unlockedLines >= 4) {
        state.lines[3].nodeIds = [main0.id, custs[6].id, custs[7].id, custs[8].id];
        recalculateLineBridges(state.lines[3]);
        addVehicleToLine(state.lines[3], 'car', true);
        state.lines[3].vehicles[0].segIndex = 1;
        state.lines[3].vehicles[0].progress = 0.5;
    }

    state.inventory.bridges = Math.max(2, state.inventory.bridges);
    document.getElementById('uiHintBanner').classList.add('opacity-0');
    applyThemeColors();
    updateAutoCamera(1.0, true);
    for (let step = 0; step < 25; step++) {
        updateLineVehicles(0.05);
        updateDrones(0.05);
    }
    updateClockUI();
    updateAllUI();
}

window.onload = function () {
    const params = new URLSearchParams(window.location.search);
    const initialLang = params.get('lang') || 'en';
    const scene = params.get('scene');
    try {
        const savedDiff = params.get('diff') || localStorage.getItem('miniDelivery_difficulty');
        if (savedDiff && DIFFICULTY_SPECS[savedDiff]) {
            state.difficulty = savedDiff;
        }
    } catch (e) {}

    resizeCanvas();
    initCity(0);
    setLanguage(initialLang); // English default as requested
    updateFullscreenButtonUI();

    if (!scene) {
        requestGameFullscreen().then(() => {
            autoFullscreenPending = false;
            updateFullscreenButtonUI();
        }).catch(() => {
            // Browser requires first user gesture; handleFirstGestureFullscreen will trigger on first click/tap
        });
    }

    const introEl = document.getElementById('introSplash');
    if (scene && scene !== 'intro') {
        if (introEl) {
            introEl.classList.add('intro-hide', 'hidden');
            introEl.style.display = 'none';
        }
        if (scene === 'day') {
            populateDemoNetwork(0, false, 2, 164);
            openNodeInspector(state.nodes[0]);
        } else if (scene === 'night') {
            populateDemoNetwork(25, true, 5, 528);
        } else if (scene === 'cities') {
            populateDemoNetwork(1, false, 2, 92);
            buildCityModalGrid('');
            document.getElementById('cityModal').classList.remove('hidden');
        } else if (scene === 'upgrade') {
            populateDemoNetwork(2, false, 3, 210);
            triggerWeeklyUpgradeModal();
        }
    } else if (introEl) {
        selectedStartCityIndex = state.cityIndex || 0;
        selectedStartDifficulty = state.difficulty || 'hard';
        renderStartScreenDifficulty();
        renderStartScreenCities('');
        setGameSpeed(0);
    }

    requestAnimationFrame(gameLoop);
};
