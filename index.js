require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { initSocket } = require("./socket");
const connectToDatabase = require("./config/db.js");
require("./jobs/PaymentReminders");

// Routes
const authRoutes = require("./routes/auth.js");
const userRoutes = require("./routes/user");
const ownerRoutes = require("./routes/owner");
const tenantRoutes = require("./routes/tenant");
const propertyRoutes = require("./routes/property");
const unitRoutes = require("./routes/unit");
const leaseRoutes = require("./routes/lease");
const documentRoutes = require("./routes/document");
const notificationRoutes = require("./routes/notification");
const messageRoutes = require("./routes/message");
const invitationRoutes = require("./routes/invitation");

const app = express();

// Http server creation
const server = http.createServer(app);

// Init Socket.IO
initSocket(server);

// Connection to MongoDB database
connectToDatabase();

app.use(express.json());
app.use(cors());

// Media uploads
app.use("/uploads", express.static("uploads"));

// Using Routes
app.use(authRoutes);
app.use(userRoutes);
app.use(ownerRoutes);
app.use(tenantRoutes);
app.use(propertyRoutes);
app.use(unitRoutes);
app.use(leaseRoutes);
app.use(documentRoutes);
app.use(notificationRoutes);
app.use(messageRoutes);
app.use(invitationRoutes);

// Catch-all
app.all("*", (req, res) => {
  res.status(404).json({ message: "This route does not exist" });
});

// Start Server
server.listen(process.env.PORT, () =>
  console.log("Server started on port", process.env.PORT)
);
