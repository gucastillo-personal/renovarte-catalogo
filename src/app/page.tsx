import { CategoryNav } from "@/components/CategoryNav";
import { ProductGrid } from "@/components/ProductGrid";
import { getAllProducts } from "@/lib/products";

export default function Home() {
  const products = getAllProducts();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-sage-800">
          Catálogo
        </h1>
        <p className="mt-1 text-sage-600">
          {products.length} producto{products.length === 1 ? "" : "s"} disponible
          {products.length === 1 ? "" : "s"}
        </p>
      </div>

      <CategoryNav />

      <ProductGrid products={products} />
    </div>
  );
}
