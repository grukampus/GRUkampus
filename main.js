// 1. Harita altlık katmanları (Base Layers)
const baseLayers = {
  "OSM Standart": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    noWrap: true,
    maxZoom: 22,
    minZoom: 16
  }),
  "Fiziki Harita": L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenTopoMap (CC-BY-SA)',
    noWrap: true,
    maxZoom: 18,
    minZoom: 16
  })
};

// 2. Harita kurulumu (baseLayer ile)
const map = L.map("map", {
  center: [40.915, 38.321],
  zoom: 17,
  minZoom: 16,
  maxZoom: 22,
  maxBounds: [
      [40.9075, 38.3125],
      [40.9225, 38.3305]
  ],
  maxBoundsViscosity: 0.3,
  layers: [baseLayers["OSM Standart"]]
});

// 3. Katman tanımları (fakülte hariç hepsi)
const layersConfig = [
  { name: "Kapı / Giriş",     url: "data/KAPI_GİRİS.json",                   color: "#d84315", type: "point" },
  { name: "Kütüphane",        url: "data/KÜTÜPHANE_FeaturesToJSON.json",     color: "#673ab7" },
  { name: "Laboratuvar",      url: "data/LABORATUVARR_FeaturesToJSON.json",  color: "#e91e63" },
  { name: "Laboratuvar-2",    url: "data/LABORATUVARR_FeaturesToJSON1.json", color: "#f44336" },
  { name: "Lojmanlar",        url: "data/LOJMANLAR_FeaturesToJSON.json",     color: "#009688" },
  { name: "Rektörlük",        url: "data/REKTÖRLÜK_FeaturesToJSON.json",     color: "#3f51b5" },
  { name: "Spor Salonu",      url: "data/SPOR_SALONUU_FeaturesToJSON.json",  color: "#4caf50" },
  { name: "Üniversite Birimleri", url: "data/ÜNİVERSİTE_BİRİMLER_Features.json", color: "#ffc107" },
  { name: "Yemekhane",        url: "data/YEMEKHANEE_FeaturesToJSON.json",    color: "#ff9800" },
  { name: "Yeşil Alan",       url: "data/YESİLALAN_FeaturesToJSON.json",     color: "#8bc34a" },
  { name: "Yol Ağı",          url: "data/YOL_AGI.json",                      color: "#212121", type: "line" },
  { name: "Bankamatik",       url: "data/BANKAMATİK_FeaturesToJSON.json",    color: "#00796b" },
  { name: "Güvenlik",         url: "data/GÜVENLİK_FeaturesToJSON.json",      color: "#000000" }
];

// 4. Katmanları haritaya ekle
let overlayLayers = {};
layersConfig.forEach(layer => {
  fetch(layer.url).then(res => res.json()).then(data => {
    let leafletLayer;
    if (layer.type === "line") {
      leafletLayer = L.geoJSON(data, {
        style: { color: layer.color, weight: 4, dashArray: "8, 8" }
      }).bindPopup(layer.name);
    } else if (layer.type === "point") {
      leafletLayer = L.geoJSON(data, {
        pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
          radius: 7,
          fillColor: layer.color,
          color: "#222",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9
        }),
        onEachFeature: (feature, l) => {
          let info = `<b>${layer.name}</b>`;
          if (feature.properties.KAPI_ADI) info += `<br>${feature.properties.KAPI_ADI}`;
          if (feature.properties.ADI) info += `<br>${feature.properties.ADI}`;
          l.bindPopup(info);
        }
      });
    } else {
      leafletLayer = L.geoJSON(data, {
        style: { color: layer.color, fillOpacity: 0.5, weight: 2 },
        onEachFeature: (feature, l) => {
          let info = `<b>${layer.name}</b>`;
          if (feature.properties.ADI) info += `<br>${feature.properties.ADI}`;
          if (feature.properties.FAKULTE_ADI) info += `<br>${feature.properties.FAKULTE_ADI}`;
          l.bindPopup(info);
        }
      });
    }
    leafletLayer.addTo(map);
    overlayLayers[layer.name] = leafletLayer;
    if (Object.keys(overlayLayers).length === layersConfig.length) {
      L.control.layers(baseLayers, overlayLayers, { collapsed: false }).addTo(map);
    }
  });
});

// 5. FAKÜLTE-BÖLÜM-PERSONEL DROPDOWN VE VURGULAMA
let fakulteGeoJSON, bolumler, personeller;
let highlightLayer;

// FAKÜLTE KATMANI HARİTADA HER ZAMAN ÇİZİLİ KALSIN
fetch("data/FAKULTE.json")
  .then(res => res.json())
  .then(data => {
    fakulteGeoJSON = data;
    drawFakultePolygons();
    initializeFakulteDropdown();
  });

fetch("data/bolumler.json").then(res => res.json()).then(data => bolumler = data);
fetch("data/personel.json").then(res => res.json()).then(data => personeller = data);

