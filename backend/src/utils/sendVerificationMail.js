import SibApiV3Sdk from "sib-api-v3-sdk";

const defaultClient = SibApiV3Sdk.ApiClient.instance;

const sendEmail = async ({ email, subject, message }) => {
  try {
    if (!process.env.BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY is missing in environment variables");
    }

    if (!process.env.FROM_EMAIL) {
      throw new Error("FROM_EMAIL is missing in environment variables");
    }

    if (!email) {
      throw new Error("Recipient email is required");
    }

    const apiKey = defaultClient.authentications["api-key"];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    const sendSmtpEmail = {
      sender: {
        email: process.env.FROM_EMAIL,
        name: process.env.FROM_NAME || "Aura AI",
      },

      to: [
        {
          email,
        },
      ],

      subject,

      htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>${subject}</h2>
          <p>${message}</p>
        </div>
      `,

      textContent: message,
    };

    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);

    return {
      success: true,
      message: "Email sent successfully",
      data: response,
    };
  } catch (error) {
    console.error("❌ Error in sendEmail:", error.response?.body || error.message);

    throw new Error(
      error.response?.body?.message || error.message || "Email sending failed"
    );
  }
};

export default sendEmail;