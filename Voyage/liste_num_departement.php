<?php
// Connexion à la base de données
$servername = "localhost"; //mettre le nom de VOTRE serveur 
$username = "root"; //mettre VOTRE identifiant 
$password = "root"; //mettre VOTRE mot de passe 
$dbname = "Ville_France"; //mettre le nom de VOTRE base de données 

$conn = mysqli_connect($servername, $username, $password, $dbname);

// Vérifier la connexion
if (!$conn) {
    die("La connexion à la base de données a échoué : " . mysqli_connect_error());
}

// Exécution de la requête SQL
$sql = "SELECT ville_nom FROM villes_france_free WHERE ville_departement =". $_POST['num_departement'].";"; //requete que vous souhaitez 
$result = mysqli_query($conn, $sql);

// Traitement des résultats
if (mysqli_num_rows($result) > 0) {
    while ($row = mysqli_fetch_assoc($result)) {
        echo "Nom des communes : " . $row["ville_nom"] . "<br>"; //adaptation des resultats en fonction du tableau retourné 
    }
} else {
    echo "Aucun résultat trouvé";
}

// Fermer la connexion
mysqli_close($conn);
?>
