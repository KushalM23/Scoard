const STATS_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.nba.com/",
  Origin: "https://www.nba.com",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-site",
};

async function test() {
  // Let's query stats.nba.com/stats/drafthistory
  // Parameters: LeagueID=00, SeasonYear=2024 (or Season=2024? let's see)
  const url = "https://stats.nba.com/stats/drafthistory?LeagueID=00&SeasonYear=2024";
  try {
    const res = await fetch(url, { headers: STATS_HEADERS });
    console.log(`status = ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      console.log(`Keys:`, Object.keys(data));
      if (data.resultSets) {
        console.log(`ResultSets:`, data.resultSets.map(r => r.name));
        const draftSet = data.resultSets[0];
        console.log(`Headers:`, draftSet.headers);
        console.log(`Rows count:`, draftSet.rowSet.length);
        if (draftSet.rowSet.length > 0) {
          console.log(`First row:`, draftSet.rowSet[0]);
        }
      }
    }
  } catch (err) {
    console.error(err.message);
  }
}

test();
