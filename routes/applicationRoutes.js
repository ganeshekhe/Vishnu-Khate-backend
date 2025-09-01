
// const express = require("express");
// const mongoose = require("mongoose");
// const multer = require("multer");
// const { GridFsStorage } = require("multer-gridfs-storage");
// const fs = require("fs");
// const path = require("path");
// const Application = require("../models/Application");
// const User = require("../models/User");
// const { verifyToken } = require("../middleware/authMiddleware");
// const Grid = require("gridfs-stream");

// module.exports = (io) => {
//   const router = express.Router();

//   let gfs;
//   mongoose.connection.once("open", () => {
//     gfs = Grid(mongoose.connection.db, mongoose.mongo);
//     gfs.collection("uploads");
//   });

//   const storage = new GridFsStorage({
//     url: process.env.MONGO_URI,
//     file: (req, file) => ({
//       filename: `${Date.now()}-${file.originalname}`,
//       bucketName: "uploads",
//     }),
//   });
//   const upload = multer({ storage });

//   // ================= User Submit Application =================
//   router.post("/", verifyToken, async (req, res) => {
//     try {
//       const { serviceId, userId } = req.body;
//       if (!serviceId || !userId)
//         return res.status(400).json({ message: "Service and User ID required" });

//       const user = await User.findById(userId);
//       if (!user) return res.status(404).json({ message: "User not found" });

//       const profileDocs = [
//         ...(user.profilePic?.filename
//           ? [{ filename: user.profilePic.filename, fileId: user.profilePic.fileId }]
//           : []),
//         ...[
//           user.tenthCertificate,
//           user.tenthMarksheet,
//           user.twelfthCertificate,
//           user.twelfthMarksheet,
//           user.graduationDegree,
//           user.domicile,
//           user.pgCertificate,
//           user.casteValidity,
//           user.otherDocument,
//         ]
//           .filter(Boolean)
//           .map((doc) => ({ filename: doc.filename, fileId: doc.fileId })),
//       ];

//       const newApp = new Application({
//         user: userId,
//         operator: req.user.id,
//         service: serviceId,
//         data: {},
//         documents: [],
//         userProfile: {
//           name: user.name || "",
//           caste: user.caste || "",
//           gender: user.gender || "",
//           dob: user.dob || "",
//           profileDocs,
//         },
//         status: "Submitted",
//       });

//       await newApp.save();
//       io.emit("application:submitted");
//       res.status(201).json({ message: "Application submitted", application: newApp });
//     } catch (err) {
//       console.error("❌ Submission failed:", err);
//       res.status(500).json({ message: "Submission failed", error: err.message });
//     }
//   });

//   // ================= Upload Form PDF =================
//   router.put("/:id/upload-pdf", verifyToken, upload.single("formPdf"), async (req, res) => {
//     try {
//       if (req.user.role !== "operator") return res.status(403).json({ message: "Access denied" });

//       const app = await Application.findById(req.params.id);
//       if (!app) return res.status(404).json({ message: "Application not found" });

//       app.formPdf = {
//         filename: req.file.filename,
//         fileId: req.file.id,
//       };
//       app.status = "Pending Confirmation";
//       app.rejectReason = "";
//       app.correctionComment = "";

//       await app.save();
//       io.emit("application:pdfUploaded");
//       res.json({ message: "PDF uploaded successfully" });
//     } catch (err) {
//       res.status(500).json({ message: "Upload failed" });
//     }
//   });

//   // ================= User Confirm =================
//   router.put("/:id/confirm", verifyToken, async (req, res) => {
//     try {
//       const application = await Application.findById(req.params.id);
//       if (!application) return res.status(404).json({ message: "Application not found" });

//       application.status = "Confirmed";
//       await application.save();
//       io.emit("application:confirmed");
//       res.json({ message: "Application confirmed", application });
//     } catch (err) {
//       res.status(500).json({ message: "Failed to confirm application" });
//     }
//   });

//   // ================= Admin Upload Certificate =================
//   router.put("/:id/certificate", verifyToken, upload.single("certificate"), async (req, res) => {
//     try {
//       if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });

