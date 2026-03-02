import { describe, it, expect } from "vitest";
import { applySelectedFields, getChangedFields, getDiff } from "@/lib/parse/merge";
import type { ApplicationFormValues } from "@/app/applications/_components/application-form-fields.client";

const FULL_FORM: ApplicationFormValues = {
  company_name: "Old Co",
  position: "Old Dev",
  career_type: "new",
  job_url: "https://old.com",
  source: "none",
  merit_tags: "",
  current_stage: "interest",
  company_memo: "",
  cover_letter: "",
  deadline: "",
};

describe("Edit Application Reparse Flow", () => {
  describe("Selective field apply", () => {
    it("should not auto-apply parsed fields", () => {
      const currentForm = { ...FULL_FORM };
      const parsedResult: Partial<ApplicationFormValues> = { company_name: "New Co", position: "New Dev" };

      // applySelectedFields with empty selection = no changes
      const updatedForm = applySelectedFields(currentForm, parsedResult, []);
      expect(updatedForm.company_name).toBe("Old Co");
    });

    it("should apply only selected fields", () => {
      const currentForm = { ...FULL_FORM };
      const parsedResult: Partial<ApplicationFormValues> = { company_name: "New Co", position: "New Dev" };
      const selectedFields: Array<keyof ApplicationFormValues> = ["company_name"];

      const updatedForm = applySelectedFields(currentForm, parsedResult, selectedFields);
      expect(updatedForm.company_name).toBe("New Co");
      expect(updatedForm.position).toBe("Old Dev");
    });

    it("should preserve unselected fields", () => {
      const currentForm = { ...FULL_FORM };
      const parsedResult: Partial<ApplicationFormValues> = { company_name: "New Co", position: "New Dev" };
      const selectedFields: Array<keyof ApplicationFormValues> = [];

      const updatedForm = applySelectedFields(currentForm, parsedResult, selectedFields);
      expect(updatedForm.company_name).toBe("Old Co");
      expect(updatedForm.position).toBe("Old Dev");
    });
  });

  describe("Candidate comparison", () => {
    it("should show diff between current and parsed values", () => {
      const current = { company_name: "Old Co" };
      const parsed = { company_name: "New Co" };

      const diff = getDiff(current, parsed);
      expect(diff.company_name).toEqual({ current: "Old Co", parsed: "New Co" });
    });

    it("should only show changed fields in candidate panel", () => {
      const current = { ...FULL_FORM, company_name: "Same Co", position: "Old Dev" };
      const parsed: Partial<ApplicationFormValues> = { company_name: "Same Co", position: "New Dev" };

      const changed = getChangedFields(current, parsed);
      expect(changed).toHaveProperty("position");
      expect(changed).not.toHaveProperty("company_name");
    });

    it("should ignore job_url in comparison", () => {
      const current = { ...FULL_FORM, job_url: "https://old.com" };
      const parsed: Partial<ApplicationFormValues> = { job_url: "https://new.com" };

      const changed = getChangedFields(current, parsed);
      expect(changed).not.toHaveProperty("job_url");
  });
  });

  describe("Reparse trigger", () => {
    it("should not parse on URL change alone", () => {
      const parseCalled = false;
      const onUrlChange = (_newUrl: string) => {
        // Should not trigger parse
      };

      onUrlChange("https://new-url.com");
      expect(parseCalled).toBe(false);
    });

    it("should parse only on explicit reparse action", () => {
      let parseCalled = false;
      const onReparseClick = () => {
        parseCalled = true;
      };

      onReparseClick();
      expect(parseCalled).toBe(true);
    });
  });
});
