import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/lib/types";

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,190px),1fr))] gap-4">
      {products.map((product) => (
        <li key={product.id} className="flex">
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
