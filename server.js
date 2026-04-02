require("dotenv").config();
const express = require("express");
const http = require("http");
const morgan = require("morgan");
const { Server } = require("socket.io");

const env = require("./src/config/env");
const rateLimiter = require("./src/common/middleware/rateLimiter");
const errorHandler = require("./src/common/middleware/errorHandler");

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

// Example routers
app.use("/api/auth", require("./src/modules/auth/auth.routes"));
app.use("/api/users", require("./src/modules/user/user.routes"));

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