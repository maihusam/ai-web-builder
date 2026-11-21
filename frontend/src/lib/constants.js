// Every website generation or revision costs this many credits (see backend/lib/generate.js)
export const CREDIT_COST = 5;
export const FREE_CREDITS = 20;
export const MAX_PROMPT_LENGTH = 2000;

export const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  (error?.code === "ERR_NETWORK"
    ? "Can't reach the server. Check your connection and try again."
    : error?.message) ||
  "Something went wrong";
