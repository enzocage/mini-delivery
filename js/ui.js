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
    if (!node || node.kind !== 'DEPOT') return;
    state.inspectedNodeId = node.id;
    const panel = document.getElementById('nodeInspector');
    panel.classList.remove('hidden');

    const spec = DEPOT_SPECS[node.depotType];
    const badge = document.getElementById('inspBadge');
    badge.textContent = node.depotType === 'MAIN' ? 'HQ' : node.depotType;
    badge.style.backgroundColor = spec.color;

    document.getElementById('inspTitle').textContent = getDepotLabel(node.depotType);
    document.getElementById('inspSubtitle').textContent = t('insp_packages', { cur: node.storage.length, max: node.capacity });

    const sCount = node.storage.filter(p => p.size === 'S').length;
    const lCount = node.storage.filter(p => p.size === 'L').length;
    const xlCount = node.storage.filter(p => p.size === 'XL').length;
    const droneCount = state.drones.filter(d => d.homeNodeId === node.id).length;

    document.getElementById('inspBody').innerHTML = `
        <div class="flex items-center justify-between py-1 border-b border-black/5 dark:border-white/5">
            <span class="opacity-65">${t('insp_stock')}</span>
            <span class="font-mono-num font-bold">S:${sCount} · L:${lCount} · XL:${xlCount}</span>
        </div>
        <div class="flex items-center justify-between py-1">
            <span class="opacity-65">${t('insp_drones')}</span>
            <span class="font-mono-num font-bold text-cyan-500">${droneCount}</span>
        </div>
    `;

    document.getElementById('btnInspRemoveNode').style.display = node.depotType === 'MAIN' ? 'none' : 'block';
}

document.getElementById('btnCloseInspector').addEventListener('click', () => {
    state.inspectedNodeId = null;
    document.getElementById('nodeInspector').classList.add('hidden');
});

document.getElementById('btnInspAddDrone').addEventListener('click', () => {
    const node = state.nodes.find(n => n.id === state.inspectedNodeId);
    if (node) {
        stationDroneAtNode(node, false);
        openNodeInspector(node);
    }
});

