const STATS_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.nba.com/",
  Origin: "https://www.nba.com",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-site",
};

async function test() {
  const seasons = ["2024-25", "2023-24"];
  for (const s of seasons) {
    const url = `https://stats.nba.com/stats/scheduleleaguev2?Season=${s}&LeagueID=00`;
    try {
      const res = await fetch(url, { headers: STATS_HEADERS });
      console.log(`${s}: status = ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        console.log(`  Keys:`, Object.keys(data));
        // let's see where the games/leagueSchedule is in scheduleleaguev2 response
        if (data.leagueSchedule) {
          console.log(`  Dates count: ${data.leagueSchedule?.gameDates?.length}`);
        } else {
          console.log(`  ResultSet names:`, Object.keys(data.resultSet || {}));
        }
      }
    } catch (err) {
      console.error(`${s}: failed`, err.message);
    }
  }
}

test();
