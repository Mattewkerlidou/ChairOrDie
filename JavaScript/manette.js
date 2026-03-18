/**
 * MANETTE JS - CHAIR OR DIE
 */

// 1. RÉCUPÉRATION DU PSEUDO DANS L'URL
const urlParams = new URLSearchParams(window.location.search);
const pseudoChoisi = urlParams.get('pseudo') || "Anonyme";

const nameDisplay = document.getElementById('player-name');
if (nameDisplay) nameDisplay.innerText = pseudoChoisi;

// 2. CONNEXION AU SERVEUR
const serverIP = window.location.hostname; 
const socket = new WebSocket(`ws://${serverIP}:8080`);

let isReady = false; // Le cadenas

socket.onopen = () => {
    console.log("✅ Connexion établie. Demande d'autorisation pour le pseudo...");
    // On envoie la demande
    socket.send(JSON.stringify({
        type: 'JOIN',
        pseudo: pseudoChoisi
    }));
};

// --- NOUVEAU : ÉCOUTE DES RÉPONSES DU SERVEUR ---
socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'JOIN_SUCCESS') {
        isReady = true; // On ouvre le cadenas !
        console.log("🚀 Pseudo accepté, joystick déverrouillé !");
    }

    if (data.type === 'ERROR') {
        alert("Oups : " + data.message);
        // On le renvoie à l'accueil pour changer de nom
        window.location.href = "../Html/index.html"; 
    }
};

socket.onclose = () => {
    console.warn("❌ Déconnecté du serveur.");
    isReady = false;
};

// 3. GESTION DU JOYSTICK
const stick = document.getElementById('joystick-stick');
const base = document.getElementById('joystick-base');

if (base && stick) {
    base.addEventListener('touchmove', (e) => {
        if (!isReady) return; // CADENAS FERMÉ = ON BLOQUE
        e.preventDefault();

        const touch = e.touches[0];
        const rect = base.getBoundingClientRect();
        let x = touch.clientX - (rect.left + rect.width / 2);
        let y = touch.clientY - (rect.top + rect.height / 2);

        const limit = 50;
        const dist = Math.sqrt(x*x + y*y);
        if (dist > limit) { x *= limit/dist; y *= limit/dist; }

        stick.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;

        socket.send(JSON.stringify({
            type: 'MOVE',
            x: parseFloat((x / limit).toFixed(2)),
            y: parseFloat((y / limit).toFixed(2))
        }));
    }, { passive: false });

    base.addEventListener('touchend', () => {
        stick.style.transform = "translate(-50%, -50%)";
        if (isReady) socket.send(JSON.stringify({ type: 'MOVE', x: 0, y: 0 }));
    });
}

// 4. GESTION DU BOUTON SIT
const sitBtn = document.getElementById('sit-btn');

if (sitBtn) {
    sitBtn.addEventListener('touchstart', (e) => {
        if (!isReady) return; // CADENAS
        e.preventDefault();
        
        sitBtn.style.transform = "scale(0.9)";
        socket.send(JSON.stringify({ type: 'ACTION', action: 'SIT' }));
    });

    sitBtn.addEventListener('touchend', () => {
        sitBtn.style.transform = "scale(1)";
    });
}