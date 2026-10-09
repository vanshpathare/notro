// // src/utils/otpProvider.js

// const sendWhatsAppOTP = async (phoneNumber, otp) => {
//   const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
//   const token = process.env.WHATSAPP_TOKEN; // Clean match to your .env variable!
//   const templateName = process.env.WHATSAPP_TEMPLATE_NAME;

//   // Format cleanly for India — Meta requires the 91XXXXXXXXXX string pattern
//   const formattedPhone = phoneNumber.startsWith("91")
//     ? phoneNumber
//     : `91${phoneNumber}`;

//   const response = await fetch(
//     `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
//     {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${token}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         messaging_product: "whatsapp",
//         to: formattedPhone,
//         type: "template",
//         template: {
//           name: templateName,
//           language: { code: "en" },
//           components: [
//             {
//               type: "body",
//               parameters: [{ type: "text", text: otp }],
//             },
//           ],
//         },
//       }),
//     },
//   );

//   const data = await response.json();

//   if (!response.ok) {
//     console.error("WhatsApp API error output:", data);
//     throw new Error(
//       data.error?.message || "Failed to send WhatsApp OTP package.",
//     );
//   }

//   return data;
// };

// module.exports = { sendWhatsAppOTP };

// src/utils/otpProvider.js
const axios = require("axios");

/**
 * Sends a dynamic WhatsApp OTP via Fast2SMS
 * @param {string} phoneNumber - e.g. "9503096450" or "+919503096450"
 * @param {string|number} otp - e.g. "482910"
 */
const sendWhatsAppOTP = async (phoneNumber, otp) => {
  // Strip country code (+91), spaces, or non-digits to ensure a clean 10-digit number
  const cleanNumber = String(phoneNumber).replace(/\D/g, "").slice(-10);

  if (cleanNumber.length !== 10) {
    throw new Error("Invalid phone number format. Exactly 10 digits required.");
  }

  const apiKey = process.env.FAST2SMS_API_KEY;
  const phoneNumberId = process.env.FAST2SMS_PHONE_NUMBER_ID;
  const messageId = process.env.NOTEZHO_OTP_MESSAGE_ID;

  if (!apiKey || !phoneNumberId || !messageId) {
    throw new Error("Missing Fast2SMS credentials in environment variables.");
  }

  const payload = {
    phone_number_id: phoneNumberId,
    message_id: messageId,
    numbers: cleanNumber,
    variables_values: String(otp), // Replaces {{1}} in your approved template
  };

  try {
    const response = await axios.post(
      "https://www.fast2sms.com/dev/whatsapp",
      payload,
      {
        headers: {
          authorization: apiKey,
          "Content-Type": "application/json",
        },
      },
    );

    const result = response.data;

    if (!result.return && result.status_code !== 200) {
      const errorMsg = Array.isArray(result.message)
        ? result.message.join(", ")
        : result.message || "Failed to deliver WhatsApp OTP";
      throw new Error(errorMsg);
    }

    return result;
  } catch (error) {
    const errorDetails = error.response?.data?.message || error.message;
    console.error("Fast2SMS WhatsApp Dispatch Failure:", errorDetails);

    const deliveryError = new Error("WHATSAPP_DELIVERY_FAILED");
    deliveryError.cause = errorDetails;
    throw deliveryError;
  }
};

module.exports = { sendWhatsAppOTP };
