
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const { GridFsStorage } = require("multer-gridfs-storage");
const fs = require("fs");
const path = require("path");
const Application = require("../models/Application");
const User = require("../models/User");
const { verifyToken } = require("../middleware/authMiddleware");
const Grid = require("gridfs-stream");

module.exports = (io) => {
  const router = express.Router();

  let gfs;
  mongoose.connection.once("open", () => {
    gfs = Grid(mongoose.connection.db, mongoose.mongo);
    gfs.collection("uploads");
  });

  const storage = new GridFsStorage({
    url: process.env.MONGO_URI,
    file: (req, file) => ({
      filename: `${Date.now()}-${file.originalname}`,
      bucketName: "uploads",
    }),
  });
  const upload = multer({ storage });

  // ================= User Submit Application =================
  router.post("/", verifyToken, async (req, res) => {
    try {
      const { serviceId, userId } = req.body;
      if (!serviceId || !userId)
        return res.status(400).json({ message: "Service and User ID required" });

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const profileDocs = [
        ...(user.profilePic?.filename
          ? [{ filename: user.profilePic.filename, fileId: user.profilePic.fileId }]
          : []),
        ...[
          user.tenthCertificate,
          user.tenthMarksheet,
          user.twelfthCertificate,
          user.twelfthMarksheet,
          user.graduationDegree,
          user.domicile,
          user.pgCertificate,
          user.casteValidity,
          user.otherDocument,
        ]
          .filter(Boolean)
          .map((doc) => ({ filename: doc.filename, fileId: doc.fileId })),
      ];

      const newApp = new Application({
        user: userId,
        operator: req.user.id,
        service: serviceId,
        data: {},
        documents: [],
        userProfile: {
          name: user.name || "",
          caste: user.caste || "",
          gender: user.gender || "",
          dob: user.dob || "",
          profileDocs,
        },
        status: "Submitted",
      });

      await newApp.save();
      io.emit("application:submitted");
      res.status(201).json({ message: "Application submitted", application: newApp });
    } catch (err) {
      console.error("❌ Submission failed:", err);
      res.status(500).json({ message: "Submission failed", error: err.message });
    }
  });

  // ================= Upload Form PDF =================
  router.put("/:id/upload-pdf", verifyToken, upload.single("formPdf"), async (req, res) => {
    try {
      if (req.user.role !== "operator") return res.status(403).json({ message: "Access denied" });

      const app = await Application.findById(req.params.id);
      if (!app) return res.status(404).json({ message: "Application not found" });

      app.formPdf = {
        filename: req.file.filename,
        fileId: req.file.id,
      };
      app.status = "Pending Confirmation";
      app.rejectReason = "";
      app.correctionComment = "";

      await app.save();
      io.emit("application:pdfUploaded");
      res.json({ message: "PDF uploaded successfully" });
    } catch (err) {
      res.status(500).json({ message: "Upload failed" });
    }
  });

  // ================= User Confirm =================
  router.put("/:id/confirm", verifyToken, async (req, res) => {
    try {
      const application = await Application.findById(req.params.id);
      if (!application) return res.status(404).json({ message: "Application not found" });

      application.status = "Confirmed";
      await application.save();
      io.emit("application:confirmed");
      res.json({ message: "Application confirmed", application });
    } catch (err) {
      res.status(500).json({ message: "Failed to confirm application" });
    }
  });

  // ================= Admin Upload Certificate =================
  router.put("/:id/certificate", verifyToken, upload.single("certificate"), async (req, res) => {
    try {
      if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });

      const app = await Application.findById(req.params.id);
      if (!app) return res.status(404).json({ message: "Application not found" });

      app.certificate = {
        filename: req.file.filename,
        fileId: req.file.id,
      };

      await app.save();
      io.emit("application:certificateUploaded");
      res.json({ message: "Certificate uploaded", fileId: req.file.id });
    } catch (err) {
      res.status(500).json({ message: "Upload failed" });
    }
  });

  // ================= Download All Documents =================
  router.get("/:userId/download-all", verifyToken, async (req, res) => {
    try {
      if (req.user.role !== "operator") return res.status(403).json({ message: "Access denied" });

      const gfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "uploads",
      });

      const user = await User.findById(req.params.userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const baseDir = "D:\\dump";
      const userDir = path.join(baseDir, user.name.replace(/[^a-zA-Z0-9]/g, "_"));
      if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });

      const documentFields = [
        { field: "aadharCard", label: "Aadhaar Card" },
        { field: "panCard", label: "PAN Card" },
        { field: "tenthCertificate", label: "10th Certificate" },
        { field: "tenthMarksheet", label: "10th Marksheet" },
        { field: "twelfthCertificate", label: "12th Certificate" },
        { field: "twelfthMarksheet", label: "12th Marksheet" },
        { field: "graduationDegree", label: "Graduation Degree" },
        { field: "domicile", label: "Domicile Certificate" },
        { field: "pgCertificate", label: "PG Certificate" },
        { field: "casteValidity", label: "Caste Validity" },
        { field: "otherDocument", label: "Other Document" },
      ];

      let downloadedCount = 0;

      for (const { field, label } of documentFields) {
        const doc = user[field];
        if (doc?.filename) {
          const filePath = path.join(userDir, `${label}${path.extname(doc.filename)}`);
          const readStream = gfsBucket.openDownloadStreamByName(doc.filename);
          const writeStream = fs.createWriteStream(filePath);

          await new Promise((resolve) =>
            readStream
              .on("error", resolve)
              .pipe(writeStream)
              .on("finish", resolve)
              .on("error", resolve)
          );
          downloadedCount++;
        }
      }

      res.json({ message: `Downloaded ${downloadedCount} documents to ${userDir}`, path: userDir });
    } catch (err) {
      res.status(500).json({ message: "Download failed", error: err.message });
    }
  });

  // ================= Correction Comment =================
  router.put("/:id/correction", verifyToken, async (req, res) => {
    try {
      const app = await Application.findById(req.params.id);
      if (!app || app.user.toString() !== req.user.id)
        return res.status(403).json({ message: "Access denied" });

      app.correctionComment = req.body.comment || "";
      app.status = "Pending";
      await app.save();
      io.emit("application:correctionSubmitted");
      res.json({ message: "Correction submitted" });
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ================= Operator GET Applications =================
  router.get("/operator", verifyToken, async (req, res) => {
    try {
      if (req.user.role !== "operator") return res.status(403).json({ message: "Access denied" });

      const apps = await Application.find({ operator: req.user.id })
        .populate("service", "name")
        .populate("user", "name mobile gender dob caste profilePic tenthCertificate tenthMarksheet twelfthCertificate twelfthMarksheet graduationDegree domicile pgCertificate casteValidity otherDocument");

      const filteredApps = apps.map(app => {
        const user = app.user || {};
        const documentFields = [
          { field: "aadharCard", label: "Aadhaar Card" },
          { field: "panCard", label: "PAN Card" },
          { field: "tenthCertificate", label: "10th Certificate" },
          { field: "tenthMarksheet", label: "10th Marksheet" },
          { field: "twelfthCertificate", label: "12th Certificate" },
          { field: "twelfthMarksheet", label: "12th Marksheet" },
          { field: "graduationDegree", label: "Graduation Degree" },
          { field: "domicile", label: "Domicile Certificate" },
          { field: "pgCertificate", label: "PG Certificate" },
          { field: "casteValidity", label: "Caste Validity" },
          { field: "otherDocument", label: "Other Document" },
        ];
        const profileDocs = documentFields.map(({ field, label }) => {
          const doc = user[field];
          if (doc?.filename) {
            return { docName: label, filename: doc.filename, fileId: doc.fileId };
          }
          return null;
        }).filter(Boolean);

        return {
          _id: app._id,
          service: app.service,
          user: { name: user.name || "", mobile: user.mobile || "" },
          status: app.status,
          rejectReason: app.rejectReason,
          correctionComment: app.correctionComment,
          createdAt: app.createdAt,
          userProfile: {
            name: user.name || "",
            mobile: user.mobile || "",
            gender: user.gender || "",
            dob: user.dob || "",
            caste: user.caste || "",
            profileDocs,
          },
        };
      });

      res.json(filteredApps);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  // ================= Admin View All Applications =================
  router.get("/", verifyToken, async (req, res) => {
    try {
      if (!["admin", "operator"].includes(req.user.role))
        return res.status(403).json({ message: "Access denied" });

      const apps = await Application.find()
        .populate("user", "name mobile")
        .populate("service", "name")
        .populate("operator", "name");

      res.json(apps);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  // ================= Admin Status Update =================
  router.put("/:id/status", verifyToken, async (req, res) => {
    try {
      if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });

      const app = await Application.findByIdAndUpdate(
        req.params.id,
        { status: req.body.status },
        { new: true }
      );
      if (!app) return res.status(404).json({ message: "Application not found" });

      io.emit("application:statusUpdated");
      res.json({ message: "Status updated", application: app });
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ================= Operator Reject =================
  router.put("/:id/reject", verifyToken, async (req, res) => {
    try {
      if (req.user.role !== "operator") return res.status(403).json({ message: "Access denied" });

      const { reason } = req.body;
      if (!reason) return res.status(400).json({ message: "Reject reason is required" });

      const app = await Application.findById(req.params.id);
      if (!app) return res.status(404).json({ message: "Application not found" });

      app.status = "Rejected";
      app.rejectReason = reason;
      await app.save();
      io.emit("application:rejected");
      res.json({ message: "Application rejected", application: app });
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ================= Operator Confirm =================
  router.put("/:id/operator-confirm", verifyToken, async (req, res) => {
    try {
      if (req.user.role !== "operator") return res.status(403).json({ message: "Access denied" });

      const app = await Application.findById(req.params.id);
      if (!app) return res.status(404).json({ message: "Application not found" });

      app.status = "Confirmed";
      await app.save();
      io.emit("application:operatorConfirmed");
      res.json({ message: "Application confirmed by operator" });
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // ================= User GET Applications =================
  router.get("/user", verifyToken, async (req, res) => {
    try {
      const apps = await Application.find({ user: req.user.id }).populate("service");
      res.json(apps);
    } catch (err) {
      res.status(500).json({ message: "Failed to load applications" });
    }
  });

  return router;
};
