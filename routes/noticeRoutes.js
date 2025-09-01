


// const express = require("express");
// const router = express.Router();
// const Notice = require("../models/Notice");

// // GET all notices
// router.get("/", async (req, res) => {
//   try {
//     const notices = await Notice.find().sort({ date: -1 });
//     res.json(notices);
//   } catch (err) {
//     res.status(500).json({ message: "Error fetching notices" });
//   }
// });

// // POST new notice
// router.post("/", async (req, res) => {
//   try {
//     const { title } = req.body;
//     const notice = new Notice({ title });
//     await notice.save();
//     res.status(201).json(notice);
//   } catch (err) {
//     res.status(500).json({ message: "Error adding notice" });
//   }
// });

// // ✅ PUT update notice
// router.put("/:id", async (req, res) => {
//   try {
//     const { title } = req.body;
//     const updatedNotice = await Notice.findByIdAndUpdate(
//       req.params.id,
//       { title },
//       { new: true }
//     );

//     if (!updatedNotice) {
//       return res.status(404).json({ message: "Notice not found" });
//     }

//     res.json(updatedNotice);
//   } catch (err) {
//     res.status(500).json({ message: "Error updating notice" });
//   }
// });

// // ✅ DELETE notice
// router.delete("/:id", async (req, res) => {
//   try {
//     const deletedNotice = await Notice.findByIdAndDelete(req.params.id);

//     if (!deletedNotice) {
//       return res.status(404).json({ message: "Notice not found" });
//     }

//     res.json({ message: "Notice deleted successfully" });
//   } catch (err) {
//     res.status(500).json({ message: "Error deleting notice" });
//   }
// });

// module.exports = router;









const express = require("express");
const router = express.Router();
const Notice = require("../models/Notice");

// GET all notices
router.get("/", async (req, res) => {
  try {
    const notices = await Notice.find().sort({ date: -1 });
    res.json(notices);
  } catch (err) {
    res.status(500).json({ message: "Error fetching notices" });
  }
});


router.post("/", async (req, res) => {
  try {
    const { title, url } = req.body; // 🔹 URL घेतला
    const notice = new Notice({ title, url });
    await notice.save();
    res.status(201).json(notice);
  } catch (err) {
    res.status(500).json({ message: "Error adding notice" });
  }
});

// PUT update notice
router.put("/:id", async (req, res) => {
  try {
    const { title, url } = req.body; // 🔹 URL घेतला
    const updatedNotice = await Notice.findByIdAndUpdate(
      req.params.id,
      { title, url },
      { new: true }
    );

    if (!updatedNotice) {
      return res.status(404).json({ message: "Notice not found" });
    }

    res.json(updatedNotice);
  } catch (err) {
    res.status(500).json({ message: "Error updating notice" });
  }
});

// ✅ DELETE notice
router.delete("/:id", async (req, res) => {
  try {
    const deletedNotice = await Notice.findByIdAndDelete(req.params.id);

    if (!deletedNotice) {
      return res.status(404).json({ message: "Notice not found" });
    }

    res.json({ message: "Notice deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting notice" });
  }
});

module.exports = router;
