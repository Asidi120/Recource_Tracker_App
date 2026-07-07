import React, { useState, useEffect, useMemo } from "react";
import "../styles/Style.css";
import { useNavigate } from "react-router-dom";

function StatusStron() {
  const navigate = useNavigate();
  const [statusData, setStatusData] = useState([]);
  const [filteredHostingID, setFilteredHostingID] = useState("");
  const [filteredTyp, setFilteredTyp] = useState("");
  const [filteredStatus, setFilteredStatus] = useState("");
  const [filteredNazwa, setFilteredNazwa] = useState("");

  useEffect(() => {
    const loadData = () => {
      fetch("/api/strony")
        .then((res) => res.json())
        .then((data) => {
          setStatusData(data);
          console.log("Dane statusu stron:", data);
        })
        .catch((err) => console.error("Błąd API:", err));
    };

    loadData();

    const interval = setInterval(loadData, 180000);
    return () => clearInterval(interval);
  }, []);

  const groupedData = useMemo(() => {
    return statusData.reduce((acc, item) => {
      const key = item.hosting_id;

      if (!acc[key]) {
        acc[key] = {
          hosting_id: item.hosting_id,
          login: item.login,
          data_i_czas: item.data_i_czas,
          sites: [],
        };
      }

      acc[key].sites.push(item);

      return acc;
    }, {});
  }, [statusData]);

  const filteredData = Object.values(groupedData)
  .map((hosting) => ({
    ...hosting,
    sites: hosting.sites.filter((site) =>
      (!filteredTyp || site.technologie === filteredTyp) &&
      (!filteredStatus || site.status === filteredStatus) &&
      (!filteredNazwa || site.nazwa.includes(filteredNazwa))
    ),
  }))
  .filter(
    (hosting) =>
      (!filteredHostingID || Number(hosting.hosting_id) === Number(filteredHostingID)) &&
      hosting.sites.length > 0
  );
  const uniqueTypes = [
  ...new Set(
    statusData
      .map(site => site.technologie)
      .filter(Boolean)
  )
];

const uniqueStatuses = [
  ...new Set(statusData.map(site => site.status))
];

  return (
    <div className="status-container">
      <h2>Status Stron</h2>
        <div className="filter-section">
            <select onChange={(e) => {console.log("Wybrany hosting:", e.target.value); setFilteredHostingID(e.target.value);}}>
              <option value="">Wybierz hosting</option>
              {Object.values(groupedData).map((hosting) => (
                <option key={hosting.hosting_id} value={hosting.hosting_id}>
                  {hosting.login}
                </option>
              ))}
            </select>
                        <select onChange={(e) => {console.log("Wybrany typ:", e.target.value); setFilteredTyp(e.target.value);}}>
              <option value="">Wybierz typ</option>
              {uniqueTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
                        <select onChange={(e) => {console.log("Wybrany status:", e.target.value); setFilteredStatus(e.target.value);}}>
              <option value="">Wybierz status</option>
              {uniqueStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
              <input
              type="text"
              placeholder="Filtruj nazwę"
              value={filteredNazwa}
              onChange={(e) => {console.log("Wybrana nazwa:", e.target.value); setFilteredNazwa(e.target.value);}}
            />
      </div>
      {filteredData.map((hosting) => (
        <div key={hosting.hosting_id} className="account-section">
          
          <h3>{hosting.login}</h3>

          <p>
            Ostatnia aktualizacja:{" "}
            {hosting.data_i_czas
              ? hosting.data_i_czas.slice(0, -3)
              : "N/D"}
          </p>
      
          <table className="status-table">
            <thead>
              <tr>
                <th>Domena</th>
                <th>Technologie</th>
                <th>Status</th>
                <th>Ping [ms]</th>
                <th>Błąd</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {hosting.sites.map((site) => (
                <tr key={site.id}>
                  <td>{site.nazwa}</td>
                  <td>{site.technologie || "-"}</td>

                  <td className={site.status === "online" ? "success": "danger"}>
                    {site.status}
                  </td>

                  <td>{site.ping_ms ?? "-"}</td>
                  <td>{site.blad || "-"}</td>
                  <td><button className="button" onClick={() =>navigate(`/historia_statusow/${hosting.hosting_id}/${site.usluga_id}`)}>
            Zobacz historię</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export default StatusStron;