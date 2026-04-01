// =========================================
// VARIABLES GLOBALES DU JEU
// =========================================
window.socket = null;
window.playersOnScreen = {};
window.chairsOnScreen = [];
window.currentRoomCode = "";
window.gameState = "MENU";

window.myHostId = "HOST_PC_" + Math.floor(Math.random() * 10000);

// =========================================
// MÉCANIQUES DE JEU
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
	playerDiv.innerText = pseudo.substring(0, 3).toUpperCase();

	playerDiv.style.left = window.innerWidth / 2 + "px";
	playerDiv.style.top = window.innerHeight / 2 + "px";

	arena.appendChild(playerDiv);

	if (window.playersOnScreen[pseudo]) {
		window.playersOnScreen[pseudo].element = playerDiv;
	}
};

window.spawnChairs = function (amount) {
	const arena = document.getElementById("game-arena");
	for (let i = 0; i < amount; i++) {
		const chairDiv = document.createElement("div");
		chairDiv.className = "game-chair";
		chairDiv.id = "chair-" + i;
		chairDiv.innerText = "🪑";

		chairDiv.style.left =
			Math.floor(Math.random() * (window.innerWidth - 100)) + 50 + "px";
		chairDiv.style.top =
			Math.floor(Math.random() * (window.innerHeight - 100)) + 50 + "px";

		arena.appendChild(chairDiv);

		chairsOnScreen.push({
			id: chairDiv.id,
			element: chairDiv,
			x: parseFloat(chairDiv.style.left),
			y: parseFloat(chairDiv.style.top),
			isOccupied: false,
		});
	}
};

// =========================================
// SERVEUR WEBSOCKET ET LOGIQUE DES JOUEURS
// =========================================
window.initWebSocket = function () {
	const serverIP = window.location.hostname;
	socket = new WebSocket(`ws://${serverIP}:8080`);

	socket.onopen = () => {
		console.log(
			"✅ Écran Hôte connecté au serveur avec l'ID : " + window.myHostId,
		);
		socket.send(JSON.stringify({ type: "JOIN", pseudo: window.myHostId }));
	};

	socket.onmessage = (event) => {
		const data = JSON.parse(event.data);
		const arena = document.getElementById("game-arena");
		if (!arena) return;

		// A. UN JOUEUR DEMANDE À REJOINDRE
		if (data.type === "JOIN" || data.type === "NEW_PLAYER") {
			if (data.pseudo.startsWith("HOST_PC")) return;
			if (window.currentRoomCode === "") return;

			const codeRecu = data.code ? data.code.trim().toUpperCase() : "";
			const codeVrai = window.currentRoomCode.trim().toUpperCase();

			console.log(
				`🔍 VÉRIFICATION - Le PC attend [${codeVrai}], reçu [${codeRecu}]`,
			);

			if (codeRecu === codeVrai) {
				socket.send(
					JSON.stringify({
						type: "HOST_ACCEPT_JOIN",
						pseudo: data.pseudo,
					}),
				);

				if (!window.playersOnScreen[data.pseudo]) {
					window.playersOnScreen[data.pseudo] = {
						pseudo: data.pseudo,
						element: null,
					};
					if (window.gameState === "PLAYING") {
						window.spawnPlayer(data.pseudo);
					}
					if (typeof updateLobbyUI === "function") updateLobbyUI();
				}
			} else {
				socket.send(
					JSON.stringify({
						type: "HOST_REJECT_JOIN",
						pseudo: data.pseudo,
						message: "Code Room Incorrect !",
					}),
				);
			}
		}

		// B. MOUVEMENT DU JOYSTICK
		if (data.type === "MOVE" && window.playersOnScreen[data.pseudo]) {
			const pData = window.playersOnScreen[data.pseudo];
			if (!pData || !pData.element) return;

			const playerDiv = pData.element;
			if (playerDiv.classList.contains("sitting")) return;

			let currentX = parseFloat(playerDiv.style.left);
			let currentY = parseFloat(playerDiv.style.top);

			currentX += data.x * 10;
			currentY += data.y * 10;

			currentX = Math.max(30, Math.min(window.innerWidth - 30, currentX));
			currentY = Math.max(
				30,
				Math.min(window.innerHeight - 30, currentY),
			);

			playerDiv.style.left = currentX + "px";
			playerDiv.style.top = currentY + "px";
		}

		// C. ACTION "S'ASSEOIR"
		if (
			data.type === "ACTION" &&
			data.action === "SIT" &&
			window.playersOnScreen[data.pseudo]
		) {
			const pData = window.playersOnScreen[data.pseudo];
			if (!pData || !pData.element) return;

			const playerDiv = pData.element;
			if (playerDiv.classList.contains("sitting")) return;

			const pX = parseFloat(playerDiv.style.left);
			const pY = parseFloat(playerDiv.style.top);
			let aTrouveUneChaise = false;

			for (let i = 0; i < window.chairsOnScreen.length; i++) {
				const chair = window.chairsOnScreen[i];
				if (chair.isOccupied) continue;

				const distance = Math.sqrt(
					Math.pow(pX - chair.x, 2) + Math.pow(pY - chair.y, 2),
				);

				if (distance < 60) {
					aTrouveUneChaise = true;
					chair.isOccupied = true;
					chair.element.classList.add("occupied");
					playerDiv.style.left = chair.x + "px";
					playerDiv.style.top = chair.y + "px";
					playerDiv.classList.add("sitting");
					break;
				}
			}

			if (!aTrouveUneChaise) {
				playerDiv.style.backgroundColor = "red";
				setTimeout(() => {
					if (playerDiv && !playerDiv.classList.contains("sitting")) {
						playerDiv.style.backgroundColor =
							"rgba(255, 255, 255, 0.9)";
					}
				}, 300);
			}
		}

		// D. DÉCONNEXION D'UN JOUEUR
		if (
			data.type === "PLAYER_LEFT" &&
			window.playersOnScreen[data.pseudo]
		) {
			const pData = window.playersOnScreen[data.pseudo];
			if (pData.element && pData.element.parentNode) {
				pData.element.parentNode.removeChild(pData.element);
			}
			delete window.playersOnScreen[data.pseudo];
			if (typeof updateLobbyUI === "function") updateLobbyUI();
		}
	};

	socket.onerror = () => {
		console.error("❌ Erreur de connexion au WebSocket.");
	};
};
