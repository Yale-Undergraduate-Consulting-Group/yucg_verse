import { HomeHero, HomeToolsSection } from "./components/home";
import { defaultTools } from "./lib/config";

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <HomeHero />
      <HomeToolsSection tools={defaultTools} />
    </div>
  );
}
