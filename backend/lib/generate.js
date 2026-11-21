import User from "../models/User.js";

export const CREDIT_COST = 5;
export const MAX_PROMPT_LENGTH = 2000;

// Takes credits atomically: the balance check and the deduction happen in one
// database operation, so two quick requests can't both spend the same credits.
// Returns the updated user, or null if the balance was too low.
export const chargeCredits = (userId) =>
  User.findOneAndUpdate(
    { _id: userId, credits: { $gte: CREDIT_COST } },
    { $inc: { credits: -CREDIT_COST } },
    { new: true },
  );

export const refundCredits = (userId) =>
  User.updateOne({ _id: userId }, { $inc: { credits: CREDIT_COST } });

// Models often wrap HTML in ```html fences. Only strip a fence at the very
// start/end so backticks inside the page's own code are left alone.
export const cleanCode = (raw) =>
  raw
    .trim()
    .replace(/^```[a-z]*\s*\n/i, "")
    .replace(/\n?```\s*$/, "")
    .trim();

export const friendlyError = (error) => {
  if (error?.name === "APIUserAbortError") return "The request was cancelled";
  return error?.message || "Something went wrong";
};
