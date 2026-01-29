import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.util.List;

public class fournisseurController {
    private fournisseurView view;
    private fournisseurDAO dao;
    private DefaultTableModel tableModel;

    public fournisseurController(fournisseurView view) {
        this.view = view;
        this.dao = new fournisseurDAO();
        
        String[] colonnes = {"ID", "Nom", "Email", "Téléphone", "Adresse"};
        tableModel = new DefaultTableModel(colonnes, 0);
        view.table.setModel(tableModel);
        
        
        view.btnAjouter.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                ajouterFournisseur();
            }
        });
        
        view.btnModifier.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                modifierFournisseur();
            }
        });
        
        view.btnSupprimer.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                supprimerFournisseur();
            }
        });
        
        view.table.getSelectionModel().addListSelectionListener(e -> {
            if (!e.getValueIsAdjusting()) {
                int selectedRow = view.table.getSelectedRow();
                if (selectedRow != -1) {
                    view.tfNom.setText(tableModel.getValueAt(selectedRow, 1).toString());
                    view.tfEmail.setText(tableModel.getValueAt(selectedRow, 2).toString());
                    view.tfTelephone.setText(tableModel.getValueAt(selectedRow, 3).toString());
                    view.tfAdresse.setText(tableModel.getValueAt(selectedRow, 4).toString());
                }
            }
        });
        
        afficherFournisseurs();
    }
    
    private void afficherFournisseurs() {
        tableModel.setRowCount(0);
        List<fournisseurModel> fournisseurs = dao.findAll();
        
        System.out.println("Nombre de fournisseurs chargés: " + fournisseurs.size());
        
        for (fournisseurModel fournisseur : fournisseurs) {
            Object[] row = {
                fournisseur.getId_fournisseur(),
                fournisseur.getNom(),
                fournisseur.getEmail(),
                fournisseur.getTelephone(),
                fournisseur.getAdresse()
            };
            tableModel.addRow(row);
        }
    }
    
    private void ajouterFournisseur() {
        String nom = view.tfNom.getText();
        String email = view.tfEmail.getText();
        String telephone = view.tfTelephone.getText();
        String adresse = view.tfAdresse.getText();
        
        if (nom.isEmpty() || email.isEmpty()) {
            JOptionPane.showMessageDialog(view, "Le nom et l'email sont obligatoires !", "Erreur", JOptionPane.ERROR_MESSAGE);
            return;
        }
        
        fournisseurModel fournisseur = new fournisseurModel(0, nom, email, telephone, adresse);
        
        if (dao.insert(fournisseur)) {
            JOptionPane.showMessageDialog(view, "Fournisseur ajouté avec succès !");
            afficherFournisseurs();
            viderChamps();
        } else {
            JOptionPane.showMessageDialog(view, "Erreur lors de l'ajout !", "Erreur", JOptionPane.ERROR_MESSAGE);
        }
    }
    
    private void modifierFournisseur() {
        int selectedRow = view.table.getSelectedRow();
        if (selectedRow == -1) {
            JOptionPane.showMessageDialog(view, "Veuillez sélectionner un fournisseur à modifier !");
            return;
        }
        
        int id = (int) tableModel.getValueAt(selectedRow, 0);
        String nom = view.tfNom.getText();
        String email = view.tfEmail.getText();
        String telephone = view.tfTelephone.getText();
        String adresse = view.tfAdresse.getText();
        
        if (nom.isEmpty() || email.isEmpty()) {
            JOptionPane.showMessageDialog(view, "Le nom et l'email sont obligatoires !", "Erreur", JOptionPane.ERROR_MESSAGE);
            return;
        }
        
        fournisseurModel fournisseur = new fournisseurModel(id, nom, email, telephone, adresse);
        
        if (dao.update(fournisseur)) {
            JOptionPane.showMessageDialog(view, "Fournisseur modifié avec succès !");
            afficherFournisseurs();
            viderChamps();
        } else {
            JOptionPane.showMessageDialog(view, "Erreur lors de la modification !", "Erreur", JOptionPane.ERROR_MESSAGE);
        }
    }
    
    private void supprimerFournisseur() {
        int selectedRow = view.table.getSelectedRow();
        if (selectedRow == -1) {
            JOptionPane.showMessageDialog(view, "Veuillez sélectionner un fournisseur à supprimer !");
            return;
        }
        
        int id = (int) tableModel.getValueAt(selectedRow, 0);
        int confirm = JOptionPane.showConfirmDialog(view, "Voulez-vous vraiment supprimer ce fournisseur ?", "Confirmation", JOptionPane.YES_NO_OPTION);
        
        if (confirm == JOptionPane.YES_OPTION) {
            if (dao.delete(id)) {
                JOptionPane.showMessageDialog(view, "Fournisseur supprimé avec succès !");
                afficherFournisseurs();
                viderChamps();
            } else {
                JOptionPane.showMessageDialog(view, "Erreur lors de la suppression !", "Erreur", JOptionPane.ERROR_MESSAGE);
            }
        }
    }
    
    private void viderChamps() {
        view.tfNom.setText("");
        view.tfEmail.setText("");
        view.tfTelephone.setText("");
        view.tfAdresse.setText("");
    }
}
