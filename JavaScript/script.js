// =========================================
// LOGIQUE UI (Version 39 - Sans Particules & Anti-Scroll)
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

	// On essaie de passer en plein écran
	if (document.documentElement.requestFullscreen) {
		document.documentElement
			.requestFullscreen()
			.catch((e) => console.log("Fullscreen error:", e));
	}
};

// =========================================
// BOUCLE DE JEU & COUPLE
// =========================================
window.musicTimer = null;
window.roundForceEndTimer = null;
window.chairsAreSpawned = false;

window.StartActualGame = function () {
	window.gameState = "PLAYING";

	// Disparition du lobby
	document.getElementById("lobby-screen").style.display = "none";
	const bgAnim = document.querySelector(".bg-animated");
	if (bgAnim) bgAnim.style.display = "none";

	// Cacher les éventuelles navbars HTML
	document
		.querySelectorAll("nav, header, .navbar, #navbar, .nav-bar")
		.forEach((el) => {
			el.style.display = "none";
		});

	// 🛑 VEROUILLAGE TOTAL DES SCROLLBARS
	document.documentElement.style.overflow = "hidden";
	document.body.style.overflow = "hidden";
	document.body.style.margin = "0";
	document.body.style.padding = "0";

	if (document.documentElement.requestFullscreen) {
		document.documentElement
			.requestFullscreen()
			.catch((e) => console.log("Plein écran ignoré:", e));
	}

	// Le plateau prend l'écran complet
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
		}

		p.hasItem = false;
		p.itemLimitReached = false;
		p.isFrozen = false;

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

	if (inLife.length >= 2) {
		const shuffled = inLife.sort(() => 0.5 - Math.random());
		const p1 = shuffled[0];
		const p2 = shuffled[1];
		[p1, p2].forEach((p) => {
			window.playersOnScreen[p].hasItem = true;
			window.playersOnScreen[p].itemLimitReached = true;
			window.playersOnScreen[p].currentItem = "COEUR";
			if (window.socket && window.socket.readyState === WebSocket.OPEN)
				window.socket.send(
					JSON.stringify({
						type: "GIVE_ITEM",
						pseudo: p,
						joueurCible: p,
						item: "COEUR",
					}),
				);
		});
	}

	if (typeof window.playRandomMusic === "function") window.playRandomMusic();

	window.musicTimer = setTimeout(
		() => {
			window.triggerChairs();
		},
		Math.floor(Math.random() * 10000) + 5000,
	);
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

	if (survivors.length === 1) alert("🏆 GAGNANT : " + survivors[0]);
	else if (survivors.length === 0) alert("💀 MATCH NUL");
	else setTimeout(() => window.startNewRound(), 3000);
};

window.StopGame = function () {
	window.gameState = "MENU";
	clearTimeout(window.musicTimer);
	clearTimeout(window.roundForceEndTimer);
	if (typeof window.stopMusic === "function") window.stopMusic();

	// NOUVEAU : On rend les scrollbars au navigateur si le joueur retourne au menu
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

window.DebugReplay = function () {
	clearTimeout(window.musicTimer);
	clearTimeout(window.roundForceEndTimer);
	if (typeof window.stopMusic === "function") window.stopMusic();
	window.chairsOnScreen.forEach((c) => {
		if (c.element) c.element.remove();
	});
	window.chairsOnScreen = [];
	const players = Object.keys(window.playersOnScreen);
	window.generateItemPool(players.length);
	players.forEach((p) => {
		if (!document.getElementById("player-" + p)) window.spawnPlayer(p);
		if (window.socket && window.socket.readyState === WebSocket.OPEN)
			window.socket.send(
				JSON.stringify({
					type: "ACTION",
					pseudo: p,
					action: "RESET_DEBUG",
					joueurCible: p,
				}),
			);
	});
	window.startNewRound();
};
