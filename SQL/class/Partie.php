<?php
class Partie {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    // Crée une nouvelle partie et génère un code unique de 6 caractères
    public function creerNouvellePartie() {
        // L'alphabet et les chiffres utilisés pour le code
        $caracteres = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        
        // C'est ici qu'on change la longueur ! On prend 6 caractères au lieu de 4.
        $code_partie = substr(str_shuffle($caracteres), 0, 6);

        $stmt = $this->pdo->prepare("INSERT INTO parties (code_partie, statut) VALUES (:code, 'en_attente')");
        $stmt->execute(['code' => $code_partie]);

        return [
            'id' => $this->pdo->lastInsertId(),
            'code_partie' => $code_partie
        ];
    }

    // Vérifie si un code tapé sur un téléphone correspond à une partie en attente
    public function verifierCode($code_partie) {
        $stmt = $this->pdo->prepare("SELECT * FROM parties WHERE code_partie = :code AND statut = 'en_attente'");
        $stmt->execute(['code' => $code_partie]);
        return $stmt->fetch(); // Renvoie les infos de la partie, ou false si le code est faux
    }

    // Relie un joueur à une partie (quand il rejoint le Lobby)
    public function rejoindreLobby($id_partie, $id_joueur) {
        // Le "INSERT IGNORE" empêche de créer un doublon si le joueur rafraîchit sa page
        $stmt = $this->pdo->prepare("INSERT IGNORE INTO connexions_lobby (partie_id, joueur_id, est_connecte) VALUES (:partie_id, :joueur_id, TRUE)");
        return $stmt->execute([
            'partie_id' => $id_partie,
            'joueur_id' => $id_joueur
        ]);
    }

    // Change le statut de la partie (ex: passe de 'en_attente' à 'terminee')
    public function changerStatut($id_partie, $nouveau_statut) {
        $stmt = $this->pdo->prepare("UPDATE parties SET statut = :statut WHERE id = :id");
        return $stmt->execute(['statut' => $nouveau_statut, 'id' => $id_partie]);
    }
}
?>