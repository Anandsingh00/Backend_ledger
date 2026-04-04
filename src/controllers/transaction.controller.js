const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const emailService = require("../services/email.service");
const accountModel = require("../models/account.model");
const { default: mongoose } = require("mongoose");

/**
 * * - Create a new transaction
 *  THE 10-STEP TRANSFER PROCESS:
 * *1. Validate request
 * *2. Validate idompotency key
 * *3. Check account status
 * *4. Derive sender balance from ledger
 * *5. Create transaction (PENDING)
 * *6. Create DEBIT ledger entry
 * *7. Create CREDIT ledger entry
 * *8.Mark transaction as COMPLETED
 * *9. Commit mongodb session
 * *10.Send transaction email to user
 * */

async function createTransactionController(req, res) {
  //yet to be completed
  const { fromAccount, toAccount, amount } = req.body;
}

async function createInitalFundsTransaction(req, res) {
 
    const { toAccount, amount, idempotencyKey } = req.body;

    if (!toAccount || !amount || !idempotencyKey) {
      return res.status(400).json({
        message: "toAccount, amount and idempotencyKey are required",
      });
    }

    const toUserAccount = await accountModel.findOne({
      _id: toAccount,
    });

    if (!toUserAccount) {
      return res.status(404).json({
        message: "toAccount not found",
      });
    }

    const fromUser = await accountModel.findOne({
      user: req.user._id,
    });

    if (!fromUser) {
      return res.status(400).json({
        message: "System user account not found",
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    const transaction = await transactionModel.create(
      [
        {
          fromAccount: fromUser._id,
          toAccount,
          amount,
          idempotencyKey,
          status: "PENDING",
        },
      ],
      { session },
    );

    const createdTransaction = transaction[0];

    //Debit Ledger Entry for system account 
    const debitLedgerEntry = await ledgerModel.create(
      [
        {
          account: fromUser._id,
          amount,
          transaction: createdTransaction._id,
          type: "DEBIT",
        },
      ],
      { session },
    );

    //Credit Ledger Entry for recipient account 
    const creditLedgerEntry = await ledgerModel.create(
      [
        {
          account: toAccount,
          amount,
          transaction: createdTransaction._id,
          type: "CREDIT",
        },
      ],
      { session },
    );

   console.log(
      `Ledger entries created 
      Debit: ${debitLedgerEntry[0]._id}
      Credit: ${creditLedgerEntry[0]._id}`
    );

   createdTransaction.status = "COMPLETED";
  await createdTransaction.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: "Inital fund transaction completed successfully",
      transaction: transaction,
    });
}
module.exports = {
  createTransactionController,
  createInitalFundsTransaction,
};