//       const app = await Application.findById(req.params.id);
//       if (!app) return res.status(404).json({ message: "Application not found" });

//       app.certificate = {
//         filename: req.file.filename,
//         fileId: req.file.id,
//       };

//       await app.save();
//       io.emit("application:certificateUploaded");
//       res.json({ message: "Certificate uploaded", fileId: req.file.id });
//     } catch (err) {
//       res.status(500).json({ message: "Upload failed" });
//     }
//   });

//   // ================= Download All Documents =================
//   router.get("/:userId/download-all", verifyToken, async (req, res) => {
//     try {
//       if (req.user.role !== "operator") return res.status(403).json({ message: "Access denied" });

//       const gfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
//         bucketName: "uploads",
//       });

//       const user = await User.findById(req.params.userId);
//       if (!user) return res.status(404).json({ message: "User not found" });

//       const baseDir = "D:\\dump";
//       const userDir = path.join(baseDir, user.name.replace(/[^a-zA-Z0-9]/g, "_"));
//       if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });

//       const documentFields = [
//         { field: "aadharCard", label: "Aadhaar Card" },
//         { field: "panCard", label: "PAN Card" },
//         { field: "tenthCertificate", label: "10th Certificate" },
//         { field: "tenthMarksheet", label: "10th Marksheet" },
//         { field: "twelfthCertificate", label: "12th Certificate" },
//         { field: "twelfthMarksheet", label: "12th Marksheet" },
//         { field: "graduationDegree", label: "Graduation Degree" },
//         { field: "domicile", label: "Domicile Certificate" },
//         { field: "pgCertificate", label: "PG Certificate" },
//         { field: "casteValidity", label: "Caste Validity" },
//         { field: "otherDocument", label: "Other Document" },
//       ];

//       let downloadedCount = 0;

//       for (const { field, label } of documentFields) {
//         const doc = user[field];
//         if (doc?.filename) {
//           const filePath = path.join(userDir, `${label}${path.extname(doc.filename)}`);
//           const readStream = gfsBucket.openDownloadStreamByName(doc.filename);
//           const writeStream = fs.createWriteStream(filePath);

//           await new Promise((resolve) =>
//             readStream
//               .on("error", resolve)
//               .pipe(writeStream)
//               .on("finish", resolve)
//               .on("error", resolve)
//           );
//           downloadedCount++;
//         }
//       }

//       res.json({ message: `Downloaded ${downloadedCount} documents to ${userDir}`, path: userDir });
//     } catch (err) {
//       res.status(500).json({ message: "Download failed", error: err.message });
//     }
//   });

//   // ================= Correction Comment =================
//   router.put("/:id/correction", verifyToken, async (req, res) => {
//     try {
//       const app = await Application.findById(req.params.id);
//       if (!app || app.user.toString() !== req.user.id)
//         return res.status(403).json({ message: "Access denied" });

//       app.correctionComment = req.body.comment || "";
//       app.status = "Pending";
//       await app.save();
//       io.emit("application:correctionSubmitted");
//       res.json({ message: "Correction submitted" });
//     } catch (err) {
//       res.status(500).json({ message: "Server error" });
//     }
//   });

//   // ================= Operator GET Applications =================
//   router.get("/operator", verifyToken, async (req, res) => {
//     try {
//       if (req.user.role !== "operator") return res.status(403).json({ message: "Access denied" });

//       const apps = await Application.find({ operator: req.user.id })
//         .populate("service", "name")
//         .populate("user", "name mobile gender dob caste profilePic tenthCertificate tenthMarksheet twelfthCertificate twelfthMarksheet graduationDegree domicile pgCertificate casteValidity otherDocument");

