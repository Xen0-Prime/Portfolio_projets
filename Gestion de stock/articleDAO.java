import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class articleDAO {

    public List<articleModel> findAll() {
        List<articleModel> list = new ArrayList<>();
        String sql = "SELECT id_article, nom, type, prix_unitaire, quantite_stock, id_fournisseur FROM article ORDER BY id_article DESC";

        try (Connection cnx = DB.getConnection();
             PreparedStatement ps = cnx.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                list.add(new articleModel(
                        rs.getInt("id_article"),
                        rs.getString("nom"),
                        rs.getString("type"),
                        rs.getDouble("prix_unitaire"),
                        rs.getInt("quantite_stock"),
                        rs.getInt("id_fournisseur")));
            }

        } catch (SQLException e) {
            System.err.println("Erreur lors du chargement des articles: " + e.getMessage());
            e.printStackTrace();
        }

        return list;
    }

    public boolean insert(articleModel a) {
        String sql = "INSERT INTO article(nom, type, prix_unitaire, quantite_stock, id_fournisseur) VALUES(?, ?, ?, ?, ?)";

        try (Connection cnx = DB.getConnection();
             PreparedStatement ps = cnx.prepareStatement(sql)) {

            ps.setString(1, a.getNom());
            ps.setString(2, a.getType());
            ps.setDouble(3, a.getPrix_unitaire());
            ps.setInt(4, a.getQuantite_stock());
            ps.setInt(5, a.getId_fournisseur());

            return ps.executeUpdate() == 1;

        } catch (SQLException e) {
            return false;
        }
    }

    public boolean update(articleModel a) {
        String sql ="UPDATE article SET nom = ?, type = ?, prix_unitaire = ?, quantite_stock = ?, id_fournisseur = ? WHERE id_article = ?";

        try (Connection cnx = DB.getConnection();
             PreparedStatement ps = cnx.prepareStatement(sql)) {

            ps.setString(1, a.getNom());
            ps.setString(2, a.getType());
            ps.setDouble(3, a.getPrix_unitaire());
            ps.setInt(4, a.getQuantite_stock());
            ps.setInt(5, a.getId_fournisseur());
            ps.setInt(6, a.getId_article());

            return ps.executeUpdate() == 1;

        } catch (SQLException e) {
            return false;
        }
    }

    public boolean delete(int id_article) {
        String sql = "DELETE FROM article WHERE id_article = ?";

        try (Connection cnx = DB.getConnection();
             PreparedStatement ps = cnx.prepareStatement(sql)) {

            ps.setInt(1, id_article);

            return ps.executeUpdate() == 1;

        } catch (SQLException e) {
            return false;
        }
    }

    public boolean select (int id_article) {
        String sql = "SELECT id_article, nom, type, prix_unitaire, quantite_stock, id_fournisseur FROM article WHERE id_article = ?";

        try (Connection cnx = DB.getConnection();
             PreparedStatement ps = cnx.prepareStatement(sql)) {

            ps.setInt(1, id_article);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }

        } catch (SQLException e) {
            return false;
        }
    }

    public List<articleModel> findAllWithSort(String colonne, String ordre) {
        List<articleModel> list = new ArrayList<>();
        String sql = "SELECT id_article, nom, type, prix_unitaire, quantite_stock, id_fournisseur FROM article ORDER BY " + colonne + " " + ordre;

        try (Connection cnx = DB.getConnection();
             PreparedStatement ps = cnx.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                list.add(new articleModel(
                        rs.getInt("id_article"),
                        rs.getString("nom"),
                        rs.getString("type"),
                        rs.getDouble("prix_unitaire"),
                        rs.getInt("quantite_stock"),
                        rs.getInt("id_fournisseur")));
            }

        } catch (SQLException e) {
            System.err.println("Erreur lors du tri des articles: " + e.getMessage());
            e.printStackTrace();
        }

        return list;
    }

    public List<Object[]> findAllWithFournisseur() {
        List<Object[]> list = new ArrayList<>();
        String sql = "SELECT a.id_article, a.nom, a.type, a.prix_unitaire, a.quantite_stock, a.id_fournisseur, f.nom as nom_fournisseur " +
                     "FROM article a LEFT JOIN fournisseur f ON a.id_fournisseur = f.id_fournisseur " +
                     "ORDER BY a.id_article DESC";

        try (Connection cnx = DB.getConnection();
             PreparedStatement ps = cnx.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                Object[] row = {
                    rs.getInt("id_article"),
                    rs.getString("nom"),
                    rs.getString("type"),
                    rs.getDouble("prix_unitaire"),
                    rs.getInt("quantite_stock"),
                    rs.getInt("id_fournisseur"),
                    rs.getString("nom_fournisseur")
                };
                list.add(row);
            }

        } catch (SQLException e) {
            System.err.println("Erreur lors du chargement des articles avec fournisseurs: " + e.getMessage());
            e.printStackTrace();
        }

        return list;
    }

    public List<Object[]> findAllWithFournisseurSorted(String colonne, String ordre) {
        List<Object[]> list = new ArrayList<>();
        String sql = "SELECT a.id_article, a.nom, a.type, a.prix_unitaire, a.quantite_stock, a.id_fournisseur, f.nom as nom_fournisseur " +
                     "FROM article a LEFT JOIN fournisseur f ON a.id_fournisseur = f.id_fournisseur " +
                     "ORDER BY a." + colonne + " " + ordre;

        try (Connection cnx = DB.getConnection();
             PreparedStatement ps = cnx.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                Object[] row = {
                    rs.getInt("id_article"),
                    rs.getString("nom"),
                    rs.getString("type"),
                    rs.getDouble("prix_unitaire"),
                    rs.getInt("quantite_stock"),
                    rs.getInt("id_fournisseur"),
                    rs.getString("nom_fournisseur")
                };
                list.add(row);
            }

        } catch (SQLException e) {
            System.err.println("Erreur lors du tri des articles avec fournisseurs: " + e.getMessage());
            e.printStackTrace();
        }

        return list;
    }
}
