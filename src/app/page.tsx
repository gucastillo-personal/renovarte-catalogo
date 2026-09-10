import { CatalogView } from "@/components/CatalogView";
import { CategoryNav } from "@/components/CategoryNav";
import { getAllProducts } from "@/lib/products";

export default function Home() {
  const products = getAllProducts();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-sage-800">
        Catálogo
      </h1>

      <CategoryNav />

      <CatalogView products={products} />
    </div>
  );
}