document.getElementById('btnInspRemoveNode').addEventListener('click', () => {
    const nodeIdx = state.nodes.findIndex(n => n.id === state.inspectedNodeId);
    if (nodeIdx === -1) return;
    const node = state.nodes[nodeIdx];
    if (node.depotType === 'MAIN') return;

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
    state.nodes.splice(nodeIdx, 1);
    state.inspectedNodeId = null;
    document.getElementById('nodeInspector').classList.add('hidden');
    sfx.playDisconnect();
    updateAllUI();
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

function triggerWeeklyUpgradeModal() {
    const prevSpeed = state.gameSpeed || 1;
    setGameSpeed(0);
    sfx.playWeeklyChord();
    updateAllUI();

    document.getElementById('upgradeWeekTitle').textContent = t('upg_week', { w: state.weekCount });
    document.getElementById('upgradeWeekSub').textContent = t('upg_sub');
    const container = document.getElementById('upgradeCardsContainer');
    container.innerHTML = '';

    const choices = getWeeklyUpgradeChoices();
    choices.forEach((pkg, idx) => {
        const card = document.createElement('button');
        card.style.animationDelay = `${idx * 90}ms`;
        card.className = 'dpc-pill upgrade-card-anim rounded-[32px] p-5 text-center flex flex-col items-center justify-between hover:scale-105 active:scale-95 cursor-pointer';
        card.innerHTML = `
            <div class="w-16 h-16 rounded-full flex items-center justify-center text-white font-extrabold text-sm shadow-lg mb-3" style="background:${pkg.badgeColor}">
                ${pkg.iconText}
            </div>
            <div class="text-[11px] font-extrabold uppercase tracking-wider opacity-55 mb-1">${pkg.title}</div>
            <h3 class="text-base font-extrabold leading-snug mb-2">${pkg.subtitle}</h3>
            <p class="text-xs opacity-70 leading-relaxed mb-4">${pkg.desc}</p>
            <div class="px-5 py-2 rounded-full text-xs font-extrabold text-white shadow" style="background:${pkg.badgeColor}">
                ${t('upg_select')}
            </div>
        `;
        card.addEventListener('click', () => {
            pkg.apply();
            document.getElementById('upgradeModal').classList.add('hidden');
            updateAllUI();
            setGameSpeed(prevSpeed);
        });
        container.appendChild(card);
    });

    document.getElementById('upgradeModal').classList.remove('hidden');
}

function triggerGameOver(overloadedNode) {
    setGameSpeed(0);
    const city = currentCity();
    saveCityRecord(city.id, state.score, state.starsEarned);

    document.getElementById('goTitle').textContent = t('go_title_city', { city: city.name });
    if (overloadedNode && overloadedNode.kind === 'DEPOT') {
        document.getElementById('goSubtitle').textContent = t('go_sub_depot', { depot: getDepotLabel(overloadedNode.depotType) });
    } else {
        document.getElementById('goSubtitle').textContent = t('go_sub_station', { type: overloadedNode ? overloadedNode.demandType : 'S' });
    }
    document.getElementById('goScore').textContent = state.score;
    document.getElementById('goDays').textContent = state.dayCount;
    document.getElementById('goDepots').textContent = state.nodes.filter(n => n.kind === 'DEPOT').length;
    document.getElementById('gameOverModal').classList.remove('hidden');
}

function triggerVictoryModal() {
    setGameSpeed(0);
    sfx.playWeeklyChord();
    const city = currentCity();
    const targets = getStarTargets();
    saveCityRecord(city.id, state.score, 3);

    const vicTitle = document.getElementById('vicTitle');
    const vicSubtitle = document.getElementById('vicSubtitle');
    if (vicTitle) vicTitle.textContent = t('vic_title_city', { city: city.name });
    if (vicSubtitle) vicSubtitle.textContent = t('vic_sub_city', { target: targets[2] });
    document.getElementById('vicScore').textContent = state.score;
    document.getElementById('vicDays').textContent = state.dayCount;
    document.getElementById('vicDepots').textContent = state.nodes.filter(n => n.kind === 'DEPOT').length;
    document.getElementById('victoryModal').classList.remove('hidden');
}

function buildDifficultyModalGrid() {
    const container = document.getElementById('difficultyCardsContainer');
    if (!container) return;
    container.innerHTML = '';

    const tiers = ['joke', 'easy', 'hard', 'hardcore', 'chuck'];
    const icons = {
        joke: '🤡',
        easy: '🌱',
        hard: '⚡',
        hardcore: '🔥',
        chuck: '🤠'
    };

    tiers.forEach((tierId, idx) => {
        const spec = DIFFICULTY_SPECS[tierId];
        const isCurrent = state.difficulty === tierId;
        const card = document.createElement('button');
        card.style.animationDelay = `${idx * 60}ms`;
        card.className = `dpc-pill upgrade-card-anim rounded-[28px] p-4 text-left flex flex-col justify-between hover:scale-[1.03] active:scale-95 transition-transform cursor-pointer ${isCurrent ? 'ring-2 ring-amber-500' : ''}`;

        const hqCap = Math.max(4, Math.round(DEPOT_SPECS.MAIN.cap * spec.depotCapMult));
        card.innerHTML = `
            <div>
                <div class="flex items-center justify-between gap-2 mb-2">
                    <span class="w-9 h-9 rounded-2xl flex items-center justify-center text-lg shadow-sm" style="background:${spec.color}22; color:${spec.color}">${icons[tierId]}</span>
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold text-white uppercase tracking-wider" style="background:${spec.color}">
                        ${t(`diff_${tierId}_short`)}
                    </span>
                </div>
                <h3 class="font-extrabold text-sm sm:text-base leading-tight mb-1">${t(`diff_${tierId}_name`)}</h3>
                <p class="text-[11px] opacity-70 leading-snug mb-3">${t(`diff_${tierId}_desc`)}</p>

                <div class="space-y-1.5 text-[10px] border-t border-black/10 dark:border-white/10 pt-2.5 mb-3">
                    <div class="flex justify-between">
                        <span class="opacity-60 font-bold">${t('diff_lbl_win')}</span>
                        <span class="font-mono-num font-extrabold text-amber-500">${spec.starTargets.join(' / ')}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="opacity-60 font-bold">${t('diff_lbl_overload')}</span>
                        <span class="font-mono-num font-extrabold text-rose-500">≥ ${spec.maxOrdersSL} (${spec.maxOrdersXL} XL)</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="opacity-60 font-bold">${t('diff_lbl_timer')}</span>
                        <span class="font-mono-num font-extrabold">${spec.overloadSpeedMult}×</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="opacity-60 font-bold">${t('diff_lbl_hq')}</span>
                        <span class="font-mono-num font-extrabold text-sky-500">${hqCap} Pkgs</span>
                    </div>
                </div>
            </div>
            <div class="w-full py-2 rounded-full text-center text-[11px] font-extrabold text-white shadow" style="background:${spec.color}">
                ${isCurrent ? '✓ ' + t('upg_select') : t('upg_select')}
            </div>
        `;

        card.addEventListener('click', () => {
            state.difficulty = tierId;
            try { localStorage.setItem('miniDelivery_difficulty', tierId); } catch (e) {}
            document.getElementById('difficultyModal').classList.add('hidden');
            initCity(state.cityIndex);
            showFloatingText(state.cam.x, state.cam.y - 24, `${icons[tierId]} ${t(`diff_${tierId}_name`)}`, spec.color);
        });
        container.appendChild(card);
    });
}

document.getElementById('btnOpenDifficulty').addEventListener('click', () => {
    setGameSpeed(0);
    buildDifficultyModalGrid();
    document.getElementById('difficultyModal').classList.remove('hidden');
});

document.getElementById('btnCloseDifficultyModal').addEventListener('click', () => {
    document.getElementById('difficultyModal').classList.add('hidden');
});

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

document.getElementById('btnOpenCityModal').addEventListener('click', () => {
    buildCityModalGrid(document.getElementById('citySearchInput').value);
    document.getElementById('cityModal').classList.remove('hidden');
});

document.getElementById('btnCloseCityModal').addEventListener('click', () => {
    document.getElementById('cityModal').classList.add('hidden');
});

document.getElementById('citySearchInput').addEventListener('input', (e) => {
    buildCityModalGrid(e.target.value);
});

document.getElementById('btnOpenHelp').addEventListener('click', () => {
    document.getElementById('helpModal').classList.remove('hidden');
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
        setGameSpeed(0);
        let introDismissed = false;
        const dismissIntro = () => {
            if (introDismissed) return;
            introDismissed = true;
            introEl.classList.add('intro-hide');
            setGameSpeed(1);
            setTimeout(() => {
                introEl.classList.add('hidden');
                introEl.style.display = 'none';
            }, 600);
        };
        introEl.addEventListener('click', dismissIntro);
        if (scene !== 'intro') {
            setTimeout(dismissIntro, 3000);
        }
    }

    requestAnimationFrame(gameLoop);
};
