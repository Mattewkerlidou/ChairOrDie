// --- CONFIGURATION WEBSOCKET ---
let socket;

function initWebSocket() {
    socket = new WebSocket('ws://localhost:8080');

    socket.onopen = () => {
        console.log("✅ Connecté au serveur de jeu !");
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("📩 Message du serveur :", data);

        // Si c'est un nouveau joueur qui rejoint
        if(data.type === 'JOIN') {
            console.log("🎮 " + data.pseudo + " vient d'entrer dans le lobby !");
        }
    };

    socket.onerror = () => {
        console.error("❌ Erreur de connexion au serveur.");
    };
}

// --- LOGIQUE DU JEU ---
function LaunchGame() {
    const pseudo = prompt("Ton pseudo de survivant :");
    if (pseudo) {
        const joinMessage = {
            type: 'JOIN',
            pseudo: pseudo,
            date: new Date().toLocaleTimeString()
        };
        // On envoie l'info au serveur
        socket.send(JSON.stringify(joinMessage));
    }
}

// --- ANIMATION ET CURSEUR ---
window.addEventListener('DOMContentLoaded', () => {
    // Initialisation
    initWebSocket();
    testCursorImage();

    // Gestion du Canvas
    const canvas = document.getElementById("bg-canvas");
    if (canvas) {
        const ctx = canvas.getContext("2d");
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = [];
        for(let i=0; i<50; i++){
            particles.push({
                x: Math.random()*canvas.width,
                y: Math.random()*canvas.height,
                r: Math.random()*3+1,
                dx: (Math.random()-0.5)*0.5,
                dy: (Math.random()-0.5)*0.5
            });
        }

        function animate(){
            ctx.clearRect(0,0,canvas.width,canvas.height);
            particles.forEach(p=>{
                ctx.beginPath();
                ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
                ctx.fillStyle="rgba(255,200,50,0.5)";
                ctx.fill();
                p.x += p.dx;
                p.y += p.dy;
                if(p.x>canvas.width||p.x<0) p.dx*=-1;
                if(p.y>canvas.height||p.y<0) p.dy*=-1;
            });
            requestAnimationFrame(animate);
        }
        animate();
    }
});

function testCursorImage() {
    const cursorImg = new Image();
    cursorImg.src = "../Image/chair-cursor.png";
    cursorImg.onload = () => {
        document.body.style.cursor = "url('../Image/chair-cursor.png') 16 16, auto";
    };
}