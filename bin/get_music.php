<?php
header('Content-Type: application/json');

// Le chemin vers ton dossier Audio (depuis le dossier Html)
$dossier = '../Audio';
$musiques = [];

if (is_dir($dossier)) {
    // On scanne le dossier
    $fichiers = scandir($dossier);
    
    foreach ($fichiers as $fichier) {
        // On ne garde que les fichiers qui se terminent par .mp3 (ou .wav si tu en as)
        if (pathinfo($fichier, PATHINFO_EXTENSION) === 'mp3') {
            $musiques[] = '../Audio/' . $fichier;
        }
    }
}

// On renvoie la liste au format JSON pour que le JavaScript puisse la lire
echo json_encode(array_values($musiques));
?>