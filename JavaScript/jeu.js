// =========================================
// VARIABLES GLOBALES DU JEU
// =========================================
window.socket = null;
window.playersOnScreen = {}; 
window.chairsOnScreen = [];  
window.currentRoomCode = ""; 
window.gameState = "MENU";   

window.myHostId = 'HOST_PC_' + Math.floor(Math.random() * 10000);

window.gameAudio = new Audio();
window.musicList = [
    '../Audio/Crab_Rave.mp3', 
    '../Audio/Nyan_cat.mp3',
    '../Audio/Never_Gonna.mp3',
    '../Audio/Sunflower.mp3'
];

window.playRandomMusic = function() {
    if (window.musicList.length === 0) return;
    window.gameAudio.src = window.musicList[Math.floor(Math.random() * window.musicList.length)];
    window.gameAudio.currentTime = Math.floor(Math.random() * 20); 
    window.gameAudio.play().catch(e => console.log(e));
};

window.stopMusic = function() { window.gameAudio.pause(); };

window.itemPool = [];
window.generateItemPool = function(nbJoueurs) {
    window.itemPool = [];
    let nbChaise = Math.max(1, Math.floor(nbJoueurs * 0.15));
    let nbMarteau = Math.max(1, Math.floor(nbJoueurs * 0.15));
    let nbEclair = Math.max(1, Math.floor(nbJoueurs * 0.20));
    let nbEscargot = Math.max(1, Math.floor(nbJoueurs * 0.20));
    let nbPause = Math.max(1, Math.floor(nbJoueurs * 0.01));

    for(let i=0; i<nbChaise; i++) window.itemPool.push('CHAISE_PLUS');
    for(let i=0; i<nbMarteau; i++) window.itemPool.push('MARTEAU');
    for(let i=0; i<nbEclair; i++) window.itemPool.push('ECLAIR');
    for(let i=0; i<nbEscargot; i++) window.itemPool.push('ESCARGOT');
    for(let i=0; i<nbPause; i++) window.itemPool.push('PAUSE');

    for (let i = window.itemPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [window.itemPool[i], window.itemPool[j]] = [window.itemPool[j], window.itemPool[i]];
    }
};

window.generateRoomCode = function() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; let code = "";
    for(let i=0; i<4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
};

window.spawnPlayer = function(pseudo) {
    const arena = document.getElementById('game-arena');
    if (!arena) return;
    const playerDiv = document.createElement('div');
    playerDiv.id = "player-" + pseudo; playerDiv.className = "player-avatar"; playerDiv.innerText = pseudo; 
    const color = window.playersOnScreen[pseudo].color || 'red';
    playerDiv.dataset.color = color; playerDiv.dataset.direction = 'front';
    playerDiv.style.backgroundImage = `url('../sprite/caractere/${color}/slime_front.png')`;
    playerDiv.style.left = (window.innerWidth / 2) + "px"; playerDiv.style.top = (window.innerHeight / 2) + "px";
    arena.appendChild(playerDiv);
    if (window.playersOnScreen[pseudo]) window.playersOnScreen[pseudo].element = playerDiv;
};

window.spawnChairs = function(amount) {
    const arena = document.getElementById('game-arena');
    for (let i = 0; i < amount; i++) {
        const chairDiv = document.createElement('div');
        chairDiv.className = "game-chair"; chairDiv.id = "chair-" + i;
        chairDiv.style.left = (Math.floor(Math.random() * (window.innerWidth - 100)) + 50) + "px";
        chairDiv.style.top = (Math.floor(Math.random() * (window.innerHeight - 100)) + 50) + "px";
        arena.appendChild(chairDiv);
        chairsOnScreen.push({ id: chairDiv.id, element: chairDiv, x: parseFloat(chairDiv.style.left), y: parseFloat(chairDiv.style.top), isOccupied: false });
    }
};