//       const filteredApps = apps.map(app => {
//         const user = app.user || {};
//         const documentFields = [
//           { field: "aadharCard", label: "Aadhaar Card" },
//           { field: "panCard", label: "PAN Card" },
//           { field: "tenthCertificate", label: "10th Certificate" },
//           { field: "tenthMarksheet", label: "10th Marksheet" },
//           { field: "twelfthCertificate", label: "12th Certificate" },
//           { field: "twelfthMarksheet", label: "12th Marksheet" },
//           { field: "graduationDegree", label: "Graduation Degree" },
//           { field: "domicile", label: "Domicile Certificate" },
//           { field: "pgCertificate", label: "PG Certificate" },
//           { field: "casteValidity", label: "Caste Validity" },
//           { field: "otherDocument", label: "Other Document" },
//         ];
//         const profileDocs = documentFields.map(({ field, label }) => {
//           const doc = user[field];
//           if (doc?.filename) {
//             return { docName: label, filename: doc.filename, fileId: doc.fileId };
//           }
//           return null;
//         }).filter(Boolean);

//         return {
//           _id: app._id,
//           service: app.service,
//           user: { name: user.name || "", mobile: user.mobile || "" },
//           status: app.status,
//           rejectReason: app.rejectReason,
//           correctionComment: app.correctionComment,
//           createdAt: app.createdAt,
//           userProfile: {
//             name: user.name || "",
//             mobile: user.mobile || "",
//             gender: user.gender || "",
//             dob: user.dob || "",
//             caste: user.caste || "",
//             profileDocs,
//           },
//         };
//       });

//       res.json(filteredApps);
//     } catch (err) {
//       res.status(500).json({ message: "Failed to fetch applications" });
//     }
//   });

//   // ================= Admin View All Applications =================
//   router.get("/", verifyToken, async (req, res) => {
//     try {
//       if (!["admin", "operator"].includes(req.user.role))
//         return res.status(403).json({ message: "Access denied" });

//       const apps = await Application.find()
//         .populate("user", "name mobile")
//         .populate("service", "name")
//         .populate("operator", "name");

//       res.json(apps);
//     } catch (err) {
//       res.status(500).json({ message: "Failed to fetch applications" });
//     }
//   });

//   // ================= Admin Status Update =================
//   router.put("/:id/status", verifyToken, async (req, res) => {
//     try {
//       if (req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });

//       const app = await Application.findByIdAndUpdate(
//         req.params.id,
//         { status: req.body.status },
//         { new: true }
//       );
//       if (!app) return res.status(404).json({ message: "Application not found" });

//       io.emit("application:statusUpdated");
//       res.json({ message: "Status updated", application: app });
//     } catch (err) {
//       res.status(500).json({ message: "Server error" });
//     }
//   });

//   // ================= Operator Reject =================
//   router.put("/:id/reject", verifyToken, async (req, res) => {
//     try {
//       if (req.user.role !== "operator") return res.status(403).json({ message: "Access denied" });

//       const { reason } = req.body;
//       if (!reason) return res.status(400).json({ message: "Reject reason is required" });

//       const app = await Application.findById(req.params.id);
//       if (!app) return res.status(404).json({ message: "Application not found" });

//       app.status = "Rejected";
//       app.rejectReason = reason;
//       await app.save();
//       io.emit("application:rejected");
//       res.json({ message: "Application rejected", application: app });
//     } catch (err) {
//       res.status(500).json({ message: "Server error" });
//     }
//   });

//   // ================= Operator Confirm =================
//   router.put("/:id/operator-confirm", verifyToken, async (req, res) => {
//     try {
//       if (req.user.role !== "operator") return res.status(403).json({ message: "Access denied" });

//       const app = await Application.findById(req.params.id);
//       if (!app) return res.status(404).json({ message: "Application not found" });

//       app.status = "Confirmed";
//       await app.save();
//       io.emit("application:operatorConfirmed");
//       res.json({ message: "Application confirmed by operator" });
//     } catch (err) {
//       res.status(500).json({ message: "Server error" });
//     }
//   });

//   // ================= User GET Applications =================
//   router.get("/user", verifyToken, async (req, res) => {
//     try {
//       const apps = await Application.find({ user: req.user.id }).populate("service");
//       res.json(apps);
//     } catch (err) {
//       res.status(500).json({ message: "Failed to load applications" });
//     }
//   });

//   return router;
// };






const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const { GridFsStorage } = require("multer-gridfs-storage");
const path = require("path");
const fs = require("fs");
const os = require("os");
const Application = require("../models/Application");
const User = require("../models/User");
const Service = require("../models/Service");
const { verifyToken } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/role");
const Grid = require("gridfs-stream");

