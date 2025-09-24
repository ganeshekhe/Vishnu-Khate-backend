

// const express = require("express");
// const mongoose = require("mongoose");
// const multer = require("multer");
// const { GridFsStorage } = require("multer-gridfs-storage");
// const path = require("path");
// const fs = require("fs");
// const os = require("os");
// const Application = require("../models/Application");
// const User = require("../models/User");
// const Service = require("../models/Service");
// const { verifyToken } = require("../middleware/authMiddleware");
// const { requireRole } = require("../middleware/role");
// const Grid = require("gridfs-stream");

// const router = express.Router();

// // ---------- GridFS Setup ----------
// let gfs;
// mongoose.connection.once("open", () => {
//   gfs = Grid(mongoose.connection.db, mongoose.mongo);
//   gfs.collection("uploads");
// });

// const storage = new GridFsStorage({
//   url: process.env.MONGO_URI,
//   file: (req, file) => ({
//     filename: `${Date.now()}-${file.originalname}`,
//     bucketName: "uploads",
//   }),
// });
// const upload = multer({ storage });

// // ---------- Status Flow ----------
// const STATUS_FLOW = [
//   "Submitted",
//   "In Review",
//   "Pending Confirmation",
//   "Confirmed",
//   "Completed",
// ];

// const nextStatusOf = (current) => {
//   const idx = STATUS_FLOW.indexOf(current);
//   if (idx === -1 || idx === STATUS_FLOW.length - 1) return null;
//   return STATUS_FLOW[idx + 1];
// };

// // ---------- Update Status ----------
// router.put(
//   "/:id/status",
//   verifyToken,
//   requireRole("operator", "admin"),
//   async (req, res) => {
//     try {
//       const { status, rejectReason, correctionComment } = req.body;
//       const allowedStatus = [...STATUS_FLOW, "Rejected"];
//       if (!allowedStatus.includes(status)) {
//         return res.status(400).json({ error: "Invalid status value" });
//       }

//       const app = await Application.findById(req.params.id);
//       if (!app) return res.status(404).json({ error: "Application not found" });

//       app.status = status;
//       app.rejectReason = status === "Rejected" ? rejectReason || "" : "";
//       app.correctionComment =
//         status === "Pending Confirmation" ? correctionComment || "" : "";

//       await app.save();

//       const populated = await Application.findById(app._id)
//         .populate("user", "name mobile caste dob")
//         .populate({
//           path: "service",
//           select: "name category",
//           populate: { path: "category", select: "name" },
//         })
//         .populate("subService", "name");

//       req.io.emit("applicationStatusUpdated", populated);
//       res.json({
//         message: "Status updated successfully",
//         application: populated,
//       });
//     } catch (err) {
//       console.error("Status update failed:", err);
//       res.status(500).json({ error: "Server error" });
//     }
//   }
// );

// // ---------- Application Submit ----------
// router.post("/", verifyToken, async (req, res) => {
//   try {
//     const { serviceId, subServiceId, userId } = req.body;
//     if (!serviceId || !userId)
//       return res
//         .status(400)
//         .json({ message: "Service and User ID required" });

//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ message: "User not found" });

//     const service = await Service.findById(serviceId);
//     if (!service) return res.status(404).json({ message: "Service not found" });

//     let subServiceData = null;
//     if (subServiceId) {
//       const selectedSub = service.subservices.find(
//         (s) => s._id.toString() === subServiceId
//       );
//       if (selectedSub) {
//         subServiceData = { _id: selectedSub._id, name: selectedSub.name };
//       }
//     }

//     const newApp = new Application({
//       user: userId,
//       operator: req.user.id,
//       service: serviceId,
//       subService: subServiceData,
//       status: "Submitted",
//       data: {},
//       documents: [],
//     });

//     await newApp.save();

//     const populatedApp = await Application.findById(newApp._id)
//       .populate("user", "name mobile gender dob caste")
//       .populate({
//         path: "service",
//         select: "name category",
//         populate: { path: "category", select: "name" },
//       })
//       .populate("subService", "name");

