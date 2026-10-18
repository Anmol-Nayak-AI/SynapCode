import { EventSchemas, Inngest } from "inngest";

type SynapCodeEvents = {
  "synapcode/repository.analysis.requested": {
    data: {
      jobId: string;
      organizationId: string;
      repositoryId: string;
      repository: string;
      ref: string;
      requestedBy: string;
    };
  };
};

export const inngest = new Inngest({
  id: "synapcode",
  schemas: new EventSchemas().fromRecord<SynapCodeEvents>(),
});

export function isInngestConfigured() {
  return Boolean(process.env.INNGEST_EVENT_KEY && process.env.INNGEST_SIGNING_KEY);
}
