/***************************************************************************
 * MULTILINGUAL LOCALIZATION ENGINE (EN Default, DE, FR, ES, ZH)
 ***************************************************************************/
const SUPPORTED_LANGS = [
    { code: 'en', label: 'EN', name: 'English' },
    { code: 'de', label: 'DE', name: 'Deutsch' },
    { code: 'fr', label: 'FR', name: 'Français' },
    { code: 'es', label: 'ES', name: 'Español' },
    { code: 'zh', label: '中文', name: '中文' }
];

const I18N = {
    en: {
        // Intro & General
        intro_subtitle: 'Urban Logistics & Transit Network',
        credits_prefix: 'coding & music:',
        days: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],

        // Tooltips
        tip_theme: 'Day / Night Mode',
        tip_sound: 'Synthesizer SFX On/Off',
        tip_music: 'Optional Background Music On/Off (Enzo Cage – Bright)',
        tip_lang: 'Switch Language (EN / DE / FR / ES / 中文)',
        tip_help: 'Logistics Guide & Credits',
        tip_score: 'Delivered Packages',
        tip_clock: 'Click to Pause / Resume (Spacebar)',
        tip_pause: 'Pause (Spacebar)',
        tip_speed1: 'Normal (1×)',
        tip_speed2: 'Fast (2×)',
        tip_speed3: 'Turbo (3×)',
        tip_clear_line: 'Clear selected line (vehicles return to inventory)',
        tip_bike: 'Cyberbike (2×S or 1×L): Drag onto a line or click!',
        tip_car: 'Cybercar (1×XL, 2×L or 4×S): Drag onto a line or click!',
        tip_drone: 'Cargo Drone (Direct air 1×S): Drag onto a depot or hub!',
        tip_depot_s: 'S Micro-Hub (Stores 8× S packages): Drag onto open land!',
        tip_depot_l: 'L Regional Hub (Stores 16× S/L packages): Drag onto open land!',
        tip_depot_xl: 'XL Mega-Hub (Stores 30× S/L/XL packages): Drag onto open land!',
        tip_bridges: 'Bridges: Automatically used when a line crosses rivers or bays.',

        // Depots, Vehicles & Lines
        depot_main: 'Main Depot',
        depot_s: 'S Micro-Hub',
        depot_l: 'L Regional Hub',
        depot_xl: 'XL Mega-Hub',
        veh_drone: 'Cargo Drone',
        veh_bike: 'Cyberbike',
        veh_car: 'Cybercar',
        line_names: ['Amber Line', 'Cobalt Line', 'Coral Line', 'Emerald Line', 'Amethyst Line', 'Cyan Line', 'Magenta Line'],
        vehicles_count: '{n} vehicles',

        // Hints
        hint_initial: 'Drag a line from the Main Depot (HQ) to the customer stations',
        hint_depot_s: 'Drag or click on dry land to build an S Micro-Hub (8× S)',
        hint_depot_l: 'Drag or click on dry land to build an L Regional Hub (16× S/L)',
        hint_depot_xl: 'Drag or click on dry land to build an XL Mega-Hub (30× S/L/XL)',
        hint_drone: 'Click on any Depot (HQ / S / L / XL) to station the Cargo Drone',
        hint_bike: 'Click on a colored logistics line to deploy the fast Cyberbike',
        hint_car: 'Click on a colored logistics line to deploy the heavy-duty Cybercar',

        // Inspector
        insp_packages: '{cur} / {max} Packages',
        insp_stock: 'Stored Cargo:',
        insp_drones: 'Cargo Drones:',
        insp_add_drone: '+ Drone',
        insp_remove: 'Dismantle',

        // Cities Modal
        cities_badge: '30 Metropolises',
        cities_title: 'Choose Your City',
        cities_search: 'Search city or river...',

        // Weekly Upgrades
        upg_week: 'Week {w}',
        upg_title: 'New Resources',
        upg_sub: 'Choose one tactical logistics bundle for the upcoming week',
        upg_select: 'Select',
        upg_new_line_title: 'New Line & Express',
        upg_new_line_sub: '+1 {line}, +1 Cyberbike & +1 Bridge',
        upg_new_line_desc: 'Open an independent transit corridor across the city including river crossing.',
        upg_express_title: 'Express Fleet',
        upg_express_sub: '+2 Cyberbikes & +1 Bridge',
        upg_express_desc: 'Increase frequency on your existing corridors plus an extra river crossing.',
        upg_heavy_title: 'Heavy Cargo Fleet',
        upg_heavy_sub_early: '+1 Cybercar & +1 L-Hub',
        upg_heavy_sub_late: '+1 Cybercar, +1 XL Mega-Hub & +1 Bridge',
        upg_heavy_desc: 'Transports XL heavy cargo (1×), L packages (2×), or 4× S packages.',
        upg_air_title: 'Air Bridge & Engineering',
        upg_air_sub: '+1 Cargo Drone, +1 S-Hub & +2 Bridges',
        upg_air_desc: 'Flies S packages directly across rivers and expands your bridge reserve.',

        // Game Over & Victory Modals
        go_title_city: 'Network Overloaded in {city}',
        go_sub_station: 'A {type}-Station overloaded (4+ waiting orders without relief).',
        go_sub_depot: '{depot} suffered complete storage gridlock!',
        go_delivered: 'Delivered',
        go_days: 'Days',
        go_hubs: 'Hubs',
        go_endless: 'Continue in Endless Mode',
        go_restart: 'Restart City',
        vic_title_city: '{city} Mastered!',
        vic_sub_city: '★★★ Gold Target ({target} Deliveries) achieved without network collapse!',
        vic_next_city: 'Next Metropolis →',
        vic_overtime: 'Keep Playing (Highscore)',

        // Help Modal
        help_badge: 'Dinosaur Polo Club Style',
        help_title: 'Mini Delivery — Quick Guide',
        help_s_title: 'Package S (Circle)',
        help_s_desc: 'Light parcel. Flown across water by <strong>Cargo Drones (1×)</strong> or carried on lines by <strong>Cyberbikes (2×)</strong> & <strong>Cybercars (4×)</strong>.',
        help_l_title: 'Package L (Square)',
        help_l_desc: 'Appears mid-Week 1. Too heavy for drones! Requires a line with a <strong>Cyberbike (1×)</strong> or <strong>Cybercar (2×)</strong>.',
        help_xl_title: 'Package XL (Diamond)',
        help_xl_desc: 'Heavy freight from Week 2! Can <strong>only be carried by a Cybercar (1×)</strong> along ground lines.',
        help_b1: '• <strong>Draw Lines & Connector Plugs:</strong> Drag from station to station. Grab the <strong>T-terminals</strong> or the <strong>connector plugs on any station</strong> to unplug and re-dock lines elsewhere.',
        help_b2: '• <strong>Dock Drag & Drop:</strong> Drag <strong>Bikes, Cars, Drones, and S/L/XL Hubs</strong> directly from the bottom dock onto lines, depots, or the map!',
        help_b3: '• <strong>Auto-Zoom & Invisible Touch Controls:</strong> The camera frames your city automatically. On touchscreens, use <strong>Pinch-to-Zoom</strong>, <strong>1-Finger Map Pan</strong>, <strong>Double-Tap</strong> to re-center, or a <strong>2-Finger Tap</strong> to toggle Pause.',
        help_continue: 'Resume Game',

        // Floating Messages
        msg_no_drone: 'No Cargo Drone available',
        msg_draw_line_first: 'Draw a line first!',
        msg_no_veh: 'No {veh} available',
        msg_new_main_depot: 'New Main Depot opened!',
        msg_new_bank_bridge: 'New river bank reached: +1 Bridge!',
        msg_xl_spawn_car: 'XL Freight appeared: +1 Cybercar unlocked!',
        msg_no_bridge_drone: 'No Bridge left (Use Drones!)',
        msg_car_assigned_xl: 'Cybercar assigned for XL Station!',
        msg_land_only: 'Build on dry land only',
        msg_too_close: 'Too close to station',
        msg_drag_to_depot: 'Drag onto a Depot (HQ / S / L / XL)!',
        msg_drag_to_line: 'Drag onto an active line!',
        msg_no_bridge: 'No Bridge available!',
        msg_no_bridge_direct: 'No Bridge for direct link!',
        msg_music_on: '♪ Music On: Enzo Cage – Bright',
        msg_music_off: '♪ Background Music Paused',
        msg_music_err: 'Could not load audio stream',
        msg_camera_reset: 'Auto-Camera Centered',
        msg_paused: '⏸ Paused',
        msg_resumed: '▶ Resumed',
        msg_star_1: '★☆☆ Bronze Milestone (100)!',
        msg_star_2: '★★☆ Silver Milestone (220)!'
    },

    de: {
        intro_subtitle: 'Urbane Logistik & Liniennetz',
        credits_prefix: 'coding & music:',
        days: ['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO'],

        tip_theme: 'Tag / Nacht Modus',
        tip_sound: 'Soundeffekte (Synthesizer) An/Aus',
        tip_music: 'Hintergrundmusik optional An/Aus (Enzo Cage – Bright)',
        tip_lang: 'Sprache wechseln (EN / DE / FR / ES / 中文)',
        tip_help: 'Logistik-Guide & Credits',
        tip_score: 'Ausgelieferte Pakete',
        tip_clock: 'Klicken für Pause / Weiter (Leertaste)',
        tip_pause: 'Pause (Leertaste)',
        tip_speed1: 'Normal (1×)',
        tip_speed2: 'Schnell (2×)',
        tip_speed3: 'Turbo (3×)',
        tip_clear_line: 'Ausgewählte Linie abbauen (Fahrzeuge kehren ins Inventar zurück)',
        tip_bike: 'Cyberbike (2×S oder 1×L): Auf eine Linie ziehen oder klicken!',
        tip_car: 'Cybercar (1×XL, 2×L oder 4×S): Auf eine Linie ziehen oder klicken!',
        tip_drone: 'Flugdrohne (Luftlinie 1×S): Auf ein Depot oder Zwischenlager ziehen!',
        tip_depot_s: 'S-Zwischenlager (Mikro-Hub für 8× S-Pakete): Auf freies Festland ziehen!',
        tip_depot_l: 'L-Zwischenlager (Regional-Hub für 16× S/L-Pakete): Auf freies Festland ziehen!',
        tip_depot_xl: 'XL-Mega-Hub (Speichert 30× S/L/XL-Pakete): Auf freies Festland ziehen!',
        tip_bridges: 'Brücken: Werden automatisch verbraucht, wenn eine Linie Flüsse überquert.',

        depot_main: 'Hauptdepot',
        depot_s: 'S-Zwischenlager',
        depot_l: 'L-Zwischenlager',
        depot_xl: 'XL-Mega-Hub',
        veh_drone: 'Flugdrohne',
        veh_bike: 'Cyberbike',
        veh_car: 'Cybercar',
        line_names: ['Gelb-Linie', 'Kobalt-Linie', 'Korall-Linie', 'Smaragd-Linie', 'Amethyst-Linie', 'Cyan-Linie', 'Magenta-Linie'],
        vehicles_count: '{n} Fahrzeuge',

        hint_initial: 'Ziehe eine Linie vom Hauptdepot (HQ) zu den Kundenstationen',
        hint_depot_s: 'Ziehe oder klicke auf Festland für ein S-Zwischenlager (8× S)',
        hint_depot_l: 'Ziehe oder klicke auf Festland für ein L-Zwischenlager (16× S/L)',
        hint_depot_xl: 'Ziehe oder klicke auf Festland für einen XL-Mega-Hub (30× S/L/XL)',
        hint_drone: 'Klicke auf ein Depot (HQ / S / L / XL), um die Flugdrohne zu stationieren',
        hint_bike: 'Klicke auf eine farbige Linie, um das schnelle Cyberbike zuzuweisen',
        hint_car: 'Klicke auf eine farbige Linie, um das Schwerlast-Cybercar zuzuweisen',

        insp_packages: '{cur} / {max} Pakete',
        insp_stock: 'Lagerbestand:',
        insp_drones: 'Flugdrohnen:',
        insp_add_drone: '+ Drohne',
        insp_remove: 'Abbauen',

        cities_badge: '30 Metropolen',
        cities_title: 'Wähle deine Stadt',
        cities_search: 'Stadt oder Fluss suchen...',

        upg_week: 'Woche {w}',
        upg_title: 'Neue Ressourcen',
        upg_sub: 'Wähle ein strategisches Logistik-Paket für die kommende Woche',
        upg_select: 'Auswählen',
        upg_new_line_title: 'Neue Linie & Express',
        upg_new_line_sub: '+1 {line}, +1 Cyberbike & +1 Brücke',
        upg_new_line_desc: 'Erschließe einen neuen unabhängigen Stadtkorridor inklusive Flussquerung.',
        upg_express_title: 'Express-Flotte',
        upg_express_sub: '+2 Cyberbikes & +1 Brücke',
        upg_express_desc: 'Erhöhe die Taktfrequenz auf bestehenden Linien plus eine Flussquerung.',
        upg_heavy_title: 'Schwerlast-Flotte',
        upg_heavy_sub_early: '+1 Cybercar & +1 L-Hub',
        upg_heavy_sub_late: '+1 Cybercar, +1 XL-Mega-Hub & +1 Brücke',
        upg_heavy_desc: 'Transportiert XL-Schwerlastpakete (1×), L-Pakete (2×) oder 4× S-Pakete.',
        upg_air_title: 'Luftbrücke & Brückenbau',
        upg_air_sub: '+1 Flugdrohne, +1 S-Lager & +2 Brücken',
        upg_air_desc: 'Fliegt S-Pakete direkt über Flüsse und erweitert deine Brücken-Reserve.',

        go_title_city: 'Netz überlastet in {city}',
        go_sub_station: 'Eine {type}-Station ist kollabiert (4+ wartende Aufträge ohne Entlastung).',
        go_sub_depot: '{depot} ist durch Rückstau komplett übergelaufen!',
        go_delivered: 'Geliefert',
        go_days: 'Tage',
        go_hubs: 'Hubs',
        go_endless: 'Endlos-Modus weiterspielen',
        go_restart: 'Neustart',
        vic_title_city: '{city} gemeistert!',
        vic_sub_city: '★★★ Gold-Meilenstein ({target} Lieferungen) ohne Netzkollaps erreicht!',
        vic_next_city: 'Nächste Metropole →',
        vic_overtime: 'Weiterspielen (Highscore)',

        help_badge: 'Dinosaur Polo Club Stil',
        help_title: 'Mini Delivery — Kurzguide',
        help_s_title: 'Paket S (Kreis)',
        help_s_desc: 'Leichtpaket. Wird von <strong>Flugdrohnen (1×)</strong> über Wasser geflogen oder von <strong>Cyberbikes (2×)</strong> & <strong>Cybercars (4×)</strong> auf Linien gefahren.',
        help_l_title: 'Paket L (Quadrat)',
        help_l_desc: 'Erscheint ab Mitte Woche 1. Zu schwer für Drohnen! Braucht eine Linie mit <strong>Cyberbike (1×)</strong> oder <strong>Cybercar (2×)</strong>.',
        help_xl_title: 'Paket XL (Raute)',
        help_xl_desc: 'Schwerlast ab Woche 2! Kann <strong>nur vom Cybercar (1×)</strong> über Linien transportiert werden.',
        help_b1: '• <strong>Linien ziehen & Verbindungsstellen:</strong> Ziehe direkt von Station zu Station. Greife die <strong>T-Endstücke</strong> oder die <strong>Verbindungsstellen an einer Station</strong>, um Linien abzukoppeln und woanders neu anzudocken.',
        help_b2: '• <strong>Drag & Drop aus dem Dock:</strong> Ziehe <strong>Bikes, Cars, Drohnen und S/L/XL-Zwischenlager</strong> direkt aus der unteren Leiste auf Linien, Depots oder die Karte!',
        help_b3: '• <strong>Auto-Zoom & Unsichtbare Touch-Gesten:</strong> Die Kamera zoomt automatisch mit. Auf Touchscreens: <strong>Pinch-to-Zoom</strong>, <strong>1-Finger-Schwenk</strong>, <strong>Doppeltipp</strong> zum Zentrieren und <strong>2-Finger-Tipp</strong> für Pause.',
        help_continue: 'Weiterspielen',

        msg_no_drone: 'Keine Drohne verfügbar',
        msg_draw_line_first: 'Zuerst eine Linie ziehen!',
        msg_no_veh: 'Kein {veh} verfügbar',
        msg_new_main_depot: 'Neues Hauptdepot eröffnet!',
        msg_new_bank_bridge: 'Neues Ufer erschlossen: +1 Brücke!',
        msg_xl_spawn_car: 'XL-Schwerlast erschienen: +1 Cybercar freigeschaltet!',
        msg_no_bridge_drone: 'Keine Brücke übrig (Drohne nutzen!)',
        msg_car_assigned_xl: 'Cybercar für XL-Station zugewiesen!',
        msg_land_only: 'Nur auf Festland baubar',
        msg_too_close: 'Zu nah an Station',
        msg_drag_to_depot: 'Auf ein Depot (HQ / S / L / XL) ziehen!',
        msg_drag_to_line: 'Auf eine aktive Linie ziehen!',
        msg_no_bridge: 'Keine Brücke verfügbar!',
        msg_no_bridge_direct: 'Keine Brücke für Direktverbindung!',
        msg_music_on: '♪ Musik an: Enzo Cage – Bright',
        msg_music_off: '♪ Hintergrundmusik pausiert',
        msg_music_err: 'Musik konnte nicht geladen werden',
        msg_camera_reset: 'Auto-Kamera zentriert',
        msg_paused: '⏸ Pausiert',
        msg_resumed: '▶ Weiter',
        msg_star_1: '★☆☆ Bronze-Meilenstein (100)!',
        msg_star_2: '★★☆ Silber-Meilenstein (220)!'
    },

    fr: {
        intro_subtitle: 'Logistique Urbaine & Réseau',
        credits_prefix: 'code & musique :',
        days: ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'],

        tip_theme: 'Mode Jour / Nuit',
        tip_sound: 'Effets Sonores (Synthé) Marche/Arrêt',
        tip_music: 'Musique de fond optionnelle (Enzo Cage – Bright)',
        tip_lang: 'Changer de langue (EN / DE / FR / ES / 中文)',
        tip_help: 'Guide Logistique & Crédits',
        tip_score: 'Colis Livrés',
        tip_clock: 'Cliquer pour Pause / Reprendre (Espace)',
        tip_pause: 'Pause (Espace)',
        tip_speed1: 'Normal (1×)',
        tip_speed2: 'Rapide (2×)',
        tip_speed3: 'Turbo (3×)',
        tip_clear_line: 'Supprimer la ligne sélectionnée (les véhicules reviennent)',
        tip_bike: 'Cyberbike (2×S ou 1×L) : Glisser sur une ligne ou cliquer !',
        tip_car: 'Cybercar (1×XL, 2×L ou 4×S) : Glisser sur une ligne ou cliquer !',
        tip_drone: 'Drone Cargo (Vol direct 1×S) : Glisser sur un dépôt ou hub !',
        tip_depot_s: 'Micro-Hub S (Stocke 8× colis S) : Glisser sur la terre ferme !',
        tip_depot_l: 'Hub Régional L (Stocke 16× colis S/L) : Glisser sur la terre ferme !',
        tip_depot_xl: 'Méga-Hub XL (Stocke 30× colis S/L/XL) : Glisser sur la terre ferme !',
        tip_bridges: 'Ponts : Utilisés automatiquement lorsqu’une ligne traverse une rivière.',

        depot_main: 'Dépôt Principal',
        depot_s: 'Micro-Hub S',
        depot_l: 'Hub Régional L',
        depot_xl: 'Méga-Hub XL',
        veh_drone: 'Drone Cargo',
        veh_bike: 'Cyberbike',
        veh_car: 'Cybercar',
        line_names: ['Ligne Ambre', 'Ligne Cobalt', 'Ligne Corail', 'Ligne Émeraude', 'Ligne Améthyste', 'Ligne Cyan', 'Ligne Magenta'],
        vehicles_count: '{n} véhicules',

        hint_initial: 'Tracez une ligne du Dépôt Principal (HQ) vers les stations clients',
        hint_depot_s: 'Glissez ou cliquez sur la terre ferme pour placer un Micro-Hub S (8× S)',
        hint_depot_l: 'Glissez ou cliquez sur la terre ferme pour placer un Hub Régional L (16× S/L)',
        hint_depot_xl: 'Glissez ou cliquez sur la terre ferme pour placer un Méga-Hub XL (30× S/L/XL)',
        hint_drone: 'Cliquez sur un Dépôt (HQ / S / L / XL) pour y affecter le Drone Cargo',
        hint_bike: 'Cliquez sur une ligne colorée pour y affecter le Cyberbike rapide',
        hint_car: 'Cliquez sur une ligne colorée pour y affecter le Cybercar lourd',

        insp_packages: '{cur} / {max} Colis',
        insp_stock: 'Stock actuel :',
        insp_drones: 'Drones Cargo :',
        insp_add_drone: '+ Drone',
        insp_remove: 'Démonter',

        cities_badge: '30 Métropoles',
        cities_title: 'Choisissez Votre Ville',
        cities_search: 'Rechercher une ville ou un fleuve...',

        upg_week: 'Semaine {w}',
        upg_title: 'Nouvelles Ressources',
        upg_sub: 'Choisissez un pack logistique stratégique pour la semaine à venir',
        upg_select: 'Choisir',
        upg_new_line_title: 'Nouvelle Ligne & Express',
        upg_new_line_sub: '+1 {line}, +1 Cyberbike & +1 Pont',
        upg_new_line_desc: 'Ouvrez un nouveau corridor indépendant avec franchissement de rivière.',
        upg_express_title: 'Flotte Express',
        upg_express_sub: '+2 Cyberbikes & +1 Pont',
        upg_express_desc: 'Augmentez la fréquence sur vos lignes existantes et obtenez un pont.',
        upg_heavy_title: 'Flotte Poids Lourd',
        upg_heavy_sub_early: '+1 Cybercar & +1 Hub L',
        upg_heavy_sub_late: '+1 Cybercar, +1 Méga-Hub XL & +1 Pont',
        upg_heavy_desc: 'Transporte les colis lourds XL (1×), colis L (2×) ou 4× colis S.',
        upg_air_title: 'Pont Aérien & Génie',
        upg_air_sub: '+1 Drone Cargo, +1 Hub S & +2 Ponts',
        upg_air_desc: 'Survole les rivières avec les colis S et augmente votre réserve de ponts.',

        go_title_city: 'Réseau Saturé à {city}',
        go_sub_station: 'Une station {type} a saturé (4+ commandes en attente sans relève).',
        go_sub_depot: '{depot} a subi un engorgement total de son stock !',
        go_delivered: 'Livrés',
        go_days: 'Jours',
        go_hubs: 'Hubs',
        go_endless: 'Continuer en Mode Infini',
        go_restart: 'Recommencer',
        vic_title_city: '{city} Maîtrisée !',
        vic_sub_city: '★★★ Objectif Or ({target} livraisons) atteint sans effondrement du réseau !',
        vic_next_city: 'Métropole Suivante →',
        vic_overtime: 'Continuer (Highscore)',

        help_badge: 'Style Dinosaur Polo Club',
        help_title: 'Mini Delivery — Guide Rapide',
        help_s_title: 'Colis S (Cercle)',
        help_s_desc: 'Colis léger. Transporté par <strong>Drones Cargo (1×)</strong> au-dessus de l’eau ou par <strong>Cyberbikes (2×)</strong> & <strong>Cybercars (4×)</strong>.',
        help_l_title: 'Colis L (Carré)',
        help_l_desc: 'Apparaît en Semaine 1. Trop lourd pour les drones ! Nécessite une ligne avec <strong>Cyberbike (1×)</strong> ou <strong>Cybercar (2×)</strong>.',
        help_xl_title: 'Colis XL (Losange)',
        help_xl_desc: 'Fret lourd dès la Semaine 2 ! Transportable <strong>uniquement par Cybercar (1×)</strong> sur une ligne.',
        help_b1: '• <strong>Tracer & Débrancher les Lignes :</strong> Glissez de station en station. Saisissez les <strong>terminaux en T</strong> ou les <strong>connecteurs sur une station</strong> pour débrancher et reconnecter une ligne ailleurs.',
        help_b2: '• <strong>Glisser-Déposer :</strong> Glissez <strong>Bikes, Cars, Drones et Hubs S/L/XL</strong> directement depuis la barre inférieure sur vos lignes ou la carte !',
        help_b3: '• <strong>Zoom Auto & Gestes Tactiles Invisibles :</strong> La caméra dézoome automatiquement. Sur écran tactile : <strong>Pincer pour zoomer</strong>, <strong>Glisser à 1 doigt</strong>, <strong>Double-tap</strong> pour recentrer et <strong>Tap à 2 doigts</strong> pour Pause.',
        help_continue: 'Jouer',

        msg_no_drone: 'Aucun Drone disponible',
        msg_draw_line_first: 'Tracez d’abord une ligne !',
        msg_no_veh: 'Aucun {veh} disponible',
        msg_new_main_depot: 'Nouveau Dépôt Principal ouvert !',
        msg_new_bank_bridge: 'Nouvelle rive atteinte : +1 Pont !',
        msg_xl_spawn_car: 'Fret XL apparu : +1 Cybercar débloqué !',
        msg_no_bridge_drone: 'Plus de pont (Utilisez un Drone !)',
        msg_car_assigned_xl: 'Cybercar affecté pour la station XL !',
        msg_land_only: 'Constructible sur terre uniquement',
        msg_too_close: 'Trop proche d’une station',
        msg_drag_to_depot: 'Glissez sur un Dépôt (HQ / S / L / XL) !',
        msg_drag_to_line: 'Glissez sur une ligne active !',
        msg_no_bridge: 'Aucun pont disponible !',
        msg_no_bridge_direct: 'Aucun pont pour liaison directe !',
        msg_music_on: '♪ Musique activée : Enzo Cage – Bright',
        msg_music_off: '♪ Musique en pause',
        msg_music_err: 'Impossible de charger la musique',
        msg_camera_reset: 'Caméra auto recentrée',
        msg_paused: '⏸ Pause',
        msg_resumed: '▶ Reprise',
        msg_star_1: '★☆☆ Palier Bronze (100) !',
        msg_star_2: '★★☆ Palier Argent (220) !'
    },

    es: {
        intro_subtitle: 'Logística Urbana y Red de Líneas',
        credits_prefix: 'código y música:',
        days: ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'],

        tip_theme: 'Modo Día / Noche',
        tip_sound: 'Efectos de Sonido (Sintetizador) Sí/No',
        tip_music: 'Música de fondo opcional Sí/No (Enzo Cage – Bright)',
        tip_lang: 'Cambiar idioma (EN / DE / FR / ES / 中文)',
        tip_help: 'Guía Logística y Créditos',
        tip_score: 'Paquetes Entregados',
        tip_clock: 'Clic para Pausar / Reanudar (Espacio)',
        tip_pause: 'Pausa (Espacio)',
        tip_speed1: 'Normal (1×)',
        tip_speed2: 'Rápido (2×)',
        tip_speed3: 'Turbo (3×)',
        tip_clear_line: 'Desmantelar línea seleccionada (los vehículos vuelven al inventario)',
        tip_bike: 'Cyberbike (2×S o 1×L): ¡Arrastra a una línea o haz clic!',
        tip_car: 'Cybercar (1×XL, 2×L o 4×S): ¡Arrastra a una línea o haz clic!',
        tip_drone: 'Dron de Carga (Vuelo directo 1×S): ¡Arrastra a un depósito o hub!',
        tip_depot_s: 'Micro-Hub S (Almacena 8× paquetes S): ¡Arrastra a tierra firme!',
        tip_depot_l: 'Hub Regional L (Almacena 16× paquetes S/L): ¡Arrastra a tierra firme!',
        tip_depot_xl: 'Mega-Hub XL (Almacena 30× paquetes S/L/XL): ¡Arrastra a tierra firme!',
        tip_bridges: 'Puentes: Se usan automáticamente cuando una línea cruza ríos o bahías.',

        depot_main: 'Depósito Central',
        depot_s: 'Micro-Hub S',
        depot_l: 'Hub Regional L',
        depot_xl: 'Mega-Hub XL',
        veh_drone: 'Dron de Carga',
        veh_bike: 'Cyberbike',
        veh_car: 'Cybercar',
        line_names: ['Línea Ámbar', 'Línea Cobalto', 'Línea Coral', 'Línea Esmeralda', 'Línea Amatista', 'Línea Cian', 'Línea Magenta'],
        vehicles_count: '{n} vehículos',

        hint_initial: 'Arrastra una línea desde el Depósito Central (HQ) hasta las estaciones',
        hint_depot_s: 'Arrastra o haz clic en tierra firme para crear un Micro-Hub S (8× S)',
        hint_depot_l: 'Arrastra o haz clic en tierra firme para crear un Hub Regional L (16× S/L)',
        hint_depot_xl: 'Arrastra o haz clic en tierra firme para crear un Mega-Hub XL (30× S/L/XL)',
        hint_drone: 'Haz clic en un Depósito (HQ / S / L / XL) para estacionar el Dron',
        hint_bike: 'Haz clic en una línea de color para asignar la rápida Cyberbike',
        hint_car: 'Haz clic en una línea de color para asignar el Cybercar pesado',

        insp_packages: '{cur} / {max} Paquetes',
        insp_stock: 'Inventario:',
        insp_drones: 'Drones de Carga:',
        insp_add_drone: '+ Dron',
        insp_remove: 'Desmontar',

        cities_badge: '30 Metrópolis',
        cities_title: 'Elige Tu Ciudad',
        cities_search: 'Buscar ciudad o río...',

        upg_week: 'Semana {w}',
        upg_title: 'Nuevos Recursos',
        upg_sub: 'Elige un paquete logístico estratégico para la próxima semana',
        upg_select: 'Elegir',
        upg_new_line_title: 'Nueva Línea y Exprés',
        upg_new_line_sub: '+1 {line}, +1 Cyberbike y +1 Puente',
        upg_new_line_desc: 'Abre un nuevo corredor independiente en la ciudad incluyendo cruce de río.',
        upg_express_title: 'Flota Exprés',
        upg_express_sub: '+2 Cyberbikes y +1 Puente',
        upg_express_desc: 'Aumenta la frecuencia en tus líneas actuales más un cruce de río.',
        upg_heavy_title: 'Flota de Carga Pesada',
        upg_heavy_sub_early: '+1 Cybercar y +1 Hub L',
        upg_heavy_sub_late: '+1 Cybercar, +1 Mega-Hub XL y +1 Puente',
        upg_heavy_desc: 'Transporta carga pesada XL (1×), paquetes L (2×) o 4× paquetes S.',
        upg_air_title: 'Puente Aéreo e Ingeniería',
        upg_air_sub: '+1 Dron, +1 Hub S y +2 Puentes',
        upg_air_desc: 'Vuela paquetes S directamente sobre ríos y amplía tu reserva de puentes.',

        go_title_city: 'Red Sobrecargada en {city}',
        go_sub_station: 'Una estación {type} colapsó (4+ pedidos en espera sin alivio).',
        go_sub_depot: '¡{depot} sufrió un bloqueo total de almacenamiento!',
        go_delivered: 'Entregados',
        go_days: 'Días',
        go_hubs: 'Hubs',
        go_endless: 'Seguir en Modo Infinito',
        go_restart: 'Reiniciar',
        vic_title_city: '¡{city} Dominada!',
        vic_sub_city: '¡★★★ Meta de Oro ({target} entregas) alcanzada sin colapso de red!',
        vic_next_city: 'Siguiente Metrópolis →',
        vic_overtime: 'Seguir Jugando (Récord)',

        help_badge: 'Estilo Dinosaur Polo Club',
        help_title: 'Mini Delivery — Guía Rápida',
        help_s_title: 'Paquete S (Círculo)',
        help_s_desc: 'Paquete ligero. Volado sobre el agua por <strong>Drones (1×)</strong> o llevado en líneas por <strong>Cyberbikes (2×)</strong> y <strong>Cybercars (4×)</strong>.',
        help_l_title: 'Paquete L (Cuadrado)',
        help_l_desc: 'Aparece a mitad de la Semana 1. ¡Demasiado pesado para drones! Requiere línea con <strong>Cyberbike (1×)</strong> o <strong>Cybercar (2×)</strong>.',
        help_xl_title: 'Paquete XL (Rombo)',
        help_xl_desc: '¡Carga pesada desde la Semana 2! Solo puede transportarse en <strong>Cybercar (1×)</strong> por líneas.',
        help_b1: '• <strong>Trazar y Reconectar Líneas:</strong> Arrastra de estación a estación. Sujeta los <strong>terminales en T</strong> o los <strong>conectores de cada estación</strong> para desconectar y acoplar líneas en otro lugar.',
        help_b2: '• <strong>Arrastrar y Soltar:</strong> ¡Arrastra <strong>Bikes, Cars, Drones y Hubs S/L/XL</strong> directamente desde la barra inferior hacia las líneas o el mapa!',
        help_b3: '• <strong>Zoom Auto y Gestos Táctiles Invisibles:</strong> La cámara se ajusta sola. En pantallas táctiles: <strong>Pellizcar para zoom</strong>, <strong>Deslizar con 1 dedo</strong>, <strong>Doble toque</strong> para centrar y <strong>Toque con 2 dedos</strong> para Pausa.',
        help_continue: 'Continuar',

        msg_no_drone: 'No hay Dron disponible',
        msg_draw_line_first: '¡Primero traza una línea!',
        msg_no_veh: 'No hay {veh} disponible',
        msg_new_main_depot: '¡Nuevo Depósito Central abierto!',
        msg_new_bank_bridge: 'Nueva orilla alcanzada: ¡+1 Puente!',
        msg_xl_spawn_car: 'Carga XL aparecida: ¡+1 Cybercar desbloqueado!',
        msg_no_bridge_drone: 'Sin puentes (¡Usa Drones!)',
        msg_car_assigned_xl: '¡Cybercar asignado a estación XL!',
        msg_land_only: 'Solo construible en tierra firme',
        msg_too_close: 'Demasiado cerca de otra estación',
        msg_drag_to_depot: '¡Arrastra a un Depósito (HQ / S / L / XL)!',
        msg_drag_to_line: '¡Arrastra a una línea activa!',
        msg_no_bridge: '¡No hay puentes disponibles!',
        msg_no_bridge_direct: '¡Sin puente para conexión directa!',
        msg_music_on: '♪ Música activada: Enzo Cage – Bright',
        msg_music_off: '♪ Música en pausa',
        msg_music_err: 'No se pudo cargar la música',
        msg_camera_reset: 'Cámara auto centrada',
        msg_paused: '⏸ Pausado',
        msg_resumed: '▶ Reanudado',
        msg_star_1: '¡★☆☆ Meta de Bronce (100)!',
        msg_star_2: '¡★★☆ Meta de Plata (220)!'
    },

    zh: {
        intro_subtitle: '城市物流与极简路网模拟',
        credits_prefix: '编程与音乐：',
        days: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],

        tip_theme: '日间 / 夜间模式',
        tip_sound: '合成器音效 开关',
        tip_music: '背景音乐 开关 (Enzo Cage – Bright)',
        tip_lang: '切换语言 (EN / DE / FR / ES / 中文)',
        tip_help: '物流指南与制作人员',
        tip_score: '已送达包裹总数',
        tip_clock: '点击暂停 / 继续 (空格键)',
        tip_pause: '暂停 (空格键)',
        tip_speed1: '常速 (1×)',
        tip_speed2: '快进 (2×)',
        tip_speed3: '极速 (3×)',
        tip_clear_line: '拆除当前选中线路（车辆退回库存）',
        tip_bike: '赛博摩托 (2×S 或 1×L)：拖放到线路上或点击分配！',
        tip_car: '赛博货车 (1×XL, 2×L 或 4×S)：拖放到线路上或点击分配！',
        tip_drone: '货运无人机 (跨河空运 1×S)：拖放到任意仓库或中转站！',
        tip_depot_s: 'S型微距中转站 (存放8个S包裹)：拖放到陆地建造！',
        tip_depot_l: 'L型区域中转站 (存放16个S/L包裹)：拖放到陆地建造！',
        tip_depot_xl: 'XL型超级枢纽 (存放30个S/L/XL包裹)：拖放到陆地建造！',
        tip_bridges: '桥梁：当线路跨越河流或海湾时自动消耗。',

        depot_main: '中央总仓',
        depot_s: 'S型中转站',
        depot_l: 'L型中转站',
        depot_xl: 'XL超级枢纽',
        veh_drone: '货运无人机',
        veh_bike: '赛博摩托',
        veh_car: '赛博货车',
        line_names: ['琥珀线', '钴蓝线', '珊瑚线', '翡翠线', '紫晶线', '青色线', '品红线'],
        vehicles_count: '{n} 辆载具',

        hint_initial: '从中央总仓 (HQ) 拖动绘制一条连接客户站点的物流线路',
        hint_depot_s: '拖放或点击陆地建造 S型中转站 (容量 8×S)',
        hint_depot_l: '拖放或点击陆地建造 L型中转站 (容量 16×S/L)',
        hint_depot_xl: '拖放或点击陆地建造 XL超级枢纽 (容量 30×S/L/XL)',
        hint_drone: '点击任意仓库 (HQ / S / L / XL) 部署货运无人机',
        hint_bike: '点击彩色线路部署高速赛博摩托',
        hint_car: '点击彩色线路部署重载赛博货车',

        insp_packages: '{cur} / {max} 件包裹',
        insp_stock: '当前库存：',
        insp_drones: '驻场无人机：',
        insp_add_drone: '+ 部署无人机',
        insp_remove: '拆除回收',

        cities_badge: '全球 30 座大都市',
        cities_title: '选择你的城市',
        cities_search: '搜索城市或河流...',

        upg_week: '第 {w} 周',
        upg_title: '每周资源补给',
        upg_sub: '请为下周选择一项战略物流补给包',
        upg_select: '选择此项',
        upg_new_line_title: '新线路与快线车队',
        upg_new_line_sub: '+1 {line}、+1 赛博摩托 & +1 桥梁',
        upg_new_line_desc: '开辟全新的独立城市运输干线，并附带跨河桥梁。',
        upg_express_title: '快线扩编车队',
        upg_express_sub: '+2 赛博摩托 & +1 桥梁',
        upg_express_desc: '提升现有线路的发车频率，并增加跨河桥梁储备。',
        upg_heavy_title: '重载货运车队',
        upg_heavy_sub_early: '+1 赛博货车 & +1 L型中转站',
        upg_heavy_sub_late: '+1 赛博货车、+1 XL超级枢纽 & +1 桥梁',
        upg_heavy_desc: '唯一能运输 XL重型货柜 (1×) 的载具，也可装载 2×L 或 4×S 包裹。',
        upg_air_title: '空中走廊与桥梁工程',
        upg_air_sub: '+1 货运无人机、+1 S型中转站 & +2 桥梁',
        upg_air_desc: '无人机可直接跨越水系空运 S型包裹，并补充桥梁。',

        go_title_city: '{city} 物流网络瘫痪',
        go_sub_station: '一个 {type} 型客户站点严重积压（4个以上包裹未及时送达）。',
        go_sub_depot: '{depot} 因包裹严重积压发生爆仓瘫痪！',
        go_delivered: '已送达',
        go_days: '运营天数',
        go_hubs: '枢纽数量',
        go_endless: '进入无尽模式继续游玩',
        go_restart: '重新开始',
        vic_title_city: '{city} 完美通关！',
        vic_sub_city: '★★★ 已达成金牌目标 ({target} 件送达)，城市路网高效运转！',
        vic_next_city: '下一座大都市 →',
        vic_overtime: '继续挑战高分',

        help_badge: 'Dinosaur Polo Club 极简风格',
        help_title: 'Mini Delivery — 快速指南',
        help_s_title: 'S型包裹 (圆形)',
        help_s_desc: '轻型包裹。可由<strong>货运无人机 (1×)</strong> 跨河空运，或由<strong>赛博摩托 (2×)</strong> 与<strong>赛博货车 (4×)</strong> 陆路运输。',
        help_l_title: 'L型包裹 (方形)',
        help_l_desc: '第1周中期出现。重量超出无人机负荷！必须通过配有<strong>赛博摩托 (1×)</strong> 或<strong>赛博货车 (2×)</strong> 的线路运输。',
        help_xl_title: 'XL型包裹 (菱形)',
        help_xl_desc: '第2周出现的重型货柜！<strong>只能由赛博货车 (1×)</strong> 通过陆路线路运输。',
        help_b1: '• <strong>绘制与拔插改道：</strong> 直接在站点间拖动连线。随时抓取线路末端的 <strong>T型把手</strong> 或站点边缘的 <strong>连接插头</strong>，即可将线路拔出并改接到其他站点。',
        help_b2: '• <strong>底部圆牌直接拖放：</strong> 可将底部的 <strong>摩托、货车、无人机及 S/L/XL 中转站</strong> 直接拖放到线路、仓库或空地上！',
        help_b3: '• <strong>全自动镜头与隐形触控手势：</strong> 镜头随路网自动拉远。触屏支持：<strong>双指捏合缩放</strong>、<strong>单指平移地图</strong>、<strong>双击空地</strong>归位镜头、<strong>双指轻点</strong>快速暂停。',
        help_continue: '继续游戏',

        msg_no_drone: '没有可用的货运无人机',
        msg_draw_line_first: '请先绘制一条线路！',
        msg_no_veh: '没有可用的 {veh}',
        msg_new_main_depot: '新中央总仓已启用！',
        msg_new_bank_bridge: '开辟新河岸：+1 桥梁！',
        msg_xl_spawn_car: '出现 XL重型需求：已解锁 +1 赛博货车！',
        msg_no_bridge_drone: '桥梁不足（可使用无人机跨河！）',
        msg_car_assigned_xl: '已为 XL站点自动分配赛博货车！',
        msg_land_only: '只能建造在陆地上',
        msg_too_close: '距离现有站点太近',
        msg_drag_to_depot: '请拖放到仓库或中转站 (HQ / S / L / XL)！',
        msg_drag_to_line: '请拖放到已激活的线路上！',
        msg_no_bridge: '没有可用桥梁！',
        msg_no_bridge_direct: '桥梁不足，无法直接跨河连接！',
        msg_music_on: '♪ 音乐已开启：Enzo Cage – Bright',
        msg_music_off: '♪ 背景音乐已暂停',
        msg_music_err: '音频加载失败',
        msg_camera_reset: '自动镜头已居中',
        msg_paused: '⏸ 已暂停',
        msg_resumed: '▶ 已继续',
        msg_star_1: '★☆☆ 达成铜牌里程碑 (100)！',
        msg_star_2: '★★☆ 达成银牌里程碑 (220)！'
    }
};

