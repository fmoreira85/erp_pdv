const express = require("express");
const cors = require("cors");

const { env } = require("./config/env");
const { auditContextMiddleware } = require("./middlewares/auditContext.middleware");
const routes = require("./routes");
const { notFoundMiddleware } = require("./middlewares/notFound.middleware");
const { errorMiddleware } = require("./middlewares/error.middleware");

const app = express();

app.use(
  cors({
    origin: env.corsOrigin,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(auditContextMiddleware);

app.use("/api", routes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
