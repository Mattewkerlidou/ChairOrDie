// =========================================
// 1. CONNEXION ET SÉCURITÉ (AVEC ROOM CODE)
// =========================================
const urlParams = new URLSearchParams(window.location.search);
const pseudoChoisi = urlParams.get("pseudo") || "Anonyme";
const codeChoisi = urlParams.get("code") || "";

const serverIP = window.location.hostname;
const socket = new WebSocket(`ws://${serverIP}:8080`);

let isReady = false;

socket.onopen = () => {
	console.log("✅ Connexion établie. Envoi du code Room dans le JOIN...");

	socket.send(
		JSON.stringify({
			type: "JOIN",
			pseudo: pseudoChoisi,
			code: codeChoisi,
		}),
	);
};

socket.onmessage = (event) => {
	const data = JSON.parse(event.data);

	if (data.type === "HOST_ACCEPT_JOIN" && data.pseudo === pseudoChoisi) {
		isReady = true;
		console.log("🚀 Code accepté, commandes déverrouillées !");
	}

	if (data.type === "HOST_REJECT_JOIN" && data.pseudo === pseudoChoisi) {
		alert("❌ Connexion refusée : " + data.message);
		window.location.href = "../Html/index.html";
	}

	if (data.type === "ERROR" && !isReady) {
		alert("Erreur Serveur : " + data.message);
		window.location.href = "../Html/index.html";
	}

	// Réception du signal de fin de partie
	if (data.type === "GAME_CLOSED") {
		alert("🛑 L'hôte a fermé la partie ! Retour à l'accueil.");
		window.location.href = "../Html/index.html";
	}
};

socket.onclose = () => {
	console.warn("❌ Déconnecté du serveur.");
	isReady = false;
};

// =========================================
// 2. FONCTIONS D'ENVOI AU SERVEUR
// =========================================
function sendMove(x, y) {
	if (isReady && socket.readyState === WebSocket.OPEN) {
		socket.send(
			JSON.stringify({
				type: "MOVE",
				pseudo: pseudoChoisi,
				x: parseFloat(x.toFixed(2)),
				y: parseFloat(y.toFixed(2)),
			}),
		);
	}
}

function sendAction(actionName) {
	if (isReady && socket.readyState === WebSocket.OPEN) {
		socket.send(
			JSON.stringify({
				type: "ACTION",
				pseudo: pseudoChoisi,
				action: actionName,
			}),
		);
	}
}

// =========================================
// 3. GESTION DU JOYSTICK FLOTTANT
// =========================================
const touchZone = document.getElementById("left-touch-zone");
const joyBase = document.getElementById("joystick-base");
const joyStick = document.getElementById("joystick-stick");
const joyHint = document.getElementById("joystick-hint");

let joyActive = false;
let joyOriginX = 0;
let joyOriginY = 0;
let touchId = null;
const maxRadius = 50;

if (touchZone) {
	touchZone.addEventListener(
		"touchstart",
		(e) => {
			if (!isReady) return;
			e.preventDefault();
			if (joyActive) return;

			const touch = e.changedTouches[0];
			touchId = touch.identifier;
			joyActive = true;

			joyOriginX = touch.clientX;
			joyOriginY = touch.clientY;

			const limiteDroite = window.innerWidth / 2 - 75;
			if (joyOriginX > limiteDroite) joyOriginX = limiteDroite;

			joyBase.style.left = joyOriginX + "px";
			joyBase.style.top = joyOriginY + "px";
			joyBase.style.display = "block";

			joyStick.style.transform = `translate(-50%, -50%)`;

			if (joyHint) joyHint.style.opacity = "0";
		},
		{ passive: false },
	);

	touchZone.addEventListener(
		"touchmove",
		(e) => {
			if (!isReady || !joyActive) return;
			e.preventDefault();

			for (let i = 0; i < e.changedTouches.length; i++) {
				const touch = e.changedTouches[i];
				if (touch.identifier === touchId) {
					let dx = touch.clientX - joyOriginX;
					let dy = touch.clientY - joyOriginY;
					let distance = Math.sqrt(dx * dx + dy * dy);

					if (distance > maxRadius) {
						dx = (dx / distance) * maxRadius;
						dy = (dy / distance) * maxRadius;
					}

					joyStick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
					sendMove(dx / maxRadius, dy / maxRadius);
				}
			}
		},
		{ passive: false },
	);

	function stopJoystick(e) {
		if (!isReady || !joyActive) return;
		e.preventDefault();

		for (let i = 0; i < e.changedTouches.length; i++) {
			if (e.changedTouches[i].identifier === touchId) {
				joyActive = false;
				touchId = null;
				joyBase.style.display = "none";
				sendMove(0, 0);
				if (joyHint) joyHint.style.opacity = "0.3";
			}
		}
	}

	touchZone.addEventListener("touchend", stopJoystick);
	touchZone.addEventListener("touchcancel", stopJoystick);
}

// =========================================
// 4. GESTION DES BOUTONS D'ACTION
// =========================================
const btnSit = document.getElementById("btn-sit");
const btnItem = document.getElementById("btn-item");
const btnHighlight = document.getElementById("btn-highlight");

if (btnSit) {
	btnSit.addEventListener("touchstart", (e) => {
		e.preventDefault();
		sendAction("SIT");
	});
}

if (btnItem) {
	btnItem.addEventListener("touchstart", (e) => {
		e.preventDefault();
		const isEmpty =
			document.getElementById("item-empty-text").style.display !== "none";
		if (!isEmpty) sendAction("USE_ITEM");
	});
}

if (btnHighlight) {
	btnHighlight.addEventListener("touchstart", (e) => {
		e.preventDefault();
		sendAction("HIGHLIGHT");
	});
}
