// =========================================
// VARIABLES GLOBALES DU JEU (jeu.js)
// =========================================
window.socket = null;
window.playersOnScreen = {};
window.chairsOnScreen = [];
window.currentRoomCode = "";
window.gameState = "MENU";

window.myHostId = "HOST_PC_" + Math.floor(Math.random() * 10000);

// =========================================
// SYSTÈME AUDIO
// =========================================
window.gameAudio = new Audio();
window.musicList = [];

fetch("../bin/get_music.php")
	.then((response) => response.json())
	.then((data) => {
		window.musicList = data;
	})
	.catch((error) => console.error("❌ Erreur musique:", error));

window.playRandomMusic = function () {
	if (window.musicList.length === 0) return;
	window.gameAudio.src =
		window.musicList[Math.floor(Math.random() * window.musicList.length)];
	window.gameAudio.currentTime = Math.floor(Math.random() * 20);
	window.gameAudio.play().catch((e) => console.log(e));
};

window.stopMusic = function () {
	window.gameAudio.pause();
};

// =========================================
// MÉCANIQUES DE JEU (SPRITES)
// =========================================
window.generateRoomCode = function () {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	let code = "";
	for (let i = 0; i < 4; i++)
		code += chars.charAt(Math.floor(Math.random() * chars.length));
	return code;
};

window.spawnPlayer = function (pseudo) {
	const arena = document.getElementById("game-arena");
	if (!arena) return;

	const playerDiv = document.createElement("div");
	playerDiv.id = "player-" + pseudo;
	playerDiv.className = "player-avatar";

	const pseudoSpan = document.createElement("div");
	pseudoSpan.innerText = pseudo;
	pseudoSpan.style.position = "absolute";
	pseudoSpan.style.top = "-25px";
	pseudoSpan.style.width = "100%";
	pseudoSpan.style.textAlign = "center";
	pseudoSpan.style.color = "white";
	pseudoSpan.style.fontWeight = "bold";
	pseudoSpan.style.textShadow = "1px 1px 2px black";
	pseudoSpan.style.zIndex = "10";
	playerDiv.appendChild(pseudoSpan);

	const color = window.playersOnScreen[pseudo].color || "red";
	playerDiv.dataset.color = color;
	playerDiv.dataset.direction = "front";

	const directions = ["front", "back", "left", "right"];
	directions.forEach((dir) => {
		const img = document.createElement("img");
		img.id = `img-${pseudo}-${dir}`;
		img.src = `../sprite/caractere/${color}/slime_${dir}.png`;
		img.style.position = "absolute";
		img.style.top = "0";
		img.style.left = "0";
		img.style.width = "100%";
		img.style.height = "100%";
		img.style.objectFit = "contain";
		img.style.pointerEvents = "none";
		img.style.display = dir === "front" ? "block" : "none";
		playerDiv.appendChild(img);
	});

	playerDiv.style.left = window.innerWidth / 2 + "px";
	playerDiv.style.top = window.innerHeight / 2 + "px";
	arena.appendChild(playerDiv);

	if (window.playersOnScreen[pseudo])
		window.playersOnScreen[pseudo].element = playerDiv;
};

window.spawnChairs = function (amount, hasLovers, isFinale) {
	const arena = document.getElementById("game-arena");
	for (let i = 0; i < amount; i++) {
		const chairDiv = document.createElement("div");
		chairDiv.className = "game-chair";
		chairDiv.id = "chair-" + i;
		chairDiv.style.left =
			Math.floor(Math.random() * (window.innerWidth - 100)) + 50 + "px";
		chairDiv.style.top =
			Math.floor(Math.random() * (window.innerHeight - 100)) + 50 + "px";

		let isGolden = false;
		let isBench = false;
		let maxOccupants = 1;

		if (isFinale) {
			chairDiv.style.backgroundImage =
				'url("../sprite/golden_chair.png")';
			isGolden = true;
		} else if (hasLovers && i === 0) {
			chairDiv.style.backgroundImage = 'url("../sprite/bench.png")';
			isBench = true;
			maxOccupants = 2;
		} else {
			chairDiv.style.backgroundImage = 'url("../sprite/chair.png")';
		}

		arena.appendChild(chairDiv);
		window.chairsOnScreen.push({
			id: chairDiv.id,
			element: chairDiv,
			x: parseFloat(chairDiv.style.left),
			y: parseFloat(chairDiv.style.top),
			isOccupied: false,
			occupants: [],
			maxOccupants: maxOccupants,
			isBroken: false,
			isGolden: isGolden,
			isBench: isBench,
		});
	}
};

