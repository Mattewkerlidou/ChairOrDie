<?php
// Configuration de la base de données pour XAMPP en local
$host = 'localhost'; // L'adresse du serveur local
$dbname = 'chair_or_die'; // Le nom de la base qu'on vient de créer
$user = 'root'; // L'utilisateur par défaut sur XAMPP
$pass = ''; // Le mot de passe par défaut sur XAMPP (vide)

try {
    // Création de la connexion (le pont)
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $user, $pass);
    
    // Configuration pour afficher les erreurs SQL (très utile pour débugger !)
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    // Décommenter la ligne ci-dessous pour tester si la connexion marche
     echo "Connexion à la base de données réussie !";

} catch (PDOException $e) {
    // Si la connexion échoue, on arrête tout et on affiche l'erreur
    die("Erreur de connexion à la base de données : " . $e->getMessage());
}
?>