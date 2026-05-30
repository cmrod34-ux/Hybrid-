import Navbar from "@/app/components/Navbar";
import HeroSection from "@/app/components/HeroSection";
import ProblemSection from "@/app/components/ProblemSection";
import SolutionSection from "@/app/components/SolutionSection";
import HowItWorksSection from "@/app/components/HowItWorksSection";
import NutritionSection from "@/app/components/NutritionSection";
import WaitlistSection from "@/app/components/WaitlistSection";
import Footer from "@/app/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#080a0f]">
      <Navbar />
      <HeroSection />

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      </div>

      <ProblemSection />

      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      </div>

      <SolutionSection />

      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      </div>

      <HowItWorksSection />

      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      </div>

      <NutritionSection />

      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      </div>

      <WaitlistSection />
      <Footer />
    </main>
  );
}
