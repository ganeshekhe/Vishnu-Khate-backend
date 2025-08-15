
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const multer = require("multer");
const { GridFsStorage } = require("multer-gridfs-storage");
const Grid = require("gridfs-stream");
const { verifyToken } = require("../middleware/authMiddleware");
const User = require("../models/User");

// GridFS Setup
let gfs;
const conn = mongoose.connection;
conn.once("open", () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads"); // your bucket name
});

// GridFS Storage Configuration
const storage = new GridFsStorage({
  url: process.env.MONGO_URI,
  file: (req, file) => {
    return {
      filename: `${Date.now()}-${file.originalname}`,
      bucketName: "uploads",
    };
  },
});
const upload = multer({ storage });

// GET All Users (Admin Only)
router.get("/", verifyToken, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Access denied" });

  try {
    const users = await User.find({}, "-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// PUT - Update User Role
router.put("/:id/role", verifyToken, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Access denied" });

  const { role } = req.body;
  const validRoles = ["user", "operator", "admin"];
  if (!validRoles.includes(role))
    return res.status(400).json({ message: "Invalid role" });

  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, select: "-password" }
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Role updated", user });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// PUT - Update Profile with GridFS Documents
router.put(
  "/profile",
  verifyToken,
  upload.fields([
    { name: "profilePic", maxCount: 1 },
    { name: "tenthCertificate", maxCount: 2 },
    { name: "tenthMarksheet", maxCount: 1 },
    { name: "twelfthCertificate", maxCount: 1 },
    { name: "twelfthMarksheet", maxCount: 1 },
    { name: "graduationDegree", maxCount: 1 },
    { name: "domicile", maxCount: 1 },
    { name: "pgCertificate", maxCount: 1 },
    { name: "casteValidity", maxCount: 1 },
    { name: "otherDocument", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { gender, dob, caste } = req.body;
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (gender) user.gender = gender;
      if (dob) user.dob = dob;
      if (caste) user.caste = caste;

      const docFields = [
        "tenthCertificate",
        "tenthMarksheet",
        "twelfthCertificate",
        "twelfthMarksheet",
        "graduationDegree",
        "domicile",
        "pgCertificate",
        "casteValidity",
        "otherDocument",
      ];

      docFields.forEach((field) => {
        if (req.files[field]?.[0]) {
          const file = req.files[field][0];
          user[field] = {
            filename: file.filename,
            fileId: file.id,
            uploadedAt: new Date(),
          };
        }
      });

      if (req.files.profilePic?.[0]) {
        const file = req.files.profilePic[0];
        user.profilePic = {
          filename: file.filename,
          fileId: file.id,
          uploadedAt: new Date(),
        };
      }

      await user.save();

      res.json({
        message: "Profile updated successfully",
        user: {
          name: user.name,
          mobile: user.mobile,
          gender: user.gender,
          dob: user.dob,
          caste: user.caste,
          profilePic: user.profilePic,
          ...docFields.reduce((acc, field) => {
            if (user[field]) acc[field] = user[field];
            return acc;
          }, {}),
        },
      });
    } catch (err) {
      console.error("Profile update failed:", err);
      res.status(500).json({ message: "Failed to update profile" });
    }
  }
);

// ✅ DELETE - Delete Document from User Profile by Operator/Admin
router.delete("/profile/document/:userId/:fieldName", verifyToken, async (req, res) => {
  const { userId, fieldName } = req.params;

  if (!["admin", "operator"].includes(req.user.role)) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const user = await User.findById(userId);
    if (!user || !user[fieldName]) {
      return res.status(404).json({ message: "Document not found" });
    }

    const fileId = user[fieldName].fileId;

    // Delete from GridFS
    if (fileId) {
      await conn.db.collection("uploads.files").deleteOne({
        _id: new mongoose.Types.ObjectId(fileId),
      });
      await conn.db.collection("uploads.chunks").deleteMany({
        files_id: new mongoose.Types.ObjectId(fileId),
      });
    }

    user[fieldName] = undefined;
    await user.save();

    res.json({ message: "Document deleted successfully", user });
  } catch (err) {
    console.error("Document delete failed:", err);
    res.status(500).json({ message: "Failed to delete document", error: err.message });
  }
});

// GET Logged-in User Basic Info
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("name caste gender dob mobile");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

// GET Profile of any user (for operator/admin)
router.get("/:id/profile", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "name mobile gender dob caste profilePic tenthCertificate tenthMarksheet twelfthCertificate twelfthMarksheet graduationDegree domicile pgCertificate casteValidity otherDocument"
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to load profile" });
  }
});

module.exports = router;
