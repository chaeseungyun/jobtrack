import { describe, it, expect, vi, beforeEach } from "vitest";

import { AppError } from "@/lib/core/errors";
import type {
  CreateApplicationInput,
  IApplicationRepository,
} from "@/lib/core/repositories/interfaces";
import type { IEventRepository } from "@/lib/core/repositories/interfaces";
import type { ApplicationRow } from "@/lib/supabase/types";

import { ApplicationService } from "../ApplicationService";

const USER_ID = "user-1";
const EXISTING_ID = "app-existing";
const NEW_ID = "app-new";

function buildRow(overrides: Partial<ApplicationRow> = {}): ApplicationRow {
  return {
    id: EXISTING_ID,
    user_id: USER_ID,
    company_name: "Acme",
    position: "Frontend",
    career_type: "any",
    job_url: "https://example.com/job/1",
    source: "etc",
    merit_tags: [],
    current_stage: "interest",
    company_memo: null,
    cover_letter: null,
    created_at: "2026-04-30T00:00:00Z",
    updated_at: "2026-04-30T00:00:00Z",
    ...overrides,
  } as ApplicationRow;
}

function buildInput(
  overrides: Partial<CreateApplicationInput> = {},
): CreateApplicationInput {
  return {
    company_name: "Acme",
    position: "Frontend",
    career_type: "any",
    job_url: "https://example.com/job/1",
    ...overrides,
  };
}

describe("ApplicationService.create — duplicate handling", () => {
  let service: ApplicationService;
  let applicationRepo: IApplicationRepository;
  let eventRepo: IEventRepository;

  beforeEach(() => {
    applicationRepo = {
      findMany: vi.fn(),
      findById: vi.fn(),
      findByJobUrl: vi.fn(),
      existsForUser: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };
    eventRepo = {
      findByApplicationId: vi.fn(),
      findById: vi.fn(),
      findUpcoming: vi.fn(),
      findForNotification: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      confirmNotification: vi.fn(),
    };
    service = new ApplicationService(applicationRepo, eventRepo);
  });

  it("throws DUPLICATE_APPLICATION with existing id when job_url already exists", async () => {
    vi.mocked(applicationRepo.findByJobUrl).mockResolvedValue(
      buildRow({ id: EXISTING_ID }),
    );

    await expect(service.create(USER_ID, buildInput())).rejects.toMatchObject({
      status: 409,
      code: "DUPLICATE_APPLICATION",
      details: { id: EXISTING_ID },
    });

    expect(applicationRepo.create).not.toHaveBeenCalled();
  });

  it("creates the application when job_url is unused", async () => {
    vi.mocked(applicationRepo.findByJobUrl).mockResolvedValue(null);
    vi.mocked(applicationRepo.create).mockResolvedValue(
      buildRow({ id: NEW_ID }),
    );

    const result = await service.create(USER_ID, buildInput());

    expect(result.id).toBe(NEW_ID);
    expect(applicationRepo.create).toHaveBeenCalledOnce();
  });

  it("converts a Postgres unique violation (23505) to DUPLICATE_APPLICATION", async () => {
    vi.mocked(applicationRepo.findByJobUrl)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(buildRow({ id: EXISTING_ID }));
    vi.mocked(applicationRepo.create).mockRejectedValue({
      code: "23505",
      message: "duplicate key value violates unique constraint",
    });

    await expect(service.create(USER_ID, buildInput())).rejects.toMatchObject({
      status: 409,
      code: "DUPLICATE_APPLICATION",
      details: { id: EXISTING_ID },
    });

    expect(applicationRepo.findByJobUrl).toHaveBeenCalledTimes(2);
  });

  it("skips the duplicate pre-check when job_url is empty", async () => {
    vi.mocked(applicationRepo.create).mockResolvedValue(
      buildRow({ id: NEW_ID, job_url: null }),
    );

    const result = await service.create(USER_ID, buildInput({ job_url: "" }));

    expect(result.id).toBe(NEW_ID);
    expect(applicationRepo.findByJobUrl).not.toHaveBeenCalled();
  });

  it("propagates non-unique-violation errors from create", async () => {
    vi.mocked(applicationRepo.findByJobUrl).mockResolvedValue(null);
    const dbError = Object.assign(new Error("connection lost"), {
      code: "08006",
    });
    vi.mocked(applicationRepo.create).mockRejectedValue(dbError);

    await expect(service.create(USER_ID, buildInput())).rejects.toBe(dbError);
  });

  it("AppError details survives instanceof check (route can serialize)", async () => {
    vi.mocked(applicationRepo.findByJobUrl).mockResolvedValue(
      buildRow({ id: EXISTING_ID }),
    );

    try {
      await service.create(USER_ID, buildInput());
      expect.fail("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const appErr = err as AppError;
      expect(appErr.details).toEqual({ id: EXISTING_ID });
    }
  });
});
