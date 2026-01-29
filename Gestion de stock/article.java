public class article {

    private int id_article;
    private String nom;
    private String type;
    private double prix_unitaire;
    private int quantite_stock;
    private int id_fournisseur;

    public article(int id_article, String nom, String type, double prix_unitaire, int quantite_stock, int id_fournisseur) {
        this.id_article = id_article;
        this.nom = nom;
        this.type = type;
        this.prix_unitaire = prix_unitaire;
        this.quantite_stock = quantite_stock;
        this.id_fournisseur = id_fournisseur;
    }

    public article(String nom, String type, double prix_unitaire, int quantite_stock, int id_fournisseur) {
        this(0, nom, type, prix_unitaire, quantite_stock, id_fournisseur); // id = 0 par défaut
    }

    public int getId() { return id_article; }
    public String getNom() { return nom; }
    public String getType() { return type; }
    public double getPrixUnitaire() { return prix_unitaire; }
    public int getQuantiteStock() { return quantite_stock; }
    public int getIdFournisseur() { return id_fournisseur; }
}
