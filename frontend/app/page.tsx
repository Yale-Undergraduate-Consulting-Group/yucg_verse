import { HomeHero, HomeToolsSection } from "./components/home";
import { defaultTools } from "./lib/config";
import PageViewTracker from "./components/PageViewTracker";

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <PageViewTracker page="home" />
      <HomeHero />
      <HomeToolsSection tools={defaultTools} />
    </div>
  );
}
