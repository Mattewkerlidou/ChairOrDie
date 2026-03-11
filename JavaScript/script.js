function LaunchGame(){
    alert("Le jeu va se lancer !");
}

const canvas = document.getElementById("bg-canvas");
const ctx = canvas.getContext("2d");
canvas.width = 600;
canvas.height = 400;

const particles = [];
for(let i=0;i<50;i++){
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
        if(p.x>canvas.width||p.x<0)p.dx*=-1;
        if(p.y>canvas.height||p.y<0)p.dy*=-1;
    });
    requestAnimationFrame(animate);
}
animate();



// Fonction pour tester le chargement du curseur
function testCursorImage() {
    const cursorImg = new Image();
    cursorImg.src = "../Image/chair-cursor.png";

    cursorImg.onload = function() {
        console.log("✅ Curseur personnalisé chargé avec succès !");
        // On s'assure que le style est appliqué
        document.body.style.cursor = "url('../Image/chair-cursor.png') 16 16, auto";
    };

    cursorImg.onerror = function() {
        console.warn("⚠️ Impossible de charger chair-cursor.png. Utilisation du curseur standard.");
        document.body.style.cursor = "default";
    };
}

// Appeler le test au chargement de la page
window.addEventListener('DOMContentLoaded', testCursorImage);