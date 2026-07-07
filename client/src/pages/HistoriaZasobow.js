import React, { useState, useEffect } from "react";
import "../styles/Style.css";
import {CustomTick} from "../components/CustomTick";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { useParams } from "react-router-dom";

export default function HistoriaZasobow() {
  const { id } = useParams();

  const [historia, setHistoria] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (!id) return;

    fetch(`/api/historia_zasobow/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setHistoria(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Błąd pobierania szczegółów:", err);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="history-details-container">
        Wczytywanie danych szczegółowych...
      </div>
    );
  }
  const filteredHistoria = historia.filter((item) => {
    const itemDate = new Date(item.data_i_czas);

    const fromOk = !dateFrom || itemDate >= new Date(dateFrom);
    const toOk = !dateTo || itemDate <= new Date(`${dateTo}T23:59:59`);

    return fromOk && toOk;
  });
  return (
    <div className="history-details-container">
      <h2 className="history-details-title">Historia zużycia zasobów</h2>
      <div className="filter-section">
        <label>
          Od:
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </label>

        <label>
          Do:
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </label>

        <button
          onClick={() => {
            setDateFrom("");
            setDateTo("");
          }}
        >
          Wyczyść filtry
        </button>
      </div>
      {/* CPU */}
      <h3 className="history-table-title">CPU (%)</h3>
      <div className="history-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredHistoria}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="data_i_czas"  tick={<CustomTick />} height={65} interval="preserveStartEnd" padding={{ left: 25, right: 25 }}/>
            <YAxis domain={[0, (max) => max * 1.05]} tickCount={4} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="zuzycie_cpu_procent"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* RAM */}
      <h3 className="history-table-title">RAM (MB)</h3>
      <div className="history-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredHistoria}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="data_i_czas"  tick={<CustomTick />} height={65} interval="preserveStartEnd" padding={{ left: 25, right: 25 }}/>
            <YAxis domain={[0, (max) => (max * 1.05).toFixed(2)]} tickCount={4} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="zuzycie_ramu_mb"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* DYSK */}
      <h3 className="history-table-title">Dysk (MB)</h3>
      <div className="history-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredHistoria}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="data_i_czas"  tick={<CustomTick />} height={65} interval="preserveStartEnd" padding={{ left: 25, right: 25 }}/>
            <YAxis domain={[0, (max) => (max * 1.05).toFixed(2)]} tickCount={4} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="zuzycie_dysku_mb"
              stroke="#16a34a"
              strokeWidth={2}
              dot={{ r: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* PROCESY */}
      <h3 className="history-table-title">Procesy</h3>
      <div className="history-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredHistoria}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="data_i_czas"  tick={<CustomTick />} height={65} interval="preserveStartEnd" padding={{ left: 25, right: 25 }}/>
            <YAxis domain={[0, (max) => (max * 1.05).toFixed(2)]} tickCount={4} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="zuzycie_procesow"
              stroke="#7c3aed"
              strokeWidth={2}
              dot={{ r: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ===== JEDNA WSPÓLNA TABELA ===== */}
      <h3 className="history-table-title">Historia zmian</h3>

      <div className="history-table-wrapper">
        <table className="history-table">
          <thead>
            <tr>
              <th>Data i czas</th>
              <th>CPU %</th>
              <th>RAM MB</th>
              <th>Dysk MB</th>
              <th>Procesy</th>
            </tr>
          </thead>

          <tbody>
            {historia.map((d, i) => (
              <tr key={i}>
                <td>{d.data_i_czas?.slice(0, -3)}</td>
                <td className="cpu">
                  {Number(d.zuzycie_cpu_procent).toFixed(2).slice(-2) === "00"
                    ? Number(d.zuzycie_cpu_procent).toFixed(0)
                    : Number(d.zuzycie_cpu_procent).toFixed(2)}
                  %
                </td>
                <td className="ram">
                  {Number(d.zuzycie_ramu_mb).toFixed(2).slice(-2) === "00"
                    ? Number(d.zuzycie_ramu_mb).toFixed(0)
                    : Number(d.zuzycie_ramu_mb).toFixed(2)}
                </td>
                <td className="disk">
                  {Number(d.zuzycie_dysku_mb).toFixed(2).slice(-2) === "00"
                    ? Number(d.zuzycie_dysku_mb).toFixed(0)
                    : Number(d.zuzycie_dysku_mb).toFixed(2)}
                </td>
                <td className="processes">
                  {Number(d.zuzycie_procesow).toFixed(2).slice(-2) === "00"
                    ? Number(d.zuzycie_procesow).toFixed(0)
                    : Number(d.zuzycie_procesow).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
