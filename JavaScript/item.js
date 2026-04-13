// =========================================
// GESTION DES OBJETS ET POUVOIRS (item.js)
// =========================================

window.itemPool = [];

// Génère la boîte à objets (La Chaise Plus est bien dedans, mais le Cœur est géré à part)
window.generateItemPool = function (nbJoueurs) {
	window.itemPool = [];
	let nbChaisePlus = Math.max(1, Math.floor(nbJoueurs * 0.15));
	let nbMarteau = Math.max(1, Math.floor(nbJoueurs * 0.15));
	let nbEclair = Math.max(1, Math.floor(nbJoueurs * 0.20));
	let nbEscargot = Math.max(1, Math.floor(nbJoueurs * 0.15));
	let nbFreeze = Math.max(1, Math.floor(nbJoueurs * 0.15));
	let nbPause = Math.max(1, Math.floor(nbJoueurs * 0.05));

	for (let i = 0; i < nbChaisePlus; i++) window.itemPool.push("CHAISE_PLUS");
	for (let i = 0; i < nbMarteau; i++) window.itemPool.push("MARTEAU");
	for (let i = 0; i < nbEclair; i++) window.itemPool.push("ECLAIR");
	for (let i = 0; i < nbEscargot; i++) window.itemPool.push("ESCARGOT");
	for (let i = 0; i < nbFreeze; i++) window.itemPool.push("FREEZE");
	for (let i = 0; i < nbPause; i++) window.itemPool.push("PAUSE");

	for (let i = window.itemPool.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[window.itemPool[i], window.itemPool[j]] = [window.itemPool[j], window.itemPool[i]];
	}
    console.log( "nbChaisePlus : "+ nbChaisePlus);
    console.log( "nbMarteau : "+ nbMarteau);
    console.log( "nbEclair : "+ nbEclair);
    console.log( "nbEscargot : "+ nbEscargot);
    console.log( "nbFreeze : "+ nbFreeze);
    console.log( "nbPause : "+ nbPause);
    
};

// Tirage au sort de la ferme
window.handleFarmRoll = function(pData, data) {
    if (window.isFinaleMode) {
        // En mode Finale (5%), aucun item n'est obtenable !
        
        //window.socket.send(JSON.stringify({ type: "ROLL_FAILED", pseudo: data.pseudo, joueurCible: data.pseudo }));
        return;
    }

    if (!pData.itemLimitReached && window.gameState === "PLAYING") {
        const roll = Math.floor(Math.random() * 100) + 1;
        const chanceDeGagner = 100; // ⚠️ À ajuster pour la difficulté
        console.log(roll)

        if (roll <= chanceDeGagner && window.itemPool.length > 0) {
            let item = window.itemPool.pop();
            pData.hasItem = true;
            pData.itemLimitReached = true;
            pData.currentItem = item;
            window.socket.send(JSON.stringify({ type: "GIVE_ITEM", pseudo: data.pseudo, joueurCible: data.pseudo, item: item }));
        } else {
            window.socket.send(JSON.stringify({ type: "ROLL_FAILED", pseudo: data.pseudo, joueurCible: data.pseudo }));
        }
    }
};

