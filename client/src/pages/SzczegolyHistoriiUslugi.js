import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {CustomTick} from "../components/CustomTick";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import "../styles/Style.css";

function SzczegolyHistoriiUslugi() {
  const { id } = useParams();

  const [historia, setHistoria] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (!id) return;

    fetch(`/api/historia_uslug/${id}`)
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

  if (historia.length === 0) {
    return (
      <div className="history-details-container">
        <h2 className="history-details-title">
          Szczegóły historii usługi
        </h2>
        <p>Brak danych w bazie dla usługi o ID: {id}</p>
      </div>
    );
  }

  const filteredHistoria = historia.filter((item) => {
    const itemDate = new Date(item.data_i_czas);

    const fromOk = !dateFrom || itemDate >= new Date(dateFrom);
    const toOk = !dateTo || itemDate <= new Date(`${dateTo}T23:59:59`);

    return fromOk && toOk;
  });

  const daneWykresu = [...filteredHistoria].reverse();

  return (
    <div className="history-details-container">
      <h2 className="history-details-title">
        Szczegóły historii usługi
      </h2>

      <p className="history-details-subtitle">
        Nazwa usługi: <strong>{historia[0]?.nazwa}</strong>
        {" ("}
        {historia[0]?.typ}
        {")"}
      </p>

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

      <div className="history-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={daneWykresu}
            margin={{
              top: 10,
              right: 30,
              left: 10,
              bottom: 0,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
            />

            <XAxis dataKey="data_i_czas"  tick={<CustomTick />} height={65} interval="preserveStartEnd" padding={{ left: 25, right: 25 }}/>
            <YAxis domain={[0,(max) => Number(max * 1.05).toFixed(2)]} tickCount={4} unit=" MB" />

            <Tooltip
              labelFormatter={(value) =>
                new Date(value).toLocaleString("pl-PL")
              }
              formatter={(value) => [`${Number(value).toFixed(2).slice(-2) === "00" ? Number(value).toFixed(0) : Number(value).toFixed(2)} MB`, "Rozmiar"]}
            />

            <Line
              type="monotone"
              dataKey="rozmiar_mb"
              stroke="#4f46e5"
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <h3 className="history-table-title">
        Historia zmian
      </h3>

      <div className="history-table-wrapper">
        <table className="history-table">
          <thead>
            <tr className="history-table-head-row">
              <th className="history-table-head">Data i czas</th>
              <th className="history-table-head">Rozmiar</th>
            </tr>
          </thead>

          <tbody>
            {filteredHistoria.map((row, index) => (
              <tr key={index} className="history-table-row">
                <td className="history-table-date">
                  {new Date(row.data_i_czas).toLocaleString("pl-PL").slice(0, -3)}
                </td>

                <td className="history-table-size">
                  {Number(row.rozmiar_mb).toFixed(2).slice(-2) === "00" ? Number(row.rozmiar_mb).toFixed(0) : Number(row.rozmiar_mb).toFixed(2)} MB
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SzczegolyHistoriiUslugi;