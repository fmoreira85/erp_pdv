const express = require("express");

const auditRoutes = require("./audit.routes");
const authRoutes = require("./auth.routes");
const categoriesRoutes = require("./categories.routes");
const cashRoutes = require("./cash.routes");
const clientsRoutes = require("./clients.routes");
const dashboardRoutes = require("./dashboard.routes");
const healthRoutes = require("./health.routes");
const lossesRoutes = require("./losses.routes");
const ordersRoutes = require("./orders.routes");
const pdvRoutes = require("./pdv.routes");
const productsRoutes = require("./products.routes");
const reportsRoutes = require("./reports.routes");
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
router.use("/auditoria", auditRoutes);
router.use("/categorias", categoriesRoutes);
router.use("/caixa", cashRoutes);
router.use("/clientes", clientsRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/health", healthRoutes);
router.use("/perdas", lossesRoutes);
router.use("/encomendas", ordersRoutes);
router.use("/pdv", pdvRoutes);
router.use("/produtos", productsRoutes);
router.use("/relatorios", reportsRoutes);
router.use("/estoque", stockRoutes);
router.use("/subcategorias", subcategoriesRoutes);
router.use("/fornecedores", suppliersRoutes);
router.use("/usuarios", usersRoutes);

module.exports = router;
