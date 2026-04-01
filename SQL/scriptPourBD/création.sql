-- Création de la table 'joueurs' (Limité à 12 caractères selon le GDD)
CREATE TABLE joueurs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pseudo VARCHAR(12) NOT NULL UNIQUE,
    score_victoires INT DEFAULT 0,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Création de la table 'parties' (Pour stocker les codes générés par l'hôte)
CREATE TABLE parties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code_partie VARCHAR(6) NOT NULL UNIQUE,
    statut VARCHAR(20) DEFAULT 'en_attente', -- Peut être 'en_attente', 'en_cours', 'terminee'
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Création de la table de liaison 'connexions_lobby' (Qui est dans quelle partie ?)
CREATE TABLE connexions_lobby (
    partie_id INT,
    joueur_id INT,
    est_connecte BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (partie_id, joueur_id),
    FOREIGN KEY (partie_id) REFERENCES parties(id) ON DELETE CASCADE,
    FOREIGN KEY (joueur_id) REFERENCES joueurs(id) ON DELETE CASCADE
);



DELIMITER //

CREATE TRIGGER limiter_joueurs_partie
BEFORE INSERT ON connexions_lobby
FOR EACH ROW
BEGIN
    DECLARE nb_joueurs INT;

    -- On compte combien de joueurs sont déjà inscrits dans cette partie précise
    SELECT COUNT(*) INTO nb_joueurs
    FROM connexions_lobby
    WHERE partie_id = NEW.partie_id;

    -- Si on a déjà 100 joueurs (ou plus), on bloque l'insertion et on renvoie une erreur
    IF nb_joueurs >= 100 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Impossible de rejoindre : la partie a atteint la limite de 100 joueurs.';
    END IF;
END;
//

DELIMITER ;