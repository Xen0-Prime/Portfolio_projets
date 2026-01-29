import javax.swing.*;

public class fournisseurView extends JFrame {

    public JTable table;
    public JTextField tfNom;
    public JTextField tfEmail;
    public JTextField tfTelephone;
    public JTextField tfAdresse;

    public JButton btnAjouter;
    public JButton btnModifier;
    public JButton btnSupprimer;
    public JButton btnAfficher;

    public fournisseurView(){
        this.setTitle("Gestion des Fournisseurs");
        this.setSize(900,600);
        this.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        this.setLayout(null);

        JLabel lblNom = new JLabel("Nom:");
        lblNom.setBounds(20,20,100,25);
        this.add(lblNom);

        tfNom = new JTextField();
        tfNom.setBounds(120,20,200,25);
        this.add(tfNom);

        JLabel lblEmail = new JLabel("Email:");
        lblEmail.setBounds(20,60,100,25);
        this.add(lblEmail);

        tfEmail = new JTextField();
        tfEmail.setBounds(120,60,200,25);
        this.add(tfEmail);

        JLabel lblTelephone = new JLabel("Téléphone:");
        lblTelephone.setBounds(20,100,100,25);
        this.add(lblTelephone);

        tfTelephone = new JTextField();
        tfTelephone.setBounds(120,100,200,25);
        this.add(tfTelephone);

        JLabel lblAdresse = new JLabel("Adresse:");
        lblAdresse.setBounds(350,20,100,25);
        this.add(lblAdresse);

        tfAdresse = new JTextField();
        tfAdresse.setBounds(450,20,200,25);
        this.add(tfAdresse);

        btnAjouter = new JButton("Ajouter");
        btnAjouter.setBounds(680,20,100,25);
        this.add(btnAjouter);

        btnModifier = new JButton("Modifier");
        btnModifier.setBounds(680,60,100,25);
        this.add(btnModifier);

        btnSupprimer = new JButton("Supprimer");
        btnSupprimer.setBounds(680,100,100,25);
        this.add(btnSupprimer);

        table = new JTable();
        JScrollPane scrollPane = new JScrollPane(table);
        scrollPane.setBounds(20,150,840,400);
        this.add(scrollPane);

    }
}
