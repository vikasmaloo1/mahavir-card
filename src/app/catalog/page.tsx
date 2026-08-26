import { redirect } from "next/navigation";

export default function CatalogueRedirect() {
  redirect("/products");
}
