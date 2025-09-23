
const mongoose = require("mongoose");
const { GridFSBucket } = require("mongodb");

let gfs;

mongoose.connection.once("open", () => {
  gfs = new GridFSBucket(mongoose.connection.db, {
    bucketName: "uploads", // Ensure this matches the bucket used in Multer/GridFS
  });
});

const getFileByFilename = async (req, res) => {
  try {
    const filename = req.params.filename;
    const fileDoc = await mongoose.connection.db
      .collection("uploads.files")
      .findOne({ filename });

    if (!fileDoc) return res.status(404).json({ message: "File not found" });

    res.set("Content-Type", fileDoc.contentType);
    gfs.openDownloadStreamByName(filename).pipe(res);
  } catch (error) {
    console.error("GridFS fetch error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { getFileByFilename };
