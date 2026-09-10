import { ProductCard } from "@/components/ProductCard";
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

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <li key={product.id} className="flex">
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </div>
  );
}
