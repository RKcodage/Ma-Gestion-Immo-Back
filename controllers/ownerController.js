const Owner = require("../models/Owner");
const Property = require("../models/Property");

// Create owner informations
const updateOwner = async (req, res) => {
  try {
    const { userId, ...updateFields } = req.body;

    const owner = await Owner.findOneAndUpdate(
      { userId },
      { $set: updateFields },
      { new: true }
    );

    if (!owner) {
      return res.status(404).json({ error: "Owner introuvable" });
    }

    res.status(200).json(owner);
  } catch (error) {
    console.error("updateOwner error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// Get owner by Id
const getOwnerById = async (req, res) => {
  try {
    const owner = await Owner.findById(req.params.id);

    if (!owner) {
      return res.status(404).json({ error: "Owner not found" });
    }

    const propertiesCount = await Property.countDocuments({
      ownerId: owner._id,
    });

    owner.propertiesNumber = propertiesCount; // si tu veux juste ajouter au retour

    res.status(200).json(owner);
  } catch (error) {
    console.error("getOwnerById error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

const getOwnerByUserId = async (req, res) => {
  try {
    const userId = req.params.userId.trim(); // 🧽 supprime les \n ou espaces

    const owner = await Owner.findOne({ userId });
    if (!owner) {
      return res.status(404).json({ error: "Owner not found" });
    }

    res.status(200).json(owner);
  } catch (error) {
    console.error("getOwnerByUserId error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getOwnerById, updateOwner, getOwnerByUserId };
