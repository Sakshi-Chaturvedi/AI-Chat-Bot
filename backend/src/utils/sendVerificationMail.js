import { Resend } from "resend";

const sendEmail = async ({ email, subject, message }) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is missing in environment variables");
    }

    if (!email) {
      throw new Error("Recipient email is required");
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const response = await resend.emails.send({
      from: "Aura AI <onboarding@resend.dev>",
      to: [email],
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>${subject}</h2>
          <p>${message}</p>
        </div>
      `,
    });

    if (response?.error) {
      console.error("❌ Resend returned an error:", response.error);
      throw new Error(response.error.message || "Failed to send email");
    }

    return {
      success: true,
      message: "Email sent successfully",
      data: response,
    };
  } catch (error) {
    console.error("❌ Error in sendEmail:", error.message);
    throw new Error(error.message || "Email sending failed");
  }
};

export default sendEmail;