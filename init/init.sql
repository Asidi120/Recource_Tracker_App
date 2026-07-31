CREATE DATABASE IF NOT EXISTS resource_tracker_app;

USE resource_tracker_app;

CREATE TABLE KONTO_HOSTINGOWE (
    id INT AUTO_INCREMENT PRIMARY KEY, 
    login VARCHAR(255) NOT NULL,
    serwer_nazwa VARCHAR(255) NOT NULL
);

CREATE TABLE if not exists TECHNOLOGIE (
    id INT AUTO_INCREMENT PRIMARY KEY, 
    nazwa VARCHAR(50) NOT NULL
);

CREATE TABLE if not exists USLUGI (
    id INT AUTO_INCREMENT PRIMARY KEY, 
    hosting_id INT NOT NULL, 
    -- technologie_id INT DEFAULT NULL, 
    typ_bazy_danych ENUM('MySQL', 'PostgreSQL', 'MongoDB') DEFAULT NULL,
    nazwa VARCHAR(255) NOT NULL, 
    typ ENUM('www', 'mail', 'serwer','baza_danych') NOT NULL, 
    FOREIGN KEY (hosting_id) REFERENCES KONTO_HOSTINGOWE(id)
    -- FOREIGN KEY (technologie_id) REFERENCES TECHNOLOGIE(id)
);

CREATE TABLE ZUZYCIE_ZASOBOW (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hosting_id INT NOT NULL,
    data_i_czas DATETIME NOT NULL,
    zuzycie_cpu_procent DECIMAL(5,2),
    zuzycie_ramu_mb DECIMAL(10,2),
    limit_ramu_mb DECIMAL(10,2),
    zuzycie_ramu_procent DECIMAL(5,2),
    zuzycie_dysku_mb DECIMAL(10,2),
    limit_dysku_mb DECIMAL(10,2),
    zuzycie_dysku_procent DECIMAL(5,2),
    zuzycie_procesow INT,
    limit_procesow INT,
    UNIQUE KEY (hosting_id, data_i_czas),
    FOREIGN KEY (hosting_id) REFERENCES KONTO_HOSTINGOWE(id)
);

CREATE TABLE if not exists ROZMIAR_USLUGI (
    id INT AUTO_INCREMENT PRIMARY KEY, 
    usluga_id INT NOT NULL, 
    rozmiar_mb DECIMAL(10,2) NOT NULL, 
    data_i_czas DATETIME NOT NULL, 
    UNIQUE KEY (usluga_id, data_i_czas),
    FOREIGN KEY (usluga_id) REFERENCES USLUGI(id)
);

CREATE TABLE if not exists HISTORIA_STATUSU (
    id INT AUTO_INCREMENT PRIMARY KEY, 
    usluga_id INT NOT NULL, 
    data_i_czas DATETIME NOT NULL, 
    status ENUM('online', 'offline') NOT NULL, 
    ping_ms INT, 
    blad VARCHAR(255) DEFAULT NULL,
    UNIQUE KEY (usluga_id, data_i_czas),
    FOREIGN KEY (usluga_id) REFERENCES USLUGI(id)
);

CREATE TABLE ALARMY (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hosting_id INT NOT NULL,
    typ VARCHAR(30) NOT NULL,
    aktywny TINYINT(1) DEFAULT 1,
    data_utworzenia DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_zamkniecia DATETIME NULL
    FOREIGN KEY (hosting_id) REFERENCES KONTO_HOSTINGOWE(id)
);

INSERT INTO TECHNOLOGIE (nazwa) VALUES 
('PHP'),
('Node.js'),
('React'),
('Vue.js'),
('Laravel'),
('WordPress'),
('Nginx'),
('Apache'),
('Django'),
('Flask'),
('Express.js'),
('Bootstrap');

CREATE TABLE IF NOT EXISTS USLUGI_TECHNOLOGIE (
    usluga_id INT NOT NULL,
    technologia_id INT NOT NULL,

    PRIMARY KEY (usluga_id, technologia_id),

    FOREIGN KEY (usluga_id)
        REFERENCES USLUGI(id)
        ON DELETE CASCADE,

    FOREIGN KEY (technologia_id)
        REFERENCES TECHNOLOGIE(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ROZMIAR_BAZA_DANYCH (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rozmiar_mb DECIMAL(10,2) NOT NULL,
    data_i_czas DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- DODATKOWE INDEKSY

-- Szybsze wyszukiwanie usług danego hostingu
CREATE INDEX idx_uslugi_hosting
ON USLUGI(hosting_id);

-- Szybsze pobieranie usług WWW
CREATE INDEX idx_uslugi_typ
ON USLUGI(typ);

-- Szybsze pobieranie alarmów hostingu
CREATE INDEX idx_alarmy_hosting
ON ALARMY(hosting_id);

-- Szybsze pobieranie aktywnych alarmów
CREATE INDEX idx_alarmy_aktywny
ON ALARMY(aktywny);

-- Szybsze pobieranie technologii usługi
CREATE INDEX idx_ut_technologia
ON USLUGI_TECHNOLOGIE(technologia_id);

-- Szybsze pobieranie ostatniego rozmiaru bazy
CREATE INDEX idx_db_data
ON ROZMIAR_BAZA_DANYCH(data_i_czas DESC);

CREATE INDEX idx_zasoby_data
ON ZUZYCIE_ZASOBOW(hosting_id, data_i_czas);

CREATE INDEX idx_rozmiar_uslugi_data
ON ROZMIAR_USLUGI(usluga_id, data_i_czas);

CREATE INDEX idx_status_data
ON HISTORIA_STATUSU(usluga_id, data_i_czas);

CREATE INDEX idx_alarmy_data
ON ALARMY(data_zamkniecia);

CREATE INDEX idx_db_data
ON ROZMIAR_BAZA_DANYCH(data_i_czas DESC);