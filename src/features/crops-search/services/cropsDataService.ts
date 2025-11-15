// services/cropsDataService.ts

// Mock данные на основе вашего JSON структуры
export const getCropsData = () => {
  return {
    data_source: "FAOSTAT",
    domain: "Producer Prices", 
    country: "Russian Federation",
    year: 2024,
    currency_unit: "RUB",
    base_index_period: "2014-2016 = 100",
    products: [
      {
        "item_code": "01654",
        "item_name": "Anise, badian, coriander, cumin, caraway, fennel and juniper berries, raw",
        "producer_price": 135075.2,
        "price_index": 149.12,
        "unit": "SLC/tonne"
      },
      {
        "item_code": "01341",
        "item_name": "Apples",
        "producer_price": 26609.5,
        "price_index": 140.29,
        "unit": "SLC/tonne"
      },
      {
        "item_code": "01343",
        "item_name": "Apricots",
        "producer_price": 50787.5,
        "price_index": 144.95,
        "unit": "SLC/tonne"
      },
      {
        "item_code": "0115",
        "item_name": "Barley",
        "producer_price": 13274.8,
        "price_index": 193.31,
        "unit": "SLC/tonne"
      },
      {
        "item_code": "01510",
        "item_name": "Potatoes",
        "producer_price": 17346.1,
        "price_index": 143.19,
        "unit": "SLC/tonne"
      },
      {
        "item_code": "01330",
        "item_name": "Grapes",
        "producer_price": 53771.8,
        "price_index": 253.9,
        "unit": "SLC/tonne"
      },
      {
        "item_code": "01342.01",
        "item_name": "Pears",
        "producer_price": 26593.1,
        "price_index": 140.06,
        "unit": "SLC/tonne"
      },
      {
        "item_code": "01342.02",
        "item_name": "Quinces",
        "producer_price": 27306.9,
        "price_index": 142.09,
        "unit": "SLC/tonne"
      },
      {
        "item_code": "01344.01",
        "item_name": "Sour cherries",
        "producer_price": 52321.8,
        "price_index": 147.57,
        "unit": "SLC/tonne"
      },
      {
        "item_code": "01344.02",
        "item_name": "Cherries",
        "producer_price": 50074.2,
        "price_index": 144.7,
        "unit": "SLC/tonne"
      },
      {
        "item_code": "01345",
        "item_name": "Peaches and nectarines",
        "producer_price": 49990.5,
        "price_index": 144.74,
        "unit": "SLC/tonne"
      },
      {
        "item_code": "01346",
        "item_name": "Plums and sloes",
        "producer_price": 51428.7,
        "price_index": 145.2,
        "unit": "SLC/tonne"
      },
      {
        "item_code": "01270",
        "item_name": "Mushrooms and truffles",
        "producer_price": 119989.6,
        "price_index": 136.63,
        "unit": "SLC/tonne"
      }
    ],
    search_indices: {
      by_item_code: {},
      by_item_name: {},
      by_category: {
        "cereals": ["0111", "0112", "0113", "0114", "0115", "0116", "0117", "0118", "01191", "01192", "01199.90"],
        "vegetables": ["01212", "01213", "01221", "01229", "01232", "01234", "01235", "01242", "01243", "01251", "01252", "01253.02", "01270", "01290.90", "01510"],
        "fruits": ["01330", "01341", "01342.01", "01342.02", "01343", "01344.01", "01344.02", "01345", "01346", "01349.10", "01349.20", "01351.01", "01351.02", "01353.01", "01354", "01355.90", "01359.90"],
        "nuts": ["01373", "01374", "01376", "01379.90"],
        "pulses": ["01701", "01702", "01703", "01704", "01705", "01709.01", "01709.02", "01709.90"],
        "oilseeds": ["0141", "01441", "01442", "01443", "01445", "01446", "01447", "01449.02"],
        "other": ["01620", "01654", "01659", "01691", "01801", "01929.02", "01970", "02910", "02941", "26190.01"]
      }
    }
  };
};