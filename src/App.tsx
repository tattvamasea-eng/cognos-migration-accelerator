import { BrowserRouter, Route, Routes } from "react-router-dom";
import CognosAgenticDemo from "./pages/cognos-agentic";
import ComplexityScorer from "./pages/complexity-scorer";
import { ThemeProvider } from "@/components/theme-provider";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<CognosAgenticDemo />} />
          <Route path="/scorer" element={<ComplexityScorer />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