//     req.io.emit("applicationCreated", populatedApp);
//     res
//       .status(201)
//       .json({ message: "Application submitted", application: populatedApp });
//   } catch (err) {
//     console.error("Submission failed:", err);
//     res
//       .status(500)
//       .json({ message: "Submission failed", error: err.message });
//   }
// });

// // ---------- Upload Form PDF + Operator Credentials ----------
// router.put(
//   "/:id/upload-pdf",
//   verifyToken,
//   upload.single("formPdf"),
//   async (req, res) => {
//     try {
//       if (req.user.role !== "operator")
//         return res.status(403).json({ message: "Access denied" });

//       const { operatorId, operatorPassword } = req.body;
//       const app = await Application.findById(req.params.id);
//       if (!app) return res.status(404).json({ message: "Application not found" });

//       app.formPdf = { filename: req.file.filename, fileId: req.file.id };
//       app.status = "Pending Confirmation";
//       app.rejectReason = "";
//       app.correctionComment = "";
//       app.operatorCredentials = { operatorId, operatorPassword };

//       await app.save();

//       const populated = await Application.findById(app._id)
//         .populate("user", "name mobile caste dob")
//         .populate({
//           path: "service",
//           select: "name category",
//           populate: { path: "category", select: "name" },
//         })
//         .populate("subService", "name");

//       req.io.emit("applicationStatusUpdated", populated);
//       res.json({
//         message: "PDF + Credentials uploaded successfully",
//         application: populated,
//       });
//     } catch (err) {
//       console.error("Upload failed:", err);
//       res.status(500).json({ message: "Upload failed", error: err.message });
//     }
//   }
// );

// router.get("/:userId/download-all", verifyToken, async (req, res) => {
//   try {
//     if (req.user.role !== "operator")
//       return res.status(403).json({ message: "Access denied" });

//     const user = await User.findById(req.params.userId);
//     if (!user) return res.status(404).json({ message: "User not found" });

//     // GridFS setup
//     const gfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
//       bucketName: "uploads",
//     });

//     // Base folder and user folder
//     const baseDir = "D:\\dump";
//     const userDir = path.join(
//       baseDir,
//       user.name.replace(/[^a-zA-Z0-9]/g, "_")
//     );

//     // Create folder if it doesn't exist
//     if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });

//     // List of documents to download
//     const documentFields = [
//       { field: "aadharCard", label: "Aadhaar Card" },
//       { field: "panCard", label: "PAN Card" },
//       { field: "tenthCertificate", label: "10th Certificate" },
//       { field: "tenthMarksheet", label: "10th Marksheet" },
//       { field: "twelfthCertificate", label: "12th Certificate" },
//       { field: "twelfthMarksheet", label: "12th Marksheet" },
//       { field: "graduationDegree", label: "Graduation Degree" },
//       { field: "domicile", label: "Domicile Certificate" },
//       { field: "pgCertificate", label: "PG Certificate" },
//       { field: "casteValidity", label: "Caste Validity" },
//       { field: "otherDocument", label: "Other Document" }, // multi-documents
//     ];

//     let downloadedCount = 0;

//     // Download each document
//     for (const { field, label } of documentFields) {
//       const doc = user[field];
//       if (!doc) continue;

//       // Check if field is array (like otherDocument)
//       const docsArray = Array.isArray(doc) ? doc : [doc];

//       for (let i = 0; i < docsArray.length; i++) {
//         const fileDoc = docsArray[i];
//         if (!fileDoc?.filename) continue;

//         const ext = path.extname(fileDoc.filename);
//         const fileNameSafe = field === "otherDocument" ? `${label}_${i + 1}${ext}` : `${label}${ext}`;
//         const filePath = path.join(userDir, fileNameSafe);

//         const readStream = gfsBucket.openDownloadStreamByName(fileDoc.filename);
//         const writeStream = fs.createWriteStream(filePath);

//         await new Promise((resolve, reject) => {
//           readStream
//             .on("error", reject)
//             .pipe(writeStream)
//             .on("finish", resolve)
//             .on("error", reject);
//         });

//         downloadedCount++;
//       }
//     }

