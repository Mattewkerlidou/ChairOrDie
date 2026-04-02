// =========================================
// 1. CONNEXION ET SÉCURITÉ (Version 29)
// =========================================
const urlParams = new URLSearchParams(window.location.search);
const pseudoChoisi = (urlParams.get('pseudo') || "Anonyme").trim();
const codeChoisi = (urlParams.get('code') || "").trim(); 

const serverIP = window.location.hostname; 
const socket = new WebSocket(`ws://${serverIP}:8080`);

let isReady = false; 
let currentColor = 'red'; 

let myItem = null;
let farmProgress = 0;
let hasReceivedItemThisRound = false; 
const FARM_TARGET = 10000; 

// 🚨 CONSOLE DE DEBUG MOBILE
const mobileConsole = document.createElement('div');
mobileConsole.style.position = 'fixed'; mobileConsole.style.top = '0'; mobileConsole.style.left = '0'; mobileConsole.style.width = '100%'; mobileConsole.style.height = '100px'; mobileConsole.style.backgroundColor = 'rgba(0,0,0,0.8)'; mobileConsole.style.color = '#0f0'; mobileConsole.style.fontFamily = 'monospace'; mobileConsole.style.fontSize = '12px'; mobileConsole.style.zIndex = '999999'; mobileConsole.style.overflowY = 'scroll'; mobileConsole.style.pointerEvents = 'none'; mobileConsole.style.padding = '5px'; mobileConsole.innerHTML = '🛠️ V29 PRÊTE<br>'; document.body.appendChild(mobileConsole);
function debugLog(text) { mobileConsole.innerHTML += text + '<br>'; mobileConsole.scrollTop = mobileConsole.scrollHeight; }

socket.onopen = () => { socket.send(JSON.stringify({ type: 'JOIN', pseudo: pseudoChoisi, code: codeChoisi })); };

window.chooseSlime = function(color) {
    currentColor = color;
    document.getElementById('slime-red').classList.remove('selected'); document.getElementById('slime-yellow').classList.remove('selected'); document.getElementById('slime-' + color).classList.add('selected');
    if (isReady && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'ACTION', pseudo: pseudoChoisi, action: 'SET_COLOR', color: currentColor }));
};

function resetItemUI(showFarmBar) {
    myItem = null; farmProgress = 0;
    const btnItem = document.getElementById('btn-item');
    if (btnItem) btnItem.innerHTML = `<span style="color: #555; font-size: 14px; font-weight: bold; text-transform: uppercase;">Vide</span>`;
    if (showFarmBar) {
        document.getElementById('debug-progress-container').style.display = 'block'; document.getElementById('debug-text').style.display = 'block'; document.getElementById('debug-progress-bar').style.width = '0%'; document.getElementById('debug-text').innerText = "FARM : 0%"; document.getElementById('debug-text').style.color = "white";
    } else {
        document.getElementById('debug-progress-container').style.display = 'none'; document.getElementById('debug-text').style.display = 'none';
    }
}

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    // NOUVEAUTÉ : On cherche le "vrai" destinataire dans joueurCible (ou on prend pseudo si ça manque)
    const cible = (data.joueurCible || data.pseudo || "").trim();

    if(data.type !== 'MOVE' && data.type !== 'ITEM_PROGRESS') debugLog("📥 REÇU: " + data.type);

    if (data.type === 'HOST_ACCEPT_JOIN' && cible === pseudoChoisi) {
        isReady = true; socket.send(JSON.stringify({ type: 'ACTION', pseudo: pseudoChoisi, action: 'SET_COLOR', color: currentColor }));
    }

    if (data.type === 'GAME_STARTED' || data.type === 'ROUND_STARTED') {
        document.getElementById('lobby-ui').style.display = 'none'; document.getElementById('game-ui').style.display = 'block';
        hasReceivedItemThisRound = false; resetItemUI(true); 
    }

    if (data.type === 'HOST_REJECT_JOIN' && cible === pseudoChoisi) { alert("❌ Connexion refusée."); window.location.href = "../Html/index.html"; }
    if (data.type === 'GAME_CLOSED') { alert("🛑 Fin de partie !"); window.location.href = "../Html/index.html"; }
    if (data.type === 'PLAYER_ELIMINATED' && cible === pseudoChoisi) { isReady = false; alert("💀 ÉLIMINÉ !"); window.location.href = "../Html/index.html"; }

    // --- LE JOUEUR REÇOIT SON OBJET ---
    if (data.type === 'GIVE_ITEM') {
        if (cible === pseudoChoisi) {
            debugLog(`🎁 C'EST POUR MOI ! Objet : ${data.item}`);
            myItem = data.item; hasReceivedItemThisRound = true; 
            const btnItem = document.getElementById('btn-item');
            document.getElementById('debug-progress-container').style.display = 'none'; document.getElementById('debug-text').style.display = 'none';

            if (data.item === 'ECLAIR') {
                btnItem.innerHTML = `<img src="../sprite/items/lightning.png" style="width: 80%; height: 80%; object-fit: contain; pointer-events: none;">`;
            } else {
                let emoji = "❓";
                if (data.item === 'PAUSE') emoji = "⏸️"; else if (data.item === 'CHAISE_PLUS') emoji = "🪑"; else if (data.item === 'MARTEAU') emoji = "🔨"; else if (data.item === 'ESCARGOT') emoji = "🐌"; else if (data.item === 'COEUR') emoji = "❤️";
                btnItem.innerHTML = `<span style="font-size: 45px; color: white; text-shadow: 0 0 10px rgba(255,255,255,0.5); pointer-events: none;">${emoji}</span>`;
            }
            
            btnItem.classList.remove('item-flash'); setTimeout(() => { btnItem.classList.add('item-flash'); }, 50);
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]); 
        }
    }

    if (data.type === 'ROLL_FAILED' && cible === pseudoChoisi) {
        const txt = document.getElementById('debug-text'); txt.innerText = "❌ RATÉ !"; txt.style.color = "#e74c3c"; 
        setTimeout(() => { if (!hasReceivedItemThisRound) { txt.innerText = "FARM : 0%"; txt.style.color = "white"; } }, 1000);
    }

    if (data.type === 'ACTION' && data.action === 'RESET_DEBUG' && cible === pseudoChoisi) {
        hasReceivedItemThisRound = false; resetItemUI(true);
    }
};

