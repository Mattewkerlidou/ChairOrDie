// =========================================
// LOGIQUE UI & GESTION DES MANCHES (script.js)
// =========================================
window.toggleQRCode = () => { document.getElementById("qr-modal").classList.toggle("active"); };
window.JoinGame = () => { document.getElementById("pseudo-modal").classList.add("active"); };
window.closePseudoModal = () => { document.getElementById("pseudo-modal").classList.remove("active"); };

window.ConfirmJoin = function () {
	const code = document.getElementById("room-code-input").value;
	const pseudo = document.getElementById("pseudo-input").value;
	if (!code || !pseudo) return alert("Remplis tous les champs !");
	window.location.href = "manette.html?pseudo=" + encodeURIComponent(pseudo.trim()) + "&code=" + encodeURIComponent(code.trim().toUpperCase());
};

window.updateLobbyUI = function () {
	const listDiv = document.getElementById("player-list");
	const countSpan = document.getElementById("player-count");
	if (!listDiv || !countSpan) return;
	const pseudos = Object.keys(window.playersOnScreen);
	countSpan.innerText = pseudos.length;
	listDiv.innerHTML = "";
	pseudos.forEach((pseudo) => {
		const badge = document.createElement("div");
		badge.className = "player-badge";
		badge.innerText = pseudo;
		listDiv.appendChild(badge);
	});
};

window.OpenLobby = function () {
	window.gameState = "LOBBY";
	window.currentRoomCode = window.generateRoomCode();
	document.getElementById("display-room-code").innerText = window.currentRoomCode;
	if (!window.socket || window.socket.readyState !== WebSocket.OPEN) window.initWebSocket();
	
    document.getElementById("main-menu").style.display = "none";
	document.getElementById("main-logo").style.display = "none";
	document.getElementById("lobby-screen").style.display = "block";
	window.updateLobbyUI();

	if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch((e) => console.log(e));
};

// =========================================
// BOUCLE DE JEU & TEMPS DYNAMIQUE
// =========================================
window.musicTimer = null;
window.roundForceEndTimer = null;
window.chairsAreSpawned = false;

window.roundEndTime = 0;
window.roundDuration = 0;
const MAX_ROUND_DURATION = 20000; 
const MIN_ROUND_DURATION = 3000;  
window.debugRenderId = null;

// Mémoire des Marteaux et Finale
window.pendingHammers = [];
window.hammersFinished = true;
window.initialPlayerCount = 0;
window.isFinaleMode = false;
window.lovers = [];

window.createDebugTimer = function() {
    let timerUI = document.getElementById("debug-timer");
    if (!timerUI) {
        timerUI = document.createElement("div");
        timerUI.id = "debug-timer";
        document.body.appendChild(timerUI);
    }
    timerUI.style.display = "block";
    return timerUI;
};

window.StartActualGame = function () {
	window.gameState = "PLAYING";

	document.getElementById("lobby-screen").style.display = "none";
	if (document.querySelector(".bg-animated")) document.querySelector(".bg-animated").style.display = "none";

	document.querySelectorAll("nav, header, .navbar, #navbar, .nav-bar").forEach((el) => { el.style.display = "none"; });
	document.documentElement.style.overflow = "hidden";
	document.body.style.overflow = "hidden";
	document.body.style.margin = "0";

	if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch((e) => console.log(e));

	const card = document.querySelector(".game-card");
	if (card) {
		card.style.position = "fixed"; card.style.top = "0"; card.style.left = "0";
		card.style.width = "100vw"; card.style.height = "100vh"; card.style.background = "transparent";
		card.style.border = "none"; card.style.borderRadius = "0"; card.style.boxShadow = "none";
		card.style.padding = "0"; card.style.margin = "0"; card.style.boxSizing = "border-box";
	}

	document.getElementById("stop-game-btn").style.display = "block";
    window.createDebugTimer();

	if (window.socket && window.socket.readyState === WebSocket.OPEN) window.socket.send(JSON.stringify({ type: "GAME_STARTED" }));

	const players = Object.keys(window.playersOnScreen);
    window.initialPlayerCount = players.length; // Enregistrement pour le palier des 5%
    
    // Désignation des Amoureux
    window.lovers = [];
    if (players.length >= 2) {
        const shuffled = [...players].sort(() => 0.5 - Math.random());
        window.lovers = [shuffled[0], shuffled[1]];
    }

	window.generateItemPool(players.length);
	players.forEach((p) => window.spawnPlayer(p));
	window.startNewRound();
};

