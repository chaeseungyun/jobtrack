import { Resend } from "resend";
import { Webhook } from "svix";

const resend = new Resend(process.env.RESEND_API_KEY);

export const emailService = {
  async sendNotificationEmail({
    to,
    subject,
    html,
    tags,
  }: {
    to: string;
    subject: string;
    html: string;
    tags: { name: string; value: string }[];
  }) {
    const { data, error } = await resend.emails.send({
      from: "JobTrack <notifications@resend.dev>",
      to,
      subject,
      html,
      tags,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  verifyResendWebhook(headers: Record<string, string>, payload: string) {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error("RESEND_WEBHOOK_SECRET is not set");
    }

    const wh = new Webhook(secret);
    return wh.verify(payload, headers);
  },
};
