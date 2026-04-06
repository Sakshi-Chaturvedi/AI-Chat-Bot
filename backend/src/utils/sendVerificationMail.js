import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ email, subject, message }) => {
  try {
    const response = await resend.emails.send({
      from: "Aura AI <onboarding@resend.dev>", // testing ke liye
      to: [email], // always array better hota hai
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>${subject}</h2>
          <p>${message}</p>
        </div>
      `,
    });

    return response;
  } catch (error) {
    console.error("❌ Error in sendEmail:", error);
    throw new Error("Email sending failed");
  }
};

export default sendEmail;
