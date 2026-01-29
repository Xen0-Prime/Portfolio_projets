import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.util.List;

public class articleController {
    private articleView view;
    private articleDAO dao;
    private DefaultTableModel tableModel;

    public articleController(articleView view) {
        this.view = view;
        this.dao = new articleDAO();
        
        String[] colonnes = {"ID", "Nom", "Type", "Prix unitaire", "Quantité stock", "ID Fournisseur", "Nom Fournisseur"};
        tableModel = new DefaultTableModel(colonnes, 0);
        view.table.setModel(tableModel);
                
        view.btnAjouter.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                ajouterArticle();
            }
        });
        
        view.btnModifier.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                modifierArticle();
            }
        });
        
        view.btnSupprimer.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                supprimerArticle();
            }
        });
        
        view.btnTrier.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                trierArticles();
            }
        });
        
        // Ajouter un listener pour remplir les champs lors de la sélection d'une ligne
        view.table.getSelectionModel().addListSelectionListener(e -> {
            if (!e.getValueIsAdjusting()) {
                int selectedRow = view.table.getSelectedRow();
                if (selectedRow != -1) {
                    view.tfNom.setText(tableModel.getValueAt(selectedRow, 1).toString());
                    view.tfPrix_unitaire.setText(tableModel.getValueAt(selectedRow, 3).toString());
                    view.tfQuantite_stock.setText(tableModel.getValueAt(selectedRow, 4).toString());
                }
            }
        });
        
        afficherArticles();
    }
    
    private void afficherArticles() {
        tableModel.setRowCount(0);
        List<Object[]> articles = dao.findAllWithFournisseur();
        
        System.out.println("Nombre d'articles chargés: " + articles.size());
        
        for (Object[] row : articles) {
            tableModel.addRow(row);
        }
    }
    
    private void ajouterArticle() {
        try {
            String nom = view.tfNom.getText();
            double prix = Double.parseDouble(view.tfPrix_unitaire.getText());
            int quantite = Integer.parseInt(view.tfQuantite_stock.getText());
            
            articleModel article = new articleModel(0, nom, "Fruit", prix, quantite, 1);
            
            if (dao.insert(article)) {
                JOptionPane.showMessageDialog(view, "Article ajouté avec succès !");
                afficherArticles();
                viderChamps();
            } else {
                JOptionPane.showMessageDialog(view, "Erreur lors de l'ajout !", "Erreur", JOptionPane.ERROR_MESSAGE);
            }
        } catch (NumberFormatException e) {
            JOptionPane.showMessageDialog(view, "Veuillez entrer des valeurs valides !", "Erreur", JOptionPane.ERROR_MESSAGE);
        }
    }
    
    private void modifierArticle() {
        int selectedRow = view.table.getSelectedRow();
        if (selectedRow == -1) {
            JOptionPane.showMessageDialog(view, "Veuillez sélectionner un article à modifier !");
            return;
        }
        
        try {
            int id = (int) tableModel.getValueAt(selectedRow, 0);
            String nom = view.tfNom.getText();
            double prix = Double.parseDouble(view.tfPrix_unitaire.getText());
            int quantite = Integer.parseInt(view.tfQuantite_stock.getText());
            
            articleModel article = new articleModel(id, nom, "Fruit", prix, quantite, 1);
            
            if (dao.update(article)) {
                JOptionPane.showMessageDialog(view, "Article modifié avec succès !");
                afficherArticles();
                viderChamps();
            } else {
                JOptionPane.showMessageDialog(view, "Erreur lors de la modification !", "Erreur", JOptionPane.ERROR_MESSAGE);
            }
        } catch (NumberFormatException e) {
            JOptionPane.showMessageDialog(view, "Veuillez entrer des valeurs valides !", "Erreur", JOptionPane.ERROR_MESSAGE);
        }
    }
    
    private void supprimerArticle() {
        int selectedRow = view.table.getSelectedRow();
        if (selectedRow == -1) {
            JOptionPane.showMessageDialog(view, "Veuillez sélectionner un article à supprimer !");
            return;
        }
        
        int id = (int) tableModel.getValueAt(selectedRow, 0);
        int confirm = JOptionPane.showConfirmDialog(view, "Voulez-vous vraiment supprimer cet article ?", "Confirmation", JOptionPane.YES_NO_OPTION);
        
        if (confirm == JOptionPane.YES_OPTION) {
            if (dao.delete(id)) {
                JOptionPane.showMessageDialog(view, "Article supprimé avec succès !");
                afficherArticles();
                viderChamps();
            } else {
                JOptionPane.showMessageDialog(view, "Erreur lors de la suppression !", "Erreur", JOptionPane.ERROR_MESSAGE);
            }
        }
    }
    
    private void trierArticles() {
        String[] criteres = {"Nom", "Prix unitaire"};
        String critere = (String) JOptionPane.showInputDialog(
                view,
                "Sélectionnez le critère de tri:",
                "Trier les articles",
                JOptionPane.QUESTION_MESSAGE,
                null,
                criteres,
                criteres[0]);
        
        if (critere == null) return;
        
        String[] ordres = {"Croissant", "Décroissant"};
        String ordre = (String) JOptionPane.showInputDialog(
                view,
                "Sélectionnez l'ordre:",
                "Ordre de tri",
                JOptionPane.QUESTION_MESSAGE,
                null,
                ordres,
                ordres[0]);
        
        if (ordre == null) return;
        
        String colonneSQL = critere.equals("Nom") ? "nom" : "prix_unitaire";
        String ordreSQL = ordre.equals("Croissant") ? "ASC" : "DESC";
        
        tableModel.setRowCount(0);
        List<Object[]> articles = dao.findAllWithFournisseurSorted(colonneSQL, ordreSQL);
        
        System.out.println("Nombre d'articles triés: " + articles.size());
        
        for (Object[] row : articles) {
            tableModel.addRow(row);
        }
    }
    
    private void viderChamps() {
        view.tfNom.setText("");
        view.tfPrix_unitaire.setText("");
        view.tfQuantite_stock.setText("");
    }
}
