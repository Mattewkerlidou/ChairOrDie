<?php
namespace MyApp;
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

class SocketHandler implements MessageComponentInterface {
    protected $clients;
    protected $joueurs; // [ID => Pseudo]

    public function __construct() {
        $this->clients = new \SplObjectStorage;
        $this->joueurs = [];
        echo "--- Serveur Chair or Die prêt ! ---\n";
    }

    public function onOpen(ConnectionInterface $conn) {
        $this->clients->attach($conn);
        echo "Nouvelle connexion : ID({$conn->resourceId})\n";
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        echo "RECU BRUT : $msg\n";
        $data = json_decode($msg);
        
        if (!$data || !isset($data->type)) return;

        // --- 1. GESTION DE L'IDENTIFICATION (JOIN) ---
        if ($data->type === 'JOIN') {
            $pseudoDemande = trim($data->pseudo);

            // Vérification : le pseudo est-il déjà pris ?
            if (in_array($pseudoDemande, $this->joueurs)) {
                echo "❌ REFUS : Le pseudo '$pseudoDemande' est déjà pris.\n";
                // On prévient le téléphone
                $from->send(json_encode([
                    'type' => 'ERROR',
                    'message' => 'Ce pseudo est déjà utilisé par un autre joueur !'
                ]));
                return;
            }

            // Succès : on l'enregistre
            $this->joueurs[$from->resourceId] = $pseudoDemande;
            echo "✅ IDENTIFICATION REUSSIE : ID({$from->resourceId}) est '{$pseudoDemande}'\n";
            
            // On donne le feu vert à la manette
            $from->send(json_encode(['type' => 'JOIN_SUCCESS']));
            
            // Optionnel : on prévient le grand écran (index) qu'un nouveau joueur arrive
            $broadcastMsg = json_encode(['type' => 'NEW_PLAYER', 'pseudo' => $pseudoDemande]);
            foreach ($this->clients as $client) {
                if ($client !== $from) { // Pas besoin de se l'envoyer à soi-même
                    $client->send($broadcastMsg);
                }
            }
            return;
        }

        // --- 2. SÉCURITÉ DES ACTIONS ---
        if (!isset($this->joueurs[$from->resourceId])) {
            echo "⚠️ Message ignoré : ID({$from->resourceId}) n'est pas identifié.\n";
            return;
        }

        // --- 3. BROADCAST (MOVE, ACTION...) ---
        $data->pseudo = $this->joueurs[$from->resourceId];
        $nouveauMessage = json_encode($data);

        foreach ($this->clients as $client) {
            $client->send($nouveauMessage);
        }
    }

    public function onClose(ConnectionInterface $conn) {
        // Quand un joueur part, son pseudo redevient disponible !
        if (isset($this->joueurs[$conn->resourceId])) {
            $pseudo = $this->joueurs[$conn->resourceId];
            unset($this->joueurs[$conn->resourceId]);
            echo "Déconnexion : $pseudo (ID {$conn->resourceId})\n";
            
            // On prévient le grand écran qu'il est parti
            $leaveMsg = json_encode(['type' => 'PLAYER_LEFT', 'pseudo' => $pseudo]);
            foreach ($this->clients as $client) {
                $client->send($leaveMsg);
            }
        }
        $this->clients->detach($conn);
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        echo "Erreur : " . $e->getMessage() . "\n";
        $conn->close();
    }
}