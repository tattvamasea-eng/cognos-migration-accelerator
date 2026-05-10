import { BrowserRouter, Route, Routes } from "react-router-dom";
import CognosDemo from "./pages/cognos-demo";
import ComplexityScorer from "./pages/complexity-scorer";
import { ThemeProvider } from "@/components/theme-provider";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<CognosDemo />} />
          <Route path="/scorer" element={<ComplexityScorer />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
