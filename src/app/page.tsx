import { CatalogView } from "@/components/CatalogView";
import { CategoryNav } from "@/components/CategoryNav";
import { MissionSection } from "@/components/MissionSection";
import { getAllProducts } from "@/lib/products";

export default function Home() {
  const products = getAllProducts();

  return (
    <div className="flex flex-col">
      <MissionSection />

      <div className="my-10 border-t border-beige-200 sm:my-16" />

      <div id="catalogo" className="flex scroll-mt-4 flex-col gap-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-sage-800">
          Catálogo
        </h2>

        <CategoryNav />

        <CatalogView products={products} />
      </div>
    </div>
  );
}
