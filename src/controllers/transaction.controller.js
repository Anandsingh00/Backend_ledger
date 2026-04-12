const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const emailService = require("../services/email.service");
const accountModel = require("../models/account.model");
const { default: mongoose, mongo } = require("mongoose");

/**
 * * - Create a new transaction
 *  THE 10-STEP TRANSFER PROCESS:
 * * -1. Validate request
 * * -2. Validate idompotency key
 * * -3. Check account status
 * * -4. Derive sender balance from ledger
 * * -5. Create transaction (PENDING)
 * * -6. Create DEBIT ledger entry
 * * -7. Create CREDIT ledger entry
 * * -8.Mark transaction as COMPLETED
 * * -9. Commit mongodb session
 * * -10.Send transaction email to user
 * */

async function createTransactionController(req, res) {
  const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

  /**
   * * -1. Validate request
  */
  if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
    return res.json(400).status({
      message: "fromAccount,toAccount,amount,idempotencyKey are required",
    });
  }

  const toUserAccount = await accountModel.findOne({ _id: toAccount });

  const fromUserAccount = await accountModel.findOne({ _id: fromAccount });

  if (!toUserAccount || !fromUserAccount) {
    return res.status(400).json({
      message: "Invalid fromAccount or toAccount",
    });
  }

  /**
   * 2. Validate idempotency key
  */
  const isTransactionAlreadyExists = await accountModel.findOne({
    idempotencyKey: idempotencyKey,
  });

  if (isTransactionAlreadyExists) {
    if (isTransactionAlreadyExists.status === "COMPLETED") {
      return res.status(200).json({
        message: "Transaction already completed",
        transaction: isTransactionAlreadyExists,
      });
    }

    if (isTransactionAlreadyExists.status === "PENDING") {
      return res.status(200).json({
        message: "Transaction is still processing",
      });
    }

    if (isTransactionAlreadyExists.status === "FAILED") {
      return res.status(500).json({
        message: "Transaction is Failed,Please retry",
      });
    }

    if (isTransactionAlreadyExists.status === "REVERSED") {
      return res.status(500).json({
        message: "Transaction is reversed,Please retry",
      });
    }
  }

  /**
   * 3. Check account status
  */
  if (
    toUserAccount.status !== "ACTIVE" ||
    fromUserAccount.status !== "ACTIVE"
  ) {
    return res.status(400).json({
      message: "Both the to and from account must be active",
    });
  }

  /**
   * 4. Derive sender balance from ledger
  */
  const balance = await fromUserAccount.getBalance();
  if (balance < amount) {
    return res.status(400).json({
      message: `Insufficient balance. Current balance is ${balance}. Requested amount is ${amount}`,
    });
  }

  /**
   * 5.Create transaction (PENDING)
  */
  const session = await mongoose.startSession();
  session.startTransaction();

  const transaction = await transactionModel.create(
    {
      fromAccount,
      toAccount,
      amount,
      idempotencyKey,
      status: "PENDING",
    },
    { session },
  );

  /*
   * -6. Create DEBIT ledger entry
  */
  const debitLedgerEntry = await mongoose.create(
    {
      account: fromAccount,
      amount: amount,
      transaction: transaction._id,
      type: "DEBIT",
    },
    { session },
  );

  /*
   * -7. Create CREDIT ledger entry
  */
  const creditLedgerEntry = await mongoose.create(
    {
      account: toAccount,
      amount: amount,
      transaction: transaction._id,
      type: "CREDIT",
    },
    { session },
  );

  /**
   *  -8.Mark transaction as COMPLETED
  */
  transaction.status = "COMPLETED";
  await transaction.save({ session });

  /*
   * -9. Commit mongodb session
  */
  await session.commitTransaction();
  session.endSession();

  /**
   * * -10.Send transaction email to user
  */
  await emailService.sendTransactionEmail(
    req.user.email,
    req.user.name,
    amount,
    toAccount,
  );

  return res.status(200).json({
    message: "Transaction completed successfully",
    transaction: transaction,
  });
}

async function createInitalFundsTransaction(req, res) {
  const { toAccount, amount, idempotencyKey } = req.body;

  //1.validate the user input
  if (!toAccount || !amount || !idempotencyKey) {
    return res.status(400).json({
      message: "toAccount, amount and idempotencyKey are required",
    });
  }

  const toUserAccount = await accountModel.findOne({ _id: toAccount });
  if (!toUserAccount) {
    return res.status(404).json({
      message: "toAccount Not found",
    });
  }

  const fromUser = await accountModel.findOne({ user: user.req._id });
  if (!fromUser) {
    return res.status(400).json({ message: "System user account not found" });
  }

  //2.start session
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    // Create the transaction record
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

    // Debit ledger entry
    await ledgerModel.create(
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

    // Credit ledger entry
    await ledgerModel.create(
      [
        {
          acccount: toAccount,
          amount,
          transaction: createdTransaction._id,
          type: "CREDIT",
        },
      ],
      { session },
    );

    // Update status and save
    createdTransaction.status = "COMPLETED";
    await createdTransaction.save({ session });

    //3.commit the changes
    await session.commitTransaction();

    return res.status(201).json({
      message: "Initial fund transaction completed successfully",
      transaction: transaction,
    });
  } catch (error) {
    //4.rollback:if anything fails in the try block
    console.error("Transaction aborted due to error:", error);
    await session.abortTransaction();

    return res.status(500).json({
      message: "Transaction failed and was rolled back",
      error: error.message,
    });
  } finally {
    //5. End the session
    await session.endSession();
  }
}

module.exports = {
  createTransactionController,
  createInitalFundsTransaction,
};
