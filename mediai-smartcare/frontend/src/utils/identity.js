export const isEmailLike = (value) => String(value || "").includes("@");

const toPositiveInteger = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const formatWithPrefix = (prefix, value, width = 3) => {
  const normalized = toPositiveInteger(value);
  if (!normalized) return null;
  return `${prefix}-${String(normalized).padStart(width, "0")}`;
};

export const getRoleLabel = (role) => {
  const normalizedRole = String(role || "").toLowerCase();
  if (normalizedRole === "patient") return "Patient";
  if (normalizedRole === "doctor") return "Doctor";
  if (normalizedRole === "admin") return "Admin";
  return "MediAI User";
};

export const getUserDisplayName = (currentUser) => {
  const fullName = String(currentUser?.fullName || "").trim();
  const doctorProfileName = String(currentUser?.doctorProfile?.name || "").trim();

  if (fullName && !isEmailLike(fullName)) {
    return fullName;
  }

  if (doctorProfileName && !isEmailLike(doctorProfileName)) {
    return doctorProfileName;
  }

  return getRoleLabel(currentUser?.role);
};

export const formatRoleUserId = (role, userId) => {
  const normalizedRole = String(role || "").toLowerCase();
  const prefixByRole = {
    patient: "PT",
    doctor: "DOC",
    admin: "ADM",
  };

  return formatWithPrefix(
    prefixByRole[normalizedRole] || "USR",
    userId,
    normalizedRole === "patient" ? 4 : 3,
  );
};

export const formatPatientUserId = (userId) => formatWithPrefix("PT", userId, 4);

export const formatDoctorProfileId = (doctorId) =>
  formatWithPrefix("DOC", doctorId);
