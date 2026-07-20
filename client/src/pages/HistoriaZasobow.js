import React, { useState, useEffect, useMemo } from "react";
import "../styles/Style.css";
import { CustomTick } from "../components/CustomTick";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { useParams } from "react-router-dom";

export default function HistoriaZasobow() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [historia, setHistoria] = useState([]);
  const [prediction, setPrediction] = useState([]);
  const [averageGrowth30Days, setAverageGrowth30Days] = useState(null);
  const [predictedFullDate, setPredictedFullDate] = useState(null);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/historia_zasobow/${id}`)
      .then((res) => res.json())
      .then((data) => {
        // Konwersja wartości tekstowych na liczby dla poprawnego skalowania osi Y
        const mappedHistoria = (data.historia || []).map((item) => ({
          ...item,
          zuzycie_cpu_procent:
            item.zuzycie_cpu_procent != null
              ? Number(item.zuzycie_cpu_procent)
              : null,
          zuzycie_ramu_mb:
            item.zuzycie_ramu_mb != null ? Number(item.zuzycie_ramu_mb) : null,
          zuzycie_dysku_mb:
            item.zuzycie_dysku_mb != null
              ? Number(item.zuzycie_dysku_mb)
              : null,
          zuzycie_procesow:
            item.zuzycie_procesow != null
              ? Number(item.zuzycie_procesow)
              : null,
          limit_dysku_mb:
            item.limit_dysku_mb != null ? Number(item.limit_dysku_mb) : null,
        }));

        const mappedPrediction = (data.predykcja || []).map((item) => ({
          ...item,
          zuzycie_dysku_prognoza:
            item.zuzycie_dysku_prognoza != null
              ? Number(item.zuzycie_dysku_prognoza)
              : null,
        }));

        setHistoria(mappedHistoria);
        setPrediction(mappedPrediction);
        setAverageGrowth30Days(data.srednie_wzrost);
        setPredictedFullDate(data.przewidziana_data_pelna);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Błąd pobierania szczegółów:", err);
        setLoading(false);
      });
  }, [id]);

  // Filtrowanie historii przy użyciu useMemo
  const filteredHistoria = useMemo(() => {
    return historia.filter((item) => {
      const itemDate = new Date(item.data_i_czas);
      const fromOk = !dateFrom || itemDate >= new Date(dateFrom);
      const toOk = !dateTo || itemDate <= new Date(`${dateTo}T23:59:59`);
      return fromOk && toOk;
    });
  }, [historia, dateFrom, dateTo]);

  // Filtrowanie prognozy przy użyciu useMemo
  const filteredPrediction = useMemo(() => {
    return prediction.filter((item) => {
      const itemDate = new Date(item.data_i_czas);
      const fromOk = !dateFrom || itemDate >= new Date(dateFrom);
      const toOk = !dateTo || itemDate <= new Date(`${dateTo}T23:59:59`);
      return fromOk && toOk;
    });
  }, [prediction, dateFrom, dateTo]);

  // Przygotowanie danych do wykresu dysku bez mutowania stanu
  let lastSize = null;

  // Używamy [...filteredHistoria].reverse(), aby nie mutować tablicy w pamięci
  const daneWykresu = [
    ...[...filteredHistoria].reverse(),
    ...filteredPrediction,
  ].map((item) => {
    if (item.zuzycie_dysku_mb !== null) {
      lastSize = item.zuzycie_dysku_mb;
    }

    const isMissing =
      item.zuzycie_dysku_mb === null && item.zuzycie_dysku_prognoza == null;

    return {
      ...item,
      brak_danych: isMissing ? lastSize : null,
    };
  });
  console.log("Dane wykresu dysku:", daneWykresu);
  if (loading) {
    return (
      <div className="history-details-container">
        Wczytywanie danych szczegółowych...
      </div>
    );
  }
  const limitDysku = historia[0]?.limit_dysku_mb;
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

      {/* DYSK */}
      <h3 className="history-table-title">Dysk (MB)</h3>
      <div className="history-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={daneWykresu}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="data_i_czas"
              tick={<CustomTick />}
              height={65}
              interval="preserveStartEnd"
              padding={{ left: 25, right: 25 }}
            />
            <YAxis
              domain={[0, (max) => Math.ceil(max * 1.05)]}
              tickCount={4}
              unit=" MB"
            />
            <Tooltip
              labelFormatter={(value) =>
                new Date(value).toLocaleString("pl-PL").slice(0, -3)
              }
              formatter={(value, name) => {
                if (name === "brak_danych") {
                  return ["Brak danych", "Rozmiar"];
                }
                return [
                  `${Number(value).toFixed(2).replace(/\.00$/, "")} MB`,
                  "Rozmiar",
                ];
              }}
            />
            <Line
              dataKey="zuzycie_dysku_mb"
              stroke="#16a34a"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5 }}
            />
            <Line
              dataKey="brak_danych"
              stroke="transparent"
              dot={{ r: 2, fill: "red" }}
              activeDot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="zuzycie_dysku_prognoza"
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 5 }}
            />
            {historia[0].typ === "serwer" && (
              <ReferenceLine
                y={limitDysku * 0.9}
                stroke="orange"
                strokeDasharray="5 5"
                label="90%"
              />
            )}

            {historia[0].typ === "serwer" && (
              <ReferenceLine
                y={limitDysku}
                stroke="red"
                strokeDasharray="5 5"
                label="Limit"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="container-history">
        <h3>Średni wzrost w ciągu ostatnich 30 dni:</h3>
        <br />
        <p className="history-details-subtitle">
          {averageGrowth30Days != null
            ? Number(averageGrowth30Days).toFixed(2)
            : "0"}{" "}
          MB / dzień
        </p>
        <br />

        {predictedFullDate && (
          <>
            <h3>Przewidywana data osiągnięcia limitu:</h3>
            <br />
            <p className="history-details-subtitle">
              {new Date(predictedFullDate).toLocaleDateString("pl-PL")} r.
            </p>
          </>
        )}
      </div>

      {/* CPU */}
      <h3 className="history-table-title">CPU (%)</h3>
      <div className="history-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={filteredHistoria}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="data_i_czas"
              tick={<CustomTick />}
              height={65}
              interval="preserveStartEnd"
              padding={{ left: 25, right: 25 }}
            />
            <YAxis domain={[0, (max) => Math.ceil(max * 1.05)]} tickCount={4} />
            <Tooltip
              labelFormatter={(value) =>
                new Date(value).toLocaleString("pl-PL").slice(0, -3)
              }
              formatter={(value) => [
                `${Number(value).toFixed(2).replace(/\.00$/, "")} %`,
                "CPU",
              ]}
            />
            <Line
              type="monotone"
              dataKey="zuzycie_cpu_procent"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* RAM */}
      <h3 className="history-table-title">RAM (MB)</h3>
      <div className="history-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={filteredHistoria}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="data_i_czas"
              tick={<CustomTick />}
              height={65}
              interval="preserveStartEnd"
              padding={{ left: 25, right: 25 }}
            />
            <YAxis
              domain={[0, (max) => Math.ceil(max * 1.05)]}
              tickCount={4}
              unit=" MB"
            />
            <Tooltip
              labelFormatter={(value) =>
                new Date(value).toLocaleString("pl-PL").slice(0, -3)
              }
              formatter={(value) => [
                `${Number(value).toFixed(2).replace(/\.00$/, "")} MB`,
                "Rozmiar",
              ]}
            />
            <Line
              type="monotone"
              dataKey="zuzycie_ramu_mb"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* PROCESY */}
      <h3 className="history-table-title">Procesy</h3>
      <div className="history-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={filteredHistoria}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="data_i_czas"
              tick={<CustomTick />}
              height={65}
              interval="preserveStartEnd"
              padding={{ left: 25, right: 25 }}
            />
            <YAxis domain={[0, (max) => Math.ceil(max * 1.05)]} tickCount={4} />
            <Tooltip
              labelFormatter={(value) =>
                new Date(value).toLocaleString("pl-PL").slice(0, -3)
              }
              formatter={(value) => [Number(value).toFixed(0), "Ilość"]}
            />
            <Line
              type="monotone"
              dataKey="zuzycie_procesow"
              stroke="#7c3aed"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* TABELA */}
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
            {filteredHistoria.map((d, i) => (
              <tr key={i}>
                <td>
                  {d.data_i_czas ? d.data_i_czas.slice(0, -3) : "Brak danych"}
                </td>

                {/* CPU */}
                <td className="cpu">
                  {d.zuzycie_cpu_procent === null ||
                  d.zuzycie_cpu_procent === undefined ? (
                    "Brak danych"
                  ) : (
                    <>
                      {Number(d.zuzycie_cpu_procent)
                        .toFixed(2)
                        .replace(/\.00$/, "")}
                      %
                    </>
                  )}
                </td>

                {/* RAM */}
                <td className="ram">
                  {d.zuzycie_ramu_mb === null || d.zuzycie_ramu_mb === undefined
                    ? "Brak danych"
                    : Number(d.zuzycie_ramu_mb).toFixed(2).replace(/\.00$/, "")}
                </td>

                {/* DYSK */}
                <td className="disk">
                  {d.zuzycie_dysku_mb === null ||
                  d.zuzycie_dysku_mb === undefined
                    ? "Brak danych"
                    : Number(d.zuzycie_dysku_mb)
                        .toFixed(2)
                        .replace(/\.00$/, "")}
                </td>

                {/* PROCESY */}
                <td className="processes">
                  {d.zuzycie_procesow === null ||
                  d.zuzycie_procesow === undefined
                    ? "Brak danych"
                    : Number(d.zuzycie_procesow)
                        .toFixed(2)
                        .replace(/\.00$/, "")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