// Utilisation d'un objet
window.handleItemUse = function(pData, data) {
    const itemUsed = pData.currentItem;
    console.log(`💥 ${data.pseudo} utilise : ${itemUsed} !`);

    // On retire l'item du joueur par défaut
    pData.hasItem = false;
    pData.currentItem = null;

    if (itemUsed === "PAUSE") {
        if (typeof window.triggerChairs === "function") window.triggerChairs();
    } 
    else if (itemUsed === "ECLAIR") {
        // ECLAIR : Accélère le temps (Réduit le chrono)
        if (typeof window.modifyRoundTime === "function") window.modifyRoundTime(-0.10);
        document.body.style.filter = "brightness(2)";
        setTimeout(() => { document.body.style.filter = "none"; }, 150);
    } 
    else if (itemUsed === "ESCARGOT") {
        // ESCARGOT : Ralentit le temps (Allonge le chrono)
        if (typeof window.modifyRoundTime === "function") window.modifyRoundTime(0.10);
        document.body.style.filter = "hue-rotate(90deg) saturate(0.5)";
        setTimeout(() => { document.body.style.filter = "none"; }, 300);
    } 
    else if (itemUsed === "COEUR") {
        // Le Cœur ne peut pas être cliqué/utilisé, on le rend instantanément au joueur !
        pData.hasItem = true;
        pData.currentItem = "COEUR";
        window.socket.send(JSON.stringify({ type: "GIVE_ITEM", pseudo: data.pseudo, joueurCible: data.pseudo, item: "COEUR" }));
    }
    else if (itemUsed === "MARTEAU") {
        // On stocke le marteau en mémoire pour plus tard
        window.pendingHammers.push(data.pseudo);
        console.log(`🔨 Marteau de ${data.pseudo} mis en attente...`);
    }
    else if (itemUsed === "CHAISE_PLUS") {
        // La chaise en plus ne peut être utilisée qu'APRES les chaises et les marteaux
        if (!window.chairsAreSpawned || !window.hammersFinished) {
            // On la rend au joueur s'il essaie trop tôt
            pData.hasItem = true;
            pData.currentItem = "CHAISE_PLUS";
            window.socket.send(JSON.stringify({ type: "GIVE_ITEM", pseudo: data.pseudo, joueurCible: data.pseudo, item: "CHAISE_PLUS" }));
            return;
        }

        // On fait spawn la chaise spéciale sur le joueur
        const arena = document.getElementById("game-arena");
        const chairDiv = document.createElement("div");
        chairDiv.className = "game-chair occupied";
        chairDiv.id = "chair-plus-" + Date.now();
        chairDiv.style.left = pData.element.style.left;
        chairDiv.style.top = pData.element.style.top;
        chairDiv.style.backgroundImage = 'url("../sprite/items/one_up.png")';
        arena.appendChild(chairDiv);

        window.chairsOnScreen.push({
            id: chairDiv.id,
            element: chairDiv,
            x: parseFloat(chairDiv.style.left),
            y: parseFloat(chairDiv.style.top),
            isOccupied: true,
            isBroken: false,
        });

        // Le joueur s'assoit immédiatement
        pData.element.classList.add("sitting");
        pData.element.dataset.direction = "front";
        ["front", "back", "left", "right"].forEach((d) => {
            const img = document.getElementById(`img-${data.pseudo}-${d}`);
            if (img) img.style.display = d === "front" ? "block" : "none";
        });

        // Vérification de fin de manche
        const chaisesRestantes = window.chairsOnScreen.filter((c) => !c.isBroken);
        if (chaisesRestantes.filter((c) => c.isOccupied).length >= chaisesRestantes.length) {
            if (typeof window.endRound === "function") window.endRound();
        }
    }
    else if (itemUsed === "FREEZE") {
        const myX = parseFloat(pData.element.style.left);
        const myY = parseFloat(pData.element.style.top);
        const freezeRadius = 250;

        pData.element.style.transform = "translate(-50%, -50%) scale(1.5)";
        setTimeout(() => {
            if (pData.element && !pData.element.classList.contains("sitting"))
                pData.element.style.transform = "translate(-50%, -50%) scale(1)";
        }, 200);

        Object.values(window.playersOnScreen).forEach((victim) => {
            if (victim.pseudo !== data.pseudo && !victim.element.classList.contains("sitting")) {
                const vX = parseFloat(victim.element.style.left);
                const vY = parseFloat(victim.element.style.top);
                
                if (Math.sqrt((myX - vX) ** 2 + (myY - vY) ** 2) <= freezeRadius) {
                    if (window.lovers.includes(victim.pseudo)) {
                        // Les amoureux sont immunisés grâce au cœur passif !
                        const s = victim.element.querySelector(".shield-effect");
                        if (s) { s.style.transform = "scale(1.5)"; setTimeout(() => s.style.transform = "scale(1)", 300); }
                    } else {
                        victim.isFrozen = true;
                        victim.element.style.filter = "sepia(1) hue-rotate(180deg) saturate(3) brightness(0.8)";
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
                                const iceElem = victim.element.querySelector(".ice-effect");
                                if (iceElem) iceElem.remove();
                            }
                        }, 1500);
                    }
                }
            }
        });
    } 
};

// Exécution du Marteau (Appelé par script.js quand les chaises apparaissent)
window.executeHammer = function(pseudo) {
    let pData = window.playersOnScreen[pseudo];
    if (!pData) return;
    const myX = parseFloat(pData.element.style.left);
    const myY = parseFloat(pData.element.style.top);
    let targetChair = null;
    let minDistance = 500; // Cherche plus loin

    for (let chair of window.chairsOnScreen) {
        if (chair.isBroken) continue;
        const dist = Math.sqrt((myX - chair.x) ** 2 + (myY - chair.y) ** 2);
        if (dist < minDistance) {
            minDistance = dist;
            targetChair = chair;
        }
    }
    
    // Si aucune chaise proche, on en casse une au hasard pour que le marteau ne soit pas perdu
    if (!targetChair) targetChair = window.chairsOnScreen.find(c => !c.isBroken);

    if (targetChair) {
        targetChair.isBroken = true; // Empêche instantanément les joueurs de s'asseoir

        const hammerDiv = document.createElement("div");
        hammerDiv.style.position = "absolute";
        hammerDiv.style.left = targetChair.x + "px";
        hammerDiv.style.top = (targetChair.y - 40) + "px";
        hammerDiv.style.width = "64px";
        hammerDiv.style.height = "64px";
        hammerDiv.style.backgroundImage = "url('../sprite/items/hammer_vertical.png')";
        hammerDiv.style.backgroundSize = "contain";
        hammerDiv.style.backgroundRepeat = "no-repeat";
        hammerDiv.style.zIndex = "60";
        document.getElementById("game-arena").appendChild(hammerDiv);

        setTimeout(() => { hammerDiv.style.backgroundImage = "url('../sprite/items/hammer_diagonal.png')"; }, 150);
        setTimeout(() => {
            hammerDiv.style.backgroundImage = "url('../sprite/items/hammer_horizontal.png')";
            targetChair.element.style.backgroundImage = "url('../sprite/items/broken_chair.png')";
            targetChair.element.classList.remove("occupied");
            
            // Si un joueur était assis, il est éjecté et étourdi
            if (targetChair.isOccupied) {
                Object.values(window.playersOnScreen).forEach((p) => {
                    if (p.element.classList.contains("sitting") &&
                        Math.abs(parseFloat(p.element.style.left) - targetChair.x) < 5 &&
                        Math.abs(parseFloat(p.element.style.top) - targetChair.y) < 5
                    ) {
                        p.element.classList.remove("sitting");
                        p.element.style.left = (targetChair.x + 80) + "px";
                        p.isFrozen = true;
                        p.element.style.filter = "grayscale(1)";

                        setTimeout(() => {
                            p.isFrozen = false;
                            if (p.element) p.element.style.filter = "none";
                        }, 2000);
                    }
                });
                targetChair.isOccupied = false;
            }
        }, 300);
        setTimeout(() => { hammerDiv.remove(); }, 600);
    }
};