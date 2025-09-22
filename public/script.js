const map = L.map("map").setView([22.3193, 114.1694], 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap",
}).addTo(map);

const routeSelect = document.getElementById("routeSelect");
const showRouteBtn = document.getElementById("showRoute");
let busMarkers = [];

const busIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/61/61231.png",
  iconSize: [32, 32],
});

// 🔹 1. 載入所有九巴路線
async function loadRoutes() {
  let res = await fetch("https://data.etabus.gov.hk/v1/transport/kmb/route/");
  let data = await res.json();

  data.data.forEach(route => {
    let opt = document.createElement("option");
    opt.value = route.route;
    opt.textContent = "KMB " + route.route;
    routeSelect.appendChild(opt);
  });
}
loadRoutes();

// 🔹 2. 顯示路線 + 車站
showRouteBtn.addEventListener("click", async () => {
  clearMarkers();
  const routeNo = routeSelect.value;
  if (!routeNo) return;

  // 拿取路線車站
  let stopsRes = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/route-stop/${routeNo}/inbound/1`);
  let stopsData = await stopsRes.json();

  let stopCoords = [];
  for (let stop of stopsData.data) {
    let stopInfoRes = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/stop/${stop.stop}`);
    let stopInfo = await stopInfoRes.json();
    let lat = stopInfo.data.lat;
    let long = stopInfo.data.long;
    stopCoords.push([lat, long]);

    L.marker([lat, long]).addTo(map).bindPopup(`巴士站: ${stopInfo.data.name_tc}`);
  }

  L.polyline(stopCoords, { color: "blue" }).addTo(map);
  map.fitBounds(stopCoords);

  // 🔹 每 5 秒更新實時巴士（用 ETA）
  setInterval(async () => {
    clearMarkers();
    for (let stop of stopsData.data.slice(0, 3)) {
      let etaRes = await fetch(`https://data.etabus.gov.hk/v1/transport/kmb/eta/${stop.stop}/${routeNo}/1`);
      let etaData = await etaRes.json();

      etaData.data.forEach(bus => {
        if (bus.eta) {
          // 計算巴士模擬位置（隨機放在站和站之間）
          let idx = Math.floor(Math.random() * (stopCoords.length - 1));
          let [lat1, lon1] = stopCoords[idx];
          let [lat2, lon2] = stopCoords[idx + 1];
          let progress = Math.random(); // demo: 隨機進度
          let lat = lat1 + (lat2 - lat1) * progress;
          let lon = lon1 + (lon2 - lon1) * progress;

          let marker = L.marker([lat, lon], { icon: busIcon })
            .addTo(map)
            .bindPopup(`路線 ${bus.route}<br>車牌: ${bus.license_plate || "未知"}<br>到達時間: ${bus.eta}`);
          busMarkers.push(marker);
        }
      });
    }
  }, 5000);
});

function clearMarkers() {
  busMarkers.forEach(m => map.removeLayer(m));
  busMarkers = [];
}
