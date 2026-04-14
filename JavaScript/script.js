// =========================================
// LOGIQUE UI & GESTION DES MANCHES (script.js)
// =========================================
window.toggleQRCode = () => {
	const modal = document.getElementById("qr-modal");

	if (!modal.classList.contains("active")) {
		const monIp = window.location.hostname;
		const port = window.location.port ? ":" + window.location.port : "";
		const chemin = window.location.pathname;
		const urlJoueur = `http://${monIp}${port}${chemin}`;

		let qrZone = document.getElementById("qr-code-local");

		if (!qrZone) {
			qrZone = document.createElement("div");
			qrZone.id = "qr-code-local";
			qrZone.style.margin = "15px auto";
			qrZone.style.background = "white";
			qrZone.style.padding = "10px";
			qrZone.style.borderRadius = "10px";
			qrZone.style.display = "inline-block";

			const ancienneImage = modal.querySelector("img");
			if (ancienneImage) {
				ancienneImage.replaceWith(qrZone);
			} else {
				modal.appendChild(qrZone);
			}
		}

		qrZone.innerHTML = "";
		try {
			new QRCode(qrZone, {
				text: urlJoueur,
				width: 200,
				height: 200,
			});
		} catch (e) {
			qrZone.innerHTML =
				"<p style='color:black; font-weight:bold;'>⚠️ Fichier qrcode.min.js manquant !</p>";
		}

		const tousLesTextes = modal.querySelectorAll("*");
		tousLesTextes.forEach((element) => {
			if (
				element.childNodes.length === 1 &&
				element.innerText.includes("Ou tapez")
			) {
				element.innerText = `Ou tapez : ${monIp}${port}`;
			}
		});
	}

	modal.classList.toggle("active");
};

window.JoinGame = () => {
	document.getElementById("pseudo-modal").classList.add("active");
};
window.closePseudoModal = () => {
	document.getElementById("pseudo-modal").classList.remove("active");
};

