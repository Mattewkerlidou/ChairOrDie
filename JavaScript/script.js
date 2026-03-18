// --- CONFIGURATION WEBSOCKET ET JOUEURS ---
let socket;
const playersOnScreen = {}; // Dictionnaire pour stocker les avatars des joueurs

function initWebSocket() {
    // On utilise hostname pour que ça marche aussi bien sur le PC que sur le réseau local
    const serverIP = window.location.hostname;
    socket = new WebSocket(`ws://${serverIP}:8080`);

    socket.onopen = () => {
        console.log("✅ Écran principal connecté au serveur de jeu !");
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const arena = document.getElementById('game-arena');
        if (!arena) return;

        // 1. UN NOUVEAU JOUEUR REJOINT
        if (data.type === 'JOIN' || data.type === 'NEW_PLAYER') {
            const pseudo = data.pseudo;
            if (!playersOnScreen[pseudo]) {
                console.log("🎮 " + pseudo + " vient d'entrer dans le lobby !");
                
                // Création de l'avatar HTML
                const playerDiv = document.createElement('div');
                playerDiv.id = "player-" + pseudo;
                playerDiv.className = "player-avatar"; // Classe CSS gérée dans index.css
                playerDiv.innerText = pseudo.substring(0, 3).toUpperCase(); // 3 premières lettres

                // Apparition au centre
                playerDiv.style.left = (window.innerWidth / 2) + "px";
                playerDiv.style.top = (window.innerHeight / 2) + "px";

                arena.appendChild(playerDiv);
                playersOnScreen[pseudo] = playerDiv;
            }
        }

        // 2. UN JOUEUR BOUGE SON JOYSTICK
        if (data.type === 'MOVE' && playersOnScreen[data.pseudo]) {
            const playerDiv = playersOnScreen[data.pseudo];
            
            let currentX = parseFloat(playerDiv.style.left);
            let currentY = parseFloat(playerDiv.style.top);
            const speed = 10; // Vitesse du personnage

            currentX += data.x * speed;
            currentY += data.y * speed;

            // On l'empêche de sortir de l'écran (marge de 30px)
            currentX = Math.max(30, Math.min(window.innerWidth - 30, currentX));
            currentY = Math.max(30, Math.min(window.innerHeight - 30, currentY));

            playerDiv.style.left = currentX + "px";
            playerDiv.style.top = currentY + "px";
        }

        // 3. UN JOUEUR APPUIE SUR LE BOUTON "SIT"
        if (data.type === 'ACTION' && data.action === 'SIT' && playersOnScreen[data.pseudo]) {
            const playerDiv = playersOnScreen[data.pseudo];
            
            // On lui ajoute la classe CSS qui le rend rouge et plus petit
            playerDiv.classList.add('sitting');
            
            // On lui retire après 300 millisecondes
            setTimeout(() => {
                if (playerDiv) playerDiv.classList.remove('sitting');
            }, 300);
        }

        // 4. UN JOUEUR DÉCONNECTE SA MANETTE
        if (data.type === 'PLAYER_LEFT' && playersOnScreen[data.pseudo]) {
            console.log("👋 " + data.pseudo + " a quitté la partie.");
            const playerDiv = playersOnScreen[data.pseudo];
            if (playerDiv.parentNode) {
                playerDiv.parentNode.removeChild(playerDiv);
            }
            delete playersOnScreen[data.pseudo];
        }
    };

    socket.onerror = () => {
        console.error("❌ Erreur de connexion au serveur WebSocket. Lance 'php bin/server.php'.");
    };
}

// --- LOGIQUE DU MENU ---
function LaunchGame() {
    const pseudo = prompt("Entre ton pseudo pour jouer :");
    
    if (pseudo && pseudo.trim() !== "") {
        // On redirige vers la manette en passant le pseudo dans l'URL
        window.location.href = "manette.html?pseudo=" + encodeURIComponent(pseudo.trim());
    } else {
        alert("Pseudo obligatoire !");
    }
}

// --- INITIALISATION, ANIMATION ET CURSEUR ---
window.addEventListener('DOMContentLoaded', () => {
    // Initialisation
    initWebSocket();
    testCursorImage();

    // Gestion du Canvas (Particules)
    const canvas = document.getElementById("bg-canvas");
    if (canvas) {
        const ctx = canvas.getContext("2d");
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = [];
        for(let i = 0; i < 50; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: Math.random() * 3 + 1,
                dx: (Math.random() - 0.5) * 0.5,
                dy: (Math.random() - 0.5) * 0.5
            });
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(255,200,50,0.5)";
                ctx.fill();
                p.x += p.dx;
                p.y += p.dy;
                if(p.x > canvas.width || p.x < 0) p.dx *= -1;
                if(p.y > canvas.height || p.y < 0) p.dy *= -1;
            });
            requestAnimationFrame(animate);
        }
        animate();

        // Redimensionnement du canvas si on change la taille de la fenêtre
        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });
    }
});

function testCursorImage() {
    const cursorImg = new Image();
    cursorImg.src = "../Image/chair-cursor.png";
    cursorImg.onload = () => {
        document.body.style.cursor = "url('../Image/chair-cursor.png') 16 16, auto";
    };
}