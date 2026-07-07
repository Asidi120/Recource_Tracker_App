import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Historia from "./pages/HistoriaListaKont";
import StatusStron from "./pages/StatusStron";
import StronaGlowna from "./pages/StronaGlowna";
import SzczegolyHistoriiUslugi from "./pages/SzczegolyHistoriiUslugi";
import HistoriaZasobow from "./pages/HistoriaZasobow";
import HistoriaStatusow from "./pages/HistoriaStatusow";
import "./App.css";

function App() {
  const hidenavbar=window.location.pathname.startsWith("/historia/:id") ? true : false;
  return (
    <BrowserRouter>
    <>
    {!hidenavbar && (
      <nav>
        <Link to="/">Strona Główna</Link> |{" "}
        <Link to="/status">Status Stron</Link> |{" "}
        <Link to="/historia">Historia</Link>
      </nav>
    )}
    </>
      <Routes>
        <Route path="/" element={<StronaGlowna />} />
        <Route path="/status" element={<StatusStron/>} />
        <Route path="/historia" element={<Historia />} />
        <Route path="/historia/:id" element={<SzczegolyHistoriiUslugi />} />
        <Route path="/historia_zasobow/:id" element={<HistoriaZasobow />} />
        <Route path="/historia_statusow/:hosting_id/:usluga_id" element={<HistoriaStatusow />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;