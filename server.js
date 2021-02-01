const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const port = process.env.SERVER_PORT || 4000;

const app = express();

app.use(bodyParser.json());
app.use(cors());

let allData;
let countryList;

fetch(`${process.env.COVID_STATS_URL}`)
  .then((res) => res.json())
  .then((data) => {
    countryList = [...new Set(data.map((item) => item.country))];
    allData = data;
  });

app.get('/countries', (req, res) => {
  res.json(countryList);
});

//filters data by indicator "cases" || "deaths" and return ony cumulative_count
const filterData = (indicator, data) =>
  data
    .filter((item) => item.indicator === indicator)
    .map((item) => item.cumulative_count);

//filters country data by indicator and changes to way we will use in Front End
const getStats = (countryData, indicator, type) => {
  const dataByIndicator = countryData.filter(
    (item) => item.indicator === indicator,
  );
  const lastItemCount = +dataByIndicator[dataByIndicator.length - 1][type]; // gets last item
  const prevLastItemCount = +dataByIndicator[dataByIndicator.length - 2][type]; // gets one before last item

  return {
    stats: lastItemCount,
    change: 1 - lastItemCount / prevLastItemCount, // calc change in value which can be changed to %
  };
};

app.get('/countries/:country', (req, res) => {
  const country = req.params.country;
  const countryData = allData.filter((item) => item.country === country);

  const changedData = {
    deaths: filterData('deaths', countryData),
    cases: filterData('cases', countryData),
    categories: [...new Set(countryData.map((item) => item.year_week))],
    stats: [
      getStats(countryData, 'deaths', 'weekly_count'),
      getStats(countryData, 'cases', 'weekly_count'),
      getStats(countryData, 'deaths', 'rate_14_day'),
      getStats(countryData, 'cases', 'rate_14_day'),
    ],
  };

  res.json(changedData);
});

app.get('/', (req, res) => {
  res.send('API service works!');
});

app.listen(port, () => console.log(`Server is running on port ${port}`));
