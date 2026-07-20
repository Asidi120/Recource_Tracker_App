import React, { useState, useEffect } from "react";
import "../styles/Style.css";
import KonwersjaRozmiaru from "../components/KonwersjaRozmiaru";
import { useNavigate } from "react-router-dom";

function StronaGlowna() {
  const navigate = useNavigate();

  const [hostingAccounts, setHostingAccounts] = useState([]);
  const [filteredHostingID, setFilteredHostingID] = useState("");
  const [isLooping, setIsLooping] = useState(false);

  const lastUpdate = hostingAccounts[0];


  const loadData = async () => {
    setIsLooping(true);

    try {
      const zasobyResponse = await fetch("/api/zasoby");

      if (!zasobyResponse.ok)
        throw new Error("Błąd sieci serwera");

      const zasoby = await zasobyResponse.json();

      setHostingAccounts(zasoby);


      // pobranie informacji o bazie
      const bazaResponse = await fetch("/api/rozmiar_bazy");

      if (!bazaResponse.ok)
        throw new Error("Błąd pobierania rozmiaru bazy");


      const baza = await bazaResponse.json();


      console.log("===== INFORMACJE O BAZIE =====");
      console.log("Aktualny rozmiar:", baza.rozmiar_mb, "MB");
      console.log("Data pomiaru:", baza.data_i_czas);
      console.log("Średni wzrost:", baza.sredni_wzrost, "MB/dzień");
      console.log("Przewidywana data pełna:", baza.przewidywana_data);
      console.log("==============================");


    } catch(err) {
      console.error("Błąd API:", err);
    } finally {
      setIsLooping(false);
    }
  };


  useEffect(() => {
    loadData(); 
    const interval = setInterval(loadData, 60000); 
    return () => clearInterval(interval); 
  }, []);

  const refreshData = async () => {
  setIsLooping(true);

  try {
    await loadData();

  } catch(err) {
    console.error(err);

  } finally {
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