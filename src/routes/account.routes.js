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
  "/create",
  authMiddleware.authMiddleware,
  accountController.createAccountController,
);

/**
 * -GET /api/acccounts
 * -Get all accounts of the logged-in user
 * -Protected Route
 */
router.get(
  "/",
  authMiddleware.authMiddleware,
  accountController.getUserAccountsController,
);

/**
 * * -GET /api/accounts/balance/:acccountId
 */
router.get(
  "/balance/:accountId",
  authMiddleware.authMiddleware,
  accountController.getAccountBalanceController,
);

module.exports = router;
