const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const emailService = require("../services/email.service");

/**
 * - User Register Controller
 * - POST: /api/auth/register
 */

async function userRegisterController(req, res) {
  const { email, name, password } = req.body;

  const isExist = await userModel.findOne({
    email: email,
  });

  if (isExist) {
    return res.status(422).json({
      message: "User already exist with this email,Try to login",
      status: "failed",
    });
  }

  const user = await userModel.create({
    email,
    name,
    password,
  });

  // After successful signup , send a jwt token to the user which will contain- user_id,jwt-secret and expiry time

  const token = jwt.sign({ userID: user._id }, process.env.JWT_SECRET, {
    expiresIn: "3d",
  });

  //store the token inside user's cookie
  res.cookie("token", token);

  res.status(201).json({
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
    },
    token,
  });

  await emailService.sendRegistrationEmail(email, name);
}

/**
 * - User Login Controller
 * - POST: /api/auth/login
 */
async function userLoginController(req, res) {
  const { email, password } = req.body;
  const user = await userModel.findOne({ email }).select("+password");

  if (!user) {
    return res.status(401).json({
      message: "User Not registered",
    });
  }

  const isValidPassword = await user.comparePassword(password);

  if (!isValidPassword) {
    return res.status(401).json({
      message: "Incorrect Password,Please try again",
    });
  }

  const token = jwt.sign({ userID: user._id }, process.env.JWT_SECRET, {
    expiresIn: "3d",
  });

  res.cookie("token", token);

  return res.status(200).json({
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
    },
    token,
  });
}

module.exports = {
  userRegisterController,
  userLoginController,
};
