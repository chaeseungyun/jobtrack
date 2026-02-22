import { NextRequest, NextResponse } from "next/server";
import { applicationService } from "@/lib/services/application.service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { emailService } from "@/lib/services/email.service";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createServerSupabaseClient();
  
  try {
    const d3Targets = await applicationService.findEventsForNotification(supabase, 3);
    const d1Targets = await applicationService.findEventsForNotification(supabase, 1);

    const sendPromises = [
      ...d3Targets.map((target) => 
        emailService.sendNotificationEmail({
          to: target.applications.users.email,
          subject: `[JobTrack] D-3 Reminder: ${target.applications.company_name} - ${target.applications.position}`,
          html: `
            <h3>[JobTrack] 일정 리마인드</h3>
            <p><strong>${target.applications.company_name}</strong> - ${target.applications.position} 일정이 3일 남았습니다.</p>
            <p>일시: ${new Date(target.scheduled_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</p>
            <hr />
            <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/applications/${target.application_id}">상세 보기</a></p>
          `,
          tags: [
            { name: "eventId", value: target.id },
            { name: "notificationType", value: "d3" }
          ]
        })
      ),
      ...d1Targets.map((target) => 
        emailService.sendNotificationEmail({
          to: target.applications.users.email,
          subject: `[JobTrack] D-1 Reminder: ${target.applications.company_name} - ${target.applications.position}`,
          html: `
            <h3>[JobTrack] 일정 리마인드</h3>
            <p><strong>${target.applications.company_name}</strong> - ${target.applications.position} 일정이 1일 남았습니다.</p>
            <p>일시: ${new Date(target.scheduled_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</p>
            <hr />
            <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/applications/${target.application_id}">상세 보기</a></p>
          `,
          tags: [
            { name: "eventId", value: target.id },
            { name: "notificationType", value: "d1" }
          ]
        })
      )
    ];

    await Promise.allSettled(sendPromises);

    return NextResponse.json({ 
      processed: {
        d3: d3Targets.length,
        d1: d1Targets.length
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cron processing failed" },
      { status: 500 }
    );
  }
}
