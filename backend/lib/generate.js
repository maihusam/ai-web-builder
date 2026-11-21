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

// Models often add chatty intro text, ```html fences and closing notes around
// the page. Keep only the HTML document itself: from <!DOCTYPE html> (or <html>)
// to the last </html>. Falls back to stripping outer fences if no document is found.
export const cleanCode = (raw) => {
  const text = (raw || "").trim();

  const start = text.search(/<!doctype\s+html|<html[\s>]/i);
  const endMatch = [...text.matchAll(/<\/html\s*>/gi)].pop();

  if (start !== -1 && endMatch) {
    return text.slice(start, endMatch.index + endMatch[0].length).trim();
  }

  return text
    .replace(/^```[a-z]*\s*\n/i, "")
    .replace(/\n?```\s*$/, "")
    .trim();
};

export const friendlyError = (error) => {
  if (error?.name === "APIUserAbortError") return "The request was cancelled";
  return error?.message || "Something went wrong";
};
