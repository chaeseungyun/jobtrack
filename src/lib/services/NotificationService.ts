import type { IEventRepository } from "@/lib/domain/repositories";
import { emailService } from "@/lib/services/email.service";

export class NotificationService {
  constructor(private readonly eventRepo: IEventRepository) {}

  async processReminders(): Promise<{ d3: number; d1: number }> {
    const d3Targets = await this.eventRepo.findForNotification(3);
    const d1Targets = await this.eventRepo.findForNotification(1);

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const sendPromises = [
      ...d3Targets.map((target) =>
        emailService
          .sendNotificationEmail({
            to: target.user_email,
            subject: `[JobTrack] D-3 Reminder: ${target.company_name} - ${target.position}`,
            html: `
              <h3>[JobTrack] 일정 리마인드</h3>
              <p><strong>${target.company_name}</strong> - ${target.position} 일정이 3일 남았습니다.</p>
              <p>일시: ${new Date(target.scheduled_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</p>
              <hr />
              <p><a href="${siteUrl}/applications/${target.application_id}">상세 보기</a></p>
            `,
            tags: [
              { name: "eventId", value: target.event_id },
              { name: "notificationType", value: "d3" },
            ],
          })
          .then(() =>
            this.eventRepo.confirmNotification(target.event_id, 3),
          ),
      ),
      ...d1Targets.map((target) =>
        emailService
          .sendNotificationEmail({
            to: target.user_email,
            subject: `[JobTrack] D-1 Reminder: ${target.company_name} - ${target.position}`,
            html: `
              <h3>[JobTrack] 일정 리마인드</h3>
              <p><strong>${target.company_name}</strong> - ${target.position} 일정이 1일 남았습니다.</p>
              <p>일시: ${new Date(target.scheduled_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</p>
              <hr />
              <p><a href="${siteUrl}/applications/${target.application_id}">상세 보기</a></p>
            `,
            tags: [
              { name: "eventId", value: target.event_id },
              { name: "notificationType", value: "d1" },
            ],
          })
          .then(() =>
            this.eventRepo.confirmNotification(target.event_id, 1),
          ),
      ),
    ];

    await Promise.allSettled(sendPromises);

    return { d3: d3Targets.length, d1: d1Targets.length };
  }

  async confirmWebhookNotification(
    eventId: string,
    notificationType: string,
  ): Promise<void> {
    if (notificationType === "d1" || notificationType === "d3") {
      const daysBefore = notificationType === "d3" ? 3 : 1;
      await this.eventRepo.confirmNotification(eventId, daysBefore);
    }
  }
}
