export interface JobAdapterConfig {
  render_js: boolean;
  content: string[];
  remove: string[];
  version: string;
}

export const ADAPTER_CONFIG: Record<string, JobAdapterConfig> = {
  "saramin.co.kr": {
    render_js: true,
    content: [".wrap_jv_cont"],
    remove: ["script", ".wrap_recommend_slide"],
    version: "2026-03-01",
  },
  "jobkorea.co.kr": {
    render_js: false,
    content: [".jobKindCont"],
    remove: ["script"],
    version: "2026-03-01",
  },
  generic: {
    render_js: false,
    content: ["main", "article", "#content", "body"],
    remove: ["script", "style", "noscript", "iframe"],
    version: "2026-03-01",
  },
};
