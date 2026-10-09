// const path = require("path");
// // Point to the root backend .env
// require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
// const { sendWhatsAppOTP } = require("./services/whatsappService");

// async function testOtpDispatch() {
//   const testPhone = "8788871221"; // Standard 10-digit number
//   const testCode = "729401";

//   try {
//     console.log(`Sending WhatsApp OTP to ${testPhone}...`);
//     const res = await sendWhatsAppOTP(testPhone, testCode);
//     console.log("Success! Message sent:", res);
//   } catch (err) {
//     console.error("Dispatch Error:", err.message);
//   }
// }

// testOtpDispatch();
