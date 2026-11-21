import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import User from "../models/User.js";
import { ENV } from "../env.js";
import { sendMail } from "../lib/mailer.js";
import { signToken, cookieOptions, COOKIE_NAME } from "../lib/token.js";

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  credits: user.credits,
});

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      password.length < 8
    ) {
      return res.status(400).json({
        message: "Name, email and a password of 8+ characters are required",
      });
    }

    const normalized = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalized });
    if (existing && existing.emailVerified) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    let user;
    if (existing) {
      // Never-verified signup: let the real owner start over with new details
      existing.name = name;
      existing.password = hashed;
      user = await existing.save();
    } else {
      user = await User.create({
        name,
        email: normalized,
        password: hashed,
        emailVerified: false,
      });
    }

    await sendOtp(user);

    // No login cookie yet: the account is usable only after the code is verified
    res.status(201).json({ needsVerification: true, email: user.email });
  } catch (error) {
    console.log(error.code || error.message);
    res.status(500).json({ message: "Couldn't send the verification email, please try again" });
  }
};

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const hashOtp = (email, otp) =>
  crypto.createHash("sha256").update(`${email}:${otp}`).digest("hex");

// Generates a 6-digit code, stores its hash and emails it. Returns false if a
// code was sent less than a minute ago.
const sendOtp = async (user, { force = true } = {}) => {
  const fresh = await User.findById(user.id).select("+otpSentAt");
  if (
    !force &&
    fresh?.otpSentAt &&
    Date.now() - fresh.otpSentAt.getTime() < OTP_RESEND_COOLDOWN_MS
  ) {
    return false;
  }

  const otp = String(crypto.randomInt(100000, 1000000));
  await User.updateOne(
    { _id: user.id },
    {
      $set: {
        otpHash: hashOtp(user.email, otp),
        otpExpires: new Date(Date.now() + OTP_TTL_MS),
        otpAttempts: 0,
        otpSentAt: new Date(),
      },
    },
  );

  await sendMail({
    to: user.email,
    subject: "Your verification code",
    text: `Hi ${user.name},\n\nYour verification code is ${otp}\n\nIt expires in 10 minutes. If you didn't create an account, you can ignore this email.`,
  });
  return true;
};

export const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (typeof email !== "string" || typeof otp !== "string") {
      return res.status(400).json({ message: "Email and code are required" });
    }

    const normalized = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalized }).select(
      "+otpHash +otpExpires +otpAttempts",
    );

    const invalid = { message: "That code is invalid or has expired" };
    if (!user || user.emailVerified || !user.otpHash || user.otpExpires < new Date()) {
      return res.status(400).json(invalid);
    }
    if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
      return res
        .status(429)
        .json({ message: "Too many attempts. Please request a new code." });
    }

    if (hashOtp(normalized, otp.trim()) !== user.otpHash) {
      await User.updateOne({ _id: user.id }, { $inc: { otpAttempts: 1 } });
      return res.status(400).json(invalid);
    }

    await User.updateOne(
      { _id: user.id },
      {
        $set: { emailVerified: true },
        $unset: { otpHash: "", otpExpires: "", otpAttempts: "", otpSentAt: "" },
      },
    );

    res.cookie(COOKIE_NAME, signToken(user.id), cookieOptions);
    res.json({ user: publicUser(user) });
  } catch (error) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};

export const resendOtp = async (req, res) => {
  const genericReply = { message: "If that account needs verifying, a new code is on its way." };
  try {
    const { email } = req.body;
    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (user && !user.emailVerified) {
      const sent = await sendOtp(user, { force: false });
      if (!sent) {
        return res
          .status(429)
          .json({ message: "Please wait a minute before requesting another code" });
      }
    }
    res.json(genericReply);
  } catch (error) {
    console.log(error.code || error.message);
    res.status(500).json({ message: "Couldn't send the verification email, please try again" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // password is hidden by default, so ask for it explicitly
    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    // Same message for "no user" and "wrong password" so attackers
    // can't tell which emails are registered
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.emailVerified) {
      // Password was right, so it's safe to tell them to verify (and email a code)
      await sendOtp(user, { force: false });
      return res.status(403).json({
        code: "EMAIL_NOT_VERIFIED",
        email: user.email,
        message: "Please verify your email. We've sent you a code.",
      });
    }

    res.cookie(COOKIE_NAME, signToken(user.id), cookieOptions);
    res.json({ user: publicUser(user) });
  } catch (error) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

// Always answers the same way, so nobody can use this to find out which
// emails are registered.
export const forgotPassword = async (req, res) => {
  const genericReply = {
    message: "If that email has an account, we've sent a reset link.",
  };
  try {
    const { email } = req.body;

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.json(genericReply);
    }

    const token = crypto.randomBytes(32).toString("hex");
    await User.updateOne(
      { _id: user.id },
      {
        $set: {
          resetTokenHash: hashToken(token),
          resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      },
    );

    await sendMail({
      to: user.email,
      subject: "Reset your password",
      text: `Hi ${user.name},\n\nUse this link to choose a new password (valid for 1 hour):\n${ENV.CLIENT_URL}/auth/reset?token=${token}\n\nIf you didn't ask for this, you can ignore this email.`,
    });

    res.json(genericReply);
  } catch (error) {
    console.log(error.code || error.message);
    res.status(500).json({ message: "Couldn't send the reset email, please try again" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (typeof token !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "Token and password are required" });
    }
    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }

    const user = await User.findOne({
      resetTokenHash: hashToken(token),
      resetTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "This reset link is invalid or has expired" });
    }

    await User.updateOne(
      { _id: user.id },
      {
        $set: { password: await bcrypt.hash(password, 10) },
        $unset: { resetTokenHash: "", resetTokenExpires: "" },
      },
    );

    res.cookie(COOKIE_NAME, signToken(user.id), cookieOptions);
    res.json({ user: publicUser(user) });
  } catch (error) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};

export const logout = (req, res) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: undefined });
  res.json({ message: "Logged out" });
};

export const me = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    res.json({ user: publicUser(user) });
  } catch (error) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
  }
};
