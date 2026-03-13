<?php
namespace MyApp;
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

class SocketHandler implements MessageComponentInterface {
    protected $clients;

    public function __construct() {
        $this->clients = new \SplObjectStorage;
        echo "--- Serveur Chair or Die prêt ! ---\n";
    }

    public function onOpen(ConnectionInterface $conn) {
        $this->clients->attach($conn);
        echo "Nouvelle connexion : ID({$conn->resourceId})\n";
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        // On décode le JSON reçu du JavaScript
        $data = json_decode($msg);

        if (!$data) {
            echo "Message ignoré (format non JSON) : $msg\n";
            return;
        }

        echo "Action reçue [{$data->type}] de l'ID({$from->resourceId})\n";

        // BROADCAST : On renvoie l'info à TOUT LE MONDE
        // (Pour que l'écran hôte voit le joueur bouger)
        foreach ($this->clients as $client) {
            $client->send($msg); 
        }
    }

    public function onClose(ConnectionInterface $conn) {
        $this->clients->detach($conn);
        echo "Déconnexion : ID({$conn->resourceId})\n";
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        echo "Erreur : {$e->getMessage()}\n";
        $conn->close();
    }
}