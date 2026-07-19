const STATS_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.nba.com/",
  Origin: "https://www.nba.com",
};

async function test() {
  const url = "https://stats.nba.com/js/data/playermovement/NBA_Player_Movement.json";
  try {
    const res = await fetch(url, { headers: STATS_HEADERS });
    if (res.ok) {
      const data = await res.json();
      const rows = data?.NBA_Player_Movement?.rows || [];
      const types = new Set();
      let minDate = "9999-99-99";
      let maxDate = "0000-00-00";

      for (const row of rows) {
        types.add(row.Transaction_Type);
        if (row.TRANSACTION_DATE < minDate) minDate = row.TRANSACTION_DATE;
        if (row.TRANSACTION_DATE > maxDate) maxDate = row.TRANSACTION_DATE;
      }

      console.log(`Min Date: ${minDate}`);
      console.log(`Max Date: ${maxDate}`);
      console.log(`Transaction Types:`, Array.from(types));
    }
  } catch (err) {
    console.error(err.message);
  }
}

test();
