export const getRemainingLimit = (limit, used) => {
  if (limit === Infinity) return Infinity;
  if (limit === "unlimited") return "unlimited";
  if (limit === null || limit === undefined) return "unlimited";

  return Math.max(limit - used, 0);
};
