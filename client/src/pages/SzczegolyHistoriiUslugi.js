import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CustomTick } from "../components/CustomTick";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import "../styles/Style.css";

function SzczegolyHistoriiUslugi() {
  const { id } = useParams();

  const [historia, setHistoria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prediction, setPrediction] = useState([]);
  const [averageGrowth30Days, setAverageGrowth30Days] = useState(null);
  const [predictedFullDate, setPredictedFullDate] = useState(null);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (!id) return;

    fetch(`${process.env.REACT_APP_API_URL}/api/historia_uslug/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setHistoria(data.historia);
        setPrediction(data.predykcja);
        setAverageGrowth30Days(data.srednie_wzrost);
        setPredictedFullDate(data.przewidziana_data_pelna);
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
        <h2 className="history-details-title">Szczegóły historii usługi</h2>
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
  const filteredPrediction = prediction.filter((item) => {
    const itemDate = new Date(item.data_i_czas);

    const fromOk = !dateFrom || itemDate >= new Date(dateFrom);
    const toOk = !dateTo || itemDate <= new Date(`${dateTo}T23:59:59`);

    return fromOk && toOk;
  });

  let lastSize = null;

  const daneWykresu = [
    ...filteredHistoria.reverse(),
    ...filteredPrediction,
  ].map((item) => {
    if (item.rozmiar_mb !== null) {
      lastSize = item.rozmiar_mb;
    }

    const isMissing = item.rozmiar_mb === null && item.rozmiar_prognoza == null;

    return {
      ...item,
      brak_danych: isMissing ? lastSize : null,
    };
  });
  const limitDysku = historia[0]?.limit_dysku_mb;
  return (
    <div className="history-details-container">
      <h2 className="history-details-title">Szczegóły historii usługi</h2>

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
                  `${
                    Number(value).toFixed(2).slice(-2) === "00"
                      ? Number(value).toFixed(0)
                      : Number(value).toFixed(2)
                  } MB`,
                  "Rozmiar",
                ];
              }}
            />

            <Line
              type="monotone"
              dataKey="rozmiar_mb"
              stroke="#4f46e5"
              strokeWidth={2}
              connectNulls={true}
              dot={false}
              activeDot={{ r: 5 }}
            />
            <Line
              dataKey="brak_danych"
              stroke="red"
              dot={{ r: 3, fill: "red" }}
              activeDot={{ r: 5 }}
              strokeOpacity={0}
            />

            <Line
              type="monotone"
              dataKey="rozmiar_prognoza"
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

      <h3>Średni wzrost w ciągu ostatnich 30 dni:</h3>
      <p className="history-details-subtitle">
        {averageGrowth30Days != null ? averageGrowth30Days.toFixed(2) : "0"} MB
        / dzień
        <br />
      </p>
      <h3>
        {predictedFullDate ? `Przewidywana data osiągnięcia limitu:` : null}
      </h3>
      <p className="history-details-subtitle">
        {predictedFullDate
          ? `${new Date(predictedFullDate).toLocaleDateString("pl-PL")}`
          : null}
        <br />
      </p>
      <h3 className="history-table-title">Historia zmian</h3>

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
                  {new Date(row.data_i_czas)
                    .toLocaleString("pl-PL")
                    .slice(0, -3)}
                </td>

                {row.rozmiar_mb === null ? (
                  <td className="history-table-size" style={{ color: "red" }}>
                    Brak danych
                  </td>
                ) : (
                  <td className="history-table-size">
                    {Number(row.rozmiar_mb).toFixed(2).slice(-2) === "00"
                      ? Number(row.rozmiar_mb).toFixed(0)
                      : Number(row.rozmiar_mb).toFixed(2)}{" "}
                    MB
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SzczegolyHistoriiUslugi;
