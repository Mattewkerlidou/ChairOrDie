const socket = new WebSocket('ws://10.35.175.174:8080'); // Remplace localhost par ton IP locale pour tester sur mobile
const stick = document.getElementById('joystick-stick');
const sitBtn = document.getElementById('sit-btn');

let isMoving = false;

// 1. Gérer le bouton SIT
sitBtn.addEventListener('touchstart', () => {
    const msg = { type: 'ACTION', action: 'SIT', pseudo: 'Joueur1' };
    socket.send(JSON.stringify(msg));
    sitBtn.style.transform = "scale(0.9)";
});

sitBtn.addEventListener('touchend', () => {
    sitBtn.style.transform = "scale(1)";
});

// 2. Gérer le Joystick (Simplifié)
document.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    const container = document.getElementById('joystick-base').getBoundingClientRect();
    
    // Calcul de la position relative au centre
    let x = touch.clientX - (container.left + container.width / 2);
    let y = touch.clientY - (container.top + container.height / 2);

    // Limiter le mouvement au cercle
    const distance = Math.sqrt(x*x + y*y);
    const maxRadius = 40;

    if (distance > maxRadius) {
        x *= maxRadius / distance;
        y *= maxRadius / distance;
    }

    stick.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;

    // Envoyer le mouvement au serveur
    socket.send(JSON.stringify({
        type: 'MOVE',
        x: Math.round(x),
        y: Math.round(y)
    }));
}, { passive: false });

document.addEventListener('touchend', () => {
    stick.style.transform = "translate(-50%, -50%)";
    socket.send(JSON.stringify({ type: 'MOVE', x: 0, y: 0 }));
});