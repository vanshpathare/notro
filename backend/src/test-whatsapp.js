const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { sendWhatsAppOtp } = require("./services/whatsappService");

async function testOtpDispatch() {
  const testPhone = "918788871221"; // Country code + number (e.g. 919876543210)
  const testCode = "729401";

  try {
    const res = await sendWhatsAppOtp(testPhone, testCode);
    console.log("Success! Message sent:", res);
  } catch (err) {
    console.error("Dispatch Error:", err.response?.data || err.message);
  }
}

testOtpDispatch();
