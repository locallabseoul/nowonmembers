import { createCampaign } from "./actions";
import { CampaignCreateWizard } from "./campaign-create-wizard";

export default async function NewCampaignPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return <CampaignCreateWizard action={createCampaign} error={error} />;
}