//     res.json({
//       message: `✅ Downloaded ${downloadedCount} documents to "${userDir}"`,
//       path: userDir,
//     });
//    } catch (err) {
//     console.error("❌ Download all documents failed:", err);
//      res.status(500).json({ message: "Download failed", error: err.message });
//    }
//  });
// // ---------- User Confirm ----------
// router.put("/:id/confirm", verifyToken, async (req, res) => {
//   try {
//     if (req.user.role !== "user")
//       return res
//         .status(403)
//         .json({ message: "Only user can confirm application" });

//     const app = await Application.findById(req.params.id);
//     if (!app) return res.status(404).json({ message: "Application not found" });

//     if (app.status !== "Pending Confirmation")
//       return res
//         .status(400)
//         .json({ message: "Application not ready for confirmation" });

//     app.status = "Confirmed";
//     await app.save();

//     const populated = await Application.findById(app._id)
//       .populate("user", "name mobile caste dob")
//       .populate({
//         path: "service",
//         select: "name category",
//         populate: { path: "category", select: "name" },
//       })
//       .populate("subService", "name");

//     req.io.emit("applicationStatusUpdated", populated);
//     res.json({ message: "Application confirmed", application: populated });
//   } catch (err) {
//     res.status(500).json({ message: "Failed to confirm application" });
//   }
// });

// // ---------- Admin/Operator Upload Certificate ----------
// // router.put(
// //   "/:id/uploadCertificate",
// //   verifyToken,
// //   requireRole("operator", "admin"),
// //   upload.single("certificate"),
// //   async (req, res) => {
// //     try {
// //       const app = await Application.findById(req.params.id);
// //       if (!app)
// //         return res.status(404).json({ message: "Application not found" });

// //       if (app.status !== "Confirmed") {
// //         return res.status(400).json({
// //           message: "Certificate can only be uploaded after confirmation",
// //         });
// //       }

// //       app.certificate = { filename: req.file.filename, fileId: req.file.id };
// //       app.status = "Completed";
// //       await app.save();

// //       const populated = await Application.findById(app._id)
// //         .populate("user", "name mobile caste dob")
// //         .populate({
// //           path: "service",
// //           select: "name category",
// //           populate: { path: "category", select: "name" },
// //         })
// //         .populate("subService", "name");

// //       req.io.emit("applicationStatusUpdated", populated);
// //       req.io.emit("certificateUploaded", populated);

// //       res.json({
// //         message: "Certificate uploaded successfully",
// //         application: populated,
// //       });
// //     } catch (err) {
// //       console.error("Certificate upload failed:", err);
// //       res.status(500).json({ message: "Upload failed", error: err.message });
// //     }
// //   }
// // );
// router.put(
//   "/:id/uploadCertificate",
//   verifyToken,
//   requireRole("operator", "admin"),
//   upload.single("certificate"),
//   async (req, res) => {
//     try {
//       const app = await Application.findById(req.params.id);
//       if (!app)
//         return res.status(404).json({ message: "Application not found" });

//       // ✅ Allow upload in Confirmed or In Review
//       if (app.status !== "Confirmed" && app.status !== "In Review") {
//         return res.status(400).json({
//           message:
//             "Certificate can only be uploaded after confirmation or in review",
//         });
//       }

//       // ✅ Save certificate + mark status Completed
//       app.certificate = { filename: req.file.filename, fileId: req.file.id };
//       app.status = "Completed";
//       await app.save();

//       // ✅ Populate for frontend
//       const populated = await Application.findById(app._id)
//         .populate("user", "name mobile caste dob")
//         .populate({
//           path: "service",
//           select: "name category",
//           populate: { path: "category", select: "name" },
//         })
//         .populate("subService", "name");

//       // 🔔 Emit realtime updates
//       req.io.emit("applicationStatusUpdated", populated);
//       req.io.emit("certificateUploaded", populated);

//       res.json({
//         message: "Certificate uploaded successfully",
//         application: populated,
//       });
//     } catch (err) {
//       console.error("Certificate upload failed:", err);
//       res.status(500).json({ message: "Upload failed", error: err.message });
//     }
//   }
// );

