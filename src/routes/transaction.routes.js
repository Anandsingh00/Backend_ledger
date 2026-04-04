const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const transactionController = require("../controllers/transaction.controller");

const transactionRouter = express.Router();


transactionRouter.post(
  "/",
  authMiddleware.authMiddleware,
  transactionController.createTransactionController,
);


/**
 * - POST /api/transactions/system/initial-funds
 * - Create initial funds transaction from system user
 */
transactionRouter.post(
  "/system/initial-funds",
  authMiddleware.authSystemUserMiddleware,
  transactionController.createInitalFundsTransaction,

);
module.exports = transactionRouter;
