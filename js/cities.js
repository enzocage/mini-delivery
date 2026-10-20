// 1. 30 REAL WORLD CITIES & CORE SPECS
const CITIES = [
        {
            id: 'berlin', name: 'Berlin', country: 'Deutschland', coords: '52.52°N 13.40°E',
            riverName: 'Spree & Landwehrkanal',
            day: { land: '#F4F1EA', water: '#BCE0FD', park: '#E2EED6' },
            night: { land: '#141820', water: '#0B2239', park: '#18241E' },
            rivers: [
                // Spree winding West to East through Mitte
                { width: 36, pts: [[-40, 260], [130, 275], [260, 230], [390, 250], [490, 295], [590, 285], [700, 340], [840, 395], [1040, 440]] },
                // Landwehrkanal southern loop
                { width: 18, pts: [[260, 230], [310, 380], [460, 425], [630, 410], [700, 340]] },
                // Havel / Spree North branch
                { width: 28, pts: [[130, 275], [155, 110], [180, -30]] }
            ],
            waterPolys: [
                // Müggelsee / Rummelsburger See hint
                [[760, 360], [835, 340], [860, 390], [790, 415]]
            ]
        },
        {
            id: 'muenchen', name: 'München', country: 'Deutschland', coords: '48.13°N 11.58°E',
            riverName: 'Isar & Eisbach',
            day: { land: '#F6F3EC', water: '#B4E4E8', park: '#DFEFD5' },
            night: { land: '#151922', water: '#092B32', park: '#17251E' },
            rivers: [
                // Isar flowing South-West to North-East through Munich + Museumsinsel split
                { width: 42, pts: [[270, 680], [340, 540], [430, 420], [500, 320], [565, 210], [645, 95], [730, -30]] },
                { width: 20, pts: [[415, 440], [475, 390], [525, 295], [565, 210]] }
            ],
            waterPolys: []
        },
        {
            id: 'hamburg', name: 'Hamburg', country: 'Deutschland', coords: '53.55°N 9.99°E',
            riverName: 'Norderelbe, Süderelbe & Alster',
            day: { land: '#F2EFE9', water: '#B5D8F8', park: '#E1ECD6' },
            night: { land: '#12161F', water: '#0A1F38', park: '#16211C' },
            rivers: [
                // Norderelbe
                { width: 58, pts: [[-40, 360], [220, 380], [490, 395], [730, 440], [1040, 510]] },
                // Süderelbe splitting around Wilhelmsburg
                { width: 46, pts: [[160, 375], [310, 515], [550, 535], [730, 440]] },
                // Binnen- & Außenalster flowing north from Elbe
                { width: 22, pts: [[490, 395], [510, 290]] }
            ],
            waterPolys: [
                // Außenalster & Binnenalster lake polygon
                [[485, 295], [465, 240], [510, 125], [585, 90], [610, 165], [555, 265], [525, 305]]
            ]
        },
        {
            id: 'wien', name: 'Wien', country: 'Österreich', coords: '48.20°N 16.37°E',
            riverName: 'Donau, Neue Donau & Donaukanal',
            day: { land: '#F7F2EB', water: '#B8DCF8', park: '#E3EFD7' },
            night: { land: '#161821', water: '#0C223B', park: '#19231D' },
            rivers: [
                // Hauptdonau diagonal NW to SE
                { width: 54, pts: [[240, -30], [395, 130], [565, 285], [745, 445], [960, 620]] },
                // Neue Donau parallel (forming Donauinsel)
                { width: 28, pts: [[290, -30], [440, 105], [610, 260], [790, 420], [995, 595]] },
                // Donaukanal curving through central Vienna
                { width: 22, pts: [[395, 130], [385, 275], [465, 385], [630, 460], [745, 445]] }
            ],
            waterPolys: []
        },
        {
            id: 'zuerich', name: 'Zürich', country: 'Schweiz', coords: '47.37°N 8.54°E',
            riverName: 'Zürichsee, Limmat & Sihl',
            day: { land: '#F3F2EC', water: '#B0E0F6', park: '#DFEDD6' },
            night: { land: '#131720', water: '#092438', park: '#16231C' },
            rivers: [
                // Limmat flowing NW from Lake Zurich
                { width: 32, pts: [[535, 355], [460, 250], [340, 155], [160, 75], [-30, 25]] },
                // Sihl joining Limmat at Platzspitz
                { width: 20, pts: [[380, 670], [415, 490], [435, 345], [460, 250]] }
            ],
            waterPolys: [
                // Zürichsee in the South-East
                [[500, 340], [585, 340], [710, 460], [890, 580], [920, 680], [530, 680], [495, 490]]
            ]
        },
        {
            id: 'koeln', name: 'Köln', country: 'Deutschland', coords: '50.93°N 6.96°E',
            riverName: 'Rheinbogen',
            day: { land: '#F5F1E9', water: '#B8DAF5', park: '#E3EED8' },
            night: { land: '#151820', water: '#0B2136', park: '#18231D' },
            rivers: [
                // Mighty Rhine S-curve through Cologne
                { width: 68, pts: [[610, 680], [585, 535], [475, 415], [455, 290], [525, 175], [490, 50], [430, -30]] }
            ],
            waterPolys: [
                // Deutzer Hafen / Rheinauhafen indent
                [[505, 330], [555, 345], [545, 410], [495, 395]]
            ]
        },
        {
            id: 'frankfurt', name: 'Frankfurt am Main', country: 'Deutschland', coords: '50.11°N 8.68°E',
            riverName: 'Main & Osthafen',
            day: { land: '#F4F0E8', water: '#BBDDF6', park: '#E1EDD5' },
            night: { land: '#14171F', water: '#0C2135', park: '#17221B' },
            rivers: [
                // Main River sweeping East-West
                { width: 52, pts: [[-40, 440], [180, 410], [360, 335], [535, 340], [715, 385], [885, 340], [1040, 325]] },
                // Nidda in NW
                { width: 18, pts: [[70, -20], [130, 140], [160, 280], [180, 410]] }
            ],
            waterPolys: []
        },
        {
            id: 'paris', name: 'Paris', country: 'Frankreich', coords: '48.85°N 2.35°E',
            riverName: 'Seine, Île de la Cité & Canal St-Martin',
            day: { land: '#F7F3EB', water: '#B9E1F9', park: '#E5F0DA' },
            night: { land: '#161822', water: '#0B233A', park: '#19241E' },
            rivers: [
                // La Seine iconic arc through Paris
                { width: 48, pts: [[890, 590], [720, 455], [575, 365], [440, 320], [305, 355], [185, 480], [120, 620]] },
                // Split around Île de la Cité & Île Saint-Louis
                { width: 26, pts: [[625, 395], [555, 325], [485, 305], [440, 320]] },
                // Canal Saint-Martin
                { width: 16, pts: [[620, 390], [650, 230], [735, 95], [850, -20]] }
            ],
            waterPolys: []
        },
        {
            id: 'london', name: 'London', country: 'Großbritannien', coords: '51.50°N 0.12°W',
            riverName: 'River Thames & Isle of Dogs',
            day: { land: '#F3EFE6', water: '#B4D9F4', park: '#DFECD4' },
            night: { land: '#13161E', water: '#0A1F35', park: '#17211B' },
            rivers: [
                // River Thames iconic meanders + Isle of Dogs horseshoe loop
                { width: 54, pts: [[-40, 450], [130, 435], [250, 355], [355, 285], [485, 290], [575, 345], [635, 270], [710, 265], [750, 395], [835, 405], [910, 305], [1040, 315]] }
            ],
            waterPolys: []
        },
        {
            id: 'amsterdam', name: 'Amsterdam', country: 'Niederlande', coords: '52.36°N 4.90°E',
            riverName: 'IJ, Amstel & Grachtenring',
            day: { land: '#F6F2E9', water: '#B6DFF8', park: '#E3EFD7' },
            night: { land: '#141720', water: '#0A2238', park: '#18231D' },
            rivers: [
                // Het IJ wide waterway across North Amsterdam
                { width: 78, pts: [[-40, 145], [280, 175], [570, 215], [840, 195], [1040, 165]] },
                // Amstel flowing South
                { width: 32, pts: [[515, 215], [510, 390], [525, 540], [515, 680]] },
                // Concentric Grachtengordel horseshoe 1
                { width: 15, pts: [[375, 200], [335, 330], [410, 430], [595, 430], [665, 330], [625, 215]] },
                // Concentric Grachtengordel horseshoe 2
                { width: 15, pts: [[295, 190], [255, 365], [365, 505], [635, 505], [735, 365], [690, 215]] }
            ],
            waterPolys: []
        },
        {
            id: 'venedig', name: 'Venedig', country: 'Italien', coords: '45.44°N 12.31°E',
            riverName: 'Canal Grande & Lagune von Venedig',
            day: { land: '#F8F3EA', water: '#A8E2EB', park: '#E5F1DA' },
            night: { land: '#171923', water: '#082934', park: '#19261E' },
            rivers: [
                // Canal Grande S-hook through the historic island cluster
                { width: 34, pts: [[275, 230], [420, 205], [535, 265], [470, 360], [565, 425], [700, 410]] },
                // Canale della Giudecca wide channel south
                { width: 65, pts: [[160, 460], [440, 485], [720, 455], [960, 420]] }
            ],
            waterPolys: [
                // Surrounding Venetian Lagoon margins
                [[-30, -30], [1030, -30], [1030, 95], [680, 120], [240, 105], [-30, 160]],
                [[-30, 565], [390, 585], [820, 550], [1030, 535], [1030, 680], [-30, 680]]
            ]
        },
        {
            id: 'barcelona', name: 'Barcelona', country: 'Spanien', coords: '41.38°N 2.17°E',
            riverName: 'Mittelmeer-Küste, Port Vell & Besòs',
            day: { land: '#F8F2E8', water: '#AEE0F9', park: '#E6F0D8' },
            night: { land: '#171822', water: '#09243B', park: '#1A241E' },
            rivers: [
                // Riu Besòs NE
                { width: 28, pts: [[740, -30], [790, 165], [855, 345]] },
                // Riu Llobregat SW
                { width: 32, pts: [[40, 320], [115, 475], [175, 595]] }
            ],
            waterPolys: [
                // Mediterranean Sea diagonal SE coastline + Port Vell harbor
                [[140, 680], [340, 540], [415, 495], [455, 530], [530, 475], [740, 385], [1030, 260], [1030, 680]]
            ]
        },
        {
            id: 'rom', name: 'Rom', country: 'Italien', coords: '41.90°N 12.49°E',
            riverName: 'Tiber (Fiume Tevere) & Tiberinsel',
            day: { land: '#F8F1E5', water: '#B8DDF4', park: '#E5EFD5' },
            night: { land: '#181821', water: '#0B2235', park: '#1B241D' },
            rivers: [
                // Tiber winding North to South through Rome
                { width: 44, pts: [[495, -30], [420, 115], [485, 225], [395, 305], [465, 410], [435, 525], [320, 680]] },
                // Aniene tributary NE
                { width: 22, pts: [[940, 60], [720, 120], [485, 165]] }
            ],
            waterPolys: []
        },
        {
            id: 'lissabon', name: 'Lissabon', country: 'Portugal', coords: '38.72°N 9.13°W',
            riverName: 'Tejo-Mündung (Mar da Palha)',
            day: { land: '#F8F3E9', water: '#AADBF8', park: '#E5F0D8' },
            night: { land: '#161822', water: '#08213A', park: '#18241D' },
            rivers: [],
            waterPolys: [
                // Huge Tagus estuary separating Lisbon north bank from Almada south bank
                [[-30, 480], [260, 445], [510, 410], [670, 305], [820, 165], [1030, 120], [1030, 520], [780, 545], [530, 560], [280, 565], [-30, 595]]
            ]
        },
        {
            id: 'prag', name: 'Prag', country: 'Tschechien', coords: '50.07°N 14.43°E',
            riverName: 'Moldau (Vltava) & Holešovice-Schleife',
            day: { land: '#F5F1E9', water: '#B7DCF6', park: '#E2EED6' },
            night: { land: '#151821', water: '#0B2237', park: '#18231D' },
            rivers: [
                // Vltava flowing South to North with the signature Holešovice bend
                { width: 48, pts: [[430, 680], [455, 515], [440, 365], [495, 250], [645, 235], [665, 145], [485, 115], [430, -30]] }
            ],
            waterPolys: []
        },
        {
            id: 'stockholm', name: 'Stockholm', country: 'Schweden', coords: '59.32°N 18.06°E',
            riverName: 'Mälaren, Riddarfjärden & Schären-Inseln',
            day: { land: '#F3F1EB', water: '#AFCFF2', park: '#DEEBD5' },
            night: { land: '#121620', water: '#091D35', park: '#16221C' },
            rivers: [
                // Central water channels around Gamla Stan, Kungsholmen & Södermalm
                { width: 62, pts: [[-40, 355], [240, 340], [485, 345], [740, 355], [1040, 370]] },
                { width: 42, pts: [[340, -30], [385, 175], [465, 345], [450, 510], [590, 680]] },
                { width: 34, pts: [[645, 140], [610, 345], [670, 515]] }
            ],
            waterPolys: []
        },
        {
            id: 'istanbul', name: 'Istanbul', country: 'Türkei', coords: '41.00°N 28.97°E',
            riverName: 'Bosporus, Goldenes Horn & Marmarameer',
            day: { land: '#F7F2E8', water: '#A9D9F6', park: '#E5EFD7' },
            night: { land: '#161822', water: '#08223A', park: '#19241D' },
            rivers: [
                // Bosphorus Strait separating Europe and Asia
                { width: 82, pts: [[640, -30], [585, 145], [535, 315], [495, 485]] },
                // Golden Horn (Haliç) curving NW into European side
                { width: 36, pts: [[510, 385], [355, 335], [225, 255], [135, 165]] }
            ],
            waterPolys: [
                // Sea of Marmara in the South
                [[-30, 525], [310, 485], [495, 455], [690, 510], [1030, 575], [1030, 680], [-30, 680]]
            ]
        },
        {
            id: 'kairo', name: 'Kairo', country: 'Ägypten', coords: '30.04°N 31.23°E',
            riverName: 'Nil & Gezira / Zamalek-Insel',
            day: { land: '#F9F1E2', water: '#B0DCF4', park: '#E4EED2' },
            night: { land: '#19171E', water: '#0A2236', park: '#1A241B' },
            rivers: [
                // Great Nile flowing South to North
                { width: 66, pts: [[485, 680], [495, 505], [475, 330], [485, 165], [440, -30]] },
                // Branch around Zamalek (Gezira Island)
                { width: 32, pts: [[485, 445], [405, 335], [420, 225], [485, 165]] }
            ],
            waterPolys: []
        },
        {
            id: 'kapstadt', name: 'Kapstadt', country: 'Südafrika', coords: '33.92°S 18.42°E',
            riverName: 'Tafelbucht (Table Bay) & Atlantik',
            day: { land: '#F6F2E9', water: '#A6DCF6', park: '#E1EED5' },
            night: { land: '#151821', water: '#082339', park: '#17241D' },
            rivers: [
                // Salt River / Black River canal
                { width: 22, pts: [[560, 240], [610, 430], [645, 620]] }
            ],
            waterPolys: [
                // Table Bay & Atlantic Ocean around Sea Point & Waterfront
                [[-30, -30], [1030, -30], [1030, 140], [710, 185], [540, 265], [380, 230], [235, 315], [155, 520], [120, 680], [-30, 680]]
            ]
        },
        {
            id: 'dubai', name: 'Dubai', country: 'VAE', coords: '25.20°N 55.27°E',
            riverName: 'Dubai Creek, Water Canal & Persischer Golf',
            day: { land: '#FAF1E2', water: '#A2E3F4', park: '#E7F0D6' },
            night: { land: '#191720', water: '#072738', park: '#1B251D' },
            rivers: [
                // Dubai Creek & Business Bay Canal loop
                { width: 42, pts: [[690, 165], [760, 295], [685, 420], [475, 430], [345, 315], [275, 250]] }
            ],
            waterPolys: [
                // Persian Gulf NW coastline
                [[-30, -30], [1030, -30], [1030, 85], [690, 165], [345, 265], [-30, 390]]
            ]
        },
        {
            id: 'mumbai', name: 'Mumbai', country: 'Indien', coords: '19.07°N 72.87°E',
            riverName: 'Arabisches Meer, Back Bay & Thane Creek',
            day: { land: '#F7F1E6', water: '#AEE0F6', park: '#E3EED5' },
            night: { land: '#161820', water: '#092338', park: '#18241C' },
            rivers: [
                // Mithi River separating North & South Mumbai
                { width: 28, pts: [[265, 295], [470, 315], [685, 265]] }
            ],
            waterPolys: [
                // Arabian Sea on West + Back Bay
                [[-30, -30], [285, -30], [260, 295], [215, 470], [295, 520], [250, 610], [-30, 680]],
                // Mumbai Harbour / Thane Creek on East
                [[760, -30], [1030, -30], [1030, 680], [520, 680], [640, 480], [695, 255]]
            ]
        },
        {
            id: 'singapur', name: 'Singapur', country: 'Singapur', coords: '1.35°N 103.81°E',
            riverName: 'Marina Bay, Singapore River & Kallang',
            day: { land: '#F4F2EA', water: '#A7E2F4', park: '#DCEFD4' },
            night: { land: '#131821', water: '#072638', park: '#16261E' },
            rivers: [
                // Singapore River
                { width: 28, pts: [[235, 310], [385, 365], [515, 415]] },
                // Kallang River
                { width: 32, pts: [[615, 110], [600, 285], [565, 415]] }
            ],
            waterPolys: [
                // Marina Bay & Singapore Strait South
                [[-30, 525], [340, 485], [475, 405], [595, 405], [645, 475], [1030, 435], [1030, 680], [-30, 680]]
            ]
        },
        {
            id: 'hongkong', name: 'Hongkong', country: 'China', coords: '22.31°N 114.16°E',
            riverName: 'Victoria Harbour (Kowloon & HK Island)',
            day: { land: '#F5F1E8', water: '#A9DCF6', park: '#DFEFD5' },
            night: { land: '#131722', water: '#07213A', park: '#16251E' },
            rivers: [],
            waterPolys: [
                // Victoria Harbour channel between Kowloon Peninsula and Hong Kong Island
                [[-30, 290], [285, 325], [440, 385], [595, 375], [785, 325], [1030, 355], [1030, 475], [760, 445], [565, 475], [360, 465], [140, 445], [-30, 460]]
            ]
        },
        {
            id: 'tokio', name: 'Tokio', country: 'Japan', coords: '35.67°N 139.65°E',
            riverName: 'Sumida-Fluss, Arakawa & Bucht von Tokio',
            day: { land: '#F5F2EC', water: '#B3DFF8', park: '#E2EFD8' },
            night: { land: '#141721', water: '#0A2239', park: '#18241E' },
            rivers: [
                // Sumida River
                { width: 40, pts: [[515, -30], [565, 145], [545, 305], [510, 455]] },
                // Arakawa wide floodway East
                { width: 62, pts: [[690, -30], [755, 175], [765, 345], [740, 475]] },
                // Imperial Palace / Nihonbashi canal
                { width: 20, pts: [[345, 295], [450, 315], [545, 305]] }
            ],
            waterPolys: [
                // Tokyo Bay South-East
                [[380, 680], [465, 455], [645, 475], [855, 445], [1030, 465], [1030, 680]]
            ]
        },
        {
            id: 'seoul', name: 'Seoul', country: 'Südkorea', coords: '37.56°N 126.97°E',
            riverName: 'Han-Fluss (Hangang) & Yeouido-Insel',
            day: { land: '#F4F1EA', water: '#B4DCF7', park: '#E1EED6' },
            night: { land: '#141821', water: '#0A2138', park: '#17231D' },
            rivers: [
                // Mighty Han River sweeping across Seoul
                { width: 76, pts: [[-40, 295], [195, 355], [415, 395], [645, 365], [840, 395], [1040, 345]] },
                // Yeouido southern branch
                { width: 26, pts: [[245, 365], [340, 445], [455, 430], [510, 385]] },
                // Jungnangcheon North tributary
                { width: 24, pts: [[645, -30], [635, 185], [645, 365]] }
            ],
            waterPolys: []
        },
        {
            id: 'sydney', name: 'Sydney', country: 'Australien', coords: '33.86°S 151.20°E',
            riverName: 'Port Jackson (Sydney Harbour) & Parramatta',
            day: { land: '#F7F3EA', water: '#A6DFF8', park: '#E2F0D7' },
            night: { land: '#151822', water: '#08233B', park: '#18241E' },
            rivers: [
                // Parramatta River & Port Jackson winding harbor
                { width: 74, pts: [[-40, 355], [195, 365], [395, 335], [565, 375], [745, 315], [940, 285], [1040, 265]] },
                // Middle Harbour North arm
                { width: 38, pts: [[565, 115], [665, 215], [745, 315]] },
                // Darling Harbour bay south
                { width: 34, pts: [[475, 355], [485, 465]] }
            ],
            waterPolys: []
        },
        {
            id: 'newyork', name: 'New York City', country: 'USA', coords: '40.71°N 74.00°W',
            riverName: 'Manhattan, Hudson River & East River',
            day: { land: '#F4F0E8', water: '#B1D9F6', park: '#E1EDD5' },
            night: { land: '#131620', water: '#091F37', park: '#17221C' },
            rivers: [
                // Hudson River West of Manhattan
                { width: 78, pts: [[365, -30], [335, 220], [295, 455], [265, 680]] },
                // East River separating Manhattan from Brooklyn & Queens
                { width: 54, pts: [[615, -30], [565, 185], [535, 365], [475, 495], [320, 565]] },
                // Harlem River connecting Hudson and East River
                { width: 22, pts: [[355, 85], [485, 115], [565, 185]] }
            ],
            waterPolys: [
                // Upper New York Bay South
                [[195, 515], [515, 525], [625, 680], [160, 680]]
            ]
        },
        {
            id: 'sanfrancisco', name: 'San Francisco', country: 'USA', coords: '37.77°N 122.41°W',
            riverName: 'Golden Gate & San Francisco Bay',
            day: { land: '#F6F2EA', water: '#ACD9F6', park: '#E2EFD6' },
            night: { land: '#141721', water: '#082138', park: '#17231D' },
            rivers: [],
            waterPolys: [
                // Golden Gate Strait & Central SF Bay separating SF Peninsula, Marin & Oakland
                [[-30, -30], [235, -30], [265, 165], [445, 215], [615, 115], [725, 195], [755, 680], [515, 680], [495, 345], [275, 285], [-30, 315]]
            ]
        },
        {
            id: 'chicago', name: 'Chicago', country: 'USA', coords: '41.87°N 87.62°W',
            riverName: 'Lake Michigan & Chicago River',
            day: { land: '#F4F1EA', water: '#B2DCF8', park: '#E2EED6' },
            night: { land: '#141820', water: '#0A2238', park: '#18231D' },
            rivers: [
                // Chicago River Y-junction: Main Stem, North Branch, South Branch
                { width: 30, pts: [[695, 325], [475, 325]] },
                { width: 26, pts: [[475, 325], [375, 145], [295, -30]] },
                { width: 28, pts: [[475, 325], [435, 475], [245, 615], [-30, 665]] }
            ],
            waterPolys: [
                // Lake Michigan along the eastern shoreline
                [[655, -30], [1030, -30], [1030, 680], [785, 680], [715, 455], [685, 245]]
            ]
        },
        {
            id: 'riodejaneiro', name: 'Rio de Janeiro', country: 'Brasilien', coords: '22.90°S 43.17°W',
            riverName: 'Guanabara-Bucht & Copacabana-Küste',
            day: { land: '#F7F3EA', water: '#A6E0F6', park: '#DCF0D4' },
            night: { land: '#151922', water: '#072539', park: '#16261D' },
            rivers: [
                // Maracanã / Canal do Mangue
                { width: 22, pts: [[265, 345], [455, 325]] }
            ],
            waterPolys: [
                // Guanabara Bay & Atlantic Ocean around Rio and Niterói
                [[455, -30], [765, -30], [725, 265], [645, 445], [825, 535], [1030, 555], [1030, 680], [-30, 680], [-30, 565], [345, 535], [515, 435], [445, 265]]
            ]
        }
    ];

    // Dinosaur Polo Club inspired vibrant Logistics Line Colors
    const LINE_COLORS = [
        { id: 0, name: 'Gelb-Linie',    hex: '#F59E0B' },
        { id: 1, name: 'Kobalt-Linie',  hex: '#2563EB' },
        { id: 2, name: 'Korall-Linie',  hex: '#EF4444' },
        { id: 3, name: 'Smaragd-Linie', hex: '#10B981' },
        { id: 4, name: 'Amethyst-Linie',hex: '#8B5CF6' },
        { id: 5, name: 'Cyan-Linie',    hex: '#06B6D4' },
        { id: 6, name: 'Magenta-Linie', hex: '#EC4899' }
    ];

