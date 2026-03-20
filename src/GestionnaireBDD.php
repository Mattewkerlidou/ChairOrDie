<?php
// On inclut les fichiers de base de données une seule fois ici
require_once 'connexion_bdd.php';
require_once 'Joueur.php';
require_once 'Partie.php';

class GestionnaireBDD {
    private $joueurManager;
    private $partieManager;

    public function __construct() {
        global $pdo; // On récupère la connexion créée dans connexion_bdd.php
        $this->joueurManager = new Joueur($pdo);
        $this->partieManager = new Partie($pdo);
    }

    /**
     * Action appelée quand la manette envoie le message "JOIN"
     */
    public function traiterConnexionJoueur($pseudo, $code_partie) {
        // 1. On vérifie si le code de la partie est valide
        $partie = $this->partieManager->verifierCode($code_partie);
        
        if (!$partie) {
            return ['statut' => 'erreur', 'message' => 'Code invalide ou partie déjà lancée.'];
        }

        // 2. On récupère ou on crée le joueur
        $joueur = $this->joueurManager->getOrCreateJoueur($pseudo);

        // 3. On l'ajoute au Lobby
        $this->partieManager->rejoindreLobby($partie['id'], $joueur['id']);

        // 4. On renvoie le succès avec les infos à Ratchet
        return [
            'statut' => 'succes',
            'id_joueur' => $joueur['id'],
            'id_partie' => $partie['id'],
            'pseudo' => $joueur['pseudo']
        ];
    }

    /**
     * Action appelée quand la partie se termine (Game Over)
     */
    public function traiterVictoire($id_joueur, $id_partie) {
        // On ajoute +1 victoire au gagnant
        $this->joueurManager->ajouterVictoire($id_joueur);
        
        // On passe la partie en statut "terminee"
        $this->partieManager->changerStatut($id_partie, 'terminee');

        return ['statut' => 'succes', 'message' => 'Victoire enregistrée dans le Leaderboard !'];
    }
}
?>