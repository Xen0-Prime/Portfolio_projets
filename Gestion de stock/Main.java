import javax.swing.*;
import java.awt.*;

public class Main {
    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            JFrame accueil = new JFrame("Tonton Primeur - Accueil");
            accueil.setSize(400, 200);
            accueil.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
            accueil.setLayout(new GridBagLayout());
            accueil.setLocationRelativeTo(null);
            
            GridBagConstraints gbc = new GridBagConstraints();
            gbc.insets = new Insets(10, 10, 10, 10);
            gbc.fill = GridBagConstraints.HORIZONTAL;
            
            JLabel titre = new JLabel("Bienvenue dans Tonton Primeur", SwingConstants.CENTER);
            titre.setFont(new Font("Arial", Font.BOLD, 18));
            gbc.gridx = 0;
            gbc.gridy = 0;
            gbc.gridwidth = 2;
            accueil.add(titre, gbc);
            
            // Bouton Articles
            JButton btnArticles = new JButton("Gérer les Articles");
            btnArticles.setFont(new Font("Arial", Font.PLAIN, 14));
            gbc.gridx = 0;
            gbc.gridy = 1;
            gbc.gridwidth = 1;
            accueil.add(btnArticles, gbc);
            
            JButton btnFournisseurs = new JButton("Gérer les Fournisseurs");
            btnFournisseurs.setFont(new Font("Arial", Font.PLAIN, 14));
            gbc.gridx = 1;
            gbc.gridy = 1;
            accueil.add(btnFournisseurs, gbc);
            
            btnArticles.addActionListener(e -> {
                articleView articleView = new articleView();
                new articleController(articleView);
                articleView.setVisible(true);
            });
            
            btnFournisseurs.addActionListener(e -> {
                fournisseurView fournisseurView = new fournisseurView();
                new fournisseurController(fournisseurView);
                fournisseurView.setVisible(true);
            });
            
            accueil.setVisible(true);
        });
    }
}