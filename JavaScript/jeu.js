// =========================================
// VARIABLES GLOBALES DU JEU (Version 36)
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
// SYSTÈME D'OBJETS
// =========================================
window.itemPool = [];
window.generateItemPool = function (nbJoueurs) {
	window.itemPool = [];
	let nbChaise = Math.max(1, Math.floor(nbJoueurs * 0.15));
	let nbMarteau = Math.max(1, Math.floor(nbJoueurs * 0.15));
	let nbEclair = Math.max(1, Math.floor(nbJoueurs * 0.2));
	let nbEscargot = Math.max(1, Math.floor(nbJoueurs * 0.15));
	let nbFreeze = Math.max(1, Math.floor(nbJoueurs * 0.15));
	let nbPause = Math.max(1, Math.floor(nbJoueurs * 0.05));

	for (let i = 0; i < nbChaise; i++) window.itemPool.push("CHAISE_PLUS");
	for (let i = 0; i < nbMarteau; i++) window.itemPool.push("MARTEAU");
	for (let i = 0; i < nbEclair; i++) window.itemPool.push("ECLAIR");
	for (let i = 0; i < nbEscargot; i++) window.itemPool.push("ESCARGOT");
	for (let i = 0; i < nbFreeze; i++) window.itemPool.push("FREEZE");
	for (let i = 0; i < nbPause; i++) window.itemPool.push("PAUSE");

	for (let i = window.itemPool.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[window.itemPool[i], window.itemPool[j]] = [
			window.itemPool[j],
			window.itemPool[i],
		];
	}
};

// =========================================
// MÉCANIQUES DE JEU (SPRITES OPTIMISÉS GPU)
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

