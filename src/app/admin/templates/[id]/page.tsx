import { DesignTemplateEditor } from "@/components/design-template-cms";

export default async function AdminTemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DesignTemplateEditor templateId={id} />;
}
