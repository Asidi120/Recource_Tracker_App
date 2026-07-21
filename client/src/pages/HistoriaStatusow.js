import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CustomTick } from "../components/CustomTick";
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

    fetch(`${process.env.REACT_APP_API_URL}/api/historia_statusow/${hosting_id}/${usluga_id}`)
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
      <div className="history-details-container">Wczytywanie danych...</div>
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

  let lastPing = null;

  const chartData = [...filteredHistoria].reverse().map((item) => {
    if (item.ping_ms != null) {
      lastPing = Number(item.ping_ms);
    }

    return {
      ...item,

      statusOnline: item.status === "online" ? 1 : null,
      statusOffline: item.status === "offline" ? 0 : null,
      statusBrakDanych:
        item.status !== "online" && item.status !== "offline" ? 0.5 : null,

      brak_ping: item.ping_ms == null ? lastPing : null,
    };
  });
  return (
    <div className="history-details-container">
      <h2 className="history-details-title">Historia statusów stron</h2>

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
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

            <XAxis
              dataKey="data_i_czas"
              tick={<CustomTick />}
              height={65}
              interval="preserveStartEnd"
              padding={{ left: 25, right: 25 }}
            />
            <YAxis
              domain={[0, (max) => Number(max * 1.05).toFixed(2)]}
              tickCount={4}
              unit=" ms"
            />
            <Tooltip
              labelFormatter={(value) =>
                new Date(value).toLocaleString("pl-PL").slice(0, -3)
              }
              formatter={(value, name) => {
                if (name === "brak_ping") {
                  return ["Brak danych", "Ping"];
                }
                return [`${value} ms`, "Ping"];
              }}
            />

            <Line
              type="monotone"
              dataKey="ping_ms"
              stroke="#4f46e5"
              strokeWidth={2}
              activeDot={{ r: 4 }}
              dot={false}
            />
            <Line
              dataKey="brak_ping"
              stroke="transparent"
              dot={{ r: 2, fill: "red" }}
              activeDot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <h3 className="history-table-title">Status</h3>

      <div className="history-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

            <XAxis
              dataKey="data_i_czas"
              tick={<CustomTick />}
              height={65}
              interval="preserveStartEnd"
              padding={{ left: 25, right: 25 }}
            />

            <YAxis
              domain={[0, 1]}
              ticks={[0, 0.5, 1]}
              tickFormatter={(value) => {
                if (value === 1) return "Online";
                if (value === 0) return "Offline";
                return "Brak danych";
              }}
            />

            <Tooltip
              labelFormatter={(value) =>
                new Date(value).toLocaleString("pl-PL")
              }
              formatter={(value, name) => {
                if (name === "statusOnline") {
                  return ["Online", "Status"];
                }

                if (name === "statusOffline") {
                  return ["Offline", "Status"];
                }

                if (name === "statusBrakDanych") {
                  return ["Brak danych", "Status"];
                }

                return [value, name];
              }}
            />

            <Line
              type="stepAfter"
              dataKey="statusOnline"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ r: 2, fill: "#22c55e" }}
              activeDot={{ r: 4 }}
              connectNulls={false}
            />

            <Line
              type="stepAfter"
              dataKey="statusOffline"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 2, fill: "#ef4444" }}
              activeDot={{ r: 4 }}
              connectNulls={false}
            />

            <Line
              type="stepAfter"
              dataKey="statusBrakDanych"
              stroke="#9ca3af"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 2, fill: "#9ca3af" }}
              activeDot={{ r: 4 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <h3 className="history-table-title">Historia zmian</h3>
      <p></p>
      <h4 className="account-nickname">
        {filteredHistoria[0]?.nazwa || "Brak danych"}
      </h4>
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
                  {new Date(row.data_i_czas)
                    .toLocaleString("pl-PL")
                    .slice(0, -3)}
                </td>
                <td
                  className={
                    row.status === "online"
                      ? "success"
                      : row.status === "offline"
                        ? "danger"
                        : "no-data"
                  }
                >
                  {row.status === "online"
                    ? "Online"
                    : row.status === "offline"
                      ? "Offline"
                      : "Brak danych"}
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
