public class articleModel {
    private int id_article;
    private String nom;
    private String type;
    private double prix_unitaire;
    private int quantite_stock;
    private int id_fournisseur;

    public articleModel(int id_article, String nom, String type, double prix_unitaire, int quantite_stock, int id_fournisseur) {
        this.id_article = id_article;
        this.nom = nom;
        this.type = type;
        this.prix_unitaire = prix_unitaire;
        this.quantite_stock = quantite_stock;
        this.id_fournisseur = id_fournisseur;
    }

    // Getters et Setters
    public int getId_article() {
        return id_article;
    }
    public void setId_article(int id_article) {
        this.id_article = id_article;
    }

    public String getNom() {
        return nom;
    }
    public void setNom(String nom) {
        this.nom = nom;
    }

    public String getType() {
        return type;
    }
    public void setType(String type) {
        this.type = type;
    }

    public double getPrix_unitaire() {
        return prix_unitaire;
    }
    public void setPrix_unitaire(double prix_unitaire) {
        this.prix_unitaire = prix_unitaire;
    }

    public int getQuantite_stock() {
        return quantite_stock;
    }
    public void setQuantite_stock(int quantite_stock) {
        this.quantite_stock = quantite_stock;
    }

    public int getId_fournisseur() {
        return id_fournisseur;
    }
    public void setId_fournisseur(int id_fournisseur) {
        this.id_fournisseur = id_fournisseur;
    }
}