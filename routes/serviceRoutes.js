const express = require("express");
const router = express.Router();
const Service = require("../models/Service");
const Category = require("../models/Category");
const { verifyToken } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/role");


// ---------------- CATEGORY ROUTES ----------------

// Get all categories
router.get("/categories", async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// Add new category
router.post("/categories", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const category = new Category({ name: req.body.name });
    await category.save();
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: "Failed to add category" });
  }
});

// Delete category
router.delete("/categories/:id", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: "Category deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete category" });
  }
});


// ---------------- SERVICE ROUTES ----------------

// Get all services
router.get("/", async (req, res) => {
  try {
    const services = await Service.find().populate("category");
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch services" });
  }
});


router.post("/", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const { name, description, category, fees, platformFee } = req.body;

    const service = new Service({ name, description, category, fees, platformFee });
    await service.save();
    const populated = await Service.findById(service._id).populate("category");
    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: "Failed to add service" });
  }
});




router.put("/:id", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const { name, description, category, fees, platformFee } = req.body;

    const updated = await Service.findByIdAndUpdate(
      req.params.id,
      { name, description, category, fees, platformFee },
      { new: true }
    ).populate("category");

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update service" });
  }
});

// Delete service
router.delete("/:id", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    await Service.findByIdAndDelete(req.params.id);
    res.json({ message: "Service deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete service" });
  }
});



router.put("/:id/subservices", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const { name, description, fees, platformFee } = req.body;
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ error: "Service not found" });

    service.subservices.push({ name, description, fees, platformFee });
    await service.save();

    const populated = await Service.findById(req.params.id).populate("category");
    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: "Failed to add subservice" });
  }
});



router.put("/:id/subservices/:subId", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ error: "Service not found" });

    const sub = service.subservices.id(req.params.subId);
    if (!sub) return res.status(404).json({ error: "Subservice not found" });

    sub.name = req.body.name || sub.name;
    sub.description = req.body.description || sub.description;
    sub.fees = req.body.fees || sub.fees;
    sub.platformFee = req.body.platformFee ?? sub.platformFee; // 👈 important

    await service.save();
    const populated = await Service.findById(req.params.id).populate("category");
    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update subservice" });
  }
});

// Delete subservice
router.delete("/:id/subservices/:subId", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ error: "Service not found" });

    service.subservices = service.subservices.filter(
      (s) => s._id.toString() !== req.params.subId
    );
    await service.save();

    const populated = await Service.findById(req.params.id).populate("category");
    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete subservice" });
  }
});
// Update subservice (name/fees)
router.put("/:serviceId/subservices/:subId", verifyToken, async (req, res) => {
  try {
    const { serviceId, subId } = req.params;
    const { name, fees } = req.body;

    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).json({ message: "Service not found" });

    const subservice = service.subservices.id(subId);
    if (!subservice) return res.status(404).json({ message: "Subservice not found" });

    if (name) subservice.name = name;
    if (fees) subservice.fees = fees;

    await service.save();
    res.json(service);
  } catch (error) {
    res.status(500).json({ message: "Failed to update subservice", error: error.message });
  }
});

module.exports = router;
