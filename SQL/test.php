<?php
// On affiche toutes les erreurs PHP pour le débug
ini_set('display_errors', 1);
error_reporting(E_ALL);

echo "=================================================\n";
echo "       🧪 ZONE DE TEST - CHAIR OR DIE\n";
echo "=================================================\n\n";

try {
    // 1. Inclusion des fichiers
    require_once 'connexion/connexion_bdd.php';
    require_once 'class/Joueur.php';
    require_once 'class/Partie.php';

    // Instanciation des classes
    $joueurManager = new Joueur($pdo);
    $partieManager = new Partie($pdo);

    echo "[OK] Connexion a la base de donnees reussie.\n\n";

    // --- TEST 1 : Création d'une partie ---
    echo "--- Test 1 : Creation d'une Partie (6 caracteres) ---\n";
    $nouvellePartie = $partieManager->creerNouvellePartie();
    $code_genere = $nouvellePartie['code_partie'];
    echo "Partie creee avec succes !\n";
    echo "ID: " . $nouvellePartie['id'] . " | Code Secret: " . $code_genere . "\n\n";

    // --- TEST 2 : Vérification du code ---
    echo "--- Test 2 : Verification du Code ---\n";
    $partieVerifiee = $partieManager->verifierCode($code_genere);
    if ($partieVerifiee) {
        echo "Le code " . $code_genere . " est VALIDE.\n";
        echo "Statut de la partie : " . $partieVerifiee['statut'] . "\n\n";
    } else {
        echo "[ERREUR] Le code n'a pas ete reconnu.\n\n";
    }

    // --- TEST 3 : Création / Récupération d'un joueur ---
    echo "--- Test 3 : Inscription d'un Joueur ---\n";
    $pseudoTest = "Testeur_" . rand(10, 99);
    $nouveauJoueur = $joueurManager->getOrCreateJoueur($pseudoTest);
    echo "Joueur recupere/cree : " . $nouveauJoueur['pseudo'] . "\n";
    echo "ID: " . $nouveauJoueur['id'] . " | Victoires : " . $nouveauJoueur['score_victoires'] . "\n\n";

    // --- TEST 4 : Rejoindre le Lobby ---
    echo "--- Test 4 : Rejoindre le Lobby ---\n";
    $partieManager->rejoindreLobby($nouvellePartie['id'], $nouveauJoueur['id']);
    echo "Le joueur " . $nouveauJoueur['pseudo'] . " a rejoint la partie " . $code_genere . " !\n\n";

    // --- TEST 5 : Ajouter une victoire ---
    echo "--- Test 5 : Ajout d'une Victoire ---\n";
    $joueurManager->ajouterVictoire($nouveauJoueur['id']);
    echo "Une victoire a ete ajoutee au joueur " . $nouveauJoueur['pseudo'] . ".\n\n";

    // --- TEST 6 : Le Leaderboard ---
    echo "--- Test 6 : Affichage du Top 100 ---\n";
    $top100 = $joueurManager->getTop100();
    print_r($top100);
    echo "\n";

    // --- TEST 7 : Changement de statut ---
    echo "--- Test 7 : Lancement de la partie ---\n";
    $partieManager->changerStatut($nouvellePartie['id'], 'en_cours');
    echo "La partie " . $code_genere . " est passee en statut 'en_cours'.\n\n";

    echo "=================================================\n";
    echo "        ✅ TOUS LES TESTS SONT TERMINES\n";
    echo "=================================================\n";

} catch (Exception $e) {
    // Si une erreur SQL ou PHP survient, elle s'affichera ici
    echo "\n[ERREUR FATALE] Une erreur est survenue :\n";
    echo $e->getMessage() . "\n";
}
?>