window.initWebSocket = function() {
    socket = new WebSocket(`ws://${window.location.hostname}:8080`);
    socket.onopen = () => { socket.send(JSON.stringify({ type: 'JOIN', pseudo: window.myHostId })); };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (!document.getElementById('game-arena')) return;

        if (data.type === 'JOIN' || data.type === 'NEW_PLAYER') {
            if (data.pseudo.startsWith('HOST_PC')) return; 
            if (window.currentRoomCode === "") return; 
            if (data.code?.trim().toUpperCase() === window.currentRoomCode.trim().toUpperCase()) {
                // AJOUT DE joueurCible ICI !
                socket.send(JSON.stringify({ type: 'HOST_ACCEPT_JOIN', pseudo: data.pseudo, joueurCible: data.pseudo }));
                if (!window.playersOnScreen[data.pseudo]) {
                    window.playersOnScreen[data.pseudo] = { pseudo: data.pseudo, element: null, color: 'red', hasItem: false, itemLimitReached: false, currentItem: null };
                    if (window.gameState === "PLAYING") window.spawnPlayer(data.pseudo);
                    if (typeof updateLobbyUI === "function") updateLobbyUI(); 
                }
            } else {
                socket.send(JSON.stringify({ type: 'HOST_REJECT_JOIN', pseudo: data.pseudo, joueurCible: data.pseudo, message: "Code Room Incorrect !" }));
            }
        }

        if (data.type === 'ACTION' && data.action === 'SET_COLOR' && window.playersOnScreen[data.pseudo]) {
            window.playersOnScreen[data.pseudo].color = data.color;
            const pDiv = window.playersOnScreen[data.pseudo].element;
            if (pDiv) {
                pDiv.dataset.color = data.color;
                pDiv.style.backgroundImage = `url('../sprite/caractere/${data.color}/slime_${pDiv.dataset.direction || 'front'}.png')`;
            }
        }

        // --- LANCER DE DÉ (FARM) ---
        if (data.type === 'ACTION' && data.action === 'FARM_ROLL' && window.playersOnScreen[data.pseudo]) {
            const pData = window.playersOnScreen[data.pseudo];
            
            if (!pData.itemLimitReached && window.gameState === "PLAYING") {
                const roll = Math.floor(Math.random() * 100) + 1; 
                const chanceDeGagner = 100; // 100% de chance pour test
                
                if (roll <= chanceDeGagner && window.itemPool.length > 0) {
                    let item = window.itemPool.pop();
                    pData.hasItem = true; pData.itemLimitReached = true; pData.currentItem = item;
                    // AJOUT DE joueurCible ICI !
                    socket.send(JSON.stringify({ type: 'GIVE_ITEM', pseudo: data.pseudo, joueurCible: data.pseudo, item: item }));
                } else {
                    socket.send(JSON.stringify({ type: 'ROLL_FAILED', pseudo: data.pseudo, joueurCible: data.pseudo }));
                }
            }
        }

        if (data.type === 'MOVE' && window.playersOnScreen[data.pseudo]) {
            const pData = window.playersOnScreen[data.pseudo];
            if (!pData || !pData.element || pData.element.classList.contains('sitting')) return; 
            
            let curX = parseFloat(pData.element.style.left) + (data.x * 10);
            let curY = parseFloat(pData.element.style.top) + (data.y * 10);
            curX = Math.max(30, Math.min(window.innerWidth - 30, curX)); curY = Math.max(30, Math.min(window.innerHeight - 30, curY));
            pData.element.style.left = curX + "px"; pData.element.style.top = curY + "px";

            if (Math.abs(data.x) > 0.1 || Math.abs(data.y) > 0.1) {
                let dir = Math.abs(data.x) > Math.abs(data.y) ? (data.x > 0 ? 'right' : 'left') : (data.y > 0 ? 'front' : 'back');
                if (pData.element.dataset.direction !== dir) {
                    pData.element.dataset.direction = dir;
                    pData.element.style.backgroundImage = `url('../sprite/caractere/${pData.color}/slime_${dir}.png')`;
                }
            }
        }

        if (data.type === 'ACTION' && data.action === 'SIT' && window.playersOnScreen[data.pseudo]) {
            const pData = window.playersOnScreen[data.pseudo];
            if (!pData || !pData.element || pData.element.classList.contains('sitting')) return; 
            const pX = parseFloat(pData.element.style.left); const pY = parseFloat(pData.element.style.top);
            let seatFound = false;

            for (let chair of window.chairsOnScreen) {
                if (chair.isOccupied) continue;
                if (Math.sqrt((pX - chair.x)**2 + (pY - chair.y)**2) < 60) {
                    seatFound = true; chair.isOccupied = true; chair.element.classList.add('occupied');
                    pData.element.style.left = chair.x + "px"; pData.element.style.top = chair.y + "px";
                    pData.element.classList.add('sitting');
                    pData.element.style.backgroundImage = `url('../sprite/caractere/${pData.color}/slime_front.png')`;
                    break;
                }
            }

            if (!seatFound) {
                pData.element.style.filter = "sepia(1) hue-rotate(-50deg) saturate(5)";
                setTimeout(() => { if (!pData.element.classList.contains('sitting')) pData.element.style.filter = "none"; }, 300);
            } else {
                if (window.chairsOnScreen.filter(c => c.isOccupied).length >= window.chairsOnScreen.length) {
                    if (typeof window.endRound === "function") window.endRound();
                }
            }
        }

        if (data.type === 'PLAYER_LEFT' && window.playersOnScreen[data.pseudo]) {
            if (window.playersOnScreen[data.pseudo].element) window.playersOnScreen[data.pseudo].element.remove();
            delete window.playersOnScreen[data.pseudo];
            if (typeof updateLobbyUI === "function") updateLobbyUI();
        }
    };
};