// // ---------- Operator Next Step ----------
// router.put("/:id/next", verifyToken, requireRole("operator", "admin"), async (req, res) => {
//   try {
//     const app = await Application.findById(req.params.id);
//     if (!app) return res.status(404).json({ message: "Application not found" });

//     const newStatus = nextStatusOf(app.status);
//     if (!newStatus)
//       return res
//         .status(400)
//         .json({ message: `No next step for status: ${app.status}` });

//     app.status = newStatus;
//     await app.save();

//     const populated = await Application.findById(app._id)
//       .populate("user", "name mobile caste dob")
//       .populate({
//         path: "service",
//         select: "name category",
//         populate: { path: "category", select: "name" },
//       })
//       .populate("subService", "name");

//     req.io.emit("applicationStatusUpdated", populated);
//     res.json({ message: `Moved to ${newStatus}`, application: populated });
//   } catch (err) {
//     console.error("Next step failed:", err);
//     res.status(500).json({ message: "Next step failed", error: err.message });
//   }
// });

// // ---------- Fetch Applications ----------
// router.get("/", verifyToken, async (req, res) => {
//   try {
//     if (!["admin", "operator"].includes(req.user.role))
//       return res.status(403).json({ message: "Access denied" });

//     const apps = await Application.find()
//       .populate({
//         path: "service",
//         select: "name category",
//         populate: { path: "category", select: "name" },
//       })
//       .populate("user", "name mobile caste dob")
//       .populate("subService", "name")
//       .populate("operator", "name")
//       .sort({ createdAt: -1 });

//     res.json(apps);
//   } catch (err) {
//     console.error("Failed to fetch applications:", err);
//     res
//       .status(500)
//       .json({ message: "Failed to fetch applications", error: err.message });
//   }
// });

// // ---------- Fetch applications for logged-in user ----------
// router.get("/my", verifyToken, async (req, res) => {
//   try {
//     const apps = await Application.find({ user: req.user.id })
//       .populate({
//         path: "service",
//         select: "name category",
//         populate: { path: "category", select: "name" },
//       })
//       .populate("subService", "name")
//       .sort({ createdAt: -1 });

//     res.json({ applications: apps });
//   } catch (err) {
//     console.error("Failed to fetch user applications:", err);
//     res.status(500).json({
//       message: "Failed to fetch user applications",
//       error: err.message,
//     });
//   }
// });

// // ---------- User submits correction ----------
// router.put("/:id/correction", verifyToken, async (req, res) => {
//   try {
//     const { comment } = req.body;
//     if (!comment || !comment.trim()) {
//       return res
//         .status(400)
//         .json({ message: "Correction comment is required" });
//     }

//     const app = await Application.findById(req.params.id);
//     if (!app) {
//       return res.status(404).json({ message: "Application not found" });
//     }

//     if (app.user.toString() !== req.user.id) {
//       return res
//         .status(403)
//         .json({ message: "You are not authorized to correct this application" });
//     }

//     app.status = "Pending Confirmation";
//     app.correctionComment = comment;
//     await app.save();

//     const populated = await Application.findById(app._id)
//       .populate("user", "name mobile caste dob")
//       .populate({
//         path: "service",
//         select: "name category",
//         populate: { path: "category", select: "name" },
//       })
//       .populate("subService", "name");

//     req.io.emit("applicationStatusUpdated", populated);

//     res.json({ message: "Correction submitted", application: populated });
//   } catch (err) {
//     console.error("Correction submit failed:", err);
//     res.status(500).json({
//       message: "Correction submit failed",
//       error: err.message,
//     });
//   }
// });

// // ---------- Reject Application ----------
// router.put("/:id/reject", verifyToken, requireRole("operator", "admin"), async (req, res) => {
//   try {
//     const { reason } = req.body;
//     const app = await Application.findById(req.params.id);
//     if (!app) return res.status(404).json({ message: "Application not found" });

//     app.status = "Rejected";
//     app.rejectReason = reason || "Rejected by operator";
//     await app.save();

//     const populated = await Application.findById(app._id)
//       .populate("user", "name mobile caste dob")
//       .populate({
//         path: "service",
//         select: "name category",
//         populate: { path: "category", select: "name" },
//       })
//       .populate("subService", "name");

