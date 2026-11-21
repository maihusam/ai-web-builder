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

    if (await User.findOne({ email: email.trim().toLowerCase() })) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });

    res.cookie(COOKIE_NAME, signToken(user.id), cookieOptions);
    res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    console.log(error.code || error.message);
    res.status(500).json({ message: error.message });
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
