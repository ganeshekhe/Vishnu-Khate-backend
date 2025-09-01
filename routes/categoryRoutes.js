


const express = require("express");
const router = express.Router();
const Category = require("../models/Category");
const { verifyToken } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/role");

// =============================
// Create Category (Admin Only)
// =============================
router.post("/", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const { name, icon, isActive } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Category name is required" });
    }

    const category = new Category({
      name: name.trim(),
      icon: icon || "",
      isActive: isActive !== undefined ? isActive : true,
    });

    await category.save();
    res.status(201).json(category);
  } catch (err) {
    console.error("Category create error:", err);
    res.status(500).json({ error: "Failed to create category" });
  }
});

// =============================
// Get All Categories
// =============================
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (err) {
    console.error("Fetch categories error:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// =============================
// Delete Category (Admin Only)
// =============================
router.delete("/:id", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json({ message: "Category deleted successfully" });
  } catch (err) {
    console.error("Delete category error:", err);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

module.exports = router;