const router = express.Router();

// ---------- GridFS Setup ----------
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

// ---------- Status Flow ----------
const STATUS_FLOW = [
  "Submitted",
  "In Review",
  "Pending Confirmation",
  "Confirmed",
  "Completed",
];

const nextStatusOf = (current) => {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx === -1 || idx === STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
};

// ---------- Update Status ----------
router.put(
  "/:id/status",
  verifyToken,
  requireRole("operator", "admin"), // ✅ इथे array काढून spread केलं
  async (req, res) => {
  try {
    const { status, rejectReason, correctionComment } = req.body;
    const allowedStatus = [...STATUS_FLOW, "Rejected"];
    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ error: "Application not found" });

    app.status = status;
    app.rejectReason = status === "Rejected" ? rejectReason || "" : "";
    app.correctionComment = status === "Pending Confirmation" ? correctionComment || "" : "";

    await app.save();

    const populated = await Application.findById(app._id)
      .populate("user", "name mobile caste dob")
      .populate("service", "name category");

    req.io.emit("applicationStatusUpdated", populated);
    res.json({ message: "Status updated successfully", application: populated });
  } catch (err) {
    console.error("Status update failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------- Application Submit ----------
router.post("/", verifyToken, async (req, res) => {
  try {
    const { serviceId, subServiceId, userId } = req.body;
    if (!serviceId || !userId)
      return res.status(400).json({ message: "Service and User ID required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).json({ message: "Service not found" });

    let subServiceData = null;
    if (subServiceId) {
      const selectedSub = service.subservices.find((s) => s._id.toString() === subServiceId);
      if (selectedSub) {
        subServiceData = { _id: selectedSub._id, name: selectedSub.name };
      }
    }

    const newApp = new Application({
      user: userId,
      operator: req.user.id,
      service: serviceId,
      subService: subServiceData,
      status: "Submitted",
      data: {},
      documents: [],
    });

    await newApp.save();

    const populatedApp = await Application.findById(newApp._id)
      .populate("user", "name mobile gender dob caste")
      .populate("service", "name category");

    req.io.emit("applicationCreated", populatedApp);
    res.status(201).json({ message: "Application submitted", application: populatedApp });
  } catch (err) {
    console.error("Submission failed:", err);
    res.status(500).json({ message: "Submission failed", error: err.message });
  }
});

// ---------- Upload Form PDF + Operator Credentials ----------
router.put("/:id/upload-pdf", verifyToken, upload.single("formPdf"), async (req, res) => {
  try {
    if (req.user.role !== "operator")
      return res.status(403).json({ message: "Access denied" });

    const { operatorId, operatorPassword } = req.body;
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: "Application not found" });

    app.formPdf = { filename: req.file.filename, fileId: req.file.id };
    app.status = "Pending Confirmation";
    app.rejectReason = "";
    app.correctionComment = "";
    app.operatorCredentials = { operatorId, operatorPassword };

    await app.save();

    const populated = await Application.findById(app._id)
      .populate("user", "name mobile caste dob")
      .populate("service", "name category");

    req.io.emit("applicationStatusUpdated", populated);
    res.json({ message: "PDF + Credentials uploaded successfully", application: populated });
  } catch (err) {
    console.error("Upload failed:", err);
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
});

// ---------- User Confirm ----------
router.put("/:id/confirm", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "user")
      return res.status(403).json({ message: "Only user can confirm application" });

    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: "Application not found" });

    if (app.status !== "Pending Confirmation")
      return res.status(400).json({ message: "Application not ready for confirmation" });

    app.status = "Confirmed";
    await app.save();

    const populated = await Application.findById(app._id)
      .populate("user", "name mobile caste dob")
      .populate("service", "name category");

    req.io.emit("applicationStatusUpdated", populated);
    res.json({ message: "Application confirmed", application: populated });
  } catch (err) {
    res.status(500).json({ message: "Failed to confirm application" });
  }
});

