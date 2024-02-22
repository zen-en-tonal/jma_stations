const index =
  "https://www.data.jma.go.jp/obd/stats/etrn/select/prefecture00.php";

const precRegexp = new RegExp(
  /<area shape="rect" alt="(?<precName>.+)" coords=".+" href="prefecture\.php\?prec_no=(?<precNo>[0-9]+)&block_no=&year=&month=&day=&view=">/gm,
);

const stationUrl = (precNo: string) =>
  `https://www.data.jma.go.jp/obd/stats/etrn/select/prefecture.php?prec_no=${precNo}&block_no=&year=&month=&day=&view=`;

const dataRegexp = new RegExp(
  /"javascript:viewPoint\((?<data>.+)\);" onmouseout="javascript:initPoint\(\);"/g,
);

const parseStation = (precName: string, precNo: string) => (data: string) => {
  const [
    _a,
    blockNo,
    stationName,
    stationNameKana,
    lonDeg,
    lonMin,
    latDeg,
    latMin,
    amplitude,
  ] = data.replaceAll("'", "").split(",");
  return {
    precNo,
    blockNo,
    precName,
    stationName,
    stationNameKana,
    lon: toDecDeg(parseFloat(lonDeg))(parseFloat(lonMin))(0),
    lat: toDecDeg(parseFloat(latDeg))(parseFloat(latMin))(0),
    amplitude: parseFloat(amplitude),
  };
};

const toDecDeg = (deg: number) => (min: number) => (sec: number) =>
  deg + min / 60 + sec / 3600;

if (import.meta.main) {
  // use Map to avoid duplication.
  const stations = new Map();
  const resp = await fetch(index);
  const txt = await resp.text();
  let prefs;
  while (null != (prefs = precRegexp.exec(txt)?.groups)) {
    const dataTxt = await (await fetch(stationUrl(prefs["precNo"]))).text();
    let data;
    while (null != (data = dataRegexp.exec(dataTxt)?.groups?.["data"])) {
      const station = parseStation(prefs["precName"], prefs["precNo"])(data);
      stations.set(station.blockNo, station);
    }
  }
  const result = {
    timestamp: new Date(Date.now()).toISOString(),
    stations: Array.from(stations.values()),
  };
  const encode = new TextEncoder();
  await Deno.writeFile("stations.json", encode.encode(JSON.stringify(result)));
}