//     req.io.emit("applicationStatusUpdated", populated);
//     res.json({ message: "Application rejected", application: populated });
//   } catch (err) {
//     console.error("Reject failed:", err);
//     res.status(500).json({ message: "Reject failed", error: err.message });
//   }
// });

// // ---------- User update rejected application ----------
// router.put("/:id/update", verifyToken, async (req, res) => {
//   try {
//     if (req.user.role !== "user") {
//       return res.status(403).json({ message: "Only user can update application" });
//     }

//     const app = await Application.findById(req.params.id);
//     if (!app) return res.status(404).json({ message: "Application not found" });

//     if (app.user.toString() !== req.user.id) {
//       return res.status(403).json({ message: "Not authorized" });
//     }

//     if (app.status !== "Rejected") {
//       return res
//         .status(400)
//         .json({ message: "Only rejected applications can be updated" });
//     }

//     const { updates } = req.body;
//     if (updates) {
//       if (updates.data) {
//         app.data = { ...app.data, ...updates.data };
//       }
//       if (updates.documents) {
//         app.documents = updates.documents;
//       }
//       if (updates.correctionComment) {
//         app.correctionComment = updates.correctionComment;
//       }
//     }

//     app.status = "Submitted";
//     app.rejectReason = "";

//     await app.save();

//     const populated = await Application.findById(app._id)
//       .populate("user", "name mobile caste dob")
//       .populate({
//         path: "service",
//         select: "name category",
//         populate: { path: "category", select: "name" },
//       })
//       .populate("subService", "name");

//     req.io.emit("applicationStatusUpdated", populated);

//     res.json({
//       message: "Application updated & resubmitted successfully",
//       application: populated,
//     });
//   } catch (err) {
//     console.error("❌ Update failed:", err);
//     res.status(500).json({ message: "Update failed", error: err.message });
//   }
// });



// router.post("/draft", verifyToken, async (req, res) => {
//   try {
//     const { serviceId, subService } = req.body;
//     if (!serviceId) {
//       return res.status(400).json({ message: "ServiceId required" });
//     }

//     const draft = new Application({
//       user: req.user.id,
//       service: serviceId,
//       subService: subService
//         ? { _id: subService._id, name: subService.name }
//         : null,
//       status: "Draft",
//     });

//     await draft.save();

//     const populated = await Application.findById(draft._id)
//       .populate("user", "name mobile caste dob")
//       .populate({
//         path: "service",
//         select: "name category",
//         populate: { path: "category", select: "name" },
//       })
//       .populate("subService", "name");

//     // ⚡ Draft applications वेगळ्या event ने emit करा
//     req.io.emit("applicationDrafted", populated);

//     res
//       .status(201)
//       .json({ message: "Draft created", application: populated });
//   } catch (err) {
//     console.error("❌ Draft create error:", err.message);
//     res
//       .status(500)
//       .json({ message: "Draft creation failed", error: err.message });
//   }
// });

// module.exports = router;


const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const { GridFsStorage } = require("multer-gridfs-storage");
const path = require("path");
const fs = require("fs");
// import fs from "fs";
// import path from "path";
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

