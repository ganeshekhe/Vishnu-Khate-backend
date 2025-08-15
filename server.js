
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const Grid = require("gridfs-stream");
const http = require("http");
const { Server } = require("socket.io");

// ✅ Create express app and wrap with http server
const app = express();
const server = http.createServer(app);

// ✅ Initialize socket.io
const io = new Server(server, {
  cors: {
    origin: "*", // You can replace with your frontend domain
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

const PORT = process.env.PORT || 5000;

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ Routes (Pass io to applicationRoutes)
const authRoutes = require("./routes/authRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const userRoutes = require("./routes/userRoutes");
const applicationRoutes = require("./routes/applicationRoutes")(io); // <-- important
const noticeRoutes = require("./routes/noticeRoutes");
const heroRoutes = require("./routes/heroRoutes");
const uploadRoutes = require("./routes/uploads");
const fileRoutes = require("./routes/files");

// ✅ Use routes
app.use("/api/auth", authRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/users", userRoutes);
app.use("/api/applications", applicationRoutes); // already passed io
app.use("/api/notices", noticeRoutes);
app.use("/api/heroslides", heroRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/files", fileRoutes);

// ✅ Test Route
app.get("/", (req, res) => {
  res.send("✅ Maha e-Seva Backend (GridFS + Socket.IO) Running");
});

// ✅ GridFS Setup
let gfs;
mongoose
  .connect(process.env.MONGO_URI) // 🛠 Removed deprecated options
  .then(() => {
    const conn = mongoose.connection;
    conn.once("open", () => {
      gfs = Grid(conn.db, mongoose.mongo);
      gfs.collection("uploads");
      console.log("✅ GridFS initialized");
    });

    console.log("✅ MongoDB Connected");

    // ✅ Start server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
  });

// ✅ Socket.IO Logic
io.on("connection", (socket) => {
  console.log("📡 New client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});
