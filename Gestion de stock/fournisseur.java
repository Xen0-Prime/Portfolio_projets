public class fournisseur {

    private int id_fournisseur;
    private String nom;
    private String email;
    private String telephone;
    private String adresse;

    public fournisseur(int id_fournisseur, String nom, String email, String telephone, String adresse) {
        this.id_fournisseur = id_fournisseur;
        this.nom = nom;
        this.email = email;
        this.telephone = telephone;
        this.adresse = adresse;
    }

    public fournisseur(String nom, String email, String telephone, String adresse) {
        this(0, nom, email, telephone, adresse); // id = 0 par défaut
    }

    public int getId() { return id_fournisseur; }
    public String getNom() { return nom; }
    public String getEmail() { return email; }
    public String getTelephone() { return telephone; }
    public String getAdresse() { return adresse; }
}
