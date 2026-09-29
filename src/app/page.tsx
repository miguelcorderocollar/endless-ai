import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { QuizFromConvex } from "@/components/QuizFromConvex";

export default function Home() {
  return (
    <ConvexClientProvider>
      <QuizFromConvex />
    </ConvexClientProvider>
  );
}
