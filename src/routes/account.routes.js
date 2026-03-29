const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const accountController = require("../controllers/account.controller");
/**
 * - POST /api/accounts
 * - Create a new account
 * - Protected Route
 */
router.post(
  "/",
  authMiddleware.authMiddleware,
  accountController.createAccountController,
);

module.exports = router;
