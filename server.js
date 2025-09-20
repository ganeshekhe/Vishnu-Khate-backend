


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
    origin: "*", // Replace with frontend domain in production
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

const PORT = process.env.PORT || 5000;

// ✅ Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Make io available in all routes (req.io)
app.set("io", io);
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ✅ Routes
const authRoutes = require("./routes/authRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const userRoutes = require("./routes/userRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const noticeRoutes = require("./routes/noticeRoutes");
const heroRoutes = require("./routes/heroRoutes");
const uploadRoutes = require("./routes/uploads");
const fileRoutes = require("./routes/files");
const categoryRoutes = require("./routes/categoryRoutes");
const paymentRoutes = require("./routes/paymentRoutes"); // Razorpay Routes

// ✅ Use routes
app.use("/api/auth", authRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/users", userRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/heroslides", heroRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/payments", paymentRoutes);

// ✅ Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Test Route
app.get("/", (req, res) => {
  res.send("✅ Maha e-Seva Backend (GridFS + Socket.IO + Razorpay) Running");
});

// ✅ MongoDB + GridFS Setup
let gfs;
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
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
