<?php
class Joueur {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    // Récupère un joueur par son pseudo. S'il n'existe pas, il le crée !
    public function getOrCreateJoueur($pseudo) {
        // 1. On cherche si le joueur existe déjà
        $stmt = $this->pdo->prepare("SELECT * FROM joueurs WHERE pseudo = :pseudo");
        $stmt->execute(['pseudo' => $pseudo]);
        $joueur = $stmt->fetch();

        // 2. S'il existe, on renvoie ses données
        if ($joueur) {
            return $joueur;
        }

        // 3. S'il n'existe pas, on l'insère dans la base
        $stmtInsert = $this->pdo->prepare("INSERT INTO joueurs (pseudo) VALUES (:pseudo)");
        $stmtInsert->execute(['pseudo' => $pseudo]);
        
        // On récupère son nouvel ID et on renvoie ses infos
        $newId = $this->pdo->lastInsertId();
        return ['id' => $newId, 'pseudo' => $pseudo, 'score_victoires' => 0];
    }

    // Ajoute +1 au score du vainqueur
    public function ajouterVictoire($id_joueur) {
        $stmt = $this->pdo->prepare("UPDATE joueurs SET score_victoires = score_victoires + 1 WHERE id = :id");
        return $stmt->execute(['id' => $id_joueur]);
    }

    // Récupère les 100 meilleurs joueurs (Le Leaderboard !)
    public function getTop100() {
        $stmt = $this->pdo->query("SELECT pseudo, score_victoires FROM joueurs ORDER BY score_victoires DESC LIMIT 100");
        return $stmt->fetchAll();
    }
}
?>