import TeamLink from "@/components/links/TeamLink";
import { TEAM_META } from "@/lib/teams";

const CONFERENCES = [
  {
    name: "Eastern Conference",
    divisions: [
      {
        name: "Atlantic",
        teamIds: [1610612738, 1610612751, 1610612752, 1610612755, 1610612761],
      },
      {
        name: "Central",
        teamIds: [1610612741, 1610612739, 1610612765, 1610612754, 1610612749],
      },
      {
        name: "Southeast",
        teamIds: [1610612737, 1610612766, 1610612748, 1610612753, 1610612764],
      },
    ],
  },
  {
    name: "Western Conference",
    divisions: [
      {
        name: "Northwest",
        teamIds: [1610612743, 1610612750, 1610612760, 1610612757, 1610612762],
      },
      {
        name: "Pacific",
        teamIds: [1610612744, 1610612746, 1610612747, 1610612756, 1610612758],
      },
      {
        name: "Southwest",
        teamIds: [1610612742, 1610612745, 1610612763, 1610612740, 1610612759],
      },
    ],
  },
] as const;

function getTeamLogoUrl(teamId: number) {
  return `https://cdn.nba.com/logos/nba/${teamId}/global/L/logo.svg`;
}

export default function TeamsGrid() {
  return (
    <section className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-6 sm:py-8 lg:px-8">

      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2">
        {CONFERENCES.map((conference) => (
          <section
            key={conference.name}
            className="space-y-5 rounded-2xl p-1 sm:space-y-10 sm:p-5"
          >
            <h2 className="font-display text-lg uppercase text-center tracking-[0.14em] text-text sm:text-3xl sm:tracking-[0.2em]">
              {conference.name}
            </h2>

            <div className="space-y-5 sm:space-y-8">
              {conference.divisions.map((division) => (
                <section key={division.name} className="space-y-2">
                  <h3 className="font-display mb-3 text-xs uppercase tracking-[0.22em] text-text/60 sm:mb-4 sm:text-sm sm:tracking-[0.3em]">
                    {division.name}
                  </h3>

                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2.5">
                    {division.teamIds.map((teamId) => {
                      const team = TEAM_META[teamId];

                      return (
                        <TeamLink
                          key={teamId}
                          teamId={teamId}
                          sourceComponent="teams_grid"
                          className="inline-flex min-w-0 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-1.5 py-1.5 text-[10px] text-text transition-colors hover:text-accent sm:gap-4 sm:px-3 sm:py-2 sm:text-sm"
                        >
                          <img
                            src={getTeamLogoUrl(teamId)}
                            alt={`${team.city} ${team.name} logo`}
                            className="h-7 w-7 shrink-0 sm:h-8 sm:w-8"
                          />
                          <span className="line-clamp-2 min-w-0 font-bold leading-tight sm:truncate sm:whitespace-nowrap sm:leading-normal">
                            {team.city} {team.name}
                          </span>
                        </TeamLink>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