window.startNewRound = function () {
	window.chairsOnScreen.forEach((c) => { if (c.element) c.element.remove(); });
	window.chairsOnScreen = [];
	window.chairsAreSpawned = false;
    window.pendingHammers = []; // On nettoie les anciens marteaux
    window.hammersFinished = true;

	const inLife = Object.keys(window.playersOnScreen);
    
    // 🔥 Vérification du Finale à 5%
    window.isFinaleMode = false;
    const threshold = Math.max(2, Math.ceil(window.initialPlayerCount * 0.05));
    if (inLife.length <= threshold) {
        window.isFinaleMode = true;
        window.lovers = []; // Séparation brutale des amoureux
    }

	Object.values(window.playersOnScreen).forEach((p) => {
		if (p.element) {
			p.element.classList.remove("sitting");
			p.element.style.left = window.innerWidth / 2 + "px";
			p.element.style.top = window.innerHeight / 2 + "px";
			p.element.style.filter = "none";
			
			const iceElem = p.element.querySelector(".ice-effect"); if (iceElem) iceElem.remove();
            const shieldElem = p.element.querySelector(".shield-effect"); if (shieldElem) shieldElem.remove();
		}
		p.hasItem = false;
		p.itemLimitReached = false;
		p.isFrozen = false;
        p.isShielded = false;

		if (window.socket && window.socket.readyState === WebSocket.OPEN) {
			window.socket.send(JSON.stringify({ type: "ROUND_STARTED", pseudo: p.pseudo, joueurCible: p.pseudo }));
		}
	});

    // ❤️ Distribution permanente du Cœur aux amoureux (S'ils existent encore)
    window.lovers.forEach(loverPseudo => {
        if (window.playersOnScreen[loverPseudo]) {
            const p = window.playersOnScreen[loverPseudo];
            p.hasItem = true;
            p.itemLimitReached = true;
            p.currentItem = 'COEUR';
            
            // Affiche le bouclier visuellement
            p.isShielded = true;
            const shield = document.createElement("div");
            shield.innerText = "❤️";
            shield.className = "shield-effect";
            shield.style.position = "absolute";
            shield.style.top = "-45px"; shield.style.width = "100%";
            shield.style.textAlign = "center"; shield.style.fontSize = "25px";
            p.element.appendChild(shield);

            if (window.socket && window.socket.readyState === WebSocket.OPEN) {
                window.socket.send(JSON.stringify({ type: 'GIVE_ITEM', pseudo: loverPseudo, joueurCible: loverPseudo, item: 'COEUR' }));
            }
        }
    });

	if (typeof window.playRandomMusic === "function") window.playRandomMusic();

	window.roundDuration = Math.floor(Math.random() * 10000) + 5000; 
	window.roundEndTime = Date.now() + window.roundDuration;

	window.checkMusicTimeout();
    window.createDebugTimer();
    if (window.debugRenderId) cancelAnimationFrame(window.debugRenderId);
    window.renderDebugTimer();
};

window.renderDebugTimer = function() {
    const timerUI = document.getElementById("debug-timer");
    if (!timerUI) return; 
    
    if (window.gameState === "PLAYING" && !window.chairsAreSpawned) {
        let timeLeft = Math.max(0, (window.roundEndTime - Date.now()) / 1000); 
        timerUI.innerText = `⏳ MUSIQUE: ${timeLeft.toFixed(1)}s`;
        if (timeLeft <= 3.0) timerUI.classList.add("urgent-timer"); else timerUI.classList.remove("urgent-timer");
        window.debugRenderId = requestAnimationFrame(() => window.renderDebugTimer());
    } else if (window.chairsAreSpawned) {
        timerUI.innerText = `🪑 CHAISES SPAWNÉES`;
        timerUI.classList.remove("urgent-timer");
    }
};

window.checkMusicTimeout = function () {
	if (window.gameState !== "PLAYING" || window.chairsAreSpawned) return;
	let timeLeft = window.roundEndTime - Date.now();
	if (timeLeft <= 0) window.triggerChairs();
	else window.musicTimer = setTimeout(() => window.checkMusicTimeout(), 100);
};

window.modifyRoundTime = function (percent) {
	if (window.chairsAreSpawned) return;
	let change = window.roundDuration * percent;
	window.roundDuration += change;

	if (window.roundDuration > MAX_ROUND_DURATION) {
        change = change - (window.roundDuration - MAX_ROUND_DURATION);
        window.roundDuration = MAX_ROUND_DURATION;
    } else if (window.roundDuration < MIN_ROUND_DURATION) {
        change = change + (MIN_ROUND_DURATION - window.roundDuration);
        window.roundDuration = MIN_ROUND_DURATION;
    }
    window.roundEndTime += change;
    
    const timerUI = document.getElementById("debug-timer");
    if (timerUI) {
        timerUI.style.backgroundColor = "white"; timerUI.style.color = "black";
        setTimeout(() => { timerUI.style.backgroundColor = "rgba(0, 0, 0, 0.7)"; timerUI.style.color = "#00ff00"; }, 200);
    }
};

