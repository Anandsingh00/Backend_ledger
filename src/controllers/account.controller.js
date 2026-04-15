const accountModel = require("../models/account.model");

async function createAccountController(req, res) {
  const user = req.user;

  const account = await accountModel.create({
    user: user._id,
  });

  return res.status(201).json({
    account,
    message: "Account created successfully",
  });
}

async function getUserAccountsController(req, res) {
  console.log(req.user._id);
  const accounts = await accountModel.find({ user: req.user._id });
  return res.status(200).json({
    accounts,
  });
}

async function getAccountBalanceController(req, res) {
  const { accountId } = req.params;

  const account = await accountModel.findOne({
    _id: accountId,
    user: req.user._id,
  });
  console.log(account);
  if (!account) {
    return res.status(404).json({
      message: "Account not found",
    });
  }

  const balance = await account.getBalance();
  console.log(`Balance: ${balance}`);
  return res.status(200).json({
    accountId: account._id,
    balance: balance,
  });
}

module.exports = {
  createAccountController,
  getUserAccountsController,
  getAccountBalanceController,
};