window.ConfirmJoin = function () {
	const code = document.getElementById("room-code-input").value;
	const pseudo = document.getElementById("pseudo-input").value.trim();

	if (!code || !pseudo) return alert("Remplis tous les champs !");

	if (pseudo.length > 7) {
		return alert("Ton pseudo est trop long ! (Maximum 7 caractères)");
	}

	const forbiddenNames = [
		"MERDE",
		"PUTE",
		"CONNARD",
		"SALOPE",
		"BITCH",
		"FUCK",
		"SHIT",
		"CACA",
		"ASSHOLE",
		"CON",
		"CONS",
		"DEBILE",
		"NUL",
		"NULS",
		"IDIOT",
		"IDIOTE",
		"BOUCHE",
		"NAZE",
		"CRASSE",
		"CRADE",
		"FOU",
		"FOLLE",
		"GLAND",
		"GLANDE",
		"LOOSER",
		"LOSER",
		"MINABLE",
		"RAT",
		"RATS",
		"CHIEN",
		"CHIENNE",
		"PORC",
		"PORCS",
		"ASS",
		"ASSES",
		"DUMB",
		"STUPID",
		"TRASH",
		"SUCKER",
		"NOOB",
		"NOOBS",
		"NOOBY",
		"WEIRDO",
		"CREEP",
		"JERK",
		"SCUM",
		"CRAP",
		"DORK",
		"MORON",
		"DIRTY",
		"FUCC",
		"FUK",
		"SH1T",
		"B1TCH",
		"A55",
		"@SS",
		"F*CK",
		"S*IT",
		"C*NT",
	];
	if (
		forbiddenNames.some((badWord) => pseudo.toUpperCase().includes(badWord))
	) {
		return alert("Ce pseudo est interdit !");
	}

	window.location.href =
		"manette.html?pseudo=" +
		encodeURIComponent(pseudo) +
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

	if (document.documentElement.requestFullscreen)
		document.documentElement
			.requestFullscreen()
			.catch((e) => console.log(e));
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

window.pendingHammers = [];
window.hammersFinished = true;
window.initialPlayerCount = 0;
window.isFinaleMode = false;
window.lovers = [];
window.allGamePlayers = [];

window.StartActualGame = function () {
	const players = Object.keys(window.playersOnScreen);

	// 🔥 Sécurité : Impossible de lancer s'il y a 0 joueur
	if (players.length === 0) {
		alert(
			"⚠️ Impossible de lancer la partie : Aucun joueur n'est connecté !",
		);
		return;
	}

	window.gameState = "PLAYING";

	document.getElementById("lobby-screen").style.display = "none";
	if (document.querySelector(".bg-animated"))
		document.querySelector(".bg-animated").style.display = "none";

	document
		.querySelectorAll("nav, header, .navbar, #navbar, .nav-bar")
		.forEach((el) => {
			el.style.display = "none";
		});
	document.documentElement.style.overflow = "hidden";
	document.body.style.overflow = "hidden";
	document.body.style.margin = "0";

	if (document.documentElement.requestFullscreen)
		document.documentElement
			.requestFullscreen()
			.catch((e) => console.log(e));

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

	if (window.socket && window.socket.readyState === WebSocket.OPEN)
		window.socket.send(JSON.stringify({ type: "GAME_STARTED" }));

	window.initialPlayerCount = players.length;

	window.allGamePlayers = [];
	players.forEach((p) => {
		window.allGamePlayers.push({
			pseudo: p,
			color: window.playersOnScreen[p].color,
		});
	});

	window.lovers = [];
	if (players.length >= 10) {
		const shuffled = [...players].sort(() => 0.5 - Math.random());
		window.lovers = [shuffled[0], shuffled[1]];
	}

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
	window.pendingHammers = [];
	window.hammersFinished = true;

	const inLife = Object.keys(window.playersOnScreen);

	window.isFinaleMode = false;
	const threshold = Math.max(2, Math.ceil(window.initialPlayerCount * 0.05));
	if (inLife.length <= threshold) {
		window.isFinaleMode = true;
		window.lovers = [];
	} else if (inLife.length < 10) {
		window.lovers = [];
	}

	window.generateItemPool(inLife.length);

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

	window.lovers.forEach((loverPseudo) => {
		if (window.playersOnScreen[loverPseudo]) {
			const p = window.playersOnScreen[loverPseudo];
			p.hasItem = true;
			p.itemLimitReached = true;
			p.currentItem = "COEUR";

			p.isShielded = true;
			const shield = document.createElement("div");
			shield.innerText = "❤️";
			shield.className = "shield-effect";
			shield.style.position = "absolute";
			shield.style.top = "-45px";
			shield.style.width = "100%";
			shield.style.textAlign = "center";
			shield.style.fontSize = "25px";
			p.element.appendChild(shield);

			if (window.socket && window.socket.readyState === WebSocket.OPEN) {
				window.socket.send(
					JSON.stringify({
						type: "GIVE_ITEM",
						pseudo: loverPseudo,
						joueurCible: loverPseudo,
						item: "COEUR",
					}),
				);
			}
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
};

window.triggerChairs = function () {
	if (window.chairsAreSpawned) return;
	window.chairsAreSpawned = true;
	window.hammersFinished = false;

	clearTimeout(window.musicTimer);
	if (typeof window.stopMusic === "function") window.stopMusic();

	const inLife = Object.keys(window.playersOnScreen);
	let amount = inLife.length > 1 ? inLife.length - 1 : 1;

	if (window.isFinaleMode) amount = 1;

	let hasLovers =
		!window.isFinaleMode &&
		window.lovers.length === 2 &&
		inLife.includes(window.lovers[0]) &&
		inLife.includes(window.lovers[1]);

	if (hasLovers && amount > 1) {
		amount -= 1;
	}

	if (typeof window.spawnChairs === "function")
		window.spawnChairs(amount, hasLovers, window.isFinaleMode);

	let delay = 0;
	window.pendingHammers.forEach((pseudo) => {
		setTimeout(() => {
			if (typeof window.executeHammer === "function")
				window.executeHammer(pseudo);
		}, delay);
		delay += 600;
	});

	setTimeout(() => {
		window.hammersFinished = true;
	}, delay + 100);

	window.roundForceEndTimer = setTimeout(
		() => window.endRound(),
		10000 + delay,
	);
};

// =========================================
// FIN DE MANCHE & GAGNANT (ANIMATION ÉPIQUE)
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
		window.displayGrandWinner(survivors[0]);
	} else if (survivors.length === 0) {
		alert("💀 MATCH NUL");
		setTimeout(() => window.startNewRound(), 3000);
	} else {
		setTimeout(() => window.startNewRound(), 3000);
	}
};

window.displayGrandWinner = function (name) {
	if (typeof window.stopMusic === "function") window.stopMusic();

	const arena = document.getElementById("game-arena");
	if (arena) arena.innerHTML = "";

	const victoryScreen = document.createElement("div");
	victoryScreen.id = "victory-screen";
	victoryScreen.style.position = "fixed";
	victoryScreen.style.top = "0";
	victoryScreen.style.left = "0";
	victoryScreen.style.width = "100vw";
	victoryScreen.style.height = "100vh";
	victoryScreen.style.backgroundColor = "rgba(0,0,0,0.85)";
	victoryScreen.style.zIndex = "9999";
	victoryScreen.style.overflow = "hidden";
	document.body.appendChild(victoryScreen);

	const chair = document.createElement("div");
	chair.style.position = "absolute";
	chair.style.left = "50%";
	chair.style.top = "50%";
	chair.style.transform = "translate(-50%, -50%)";
	chair.style.width = "150px";
	chair.style.height = "150px";
	chair.style.backgroundImage = 'url("../sprite/golden_chair.png")';
	chair.style.backgroundSize = "contain";
	chair.style.backgroundRepeat = "no-repeat";
	chair.style.backgroundPosition = "center";
	chair.style.zIndex = "10";
	victoryScreen.appendChild(chair);

	const centerX = window.innerWidth / 2;
	const centerY = window.innerHeight / 2;
	const radius = Math.min(centerX, centerY) * 0.75;
	const totalPlayers = window.allGamePlayers
		? window.allGamePlayers.length
		: 1;

	let winnerElem = null;

	if (window.allGamePlayers) {
		window.allGamePlayers.forEach((p, index) => {
			const angle = (index / totalPlayers) * Math.PI * 2;
			const x = centerX + radius * Math.cos(angle);
			const y = centerY + radius * Math.sin(angle);

			const slimeDiv = document.createElement("div");
			slimeDiv.style.position = "absolute";
			slimeDiv.style.left = x + "px";
			slimeDiv.style.top = y + "px";
			slimeDiv.style.transform = "translate(-50%, -50%)";
			slimeDiv.style.width = "70px";
			slimeDiv.style.height = "70px";
			slimeDiv.style.transition = "all 1s cubic-bezier(0.25, 1, 0.5, 1)";
			slimeDiv.style.zIndex = "15";

			let dir = "front";
			if (Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))) {
				dir = Math.cos(angle) > 0 ? "left" : "right";
			} else {
				dir = Math.sin(angle) > 0 ? "back" : "front";
			}

			const img = document.createElement("img");
			img.src = `../sprite/caractere/${p.color}/slime_${dir}.png`;
			img.style.width = "100%";
			img.style.height = "100%";
			img.style.objectFit = "contain";
			slimeDiv.appendChild(img);
			victoryScreen.appendChild(slimeDiv);

			if (p.pseudo === name) {
				winnerElem = slimeDiv;
				winnerElem.dataset.color = p.color;
				winnerElem.style.zIndex = "20";
			}
		});
	}

	const nameDisplay = document.createElement("div");
	nameDisplay.style.position = "absolute";
	nameDisplay.style.top = "15%";
	nameDisplay.style.width = "100%";
	nameDisplay.style.textAlign = "center";
	nameDisplay.style.color = "#F4A261";
	nameDisplay.style.fontSize = "70px";
	nameDisplay.style.fontFamily = "Impact, sans-serif";
	nameDisplay.style.textShadow = "0 0 20px #E9C46A, 4px 4px 10px black";
	nameDisplay.style.opacity = "0";
	nameDisplay.style.transform = "scale(0.5)";
	nameDisplay.style.transition = "all 1s ease-out";
	nameDisplay.style.zIndex = "30";
	nameDisplay.innerText = "👑 " + name + " 👑";
	victoryScreen.appendChild(nameDisplay);

	// 🔥 LE BOUTON "RETOUR AU MENU"
	const replayBtn = document.createElement("button");
	replayBtn.innerText = "RETOUR AU MENU";
	replayBtn.style.position = "absolute";
	replayBtn.style.bottom = "10%";
	replayBtn.style.left = "50%";
	replayBtn.style.transform = "translateX(-50%)";
	replayBtn.style.padding = "15px 40px";
	replayBtn.style.fontSize = "24px";
	replayBtn.style.fontWeight = "bold";
	replayBtn.style.color = "white";
	replayBtn.style.backgroundColor = "#e74c3c";
	replayBtn.style.border = "none";
	replayBtn.style.borderRadius = "50px";
	replayBtn.style.cursor = "pointer";
	replayBtn.style.boxShadow = "0 6px 0 #c0392b";
	replayBtn.style.opacity = "0";
	replayBtn.style.transition = "opacity 1s ease, transform 0.1s ease";
	replayBtn.style.zIndex = "40";

	replayBtn.onmousedown = () =>
		(replayBtn.style.transform = "translateX(-50%) translateY(6px)");
	replayBtn.onmouseup = () =>
		(replayBtn.style.transform = "translateX(-50%)");
	replayBtn.onclick = () => location.reload();

	victoryScreen.appendChild(replayBtn);

	setTimeout(() => {
		if (winnerElem) {
			winnerElem.style.left = "50%";
			winnerElem.style.top = "48%";
			winnerElem.style.transform = "translate(-50%, -50%) scale(2.2)";

			const img = winnerElem.querySelector("img");
			if (img)
				img.src = `../sprite/caractere/${winnerElem.dataset.color}/slime_front.png`;
		}

		nameDisplay.style.opacity = "1";
		nameDisplay.style.transform = "scale(1)";

		try {
			const victoryMusic = new Audio("../bin/victory.mp3");
			victoryMusic.play().catch((e) => console.log(e));
		} catch (error) {
			console.log(error);
		}

		for (let i = 0; i < 150; i++) {
			setTimeout(() => createConfetti(victoryScreen), i * 15);
		}

		setTimeout(() => {
			replayBtn.style.opacity = "1";
		}, 2000);
	}, 1500);
};

function createConfetti(parent = document.body) {
	const colors = ["#e9c46a", "#f4a261", "#e74c3c", "#3498db", "#2ecc71"];
	const confetti = document.createElement("div");
	confetti.className = "confetti";
	confetti.style.position = "fixed";
	confetti.style.left = Math.random() * 100 + "vw";
	confetti.style.backgroundColor =
		colors[Math.floor(Math.random() * colors.length)];
	confetti.style.top = "-10px";
	confetti.style.zIndex = "10000";

	const size = Math.random() * 10 + 5 + "px";
	confetti.style.width = size;
	confetti.style.height = size;

	const duration = Math.random() * 3 + 2;
	confetti.style.animationDuration = duration + "s";

	parent.appendChild(confetti);
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
