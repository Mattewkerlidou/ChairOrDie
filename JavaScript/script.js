// =========================================
// LOGIQUE DES BOUTONS DU MENU (UI)
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

	if (!code || code.trim() === "")
		return alert("Tu dois entrer le code de la Room !");
	if (!pseudo || pseudo.trim() === "")
		return alert("Tu dois choisir un pseudo !");

	window.location.href =
		"manette.html?pseudo=" +
		encodeURIComponent(pseudo.trim()) +
		"&code=" +
		encodeURIComponent(code.trim().toUpperCase());
};

// =========================================
// LOGIQUE DU LOBBY ET CHANGEMENT D'ÉCRAN
// =========================================
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

	if (!window.socket || window.socket.readyState !== WebSocket.OPEN) {
		window.initWebSocket();
	}

	document.getElementById("main-menu").style.display = "none";
	document.getElementById("main-logo").style.display = "none";
	document.getElementById("lobby-screen").style.display = "block";

	updateLobbyUI();
	const elem = document.documentElement;
	if (elem.requestFullscreen)
		elem.requestFullscreen().catch((err) => console.log(err));
};

window.StartActualGame = function () {
	window.gameState = "PLAYING";

	document.getElementById("lobby-screen").style.display = "none";
	document.querySelector(".bg-animated").style.display = "none";

	const card = document.querySelector(".game-card");
	if (card) {
		card.dataset.oldBorder = card.style.border;
		card.dataset.oldBackground = card.style.background;
		card.dataset.oldBoxShadow = card.style.boxShadow;
		card.style.border = "none";
		card.style.background = "transparent";
		card.style.boxShadow = "none";
		card.style.width = "100vw";
		card.style.height = "100vh";
	}

	document.getElementById("stop-game-btn").style.display = "block";

	Object.keys(window.playersOnScreen).forEach((pseudo) => {
		window.spawnPlayer(pseudo);
	});

	const nbJoueurs = Object.keys(window.playersOnScreen).length;
	window.spawnChairs(nbJoueurs > 1 ? nbJoueurs - 1 : 3);
};

window.StopGame = function () {
	window.gameState = "MENU";
	window.currentRoomCode = "";

	// Alerte générale avant fermeture
	if (window.socket && window.socket.readyState === WebSocket.OPEN) {
		window.socket.send(JSON.stringify({ type: "GAME_CLOSED" }));
		setTimeout(() => {
			window.socket.close();
			window.socket = null;
		}, 100);
	} else if (window.socket) {
		window.socket.close();
		window.socket = null;
	}

	if (document.fullscreenElement)
		document.exitFullscreen().catch((err) => console.log(err));

	document.getElementById("main-menu").style.display = "flex";
	document.getElementById("main-logo").style.display = "block";
	document.getElementById("lobby-screen").style.display = "none";
	document.querySelector(".bg-animated").style.display = "block";

	const card = document.querySelector(".game-card");
	if (card) {
		card.style.border = card.dataset.oldBorder || "";
		card.style.background = card.dataset.oldBackground || "";
		card.style.boxShadow = card.dataset.oldBoxShadow || "";
		card.style.width = "650px";
		card.style.minHeight = "550px";
	}

	document.getElementById("stop-game-btn").style.display = "none";

	window.chairsOnScreen.forEach((chair) => {
		if (chair.element && chair.element.parentNode)
			chair.element.parentNode.removeChild(chair.element);
	});
	window.chairsOnScreen.length = 0;

	Object.values(window.playersOnScreen).forEach((pData) => {
		if (pData.element && pData.element.parentNode) {
			pData.element.parentNode.removeChild(pData.element);
		}
	});
	window.playersOnScreen = {};
	updateLobbyUI();
};

// =========================================
// FOND ANIMÉ (CANVAS) ET CURSEUR
// =========================================
window.addEventListener("DOMContentLoaded", () => {
	const cursorImg = new Image();
	cursorImg.src = "../Image/chair-cursor.png";
	cursorImg.onload = () => {
		document.body.style.cursor =
			"url('../Image/chair-cursor.png') 16 16, auto";
	};

	const canvas = document.getElementById("bg-canvas");
	if (canvas) {
		const ctx = canvas.getContext("2d");
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		const particles = [];
		for (let i = 0; i < 50; i++)
			particles.push({
				x: Math.random() * canvas.width,
				y: Math.random() * canvas.height,
				r: Math.random() * 3 + 1,
				dx: (Math.random() - 0.5) * 0.5,
				dy: (Math.random() - 0.5) * 0.5,
			});
		function animate() {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			particles.forEach((p) => {
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
				ctx.fillStyle = "rgba(255,200,50,0.5)";
				ctx.fill();
				p.x += p.dx;
				p.y += p.dy;
				if (p.x > canvas.width || p.x < 0) p.dx *= -1;
				if (p.y > canvas.height || p.y < 0) p.dy *= -1;
			});
			requestAnimationFrame(animate);
		}
		animate();
		window.addEventListener("resize", () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		});
	}
});
