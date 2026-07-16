import React, { useState, useEffect } from "react";
import "../styles/Style.css";
import KonwersjaRozmiaru from "../components/KonwersjaRozmiaru";
import { useNavigate } from "react-router-dom";

function StronaGlowna() {
  const navigate = useNavigate();
  const [hostingAccounts, setHostingAccounts] = useState([]);
  const [filteredHostingID, setFilteredHostingID] = useState("");
  const [isLooping, setIsLooping] = useState(false); 
  const [averageGrowth30Days, setAverageGrowth30Days] = useState(null);
  const [predictedFullDate, setPredictedFullDate] = useState(null);

  const loadData = () => {
    setIsLooping(true);
    fetch("/api/zasoby")
      .then((res) => {
        if (!res.ok) throw new Error("Błąd sieci serwera");
        return res.json();
      })
      .then((data) => {
        setHostingAccounts(data);

        setIsLooping(false);
      })
      .catch((err) => {
        console.error("Błąd API:", err);
        setIsLooping(false);
      });
  };

  useEffect(() => {
    loadData(); 
    const interval = setInterval(loadData, 180000); 
    return () => clearInterval(interval); 
  }, []);

  const lastUpdate = hostingAccounts[0];

  const refreshData = async () => {
  setIsLooping(true);

  try {
    await fetch("/api/odswiez", {
      method: "POST"
    });

    loadData();
  } catch (err) {
    console.error(err);
    setIsLooping(false);
  }
};

  return (
    <div className="container">
      <div className="row">
        <h2>Ostatnia aktualizacja</h2>

        <p>
          Data:{" "}
          {lastUpdate?.data_i_czas
            ? lastUpdate.data_i_czas.split(" ")[0]
            : "N/D"}
        </p>

        <p>
          Godzina:{" "}
          {lastUpdate?.data_i_czas
            ? lastUpdate.data_i_czas.split(" ")[1].slice(0, 5)
            : "N/D"}
        </p>

        <button onClick={refreshData} disabled={isLooping}>
          {isLooping ? "Odświeżanie..." : "Odśwież"}
        </button>
      </div>

      <div className="filter">
        <select
          value={filteredHostingID}
          onChange={(e) => {
            console.log("Wybrany hosting:", e.target.value);
            setFilteredHostingID(e.target.value);
          }}
        >
          <option value="">Wybierz hosting</option>
          {hostingAccounts.map((account) => (
            <option key={account.hosting_id} value={account.hosting_id}>
              {account.login}
            </option>
          ))}
        </select>
      </div>

      {hostingAccounts
        .filter(
          (account) =>
            !filteredHostingID || Number(account.hosting_id) === Number(filteredHostingID),
        )
        .map((account) => (
          <div key={account.hosting_id} className="account-section">
            <div className="row1">
            <h3>{account.login}</h3>
            <button onClick={() => navigate(`/historia_zasobow/${account.hosting_id}`)}
            >Zobacz historię</button>
            </div>
            <table className="history-table">
              <thead>
                <tr>
                  <th>Zasób</th>
                  <th>Wykorzystanie</th>
                  <th>Limit</th>
                  <th>%</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>CPU</td>
                  <td>{Number(account.zuzycie_cpu_procent).toFixed(2).slice(-2) === "00" ? Number(account.zuzycie_cpu_procent).toFixed(0) : Number(account.zuzycie_cpu_procent).toFixed(2)}%</td>
                  <td>100%</td>
                  <td
                    className={
                      account.zuzycie_cpu_procent >= 90
                        ? "danger"
                        : account.zuzycie_cpu_procent >= 70
                          ? "warning"
                          : "success"
                    }
                  >
                    {Number(account.zuzycie_cpu_procent).toFixed(2).slice(-2) === "00" ? Number(account.zuzycie_cpu_procent).toFixed(0) : Number(account.zuzycie_cpu_procent).toFixed(2)}%
                  </td>
                </tr>

                <tr>
                  <td>RAM</td>
                  <KonwersjaRozmiaru rozmiar={account.zuzycie_ramu_mb}/>
                  <KonwersjaRozmiaru rozmiar={account.limit_ramu_mb}/>
                  <td
                    className={
                      account.zuzycie_ramu_procent >= 90
                        ? "danger"
                        : account.zuzycie_ramu_procent >= 70
                          ? "warning"
                          : "success"
                    }
                  >
                    {Number(account.zuzycie_ramu_procent).toFixed(2).slice(-2) === "00" ? Number(account.zuzycie_ramu_procent).toFixed(0) : Number(account.zuzycie_ramu_procent).toFixed(2)}%
                  </td>
                </tr>

                <tr>
                  <td>Dysk</td>
                  <KonwersjaRozmiaru rozmiar={account.zuzycie_dysku_mb}/>
                  <KonwersjaRozmiaru rozmiar={account.limit_dysku_mb}/>
                  <td
                    className={
                      account.zuzycie_dysku_procent >= 90
                        ? "danger"
                        : account.zuzycie_dysku_procent >= 70
                          ? "warning"
                          : "success"
                    }
                  >
                    {Number(account.zuzycie_dysku_procent).toFixed(2).slice(-2) === "00" ? Number(account.zuzycie_dysku_procent).toFixed(0) : Number(account.zuzycie_dysku_procent).toFixed(2)}%
                  </td>
                </tr>

                <tr>
                  <td>Procesy</td>
                  <td>{account.zuzycie_procesow}</td>
                  <td>{account.limit_procesow}</td>
                  <td
                    className={
                      account.zuzycie_procesow / account.limit_procesow >= 0.9
                        ? "danger"
                        : account.zuzycie_procesow / account.limit_procesow >= 0.7
                          ? "warning"
                          : "success"
                    }
                  >
                    {(
                      (account.zuzycie_procesow / account.limit_procesow) * 100).toFixed(2).slice(-2) === "00"
                      ? ((account.zuzycie_procesow / account.limit_procesow) * 100).toFixed(0)
                      : ((account.zuzycie_procesow / account.limit_procesow) * 100).toFixed(2)}
                    %
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );
}

export default StronaGlowna;