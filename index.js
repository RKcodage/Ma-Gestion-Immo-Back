const express = require("express");
const cors = require("cors");

const connectToDatabase = require("./config/db.js");

// Routes
// const userRoutes = require("./routes/user.js");

const app = express();
app.use(express.json());
app.use(cors());

require("dotenv").config();
// Connexion MongoDB
connectToDatabase();

// Using Routes
// app.use(userRoutes);

// Catch-all
app.all("*", (req, res) => {
  res.status(404).json({ message: "This route does not exist" });
});

// Start Serveur
app.listen(process.env.PORT, () =>
  console.log("Server started on port", process.env.PORT)
);
