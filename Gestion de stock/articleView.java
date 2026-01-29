import javax.swing.*;

public class articleView extends JFrame {

    public JTable table;
    public JTextField tfNom;
    public JTextField tfPrix_unitaire;
    public JTextField tfQuantite_stock;

    public JButton btnAjouter;
    public JButton btnModifier;
    public JButton btnSupprimer;
    public JButton btnTrier;
    public JButton btnAfficher;

    public articleView(){
        this.setTitle("Gestion des Articles");
        this.setSize(800,600);
        this.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        this.setLayout(null);

        JLabel lblNom = new JLabel("Nom:");
        lblNom.setBounds(20,20,100,25);
        this.add(lblNom);

        tfNom = new JTextField();
        tfNom.setBounds(120,20,200,25);
        this.add(tfNom);

        JLabel lblPrix = new JLabel("Prix:");
        lblPrix.setBounds(20,60,100,25);
        this.add(lblPrix);

        tfPrix_unitaire = new JTextField();
        tfPrix_unitaire.setBounds(120,60,200,25);
        this.add(tfPrix_unitaire);

        JLabel lblQuantite = new JLabel("Quantité:");
        lblQuantite.setBounds(20,100,100,25);
        this.add(lblQuantite);

        tfQuantite_stock = new JTextField();
        tfQuantite_stock.setBounds(120,100,200,25);
        this.add(tfQuantite_stock);

        btnAjouter = new JButton("Ajouter");
        btnAjouter.setBounds(350,20,100,25);
        this.add(btnAjouter);

        btnModifier = new JButton("Modifier");
        btnModifier.setBounds(350,60,100,25);
        this.add(btnModifier);

        btnSupprimer = new JButton("Supprimer");
        btnSupprimer.setBounds(350,100,100,25);
        this.add(btnSupprimer);

        btnTrier = new JButton("Trier");
        btnTrier.setBounds(470,20,100,25);
        this.add(btnTrier);

        table = new JTable();
        JScrollPane scrollPane = new JScrollPane(table);
        scrollPane.setBounds(20,150,740,400);
        this.add(scrollPane);

    }

}
