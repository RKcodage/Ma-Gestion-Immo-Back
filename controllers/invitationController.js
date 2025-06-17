const Invitation = require("../models/Invitation");

const getInvitationByToken = async (req, res) => {
  try {
    const { token } = req.params;

    const invitation = await Invitation.findOne({
      token,
      used: false,
      expiresAt: { $gt: Date.now() },
    });

    if (!invitation) {
      return res.status(404).json({ error: "Invitation invalide ou expirée" });
    }

    res.status(200).json({ email: invitation.email });
  } catch (err) {
    console.error("Erreur getInvitationByToken:", err.message);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

module.exports = { getInvitationByToken };