// =========================================
// SERVEUR WEBSOCKET
// =========================================
window.initWebSocket = function () {
	window.socket = new WebSocket(`ws://${window.location.hostname}:8080`);
	window.socket.onopen = () => {
		window.socket.send(
			JSON.stringify({ type: "JOIN", pseudo: window.myHostId }),
		);
	};

	window.socket.onmessage = (event) => {
		const data = JSON.parse(event.data);
		if (!document.getElementById("game-arena")) return;

		if (data.type === "JOIN" || data.type === "NEW_PLAYER") {
			if (data.pseudo.startsWith("HOST_PC")) return;
			if (window.currentRoomCode === "") return;

			const pseudoUpper = data.pseudo.toUpperCase();

			// Ta liste de mots interdits
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
				data.code?.trim().toUpperCase() !==
				window.currentRoomCode.trim().toUpperCase()
			) {
				window.socket.send(
					JSON.stringify({
						type: "HOST_REJECT_JOIN",
						pseudo: data.pseudo,
						joueurCible: data.pseudo,
						message: "Code Room Incorrect !",
					}),
				);
				return;
			}

			if (data.pseudo.length > 7) {
				window.socket.send(
					JSON.stringify({
						type: "HOST_REJECT_JOIN",
						pseudo: data.pseudo,
						joueurCible: data.pseudo,
						message: "Pseudo trop long (Max 7 caractères) !",
					}),
				);
				return;
			}

			if (
				forbiddenNames.some((badWord) => pseudoUpper.includes(badWord))
			) {
				window.socket.send(
					JSON.stringify({
						type: "HOST_REJECT_JOIN",
						pseudo: data.pseudo,
						joueurCible: data.pseudo,
						message: "Ce pseudo est interdit !",
					}),
				);
				return;
			}

			if (window.playersOnScreen[data.pseudo]) {
				window.socket.send(
					JSON.stringify({
						type: "HOST_REJECT_JOIN",
						pseudo: data.pseudo,
						joueurCible: data.pseudo,
						message:
							"Ce pseudo est déjà pris par un autre joueur !",
					}),
				);
				return;
			}

			window.socket.send(
				JSON.stringify({
					type: "HOST_ACCEPT_JOIN",
					pseudo: data.pseudo,
					joueurCible: data.pseudo,
				}),
			);

			window.playersOnScreen[data.pseudo] = {
				pseudo: data.pseudo,
				element: null,
				color: "red",
				hasItem: false,
				itemLimitReached: false,
				currentItem: null,
				isFrozen: false,
				isShielded: false,
			};

			if (window.gameState === "PLAYING") window.spawnPlayer(data.pseudo);
			if (typeof window.updateLobbyUI === "function")
				window.updateLobbyUI();
		}

		if (
			data.type === "ACTION" &&
			data.action === "SET_COLOR" &&
			window.playersOnScreen[data.pseudo]
		) {
			window.playersOnScreen[data.pseudo].color = data.color;
			const pDiv = window.playersOnScreen[data.pseudo].element;
			if (pDiv) {
				pDiv.dataset.color = data.color;
				["front", "back", "left", "right"].forEach((dir) => {
					const img = document.getElementById(
						`img-${data.pseudo}-${dir}`,
					);
					if (img)
						img.src = `../sprite/caractere/${data.color}/slime_${dir}.png`;
				});
			}
		}

		if (
			data.type === "ACTION" &&
			data.action === "FARM_ROLL" &&
			window.playersOnScreen[data.pseudo]
		) {
			if (typeof window.handleFarmRoll === "function")
				window.handleFarmRoll(
					window.playersOnScreen[data.pseudo],
					data,
				);
		}

		if (
			data.type === "ACTION" &&
			data.action === "USE_ITEM" &&
			window.playersOnScreen[data.pseudo]
		) {
			const pData = window.playersOnScreen[data.pseudo];
			if (
				pData.hasItem &&
				pData.currentItem &&
				typeof window.handleItemUse === "function"
			) {
				window.handleItemUse(pData, data);
			}
		}

		if (
			data.type === "ACTION" &&
			data.action === "SIT" &&
			window.playersOnScreen[data.pseudo]
		) {
			const pData = window.playersOnScreen[data.pseudo];
			if (
				!pData ||
				!pData.element ||
				pData.element.classList.contains("sitting") ||
				pData.isFrozen
			)
				return;
			if (!window.chairsAreSpawned) return;

			const pX = parseFloat(pData.element.style.left);
			const pY = parseFloat(pData.element.style.top);
			let seatFound = false;

			const isLover =
				window.lovers && window.lovers.includes(data.pseudo);

			for (let chair of window.chairsOnScreen) {
				if (
					chair.isBroken ||
					chair.occupants.length >= chair.maxOccupants
				)
					continue;

				if (isLover && !chair.isBench && !chair.isGolden) continue;
				if (!isLover && chair.isBench) continue;

				if (Math.sqrt((pX - chair.x) ** 2 + (pY - chair.y) ** 2) < 60) {
					seatFound = true;

					chair.occupants.push(data.pseudo);
					if (chair.occupants.length >= chair.maxOccupants) {
						chair.isOccupied = true;
						chair.element.classList.add("occupied");
					}

					let offsetX = 0;
					if (chair.isBench)
						offsetX = chair.occupants.length === 1 ? -20 : 20;

					pData.element.style.left = chair.x + offsetX + "px";
					pData.element.style.top = chair.y + "px";
					pData.element.classList.add("sitting");

					pData.element.dataset.direction = "front";
					["front", "back", "left", "right"].forEach((d) => {
						const img = document.getElementById(
							`img-${data.pseudo}-${d}`,
						);
						if (img)
							img.style.display =
								d === "front" ? "block" : "none";
					});
					break;
				}
			}

			if (!seatFound) {
				pData.element.style.filter =
					"sepia(1) hue-rotate(-50deg) saturate(5)";
				setTimeout(() => {
					if (
						!pData.element.classList.contains("sitting") &&
						!pData.isFrozen
					)
						pData.element.style.filter = "none";
				}, 300);
			} else {
				const chaisesRestantes = window.chairsOnScreen.filter(
					(c) => !c.isBroken,
				);
				const allFull = chaisesRestantes.every(
					(c) => c.occupants.length >= c.maxOccupants,
				);

				if (allFull) {
					if (typeof window.endRound === "function")
						window.endRound();
				}
			}
		}

		if (data.type === "MOVE" && window.playersOnScreen[data.pseudo]) {
			const pData = window.playersOnScreen[data.pseudo];

			if (
				!pData ||
				!pData.element ||
				pData.element.classList.contains("sitting") ||
				pData.isFrozen
			)
				return;

			let curX = parseFloat(pData.element.style.left) + data.x * 10;
			let curY = parseFloat(pData.element.style.top) + data.y * 10;
			curX = Math.max(30, Math.min(window.innerWidth - 30, curX));
			curY = Math.max(30, Math.min(window.innerHeight - 30, curY));
			pData.element.style.left = curX + "px";
			pData.element.style.top = curY + "px";

			if (Math.abs(data.x) > 0.1 || Math.abs(data.y) > 0.1) {
				let dir =
					Math.abs(data.x) > Math.abs(data.y)
						? data.x > 0
							? "right"
							: "left"
						: data.y > 0
							? "front"
							: "back";
				if (pData.element.dataset.direction !== dir) {
					pData.element.dataset.direction = dir;
					["front", "back", "left", "right"].forEach((d) => {
						const img = document.getElementById(
							`img-${data.pseudo}-${d}`,
						);
						if (img)
							img.style.display = d === dir ? "block" : "none";
					});
				}
			}
		}

		if (
			data.type === "PLAYER_LEFT" &&
			window.playersOnScreen[data.pseudo]
		) {
			if (window.playersOnScreen[data.pseudo].element)
				window.playersOnScreen[data.pseudo].element.remove();
			delete window.playersOnScreen[data.pseudo];
			if (typeof window.updateLobbyUI === "function")
				window.updateLobbyUI();
		}
	};
};
