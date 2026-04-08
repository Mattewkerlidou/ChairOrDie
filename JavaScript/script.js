// =========================================
// LOGIQUE UI (Version avec Animation du Gagnant)
// =========================================
window.toggleQRCode = () => {
	document.getElementById("qr-modal").classList.toggle("active");
};
window.JoinGame = () => {
	document.getElementById("pseudo-modal").classList.add("active");
};
window.closePseudoModal = () => {
	document.getElementById("pseudo-modal").classList.remove("active");
};

window.ConfirmJoin = function () {
	const code = document.getElementById("room-code-input").value;
	const pseudo = document.getElementById("pseudo-input").value;
	if (!code || !pseudo) return alert("Remplis tous les champs !");
	window.location.href =
		"manette.html?pseudo=" +
		encodeURIComponent(pseudo.trim()) +
		"&code=" +
		encodeURIComponent(code.trim().toUpperCase());
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
	document.getElementById("display-room-code").innerText =
		window.currentRoomCode;
	if (!window.socket || window.socket.readyState !== WebSocket.OPEN)
		window.initWebSocket();
	document.getElementById("main-menu").style.display = "none";
	document.getElementById("main-logo").style.display = "none";
	document.getElementById("lobby-screen").style.display = "block";
	window.updateLobbyUI();

	if (document.documentElement.requestFullscreen) {
		document.documentElement
			.requestFullscreen()
			.catch((e) => console.log("Fullscreen error:", e));
	}
};

// =========================================
// BOUCLE DE JEU & TEMPS DYNAMIQUE
// =========================================
window.musicTimer = null;
window.roundForceEndTimer = null;
window.chairsAreSpawned = false;

window.roundEndTime = 0;
window.roundDuration = 0;
const MAX_ROUND_DURATION = 20000; // 20 secondes max
const MIN_ROUND_DURATION = 3000;  // 3 secondes min

window.StartActualGame = function () {
	window.gameState = "PLAYING";

	document.getElementById("lobby-screen").style.display = "none";
	const bgAnim = document.querySelector(".bg-animated");
	if (bgAnim) bgAnim.style.display = "none";

	document
		.querySelectorAll("nav, header, .navbar, #navbar, .nav-bar")
		.forEach((el) => {
			el.style.display = "none";
		});

	document.documentElement.style.overflow = "hidden";
	document.body.style.overflow = "hidden";
	document.body.style.margin = "0";
	document.body.style.padding = "0";

	if (document.documentElement.requestFullscreen) {
		document.documentElement
			.requestFullscreen()
			.catch((e) => console.log("Plein écran ignoré:", e));
	}

	const card = document.querySelector(".game-card");
	if (card) {
		card.style.position = "fixed";
		card.style.top = "0";
		card.style.left = "0";
		card.style.width = "100vw";
		card.style.height = "100vh";
		card.style.background = "transparent";
		card.style.border = "none";
		card.style.borderRadius = "0";
		card.style.boxShadow = "none";
		card.style.padding = "0";
		card.style.margin = "0";
		card.style.boxSizing = "border-box";
	}

	document.getElementById("stop-game-btn").style.display = "block";

	if (window.socket && window.socket.readyState === WebSocket.OPEN)
		window.socket.send(JSON.stringify({ type: "GAME_STARTED" }));

	const players = Object.keys(window.playersOnScreen);
	window.generateItemPool(players.length);
	players.forEach((p) => window.spawnPlayer(p));
	window.startNewRound();
};

