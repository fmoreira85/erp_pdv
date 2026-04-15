const express = require("express");

const authRoutes = require("./auth.routes");
const categoriesRoutes = require("./categories.routes");
const clientsRoutes = require("./clients.routes");
const dashboardRoutes = require("./dashboard.routes");
const healthRoutes = require("./health.routes");
const pdvRoutes = require("./pdv.routes");
const productsRoutes = require("./products.routes");
const stockRoutes = require("./stock.routes");
const subcategoriesRoutes = require("./subcategories.routes");
const suppliersRoutes = require("./suppliers.routes");
const usersRoutes = require("./users.routes");

const router = express.Router();

router.get("/", (req, res) => {
  return res.json({
    success: true,
    data: {
      message: "API ERP PDV inicializada com sucesso",
    },
    error: null,
  });
});

router.use("/auth", authRoutes);
router.use("/categorias", categoriesRoutes);
router.use("/clientes", clientsRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/health", healthRoutes);
router.use("/pdv", pdvRoutes);
router.use("/produtos", productsRoutes);
router.use("/estoque", stockRoutes);
router.use("/subcategorias", subcategoriesRoutes);
router.use("/fornecedores", suppliersRoutes);
router.use("/usuarios", usersRoutes);

module.exports = router;
