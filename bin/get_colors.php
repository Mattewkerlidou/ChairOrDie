<?php
header('Content-Type: application/json');

// Le dossier contenant les sprites des personnages
$dossier = '../sprite/caractere';
$couleurs = [];

if (is_dir($dossier)) {
    $fichiers = scandir($dossier);
    
    foreach ($fichiers as $fichier) {
        // On cherche uniquement les dossiers (ex: "red", "yellow"), et on ignore les fichiers cachés . et ..
        if ($fichier !== '.' && $fichier !== '..' && is_dir($dossier . '/' . $fichier)) {
            $couleurs[] = $fichier;
        }
    }
}

// On renvoie la liste des dossiers trouvés
echo json_encode(array_values($couleurs));
?>