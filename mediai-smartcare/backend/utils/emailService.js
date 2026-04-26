const emailConfigured = () => false;

const sendEmail = async ({ to }) => {
  if (!to) {
    return {
      status: "skipped",
      reason: "Missing recipient email address",
    };
  }

  return {
    status: "skipped",
    reason: "External email delivery is disabled",
  };
};

module.exports = {
  sendEmail,
  emailConfigured,
};
