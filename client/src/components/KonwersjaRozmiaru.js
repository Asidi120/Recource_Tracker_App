function KonwersjaRozmiaru({ rozmiar }) {
  const jednostki = ["MB", "GB", "TB", "PB"];

  let wartosc = rozmiar;
  wartosc=Number(wartosc)
  let index = 0;

  while (wartosc >= 1024 && index < jednostki.length - 1) {
    wartosc /= 1024;
    index++;
  }
  const wynik = wartosc.toFixed(2).replace(/\.?0+$/, "");
  return (
    <td>
      {wynik} {jednostki[index]}
    </td>
  );
}

export default KonwersjaRozmiaru;