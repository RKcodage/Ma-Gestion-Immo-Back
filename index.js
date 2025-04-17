const express = require("express");
const cors = require("cors");
const connectToDatabase = require("./config/db.js");

// Routes
const authRoutes = require("./routes/auth.js");
const userRoutes = require("./routes/user");
const ownerRoutes = require("./routes/owner");
const tenantRoutes = require("./routes/tenant");

const app = express();
app.use(express.json());
app.use(cors());

// Media uploads
app.use("/uploads", express.static("uploads"));

require("dotenv").config();
// Connexion MongoDB
connectToDatabase();

// Using Routes
app.use(authRoutes);
app.use(userRoutes);
app.use(ownerRoutes);
app.use(tenantRoutes);

// Catch-all
app.all("*", (req, res) => {
  res.status(404).json({ message: "This route does not exist" });
});

// Start Serveur
app.listen(process.env.PORT, () =>
  console.log("Server started on port", process.env.PORT)
);