// ---------- Admin/Operator Upload Certificate ----------
router.put("/:id/certificate", verifyToken, upload.single("certificate"), async (req, res) => {
  try {
    if (!["admin", "operator"].includes(req.user.role))
      return res.status(403).json({ message: "Only admin/operator can upload certificate" });

    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: "Application not found" });

    if (app.status !== "Confirmed")
      return res.status(400).json({ message: "Certificate can only be uploaded after confirmation" });

    app.certificate = { filename: req.file.filename, fileId: req.file.id };
    app.status = "Completed";
    await app.save();

    const populated = await Application.findById(app._id)
      .populate("user", "name mobile caste dob")
      .populate("service", "name category");

    req.io.emit("applicationStatusUpdated", populated);
    res.json({ message: "Certificate uploaded", application: populated });
  } catch (err) {
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
});

router.put("/:id/uploadCertificate", verifyToken, requireRole("operator","admin"), upload.single("certificate"), async (req, res) => {
  try {
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: "Application not found" });

    if (app.status !== "Confirmed") {
      return res.status(400).json({ message: "Certificate can only be uploaded after confirmation" });
    }

    // 👇 consistency: नेहमी certificate field मध्ये save कर
    app.certificate = { filename: req.file.filename, fileId: req.file.id };
    app.status = "Completed";
    await app.save();

    const populated = await Application.findById(app._id)
      .populate("user", "name mobile")
      .populate("service", "name");

    // दोन्ही emit करा
    req.io.emit("applicationStatusUpdated", populated);
    req.io.emit("certificateUploaded", populated);

    res.json({ message: "Certificate uploaded successfully", application: populated });
  } catch (err) {
    console.error("Certificate upload failed:", err);
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
});


// ---------- Operator Next Step ----------
router.put("/:id/next", verifyToken, requireRole(["operator", "admin"]), async (req, res) => {
  try {
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: "Application not found" });

    const newStatus = nextStatusOf(app.status);
    if (!newStatus)
      return res.status(400).json({ message: `No next step for status: ${app.status}` });

    app.status = newStatus;
    await app.save();

    const populated = await Application.findById(app._id)
      .populate("user", "name mobile caste dob")
      .populate("service", "name category");

    req.io.emit("applicationStatusUpdated", populated);
    res.json({ message: `Moved to ${newStatus}`, application: populated });
  } catch (err) {
    console.error("Next step failed:", err);
    res.status(500).json({ message: "Next step failed", error: err.message });
  }
});

// ---------- Fetch Applications ----------
router.get("/", verifyToken, async (req, res) => {
  try {
    if (!["admin", "operator"].includes(req.user.role))
      return res.status(403).json({ message: "Access denied" });

    const apps = await Application.find()
      .populate({
        path: "service",
        select: "name category",
        populate: { path: "category", select: "name" },
      })
      .populate("user", "name mobile")
      .populate("operator", "name")
      .sort({ createdAt: -1 });

    res.json(apps);
  } catch (err) {
    console.error("Failed to fetch applications:", err);
    res.status(500).json({ message: "Failed to fetch applications", error: err.message });
  }
});
// ---------- Fetch applications for logged-in user ----------
router.get("/my", verifyToken, async (req, res) => {
  try {
    const apps = await Application.find({ user: req.user.id })
      .populate("service", "name category")
      .populate("subService", "name")
      .sort({ createdAt: -1 });

    res.json({ applications: apps });
  } catch (err) {
    console.error("Failed to fetch user applications:", err);
    res.status(500).json({ message: "Failed to fetch user applications", error: err.message });
  }
});
// ---------- User submits correction ----------
router.put("/:id/correction", verifyToken, async (req, res) => {
  try {
    const { comment } = req.body;
    if (!comment || !comment.trim()) {
      return res.status(400).json({ message: "Correction comment is required" });
    }

    const app = await Application.findById(req.params.id);
    if (!app) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (app.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "You are not authorized to correct this application" });
    }

    app.status = "Pending Confirmation";
    app.correctionComment = comment;
    await app.save();

    const populated = await Application.findById(app._id)
      .populate("user", "name mobile")
      .populate("service", "name category");

    req.io.emit("applicationStatusUpdated", populated);

    res.json({ message: "Correction submitted", application: populated });
  } catch (err) {
    console.error("Correction submit failed:", err);
    res.status(500).json({ message: "Correction submit failed", error: err.message });
  }
});
// Example Express route


