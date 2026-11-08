export const branches = [
  { id: "all", name: "All Branches", nameAr: "كل الفروع" },
  { id: "hajiss", name: "Hajiss", nameAr: "هاجس" },
  { id: "ghalia", name: "Ghalia", nameAr: "غاليا" },
  { id: "odun", name: "Odun", nameAr: "أودون" },
  { id: "natheel", name: "Natheel", nameAr: "نخيل" },
];

export const branchName = (id) => branches.find((branch) => branch.id === id)?.name ?? id;

const legacyBranchIds = {
  danis: "ghalia",
  deshin: "odun",
  gcc: "natheel",
  foundation: "ghalia",
};

export const normalizeBranchId = (id) => legacyBranchIds[id] ?? id;