// Default language is English ('en') as requested!
let currentLang = 'en';

function t(key, params = null) {
    const dict = I18N[currentLang] || I18N.en;
    let str = dict[key] !== undefined ? dict[key] : (I18N.en[key] || key);
    if (params && typeof str === 'string') {
        for (const [k, v] of Object.entries(params)) {
            str = str.replace(`{${k}}`, v);
        }
    }
    return str;
}

function getLineName(lineId) {
    const dict = I18N[currentLang] || I18N.en;
    return (dict.line_names && dict.line_names[lineId]) || I18N.en.line_names[lineId] || `Line ${lineId + 1}`;
}

function getDepotLabel(depotType) {
    const spec = DEPOT_SPECS[depotType];
    return spec ? t(spec.labelKey) : depotType;
}

function getVehicleLabel(vType) {
    const spec = VEHICLE_SPECS[vType];
    return spec ? t(spec.labelKey) : vType;
}

function applyTranslationsToDOM() {
    document.documentElement.lang = currentLang;

    const langBtnLabel = document.getElementById('uiLangLabel');
    if (langBtnLabel) {
        const found = SUPPORTED_LANGS.find(l => l.code === currentLang);
        langBtnLabel.textContent = found ? found.label : currentLang.toUpperCase();
    }

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });

    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        el.innerHTML = t(key);
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        el.title = t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key);
    });
}