// ---------- Status Flow (canonical) ----------
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
  requireRole("operator", "admin"),
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
      // For manual status update, allow correction comment to be set when moving to Pending Confirmation or In Review
      app.correctionComment =
        status === "Pending Confirmation" || status === "In Review"
          ? correctionComment || ""
          : "";

      await app.save();

      const populated = await Application.findById(app._id)
        .populate("user", "name mobile caste dob")
        .populate({
          path: "service",
          select: "name category",
          populate: { path: "category", select: "name" },
        })
        .populate("subService", "name");

      req.io.emit("applicationStatusUpdated", populated);
      res.json({
        message: "Status updated successfully",
        application: populated,
      });
    } catch (err) {
      console.error("Status update failed:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// ---------- Application Submit ----------
router.post("/", verifyToken, async (req, res) => {
  try {
    const { serviceId, subServiceId, userId } = req.body;

    if (!serviceId || !userId)
      return res
        .status(400)
        .json({ message: "Service and User ID required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).json({ message: "Service not found" });

    let subServiceData = null;
    if (subServiceId) {
      const selectedSub = service.subservices.find(
        (s) => s._id.toString() === subServiceId
      );
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
      .populate({
        path: "service",
        select: "name category",
        populate: { path: "category", select: "name" },
      })
      .populate("subService", "name");

    req.io.emit("applicationCreated", populatedApp);
    res
      .status(201)
      .json({ message: "Application submitted", application: populatedApp });
  } catch (err) {
    console.error("Submission failed:", err);
    res
      .status(500)
      .json({ message: "Submission failed", error: err.message });
  }
});

// ---------- Upload Form PDF + Operator Credentials ----------
router.put(
  "/:id/upload-pdf",
  verifyToken,
  upload.single("formPdf"),
  async (req, res) => {
    try {
      if (req.user.role !== "operator")
        return res.status(403).json({ message: "Access denied" });

      const { operatorId, operatorPassword } = req.body;
      const app = await Application.findById(req.params.id);
      if (!app) return res.status(404).json({ message: "Application not found" });

      // Save form PDF and operator credentials
      app.formPdf = { filename: req.file.filename, fileId: req.file.id };
      // After operator uploads filled PDF, send to user for confirmation
      app.status = "Pending Confirmation";
      app.rejectReason = "";
      app.correctionComment = "";
      app.operatorCredentials = { operatorId, operatorPassword };

      await app.save();

      const populated = await Application.findById(app._id)
        .populate("user", "name mobile caste dob")
        .populate({
          path: "service",
          select: "name category",
          populate: { path: "category", select: "name" },
        })
        .populate("subService", "name");

      req.io.emit("applicationStatusUpdated", populated);
      res.json({
        message: "PDF + Credentials uploaded successfully",
        application: populated,
      });
    } catch (err) {
      console.error("Upload failed:", err);
      res.status(500).json({ message: "Upload failed", error: err.message });
    }
  }
);

// router.get("/:userId/download-all", verifyToken, async (req, res) => {
//   try {
//     if (req.user.role !== "operator")
//       return res.status(403).json({ message: "Access denied" });

//     const user = await User.findById(req.params.userId);
//     if (!user) return res.status(404).json({ message: "User not found" });

//     const gfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
//       bucketName: "uploads",
//     });

//     // Base folder (server-side) - make configurable via env if needed
//     const baseDir = "D:\\dump";

//     const userDir = path.join(
//       baseDir,
//       user.name.replace(/[^a-zA-Z0-9]/g, "_")
//     );

//     if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });

//     const documentFields = [
//       { field: "aadharCard", label: "Aadhaar Card" },
//       { field: "panCard", label: "PAN Card" },
//       { field: "tenthCertificate", label: "10th Certificate" },
//       { field: "tenthMarksheet", label: "10th Marksheet" },
//       { field: "twelfthCertificate", label: "12th Certificate" },
//       { field: "twelfthMarksheet", label: "12th Marksheet" },
//       { field: "graduationDegree", label: "Graduation Degree" },
//       { field: "domicile", label: "Domicile Certificate" },
//       { field: "pgCertificate", label: "PG Certificate" },
//       { field: "casteValidity", label: "Caste Validity" },
//       { field: "otherDocument", label: "Other Document" }, // multi-documents
//     ];

//     let downloadedCount = 0;

//     for (const { field, label } of documentFields) {
//       const doc = user[field];

//       if (!doc) continue;

//       const docsArray = Array.isArray(doc) ? doc : [doc];

//       for (let i = 0; i < docsArray.length; i++) {
//         const fileDoc = docsArray[i];
//         if (!fileDoc?.filename) continue;

//         const ext = path.extname(fileDoc.filename);
//         const fileNameSafe = field === "otherDocument" ? `${label}_${i + 1}${ext}` : `${label}${ext}`;
//         const filePath = path.join(userDir, fileNameSafe);

//         const readStream = gfsBucket.openDownloadStreamByName(fileDoc.filename);
//         const writeStream = fs.createWriteStream(filePath);

//         await new Promise((resolve, reject) => {
//           readStream
//             .on("error", reject)
//             .pipe(writeStream)
//             .on("finish", resolve)
//             .on("error", reject);
//         });

//         downloadedCount++;
//       }
//     }

//     res.json({
//       message: `Downloaded ${downloadedCount} documents to "${userDir}"`,
//       path: userDir,
//     });
//   } catch (err) {
//     console.error("Download all documents failed:", err);
//     res.status(500).json({ message: "Download failed", error: err.message });
//   }
// });

router.get("/:userId/download-all", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "operator")
      return res.status(403).json({ message: "Access denied" });

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const gfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "uploads",
    });

    // Preferred drive
    const preferredDrive = "D:";
    let baseDir;

    if (fs.existsSync(preferredDrive)) {
      baseDir = path.join(preferredDrive, "dump");
    } else {
      baseDir = path.join("C:", "dump");
    }

    const userDir = path.join(
      baseDir,
      user.name.replace(/[^a-zA-Z0-9]/g, "_")
    );

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
      message: `Downloaded ${downloadedCount} documents to "${userDir}"`,
      path: userDir,
    });
  } catch (err) {
    console.error("Download all documents failed:", err);
    res.status(500).json({ message: "Download failed", error: err.message });
  }
});

