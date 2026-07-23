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
    <section className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {CONFERENCES.map((conference) => (
          <section
            key={conference.name}
            className="space-y-10 p-5"
          >
            <h2 className="font-display text-2xl uppercase text-center tracking-[0.2em] text-text sm:text-3xl">
              {conference.name}
            </h2>

            <div className="space-y-8">
              {conference.divisions.map((division) => (
                <section key={division.name} className="space-y-2">
                  <h3 className="font-display text-sm mb-4 uppercase tracking-[0.3em] text-text/60">
                    {division.name}
                  </h3>

                  <div className="flex flex-wrap gap-x-4 gap-y-4">
                    {division.teamIds.map((teamId) => {
                      const team = TEAM_META[teamId];

                      return (
                        <TeamLink
                          key={teamId}
                          teamId={teamId}
                          sourceComponent="teams_grid"
                          className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-white/10 bg-white/10 px-4 py-2 max-w-[200px] text-md text-text transition-colors hover:text-accent"
                        >
                          <img
                            src={getTeamLogoUrl(teamId)}
                            alt={`${team.city} ${team.name} logo`}
                            className="h-10 w-10 shrink-0"
                          />
                          <span className="truncate font-bold">
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