router.put("/applications/:id/uploadCertificate",
  upload.single("certificate"),
  async (req, res) => {
    try {
      const appId = req.params.id;
      // Save file info to DB
      res.json({ message: "Certificate uploaded" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);


router.get("/:userId/download-all", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "operator")
      return res.status(403).json({ message: "Access denied" });

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // GridFS setup
    const gfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "uploads",
    });

    // OS-dependent base folder (Documents folder in user's home directory)
    const baseDir = path.join(os.homedir(), "Documents", "SwambhuDownloads");
    const userDir = path.join(
      baseDir,
      user.name.replace(/[^a-zA-Z0-9]/g, "_")
    );

    // Create folder if it doesn't exist
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
      { field: "otherDocument", label: "Other Document" }, // multi-documents
    ];

    let downloadedCount = 0;

    for (const { field, label } of documentFields) {
      const doc = user[field];
      if (!doc) continue;

      const docsArray = Array.isArray(doc) ? doc : [doc];

      for (let i = 0; i < docsArray.length; i++) {
        const fileDoc = docsArray[i];
        if (!fileDoc?.filename) continue;

        const ext = path.extname(fileDoc.filename);
        const fileNameSafe = field === "otherDocument" ? `${label}_${i + 1}${ext}` : `${label}${ext}`;
        const filePath = path.join(userDir, fileNameSafe);

        const readStream = gfsBucket.openDownloadStreamByName(fileDoc.filename);
        const writeStream = fs.createWriteStream(filePath);

        await new Promise((resolve, reject) => {
          readStream
            .on("error", reject)
            .pipe(writeStream)
            .on("finish", resolve)
            .on("error", reject);
        });

        downloadedCount++;
      }
    }

    res.json({
      message: `✅ Downloaded ${downloadedCount} documents to "${userDir}"`,
      path: userDir,
    });
  } catch (err) {
    console.error("❌ Download all documents failed:", err);
    res.status(500).json({ message: "Download failed", error: err.message });
  }
});




router.put("/:id/reject", verifyToken, requireRole("operator","admin"), async (req, res) => {
  try {
    const { reason } = req.body;
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: "Application not found" });

    app.status = "Rejected";
    app.rejectReason = reason || "Rejected by operator";
    await app.save();

    const populated = await Application.findById(app._id)
      .populate("user", "name mobile")
      .populate("service", "name");

    req.io.emit("applicationStatusUpdated", populated);
    res.json({ message: "Application rejected", application: populated });
  } catch (err) {
    console.error("Reject failed:", err);
    res.status(500).json({ message: "Reject failed", error: err.message });
  }
});

// ---------- User update rejected application ----------
router.put("/:id/update", verifyToken, async (req, res) => {
  try {
    // फक्त user ला परवानगी
    if (req.user.role !== "user") {
      return res.status(403).json({ message: "Only user can update application" });
    }

    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: "Application not found" });

    // स्वतःचीच application update करता येईल
    if (app.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // फक्त rejected असताना update/resubmit करता येईल
    if (app.status !== "Rejected") {
      return res.status(400).json({ message: "Only rejected applications can be updated" });
    }

    // request body मधून आलेले updates apply कर
    const { updates } = req.body;
    if (updates) {
      if (updates.data) {
        app.data = { ...app.data, ...updates.data };
      }
      if (updates.documents) {
        app.documents = updates.documents;
      }
      if (updates.correctionComment) {
        app.correctionComment = updates.correctionComment;
      }
    }

    // status परत Submitted कर
    app.status = "Submitted";
    app.rejectReason = "";

    await app.save();

    const populated = await Application.findById(app._id)
      .populate("user", "name mobile caste dob")
      .populate("service", "name category");

    // socket.io update emit
    req.io.emit("applicationStatusUpdated", populated);

    res.json({
      message: "Application updated & resubmitted successfully",
      application: populated,
    });
  } catch (err) {
    console.error("❌ Update failed:", err);
    res.status(500).json({ message: "Update failed", error: err.message });
  }
});



module.exports = router;
