import React, { useState, useEffect } from "react";
import "../styles/Style.css";
import {CustomTick} from "../components/CustomTick";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useNavigate } from "react-router-dom";

function HistoriaListaKont() {
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [filteredHostingID, setFilteredHostingID] = useState("");
  const [filteredTyp, setFilteredTyp] = useState("");
  const [filteredNazwa, setFilteredNazwa] = useState("");

  const groupData = (data) => {
    const grouped = {};

    data.forEach((item) => {
      const hostingId = item.hosting_id;
      const serviceId = item.usluga_id;

      if (!grouped[hostingId]) {
        grouped[hostingId] = {
          hosting_id: hostingId,
          login: item.login,
          uslugi: {},
        };
      }

      if (!grouped[hostingId].uslugi[serviceId]) {
        grouped[hostingId].uslugi[serviceId] = {
          usluga_id: serviceId,
          nazwa: item.nazwa,
          typ: item.typ,
          aktualny_rozmiar_mb: item.aktualny_rozmiar_mb,
          historia: [],
        };
      }

      grouped[hostingId].uslugi[serviceId].historia.push({
        data: item.data_i_czas,
        rozmiar: Number(item.rozmiar_mb),
      });
    });

    return Object.values(grouped).map((hosting) => ({
      ...hosting,
      uslugi: Object.values(hosting.uslugi),
    }));
  };

  useEffect(() => {
    fetch("/api/historia_uslug")
      .then((res) => res.json())
      .then((data) => setAccounts(groupData(data)))
      .catch((err) => console.error("Database error:", err));
  }, []);

  const toggleAccount = (id) => {
    setExpanded((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const all = {};

    accounts.forEach((acc) => {
      all[acc.hosting_id] = true;
    });

    setExpanded(all);
  };

  const collapseAll = () => {
    setExpanded({});
  };

  const uniqueTypes = [
    ...new Set(
      accounts
        .flatMap((account) => account.uslugi)
        .map((service) => service.typ)
        .filter(Boolean),
    ),
  ];

  const filteredAccounts = accounts
    .map((account) => ({
      ...account,
      uslugi: account.uslugi.filter(
        (service) =>
          (!filteredTyp || service.typ === filteredTyp) &&
          (!filteredNazwa ||
            service.nazwa.toLowerCase().includes(filteredNazwa.toLowerCase())),
      ),
    }))
    .filter(
      (account) =>
        (!filteredHostingID ||
          Number(account.hosting_id) === Number(filteredHostingID)) &&
        account.uslugi.length > 0,
    );

  return (
    <div className="container">
      <h2>Historia</h2>
      <br />
      <div className="history-actions">
        <button onClick={expandAll}>Rozwiń wszystkie</button>
        <button onClick={collapseAll}>Zwiń wszystkie</button>
      </div>

      <div className="filter-section">
        <select
          value={filteredHostingID}
          onChange={(e) => setFilteredHostingID(e.target.value)}
        >
          <option value="">Wszystkie hostingi</option>

          {accounts.map((hosting) => (
            <option key={hosting.hosting_id} value={hosting.hosting_id}>
              {hosting.login}
            </option>
          ))}
        </select>

        <select
          value={filteredTyp}
          onChange={(e) => setFilteredTyp(e.target.value)}
        >
          <option value="">Wszystkie typy</option>

          {uniqueTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Filtruj nazwę..."
          value={filteredNazwa}
          onChange={(e) => setFilteredNazwa(e.target.value)}
        />
      </div>

      {filteredAccounts.map((account) => (
        <div key={account.hosting_id} className="account-block">
          <div
            className="account-header"
            onClick={() => toggleAccount(account.hosting_id)}
          >
            <h3>
              {expanded[account.hosting_id] ? "▼" : "▶"} {account.login}
            </h3>
          </div>

          {expanded[account.hosting_id] && (
            <div className="account-body">
              {account.uslugi.map((service) => (
                <div key={service.usluga_id} className="service-card">
                  <div className="service-header">
                    <div>
                      <strong>{service.nazwa}</strong>
                      <div>{service.typ}</div>
                    </div>

                    <div>
                      <strong>
                        {Number(service.aktualny_rozmiar_mb).toFixed(2).slice(-2) === "00" ? Number(service.aktualny_rozmiar_mb).toFixed(0) : Number(service.aktualny_rozmiar_mb).toFixed(2)} MB
                      </strong>
                    </div>
                  </div>

                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[...service.historia].reverse()}>
                        <CartesianGrid strokeDasharray="3 3" />

                        <XAxis dataKey="data"  tick={<CustomTick />} height={65} interval="preserveStartEnd" padding={{ left: 25, right: 25 }}/>

                        <YAxis domain={[0,(max) => Number(max * 1.05).toFixed(2)]} tickCount={4} />

                        <Tooltip
                          labelFormatter={(value) =>
                            new Date(value).toLocaleString("pl-PL")
                          }
                        />

                        <Line
                          type="monotone"
                          dataKey="rozmiar"
                          stroke="#4f46e5"
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="service-actions">
                    <button
                      onClick={() => navigate(`/historia/${service.usluga_id}`)}
                    >
                      Zobacz szczegóły
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default HistoriaListaKont;
