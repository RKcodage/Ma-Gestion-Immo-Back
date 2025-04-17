const Tenant = require("../models/Tenant");

// GET tenant by userId
const getTenantByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;

    const tenant = await Tenant.findOne({ userId });
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    res.status(200).json(tenant);
  } catch (error) {
    console.error("getTenantByUserId error:", error.message);
    res
      .status(500)
      .json({ error: "An error occurred while fetching tenant data." });
  }
};

// Update tenant infos
const updateTenantByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;
    const {
      address,
      birthDate,
      employmentStatus,
      guarantor,
      visaleGuarantee = {},
    } = req.body;

    const tenant = await Tenant.findOne({ userId });

    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    tenant.address = address ?? tenant.address;
    tenant.birthDate = birthDate ?? tenant.birthDate;
    tenant.employmentStatus = employmentStatus ?? tenant.employmentStatus;
    tenant.guarantor = guarantor ?? tenant.guarantor;
    tenant.visaleGuarantee = {
      enabled: visaleGuarantee.enabled ?? tenant.visaleGuarantee.enabled,
      contractNumber:
        visaleGuarantee.contractNumber ?? tenant.visaleGuarantee.contractNumber,
      validityStart:
        visaleGuarantee.validityStart ?? tenant.visaleGuarantee.validityStart,
      validityEnd:
        visaleGuarantee.validityEnd ?? tenant.visaleGuarantee.validityEnd,
    };

    await tenant.save();

    res.status(200).json({ message: "Tenant updated", tenant });
  } catch (error) {
    console.error("updateTenantByUserId error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getTenantByUserId,
  updateTenantByUserId,
};
