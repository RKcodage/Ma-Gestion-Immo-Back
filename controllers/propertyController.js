const Property = require("../models/Property");

// Create property
const createProperty = async (req, res) => {
  try {
    const {
      ownerId,
      address,
      city,
      postalCode,
      description,
      type,
      surface,
      rooms,
      rent,
      charges,
      isOccupied,
      tenants,
      photos,
    } = req.body;

    if (!ownerId || !address || !city || !type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newProperty = new Property({
      ownerId,
      address,
      city,
      postalCode,
      description,
      type,
      surface,
      rooms,
      rent,
      charges,
      isOccupied,
      tenants,
      photos,
    });

    await newProperty.save();
    res.status(201).json(newProperty);
  } catch (error) {
    console.error("createProperty error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
};

// Get property
const getPropertiesByOwner = async (req, res) => {
  try {
    const ownerId = req.params.ownerId;

    const properties = await Property.find({ ownerId }).populate("ownerId");

    res.status(200).json(properties);
  } catch (error) {
    console.error("getPropertiesByOwner error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// Get property by id
const getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).populate("ownerId");

    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    res.status(200).json(property);
  } catch (error) {
    console.error("getPropertyById error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// Update property
const updatePropertyById = async (req, res) => {
  try {
    const propertyId = req.params.id;
    const updates = req.body;

    const updated = await Property.findByIdAndUpdate(propertyId, updates, {
      new: true,
    });

    if (!updated) {
      return res.status(404).json({ error: "Property not found" });
    }

    res.status(200).json({ message: "Property updated", property: updated });
  } catch (error) {
    console.error("updatePropertyById error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// Delete property
const deletePropertyById = async (req, res) => {
  try {
    const propertyId = req.params.id;

    const deleted = await Property.findByIdAndDelete(propertyId);
    if (!deleted) {
      return res.status(404).json({ error: "Property not found" });
    }

    res.status(200).json({ message: "Property deleted successfully" });
  } catch (error) {
    console.error("deletePropertyById error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createProperty,
  updatePropertyById,
  getPropertiesByOwner,
  getPropertyById,
  deletePropertyById,
};
