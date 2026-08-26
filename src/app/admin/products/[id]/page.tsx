import { ProductEditor } from "@/components/product-cms";

export default async function AdminProductPage({ params }: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  return <ProductEditor productId={id} />;
}