window.triggerChairs = function () {
	if (window.chairsAreSpawned) return;
	window.chairsAreSpawned = true;
    window.hammersFinished = false; // Bloque les CHAISE_PLUS

	clearTimeout(window.musicTimer);
	if (typeof window.stopMusic === "function") window.stopMusic();

	const inLife = Object.keys(window.playersOnScreen);
    let amount = inLife.length > 1 ? inLife.length - 1 : 1;
    
    // Si on est en finale, 1 seule chaise apparaît !
    if (window.isFinaleMode) amount = 1;
    
    let hasLovers = (!window.isFinaleMode && window.lovers.length === 2 && inLife.includes(window.lovers[0]) && inLife.includes(window.lovers[1]));
    
	if (typeof window.spawnChairs === "function") window.spawnChairs(amount, hasLovers, window.isFinaleMode);

    // 🔥 Exécution des Marteaux Mémorisés en Séquence
    let delay = 0;
    window.pendingHammers.forEach((pseudo) => {
        setTimeout(() => {
            if (typeof window.executeHammer === "function") window.executeHammer(pseudo);
        }, delay);
        delay += 600; // 600ms entre chaque coup de marteau
    });

    // On libère l'utilisation des CHAISE_PLUS à la fin des animations
    setTimeout(() => {
        window.hammersFinished = true;
    }, delay + 100);

	window.roundForceEndTimer = setTimeout(() => window.endRound(), 10000 + delay);
};

// =========================================
// FIN DE MANCHE & GAGNANT
// =========================================
window.endRound = function () {
	clearTimeout(window.roundForceEndTimer);
	let survivors = [];
	let dead = [];
	
	Object.values(window.playersOnScreen).forEach((p) => {
		if (p.element && p.element.classList.contains("sitting")) survivors.push(p.pseudo);
		else dead.push(p.pseudo);
	});

	dead.forEach((p) => {
		if (window.playersOnScreen[p].element) window.playersOnScreen[p].element.remove();
		delete window.playersOnScreen[p];
		if (window.socket && window.socket.readyState === WebSocket.OPEN) window.socket.send(JSON.stringify({ type: "PLAYER_ELIMINATED", pseudo: p, joueurCible: p }));
	});

	if (survivors.length === 1) {
        window.displayGrandWinner(survivors[0]);
    } else if (survivors.length === 0) {
        alert("💀 MATCH NUL");
        setTimeout(() => window.startNewRound(), 3000);
    } else {
        setTimeout(() => window.startNewRound(), 3000);
    }
};

window.displayGrandWinner = function(name) {
    if (typeof window.stopMusic === "function") window.stopMusic();
    
    const timerUI = document.getElementById("debug-timer");
    if (timerUI) timerUI.style.display = "none";
    
    const overlay = document.getElementById('winner-overlay');
    const nameDisplay = document.getElementById('winner-name');
    
    if (nameDisplay && overlay) {
        nameDisplay.innerText = name;
        overlay.style.display = 'flex';
    }

    for (let i = 0; i < 100; i++) createConfetti();
};

function createConfetti() {
    const colors = ['#e9c46a', '#f4a261', '#e74c3c', '#3498db', '#2ecc71'];
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.top = '-10px';
    
    const size = Math.random() * 10 + 5 + 'px';
    confetti.style.width = size; confetti.style.height = size;
    
    const duration = Math.random() * 3 + 2;
    confetti.style.animationDuration = duration + 's';
    
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), duration * 1000);
}

window.StopGame = function () {
	window.gameState = "MENU";
	clearTimeout(window.musicTimer);
	clearTimeout(window.roundForceEndTimer);
    if (window.debugRenderId) cancelAnimationFrame(window.debugRenderId);
    
    const timerUI = document.getElementById("debug-timer");
    if (timerUI) timerUI.style.display = "none";
    
	if (typeof window.stopMusic === "function") window.stopMusic();

	document.documentElement.style.overflow = "auto"; document.body.style.overflow = "auto";

	if (window.socket && window.socket.readyState === WebSocket.OPEN) {
		window.socket.send(JSON.stringify({ type: "GAME_CLOSED" }));
		setTimeout(() => { window.socket.close(); window.socket = null; location.reload(); }, 100);
	} else { location.reload(); }
};