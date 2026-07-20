import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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
import "../styles/Style.css";

function HistoriaStatusow() {
  const { hosting_id, usluga_id } = useParams();

  const [historia, setHistoria] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (!hosting_id) return;

    fetch(`/api/historia_statusow/${hosting_id}/${usluga_id}`)
      .then((res) => res.json())
      .then((data) => {
        setHistoria(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Błąd pobierania danych:", err);
        setLoading(false);
      });
  }, [hosting_id, usluga_id]);

  if (loading) {
    return (
      <div className="history-details-container">
        Wczytywanie danych...
      </div>
    );
  }

  if (historia.length === 0) {
    return (
      <div className="history-details-container">
        <h2 className="history-details-title">Historia statusów stron</h2>
        <p>Brak danych.</p>
      </div>
    );
  }

  const filteredHistoria = historia.filter((item) => {
    const itemDate = new Date(item.data_i_czas);

    const fromOk = !dateFrom || itemDate >= new Date(dateFrom);
    const toOk = !dateTo || itemDate <= new Date(`${dateTo}T23:59:59`);

    return fromOk && toOk;
  });

  const chartData = [...filteredHistoria]
    .reverse()
    .map((item) => ({
      ...item,
      statusValue:
        item.status === "online" ? 1 : 0,
    }));

  return (
    <div className="history-details-container">
      <h2 className="history-details-title">
        Historia statusów stron
      </h2>

      <p className="history-details-subtitle">
        <strong>{historia[0]?.login}</strong>
      </p>

      <p className="history-details-subtitle">
        Technologie: {historia[0]?.technologie}
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
      
      <h3 className="history-table-title">Ping</h3>

      <div className="history-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
            />

            <XAxis dataKey="data_i_czas"  tick={<CustomTick />} height={65} interval="preserveStartEnd" padding={{ left: 25, right: 25 }}/>
            <YAxis domain={[0,(max) => Number(max * 1.05).toFixed(2)]} tickCount={4} unit=" ms" />
            <Tooltip
              labelFormatter={(value) =>
                new Date(value).toLocaleString("pl-PL")
              }
              formatter={(value) => [`${value} ms`, "Ping"]}
            />

            <Line
              type="monotone"
              dataKey="ping_ms"
              stroke="#4f46e5"
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <h3 className="history-table-title">Status</h3>

      <div className="history-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
            />

            <XAxis dataKey="data_i_czas"  tick={<CustomTick />} height={65} interval="preserveStartEnd" padding={{ left: 25, right: 25 }}/>

            <YAxis
              domain={[0, 1]}
              ticks={[0, 1]}
              tickFormatter={(value) =>
                value === 1 ? "Online" : "Offline"
              }
            />

            <Tooltip
              labelFormatter={(value) =>
                new Date(value).toLocaleString("pl-PL")
              }
              formatter={(value) => [
                 value === 1 ? "Online" : "Offline",
                "Status",
              ]}
            />

            <Line
              type="stepAfter"
              dataKey="statusValue"
              stroke="#22c55e"
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
      <p></p>
    <h4 className="account-nickname">{filteredHistoria[0]?.nazwa || "Brak danych"}</h4>
    <br />
      <div className="history-table-wrapper">
        <table className="history-table">
          <thead>
            <tr>
              <th>Data i czas</th>
              <th>Status</th>
              <th>Ping [ms]</th>
              <th>Błąd</th>
            </tr>
          </thead>

          <tbody>
            {filteredHistoria.map((row, index) => (
              <tr key={index}>
                <td>
                  {new Date(row.data_i_czas).toLocaleString("pl-PL")}
                </td>
                <td
                  className={
                    row.status === "online"
                      ? "success"
                      : "danger"
                  }
                >
                  {row.status}
                </td>

                <td>{row.ping_ms ?? "-"}</td>
                <td>{row.blad ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default HistoriaStatusow;