const WORLD_W = 1000;
const WORLD_H = 650;

const DEPOT_SPECS = {
    MAIN: { labelKey: 'depot_main', label: 'Main Depot',     cap: 24, allowed: ['S', 'L', 'XL'], radius: 22, droneRange: 255, color: '#F59E0B' },
    S:    { labelKey: 'depot_s',    label: 'S Micro-Hub',    cap: 6,  allowed: ['S'],            radius: 15, droneRange: 215, color: '#0EA5E9' },
    L:    { labelKey: 'depot_l',    label: 'L Regional Hub', cap: 12, allowed: ['S', 'L'],       radius: 17, droneRange: 245, color: '#F59E0B' },
    XL:   { labelKey: 'depot_xl',   label: 'XL Mega-Hub',    cap: 20, allowed: ['S', 'L', 'XL'], radius: 20, droneRange: 280, color: '#F43F5E' }
};

const VEHICLE_SPECS = {
    drone: { labelKey: 'veh_drone', label: 'Cargo Drone', speed: 128, capS: 1, capL: 0, capXL: 0 },
    bike:  { labelKey: 'veh_bike',  label: 'Cyberbike',   speed: 96,  capS: 2, capL: 1, capXL: 0 },
    car:   { labelKey: 'veh_car',   label: 'Cybercar',    speed: 76,  capS: 4, capL: 2, capXL: 1 }
};