// ---------- User Confirm ----------
router.put("/:id/confirm", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "user")
      return res
        .status(403)
        .json({ message: "Only user can confirm application" });

    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: "Application not found" });

    if (app.status !== "Pending Confirmation")
      return res
        .status(400)
        .json({ message: "Application not ready for confirmation" });

    app.status = "Confirmed";
    await app.save();

    const populated = await Application.findById(app._id)
      .populate("user", "name mobile caste dob")
      .populate({
        path: "service",
        select: "name category",
        populate: { path: "category", select: "name" },
      })
      .populate("subService", "name");

    req.io.emit("applicationStatusUpdated", populated);
    res.json({ message: "Application confirmed", application: populated });
  } catch (err) {
    res.status(500).json({ message: "Failed to confirm application" });
  }
});

// ---------- Admin/Operator Upload Certificate (only after Confirmed) ----------
router.put(
  "/:id/uploadCertificate",
  verifyToken,
  requireRole("operator", "admin"),
  upload.single("certificate"),
  async (req, res) => {
    try {
      const app = await Application.findById(req.params.id);
      if (!app)
        return res.status(404).json({ message: "Application not found" });

      // Allow upload ONLY if app is Confirmed
      if (app.status !== "Confirmed") {
        return res.status(400).json({
          message: "Certificate can only be uploaded after confirmation",
        });
      }

      app.certificate = { filename: req.file.filename, fileId: req.file.id };
      app.status = "Completed";
      await app.save();

      const populated = await Application.findById(app._id)
        .populate("user", "name mobile caste dob")
        .populate({
          path: "service",
          select: "name category",
          populate: { path: "category", select: "name" },
        })
        .populate("subService", "name");

      req.io.emit("applicationStatusUpdated", populated);
      req.io.emit("certificateUploaded", populated);

      res.json({
        message: "Certificate uploaded successfully",
        application: populated,
      });
    } catch (err) {
      console.error("Certificate upload failed:", err);
      res.status(500).json({ message: "Upload failed", error: err.message });
    }
  }
);

// ---------- Operator Next Step ----------
router.put("/:id/next", verifyToken, requireRole("operator", "admin"), async (req, res) => {
  try {
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: "Application not found" });

    const newStatus = nextStatusOf(app.status);
    if (!newStatus)
      return res
        .status(400)
        .json({ message: `No next step for status: ${app.status}` });

    app.status = newStatus;
    await app.save();

    const populated = await Application.findById(app._id)
      .populate("user", "name mobile caste dob")
      .populate({
        path: "service",
        select: "name category",
        populate: { path: "category", select: "name" },
      })
      .populate("subService", "name");

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
      .populate("user", "name mobile caste dob")
      .populate("subService", "name")
      .populate("operator", "name")
      .sort({ createdAt: -1 });

    res.json(apps);
  } catch (err) {
    console.error("Failed to fetch applications:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch applications", error: err.message });
  }
});

