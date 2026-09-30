/**
 * India-Wide Region & Union Territory Definitions for AeroAqua
 * Official names, regional centroids (latitude, longitude), and live monitoring status.
 */

export const INDIA_REGIONS = [
  // States (28)
  { id: 'Andhra Pradesh', name: 'Andhra Pradesh', latitude: 15.9129, longitude: 79.7400, zoom: 7, hasLiveStations: false },
  { id: 'Arunachal Pradesh', name: 'Arunachal Pradesh', latitude: 28.2180, longitude: 94.7278, zoom: 7, hasLiveStations: false },
  { id: 'Assam', name: 'Assam', latitude: 26.2006, longitude: 92.9376, zoom: 7, hasLiveStations: false },
  { id: 'Bihar', name: 'Bihar', latitude: 25.0961, longitude: 85.3131, zoom: 7, hasLiveStations: false },
  { id: 'Chhattisgarh', name: 'Chhattisgarh', latitude: 21.2787, longitude: 81.8661, zoom: 7, hasLiveStations: false },
  { id: 'Goa', name: 'Goa', latitude: 15.2993, longitude: 74.1240, zoom: 9, hasLiveStations: false },
  { id: 'Gujarat', name: 'Gujarat', latitude: 22.3000, longitude: 72.2000, zoom: 7, hasLiveStations: true },
  { id: 'Haryana', name: 'Haryana', latitude: 29.0588, longitude: 76.0856, zoom: 8, hasLiveStations: false },
  { id: 'Himachal Pradesh', name: 'Himachal Pradesh', latitude: 31.1048, longitude: 77.1734, zoom: 8, hasLiveStations: false },
  { id: 'Jharkhand', name: 'Jharkhand', latitude: 23.6102, longitude: 85.2799, zoom: 7, hasLiveStations: false },
  { id: 'Karnataka', name: 'Karnataka', latitude: 15.3173, longitude: 75.7139, zoom: 7, hasLiveStations: false },
  { id: 'Kerala', name: 'Kerala', latitude: 10.8505, longitude: 76.2711, zoom: 7, hasLiveStations: false },
  { id: 'Madhya Pradesh', name: 'Madhya Pradesh', latitude: 22.9734, longitude: 78.6569, zoom: 7, hasLiveStations: false },
  { id: 'Maharashtra', name: 'Maharashtra', latitude: 19.6500, longitude: 75.3000, zoom: 7, hasLiveStations: true },
  { id: 'Manipur', name: 'Manipur', latitude: 24.6637, longitude: 93.9063, zoom: 8, hasLiveStations: false },
  { id: 'Meghalaya', name: 'Meghalaya', latitude: 25.4670, longitude: 91.3662, zoom: 8, hasLiveStations: false },
  { id: 'Mizoram', name: 'Mizoram', latitude: 23.1645, longitude: 92.9376, zoom: 8, hasLiveStations: false },
  { id: 'Nagaland', name: 'Nagaland', latitude: 26.1584, longitude: 94.5624, zoom: 8, hasLiveStations: false },
  { id: 'Odisha', name: 'Odisha', latitude: 20.9517, longitude: 85.0985, zoom: 7, hasLiveStations: false },
  { id: 'Punjab', name: 'Punjab', latitude: 31.1471, longitude: 75.3412, zoom: 8, hasLiveStations: false },
  { id: 'Rajasthan', name: 'Rajasthan', latitude: 27.0238, longitude: 74.2179, zoom: 7, hasLiveStations: false },
  { id: 'Sikkim', name: 'Sikkim', latitude: 27.5330, longitude: 88.5122, zoom: 9, hasLiveStations: false },
  { id: 'Tamil Nadu', name: 'Tamil Nadu', latitude: 11.1271, longitude: 78.6569, zoom: 7, hasLiveStations: false },
  { id: 'Telangana', name: 'Telangana', latitude: 18.1124, longitude: 79.0193, zoom: 7, hasLiveStations: false },
  { id: 'Tripura', name: 'Tripura', latitude: 23.9408, longitude: 91.9882, zoom: 9, hasLiveStations: false },
  { id: 'Uttar Pradesh', name: 'Uttar Pradesh', latitude: 26.8467, longitude: 80.9462, zoom: 7, hasLiveStations: false },
  { id: 'Uttarakhand', name: 'Uttarakhand', latitude: 30.0668, longitude: 79.0193, zoom: 8, hasLiveStations: false },
  { id: 'West Bengal', name: 'West Bengal', latitude: 22.9868, longitude: 87.8550, zoom: 7, hasLiveStations: false },

  // Union Territories (8)
  { id: 'Delhi', name: 'Delhi', latitude: 28.6139, longitude: 77.2090, zoom: 11, hasLiveStations: true },
  { id: 'Andaman and Nicobar Islands', name: 'Andaman and Nicobar Islands', latitude: 11.7401, longitude: 92.6586, zoom: 7, hasLiveStations: false },
  { id: 'Chandigarh', name: 'Chandigarh', latitude: 30.7333, longitude: 76.7794, zoom: 11, hasLiveStations: false },
  { id: 'Dadra and Nagar Haveli and Daman and Diu', name: 'Dadra and Nagar Haveli and Daman and Diu', latitude: 20.4283, longitude: 72.8397, zoom: 9, hasLiveStations: false },
  { id: 'Jammu and Kashmir', name: 'Jammu and Kashmir', latitude: 33.7782, longitude: 76.5762, zoom: 7, hasLiveStations: false },
  { id: 'Ladakh', name: 'Ladakh', latitude: 34.1526, longitude: 77.5771, zoom: 7, hasLiveStations: false },
  { id: 'Lakshadweep', name: 'Lakshadweep', latitude: 10.5667, longitude: 72.6417, zoom: 9, hasLiveStations: false },
  { id: 'Puducherry', name: 'Puducherry', latitude: 11.9416, longitude: 79.8083, zoom: 10, hasLiveStations: false },
];

export const getRegionMeta = (regionId) => {
  if (!regionId) return INDIA_REGIONS.find((r) => r.id === 'Delhi');
  const found = INDIA_REGIONS.find(
    (r) => r.id.toLowerCase() === regionId.toLowerCase() || r.name.toLowerCase() === regionId.toLowerCase()
  );
  return found || { id: regionId, name: regionId, latitude: 28.6139, longitude: 77.2090, zoom: 8, hasLiveStations: false };
};
