import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class fournisseurDAO {

    public List<fournisseurModel> findAll() {
        List<fournisseurModel> list = new ArrayList<>();
        String sql = "SELECT id_fournisseur, nom, email, telephone, adresse FROM fournisseur ORDER BY id_fournisseur DESC";

        try (Connection cnx = DB.getConnection();
             PreparedStatement ps = cnx.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                list.add(new fournisseurModel(
                        rs.getInt("id_fournisseur"),
                        rs.getString("nom"),
                        rs.getString("email"),
                        rs.getString("telephone"),
                        rs.getString("adresse")));
            }

        } catch (SQLException e) {
            System.err.println("Erreur lors du chargement des fournisseurs: " + e.getMessage());
            e.printStackTrace();
        }

        return list;
    }

    public boolean insert(fournisseurModel f) {
        String sql = "INSERT INTO fournisseur(nom, email, telephone, adresse) VALUES(?, ?, ?, ?)";

        try (Connection cnx = DB.getConnection();
             PreparedStatement ps = cnx.prepareStatement(sql)) {

            ps.setString(1, f.getNom());
            ps.setString(2, f.getEmail());
            ps.setString(3, f.getTelephone());
            ps.setString(4, f.getAdresse());

            return ps.executeUpdate() == 1;

        } catch (SQLException e) {
            return false;
        }
    }

    public boolean update(fournisseurModel f) {
        String sql ="UPDATE fournisseur SET nom = ?, email = ?, telephone = ?, adresse = ? WHERE id_fournisseur = ?";

        try (Connection cnx = DB.getConnection();
             PreparedStatement ps = cnx.prepareStatement(sql)) {

            ps.setString(1, f.getNom());
            ps.setString(2, f.getEmail());
            ps.setString(3, f.getTelephone());
            ps.setString(4, f.getAdresse());
            ps.setInt(5, f.getId_fournisseur());

            return ps.executeUpdate() == 1;

        } catch (SQLException e) {
            return false;
        }
    }

    public boolean delete(int id_fournisseur) {
        String sql = "DELETE FROM fournisseur WHERE id_fournisseur = ?";

        try (Connection cnx = DB.getConnection();
             PreparedStatement ps = cnx.prepareStatement(sql)) {

            ps.setInt(1, id_fournisseur);

            return ps.executeUpdate() == 1;

        } catch (SQLException e) {
            return false;
        }
    }
}
