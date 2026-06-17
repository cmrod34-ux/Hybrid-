import Navbar from "@/app/components/Navbar";
import HeroSection from "@/app/components/HeroSection";
import ProblemSection from "@/app/components/ProblemSection";
import SolutionSection from "@/app/components/SolutionSection";
import ProductFlowSection from "@/app/components/ProductFlowSection";
import NutritionSection from "@/app/components/NutritionSection";
import FounderSection from "@/app/components/FounderSection";
import ChatSection from "@/app/components/ChatSection";
import QuestionnaireSection from "@/app/components/QuestionnaireSection";
import FeedbackSection from "@/app/components/FeedbackSection";
import WaitlistSection from "@/app/components/WaitlistSection";
import Footer from "@/app/components/Footer";

const Divider = () => (
  <div className="max-w-6xl mx-auto px-6">
    <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
  </div>
);

export default function Home() {
  return (
    <main className="min-h-screen bg-[#080a0f]">
      <Navbar />
      <HeroSection />
      <Divider />
      <ProblemSection />
      <Divider />
      <SolutionSection />
      <Divider />
      <ProductFlowSection />
      <Divider />
      <NutritionSection />
      <Divider />
      <FounderSection />
      <Divider />
      <ChatSection />
      <Divider />
      <QuestionnaireSection />
      <Divider />
      <FeedbackSection />
      <Divider />
      <WaitlistSection />
      <Footer />
    </main>
  );
}