window.startNewRound = function () {
	window.chairsOnScreen.forEach((c) => {
		if (c.element) c.element.remove();
	});
	window.chairsOnScreen = [];
	window.chairsAreSpawned = false;

	const inLife = Object.keys(window.playersOnScreen);

	Object.values(window.playersOnScreen).forEach((p) => {
		if (p.element) {
			p.element.classList.remove("sitting");
			p.element.style.left = window.innerWidth / 2 + "px";
			p.element.style.top = window.innerHeight / 2 + "px";
			p.element.style.filter = "none";
			
			const iceElem = p.element.querySelector(".ice-effect");
			if (iceElem) iceElem.remove();
            
            const shieldElem = p.element.querySelector(".shield-effect");
            if (shieldElem) shieldElem.remove();
		}

		p.hasItem = false;
		p.itemLimitReached = false;
		p.isFrozen = false;
        p.isShielded = false;

		if (window.socket && window.socket.readyState === WebSocket.OPEN) {
			window.socket.send(
				JSON.stringify({
					type: "ROUND_STARTED",
					pseudo: p.pseudo,
					joueurCible: p.pseudo,
				}),
			);
		}
	});

	if (typeof window.playRandomMusic === "function") window.playRandomMusic();

	window.roundDuration = Math.floor(Math.random() * 10000) + 5000; 
	window.roundEndTime = Date.now() + window.roundDuration;

	window.checkMusicTimeout();
};

window.checkMusicTimeout = function () {
	if (window.gameState !== "PLAYING" || window.chairsAreSpawned) return;

	let timeLeft = window.roundEndTime - Date.now();

	if (timeLeft <= 0) {
		window.triggerChairs();
	} else {
		window.musicTimer = setTimeout(() => window.checkMusicTimeout(), 100);
	}
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
};

window.triggerChairs = function () {
	if (window.chairsAreSpawned) return;
	window.chairsAreSpawned = true;

	clearTimeout(window.musicTimer);
	if (typeof window.stopMusic === "function") window.stopMusic();

	const inLife = Object.keys(window.playersOnScreen);
	window.spawnChairs(inLife.length > 1 ? inLife.length - 1 : 1);

	window.roundForceEndTimer = setTimeout(() => window.endRound(), 10000);
};

// =========================================
// FIN DE MANCHE & GAGNANT
// =========================================
window.endRound = function () {
	clearTimeout(window.roundForceEndTimer);
	let survivors = [];
	let dead = [];
	
	Object.values(window.playersOnScreen).forEach((p) => {
		if (p.element && p.element.classList.contains("sitting"))
			survivors.push(p.pseudo);
		else dead.push(p.pseudo);
	});

	dead.forEach((p) => {
		if (window.playersOnScreen[p].element)
			window.playersOnScreen[p].element.remove();
		delete window.playersOnScreen[p];
		if (window.socket && window.socket.readyState === WebSocket.OPEN)
			window.socket.send(
				JSON.stringify({
					type: "PLAYER_ELIMINATED",
					pseudo: p,
					joueurCible: p,
				}),
			);
	});

	if (survivors.length === 1) {
        // 🔥 Lancement de l'écran du Grand Gagnant
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
    
    const overlay = document.getElementById('winner-overlay');
    const nameDisplay = document.getElementById('winner-name');
    
    if (nameDisplay && overlay) {
        nameDisplay.innerText = name;
        overlay.style.display = 'flex';
    }

    // Lancement des confettis
    for (let i = 0; i < 100; i++) {
        createConfetti();
    }
};

function createConfetti() {
    const colors = ['#e9c46a', '#f4a261', '#e74c3c', '#3498db', '#2ecc71'];
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.top = '-10px';
    
    const size = Math.random() * 10 + 5 + 'px';
    confetti.style.width = size;
    confetti.style.height = size;
    
    const duration = Math.random() * 3 + 2;
    confetti.style.animationDuration = duration + 's';
    
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), duration * 1000);
}

// =========================================
// GESTION DU MENU & REJOUER
// =========================================
window.StopGame = function () {
	window.gameState = "MENU";
	clearTimeout(window.musicTimer);
	clearTimeout(window.roundForceEndTimer);
	if (typeof window.stopMusic === "function") window.stopMusic();

	document.documentElement.style.overflow = "auto";
	document.body.style.overflow = "auto";

	if (window.socket && window.socket.readyState === WebSocket.OPEN) {
		window.socket.send(JSON.stringify({ type: "GAME_CLOSED" }));
		setTimeout(() => {
			window.socket.close();
			window.socket = null;
			location.reload();
		}, 100);
	} else {
		location.reload();
	}
};