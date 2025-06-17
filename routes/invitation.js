const express = require("express");
const router = express.Router();
const { getInvitationByToken } = require("../controllers/invitationController");

router.get("/invitation/:token", getInvitationByToken);

module.exports = router;
