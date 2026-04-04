import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ email, subject, message }) => {
  try {
    await resend.emails.send({
      from: "Aura.AI",
      to: email,
      subject,
      html: `
        <div style="font-family: Arial; padding: 20px;">
          <h2>${subject}</h2>
          <p>${message}</p>
        </div>
      `,
    });
  } catch (error) {
    console.log("Error Message in Email Function -> ", error);
    throw new Error("Email sending failed");
  }
};

export default sendEmail;
