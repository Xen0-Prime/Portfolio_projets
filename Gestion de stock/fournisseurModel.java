public class fournisseurModel {
    private int id_fournisseur;
    private String nom;
    private String email;
    private String telephone;
    private String adresse;

    public fournisseurModel(int id_fournisseur, String nom, String email, String telephone, String adresse) {
        this.id_fournisseur = id_fournisseur;
        this.nom = nom;
        this.email = email;
        this.telephone = telephone;
        this.adresse = adresse;
    }

    public int getId_fournisseur() {
        return id_fournisseur;
    }
    public void setId_fournisseur(int id_fournisseur) {
        this.id_fournisseur = id_fournisseur;
    }

    public String getNom() {
        return nom;
    }
    public void setNom(String nom) {
        this.nom = nom;
    }

    public String getEmail() {
        return email;
    }
    public void setEmail(String email) {
        this.email = email;
    }

    public String getTelephone() {
        return telephone;
    }
    public void setTelephone(String telephone) {
        this.telephone = telephone;
    }
    
    public String getAdresse() {
        return adresse;
    }
    public void setAdresse(String adresse) {
        this.adresse = adresse;
    }
}