// ---------- Fetch applications for logged-in user ----------
router.get("/my", verifyToken, async (req, res) => {
  try {
    const apps = await Application.find({ user: req.user.id })
      .populate({
        path: "service",
        select: "name category",
        populate: { path: "category", select: "name" },
      })
      .populate("subService", "name")
      .sort({ createdAt: -1 });

    res.json({ applications: apps });
  } catch (err) {
    console.error("Failed to fetch user applications:", err);
    res.status(500).json({
      message: "Failed to fetch user applications",
      error: err.message,
    });
  }
});

// ---------- User submits correction ----------
router.put("/:id/correction", verifyToken, async (req, res) => {
  try {
    const { comment } = req.body;
    if (!comment || !comment.trim()) {
      return res
        .status(400)
        .json({ message: "Correction comment is required" });
    }

    const app = await Application.findById(req.params.id);
    if (!app) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (app.user.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You are not authorized to correct this application" });
    }

    // Put application back to In Review so operator can re-check and re-upload if needed
    app.status = "In Review";
    app.correctionComment = comment;
    await app.save();

    const populated = await Application.findById(app._id)
      .populate("user", "name mobile caste dob")
      .populate({
        path: "service",
        select: "name category",
        populate: { path: "category", select: "name" },
      })
      .populate("subService", "name");

    req.io.emit("applicationStatusUpdated", populated);

    res.json({ message: "Correction submitted", application: populated });
  } catch (err) {
    console.error("Correction submit failed:", err);
    res.status(500).json({
      message: "Correction submit failed",
      error: err.message,
    });
  }
});

// ---------- Reject Application ----------
router.put("/:id/reject", verifyToken, requireRole("operator", "admin"), async (req, res) => {
  try {
    const { reason } = req.body;
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: "Application not found" });

    app.status = "Rejected";
    app.rejectReason = reason || "Rejected by operator";
    await app.save();

    const populated = await Application.findById(app._id)
      .populate("user", "name mobile caste dob")
      .populate({
        path: "service",
        select: "name category",
        populate: { path: "category", select: "name" },
      })
      .populate("subService", "name");

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
    if (req.user.role !== "user") {
      return res.status(403).json({ message: "Only user can update application" });
    }

    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ message: "Application not found" });

    if (app.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (app.status !== "Rejected") {
      return res
        .status(400)
        .json({ message: "Only rejected applications can be updated" });
    }

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

    // After user updates rejected app, send to Submitted state again
    app.status = "Submitted";
    app.rejectReason = "";

    await app.save();

    const populated = await Application.findById(app._id)
      .populate("user", "name mobile caste dob")
      .populate({
        path: "service",
        select: "name category",
        populate: { path: "category", select: "name" },
      })
      .populate("subService", "name");

    req.io.emit("applicationStatusUpdated", populated);

    res.json({
      message: "Application updated & resubmitted successfully",
      application: populated,
    });
  } catch (err) {
    console.error("Update failed:", err);
    res.status(500).json({ message: "Update failed", error: err.message });
  }
});

router.post("/draft", verifyToken, async (req, res) => {
  try {
    const { serviceId, subService } = req.body;
    if (!serviceId) {
      return res.status(400).json({ message: "ServiceId required" });
    }

    const draft = new Application({
      user: req.user.id,
      service: serviceId,
      subService: subService
        ? { _id: subService._id, name: subService.name }
        : null,
      status: "Draft",
    });

    await draft.save();

    const populated = await Application.findById(draft._id)
      .populate("user", "name mobile caste dob")
      .populate({
        path: "service",
        select: "name category",
        populate: { path: "category", select: "name" },
      })
      .populate("subService", "name");

    // Emit draft event
    req.io.emit("applicationDrafted", populated);

    res
      .status(201)
      .json({ message: "Draft created", application: populated });
  } catch (err) {
    console.error("Draft create error:", err.message);
    res
      .status(500)
      .json({ message: "Draft creation failed", error: err.message });
  }
});

module.exports = router;