socket.onclose = () => { isReady = false; debugLog("❌ DÉCONNECTÉ"); };

function sendMove(x, y) { if (isReady && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'MOVE', pseudo: pseudoChoisi, x: parseFloat(x.toFixed(2)), y: parseFloat(y.toFixed(2)) })); }
function sendAction(actionName) { if (isReady && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'ACTION', pseudo: pseudoChoisi, action: actionName })); }

const touchZone = document.getElementById('left-touch-zone'); const joyBase = document.getElementById('joystick-base'); const joyStick = document.getElementById('joystick-stick');
let joyActive = false; let joyOriginX = 0, joyOriginY = 0; let touchId = null; const maxRadius = 50; 

if (touchZone) {
    touchZone.addEventListener('touchstart', (e) => {
        if (!isReady) return; e.preventDefault(); if (joyActive) return; 
        const touch = e.changedTouches[0]; touchId = touch.identifier; joyActive = true;
        joyOriginX = touch.clientX; joyOriginY = touch.clientY;
        const limiteDroite = (window.innerWidth / 2) - 75; if (joyOriginX > limiteDroite) joyOriginX = limiteDroite; 
        joyBase.style.left = joyOriginX + 'px'; joyBase.style.top = joyOriginY + 'px';
        joyBase.style.display = 'block'; joyStick.style.transform = `translate(-50%, -50%)`;
    }, { passive: false });

    touchZone.addEventListener('touchmove', (e) => {
        if (!isReady || !joyActive) return; e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === touchId) {
                let dx = touch.clientX - joyOriginX; let dy = touch.clientY - joyOriginY;
                let distance = Math.sqrt(dx * dx + dy * dy);
                if (distance > maxRadius) { dx = (dx / distance) * maxRadius; dy = (dy / distance) * maxRadius; }

                if (!hasReceivedItemThisRound) {
                    let forceJoystick = Math.sqrt(dx*dx + dy*dy); farmProgress += forceJoystick;
                    let pct = Math.min(100, (farmProgress / FARM_TARGET) * 100);
                    document.getElementById('debug-progress-bar').style.width = Math.floor(pct) + '%';
                    
                    const txt = document.getElementById('debug-text');
                    if(txt.innerText !== "❌ RATÉ !") txt.innerText = "FARM : " + Math.floor(pct) + "%";

                    if (farmProgress >= FARM_TARGET) {
                        farmProgress = 0; sendAction('FARM_ROLL'); 
                    }
                }
                joyStick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`; sendMove(dx / maxRadius, dy / maxRadius);
            }
        }
    }, { passive: false });

    function stopJoystick(e) {
        if (!isReady || !joyActive) return; e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) { if (e.changedTouches[i].identifier === touchId) { joyActive = false; touchId = null; joyBase.style.display = 'none'; sendMove(0, 0); } }
    }
    touchZone.addEventListener('touchend', stopJoystick); touchZone.addEventListener('touchcancel', stopJoystick);
}

const btnSit = document.getElementById('btn-sit'); const btnItem = document.getElementById('btn-item');
if (btnSit) btnSit.addEventListener('touchstart', (e) => { e.preventDefault(); sendAction('SIT'); });
if (btnItem) {
    btnItem.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (myItem !== null) { sendAction('USE_ITEM'); resetItemUI(false); }
    });
}