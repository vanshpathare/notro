// src/utils/otpProvider.js

const sendWhatsAppOTP = async (phoneNumber, otp) => {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN; // Clean match to your .env variable!
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME;

  // Format cleanly for India — Meta requires the 91XXXXXXXXXX string pattern
  const formattedPhone = phoneNumber.startsWith("91")
    ? phoneNumber
    : `91${phoneNumber}`;

  const response = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en" },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: otp }],
            },
          ],
        },
      }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("WhatsApp API error output:", data);
    throw new Error(
      data.error?.message || "Failed to send WhatsApp OTP package.",
    );
  }

  return data;
};

module.exports = { sendWhatsAppOTP };
