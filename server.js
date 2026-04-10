require("dotenv").config();
const paymentRoutes = require("./src/modules/payment/routes");
const notificationRoutes = require("./src/modules/notification/routes");
const express = require("express");
const http = require("http");
const morgan = require("morgan");
const { Server } = require("socket.io");

const env = require("./src/config/env");
const rateLimiter = require("./src/common/middleware/rateLimiter");
const errorHandler = require("./src/common/middleware/errorHandler");

const authRoutes = require("./src/modules/auth/auth.routes");
const userRoutes = require("./src/modules/user/user.routes");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

app.use(express.json());
app.use(morgan("dev"));
app.use(rateLimiter);

app.get("/", (req, res) => {
  res.json({ success: true, message: "API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/notifications", notificationRoutes);

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

app.use(errorHandler);

server.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});