window.spawnChairs = function (amount) {
	const arena = document.getElementById("game-arena");
	for (let i = 0; i < amount; i++) {
		const chairDiv = document.createElement("div");
		chairDiv.className = "game-chair";
		chairDiv.id = "chair-" + i;
		chairDiv.style.left =
			Math.floor(Math.random() * (window.innerWidth - 100)) + 50 + "px";
		chairDiv.style.top =
			Math.floor(Math.random() * (window.innerHeight - 100)) + 50 + "px";

		chairDiv.style.backgroundImage = 'url("../sprite/chair.png")';

		arena.appendChild(chairDiv);
		window.chairsOnScreen.push({
			id: chairDiv.id,
			element: chairDiv,
			x: parseFloat(chairDiv.style.left),
			y: parseFloat(chairDiv.style.top),
			isOccupied: false,
			isBroken: false,
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
			if (
				data.code?.trim().toUpperCase() ===
				window.currentRoomCode.trim().toUpperCase()
			) {
				window.socket.send(
					JSON.stringify({
						type: "HOST_ACCEPT_JOIN",
						pseudo: data.pseudo,
						joueurCible: data.pseudo,
					}),
				);
				if (!window.playersOnScreen[data.pseudo]) {
					window.playersOnScreen[data.pseudo] = {
						pseudo: data.pseudo,
						element: null,
						color: "red",
						hasItem: false,
						itemLimitReached: false,
						currentItem: null,
						isFrozen: false,
					};
					if (window.gameState === "PLAYING")
						window.spawnPlayer(data.pseudo);
					if (typeof window.updateLobbyUI === "function")
						window.updateLobbyUI();
				}
			} else {
				window.socket.send(
					JSON.stringify({
						type: "HOST_REJECT_JOIN",
						pseudo: data.pseudo,
						joueurCible: data.pseudo,
						message: "Code Room Incorrect !",
					}),
				);
			}
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
			const pData = window.playersOnScreen[data.pseudo];

			if (!pData.itemLimitReached && window.gameState === "PLAYING") {
				const roll = Math.floor(Math.random() * 100) + 1;
				const chanceDeGagner = 100; // ⚠️ À réduire pour le vrai jeu

				if (roll <= chanceDeGagner && window.itemPool.length > 0) {
					let item = window.itemPool.pop();
					pData.hasItem = true;
					pData.itemLimitReached = true;
					pData.currentItem = item;
					window.socket.send(
						JSON.stringify({
							type: "GIVE_ITEM",
							pseudo: data.pseudo,
							joueurCible: data.pseudo,
							item: item,
						}),
					);
				} else {
					window.socket.send(
						JSON.stringify({
							type: "ROLL_FAILED",
							pseudo: data.pseudo,
							joueurCible: data.pseudo,
						}),
					);
				}
			}
		}

		// --- 💥 UTILISATION D'UN OBJET ---
		if (
			data.type === "ACTION" &&
			data.action === "USE_ITEM" &&
			window.playersOnScreen[data.pseudo]
		) {
			const pData = window.playersOnScreen[data.pseudo];

			if (pData.hasItem && pData.currentItem) {
				const itemUsed = pData.currentItem;
				console.log(`💥 ${data.pseudo} utilise : ${itemUsed} !`);

				pData.hasItem = false;
				pData.currentItem = null;

				if (itemUsed === "PAUSE") {
					if (typeof window.triggerChairs === "function")
						window.triggerChairs();
				} else if (itemUsed === "FREEZE") {
					const myX = parseFloat(pData.element.style.left);
					const myY = parseFloat(pData.element.style.top);
					const freezeRadius = 250;

					pData.element.style.transform =
						"translate(-50%, -50%) scale(1.5)";
					setTimeout(() => {
						if (
							pData.element &&
							!pData.element.classList.contains("sitting")
						)
							pData.element.style.transform =
								"translate(-50%, -50%) scale(1)";
					}, 200);

					Object.values(window.playersOnScreen).forEach((victim) => {
						if (
							victim.pseudo !== data.pseudo &&
							!victim.element.classList.contains("sitting")
						) {
							const vX = parseFloat(victim.element.style.left);
							const vY = parseFloat(victim.element.style.top);
							if (
								Math.sqrt((myX - vX) ** 2 + (myY - vY) ** 2) <=
								freezeRadius
							) {
								victim.isFrozen = true;
								victim.element.style.filter =
									"sepia(1) hue-rotate(180deg) saturate(3) brightness(0.8)";
								const ice = document.createElement("div");
								ice.innerText = "❄️";
								ice.className = "ice-effect";
								ice.style.position = "absolute";
								ice.style.top = "-40px";
								ice.style.width = "100%";
								ice.style.textAlign = "center";
								ice.style.fontSize = "30px";
								ice.style.zIndex = "20";
								victim.element.appendChild(ice);

								setTimeout(() => {
									victim.isFrozen = false;
									if (victim.element) {
										victim.element.style.filter = "none";
										const iceElem =
											victim.element.querySelector(
												".ice-effect",
											);
										if (iceElem) iceElem.remove();
									}
								}, 1500);
							}
						}
					});
				} else if (itemUsed === "MARTEAU") {
					const myX = parseFloat(pData.element.style.left);
					const myY = parseFloat(pData.element.style.top);
					let targetChair = null;
					let minDistance = 200;

					for (let chair of window.chairsOnScreen) {
						if (chair.isBroken) continue;
						const dist = Math.sqrt(
							(myX - chair.x) ** 2 + (myY - chair.y) ** 2,
						);
						if (dist < minDistance) {
							minDistance = dist;
							targetChair = chair;
						}
					}

					if (targetChair) {
						targetChair.isBroken = true;

						const hammerDiv = document.createElement("div");
						hammerDiv.style.position = "absolute";
						hammerDiv.style.left = targetChair.x + "px";
						hammerDiv.style.top = targetChair.y - 40 + "px";
						hammerDiv.style.width = "64px";
						hammerDiv.style.height = "64px";
						hammerDiv.style.backgroundImage =
							"url('../sprite/items/hammer_vertical.png')";
						hammerDiv.style.backgroundSize = "contain";
						hammerDiv.style.backgroundRepeat = "no-repeat";
						hammerDiv.style.zIndex = "60";
						document
							.getElementById("game-arena")
							.appendChild(hammerDiv);

						setTimeout(() => {
							hammerDiv.style.backgroundImage =
								"url('../sprite/items/hammer_diagonal.png')";
						}, 100);
						setTimeout(() => {
							hammerDiv.style.backgroundImage =
								"url('../sprite/items/hammer_horizontal.png')";
							targetChair.element.style.backgroundImage =
								"url('../sprite/items/broken_chair.png')";

							if (targetChair.isOccupied) {
								Object.values(window.playersOnScreen).forEach(
									(p) => {
										if (
											p.element.classList.contains(
												"sitting",
											) &&
											Math.abs(
												parseFloat(
													p.element.style.left,
												) - targetChair.x,
											) < 5 &&
											Math.abs(
												parseFloat(
													p.element.style.top,
												) - targetChair.y,
											) < 5
										) {
											p.element.classList.remove(
												"sitting",
											);
											p.element.style.left =
												targetChair.x + 80 + "px";
											p.isFrozen = true;
											p.element.style.filter =
												"grayscale(1)";

											setTimeout(() => {
												p.isFrozen = false;
												if (p.element)
													p.element.style.filter =
														"none";
											}, 2000);
										}
									},
								);
								targetChair.isOccupied = false;
							}
						}, 200);

						setTimeout(() => {
							hammerDiv.remove();
						}, 500);
					}
				}
			}
		}

		// --- MOUVEMENT ---
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

		// --- S'ASSEOIR ---
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

			for (let chair of window.chairsOnScreen) {
				if (chair.isOccupied || chair.isBroken) continue;

				if (Math.sqrt((pX - chair.x) ** 2 + (pY - chair.y) ** 2) < 60) {
					seatFound = true;
					chair.isOccupied = true;
					chair.element.classList.add("occupied");
					pData.element.style.left = chair.x + "px";
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
				if (
					chaisesRestantes.filter((c) => c.isOccupied).length >=
					chaisesRestantes.length
				) {
					if (typeof window.endRound === "function")
						window.endRound();
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
