<?php
use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use MyApp\SocketHandler;

require dirname(__DIR__) . '/vendor/autoload.php';
require dirname(__DIR__) . '/src/SocketHandler.php';

$server = IoServer::factory(
    new HttpServer(
        new WsServer(
            new SocketHandler()
        )
    ),
    8080
);

echo "Serveur Chair or Die en ligne sur le port 8080...\n";
$server->run();