// Fakülteleri haritaya ekle (her zaman göster)
function drawFakultePolygons() {
  L.geoJSON(fakulteGeoJSON, {
    style: {
      color: "#003366",
      fillColor: "#66ccff",
      weight: 2,
      fillOpacity: 0.5
    },
    onEachFeature: (feature, layer) => {
      const fakulteAdi = feature.properties.FAKULTE_ADI || feature.properties.ADI || "";
      layer.bindPopup(`<b>${fakulteAdi}</b>`);
      layer.on("click", () => {
        highlightFakulte(feature.properties.FAKULTE_ID);
        document.getElementById("fakulteSec").value = feature.properties.FAKULTE_ID;
        triggerBolumDropdown(feature.properties.FAKULTE_ID);
      });
    }
  }).addTo(map);
}

// Fakülte dropdownunu doldur
function initializeFakulteDropdown() {
  const fakulteDropdown = document.getElementById("fakulteSec");
  fakulteDropdown.innerHTML = "<option value=''>Fakülte Seç</option>";
  fakulteGeoJSON.features.forEach(f => {
    fakulteDropdown.add(new Option(f.properties.FAKULTE_ADI, f.properties.FAKULTE_ID));
  });
  fakulteDropdown.disabled = false;

  // Event temizleme - klon yöntemiyle!
  const newFakulteDropdown = fakulteDropdown.cloneNode(true);
  fakulteDropdown.parentNode.replaceChild(newFakulteDropdown, fakulteDropdown);

  newFakulteDropdown.addEventListener("change", e => {
    triggerBolumDropdown(e.target.value);
    highlightFakulte(e.target.value);
  });
}

// Bölüm dropdownunu doldur (EVENT KARIŞMASIN!)
function triggerBolumDropdown(fakulteID) {
  const bolumDropdown = document.getElementById("bolumSec");
  bolumDropdown.innerHTML = "<option value=''>Bölüm Seç</option>";
  document.getElementById("personelSec").innerHTML = "<option value=''>Personel Seç</option>";
  bolumDropdown.disabled = false;
  document.getElementById("personelSec").disabled = true;

  // Tüm eski eventleri temizle!
  const newBolumDropdown = bolumDropdown.cloneNode(true);
  bolumDropdown.parentNode.replaceChild(newBolumDropdown, bolumDropdown);

  bolumler.filter(b => b.FAKULTE_ID === fakulteID).forEach(b => {
    newBolumDropdown.add(new Option(b.BOLUM_ADI, b.BOLUM_ID));
  });

  newBolumDropdown.addEventListener("change", e => {
    triggerPersonelDropdown(fakulteID, e.target.value);
  });
}

// Personel dropdownunu doldur (EVENT KARIŞMASIN!)
function triggerPersonelDropdown(fakulteID, bolumID) {
  const personelDropdown = document.getElementById("personelSec");
  personelDropdown.innerHTML = "<option value=''>Personel Seç</option>";
  personelDropdown.disabled = false;

  // Tüm eski eventleri temizle!
  const newPersonelDropdown = personelDropdown.cloneNode(true);
  personelDropdown.parentNode.replaceChild(newPersonelDropdown, personelDropdown);

  personeller.filter(p => p.FAKULTE_ID === fakulteID && p.BOLUM_ID === bolumID).forEach(p => {
    let ad = (p.UNVAN ? p.UNVAN + ' ' : '') + p.AD_SOYAD;
    newPersonelDropdown.add(new Option(ad, p.PERSONEL_ID));
  });

  newPersonelDropdown.addEventListener("change", e => {
    const secilenID = e.target.value;
    const personel = personeller.find(p => p.PERSONEL_ID === secilenID);
    if (personel) {
      highlightFakulte(fakulteID, true, personel);
    }
  });
}

// Seçili fakülteyi vurgula ve odağı oraya al
function highlightFakulte(fakulteID, zoom = true, personel = null) {
  if (highlightLayer) {
    map.removeLayer(highlightLayer);
  }
  const fakulte = fakulteGeoJSON.features.find(f => f.properties.FAKULTE_ID === fakulteID);
  if (fakulte) {
    highlightLayer = L.geoJSON(fakulte, {
      style: { color: "#ff5722", fillColor: "#ffd180", weight: 5, fillOpacity: 0.7 }
    }).addTo(map);
    if (zoom) map.fitBounds(highlightLayer.getBounds(), {padding: [100, 100]});
    if (personel) {
      const bounds = highlightLayer.getBounds();
      L.popup()
        .setLatLng(bounds.getCenter())
        .setContent(`<b>${personel.AD_SOYAD}</b><br>${personel.UNVAN}`)
        .openOn(map);
    }
  }
}

// Sol altta harita değiştirme butonu
let currentBase = "OSM Standart";
const btn = document.getElementById("haritaDegistirBtn");
btn.addEventListener("click", function() {
  if (currentBase === "OSM Standart") {
    map.removeLayer(baseLayers["OSM Standart"]);
    map.addLayer(baseLayers["Fiziki Harita"]);
    currentBase = "Fiziki Harita";
    btn.textContent = "Harita: Fiziki";
  } else {
    map.removeLayer(baseLayers["Fiziki Harita"]);
    map.addLayer(baseLayers["OSM Standart"]);
    currentBase = "OSM Standart";
    btn.textContent = "Harita: OSM";
  }
});
