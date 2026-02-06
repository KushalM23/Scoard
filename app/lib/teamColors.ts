// NBA Team Colors and Logo URLs
// Primary colors used for paint area, secondary for accents

export interface TeamColors {
    primary: string;
    secondary: string;
    logo: string;
}

export const NBA_TEAM_COLORS: Record<number, TeamColors> = {
    // Atlanta Hawks
    1610612737: { primary: '#E03A3E', secondary: '#C1D32F', logo: 'https://cdn.nba.com/logos/nba/1610612737/primary/L/logo.svg' },
    // Boston Celtics
    1610612738: { primary: '#007A33', secondary: '#BA9653', logo: 'https://cdn.nba.com/logos/nba/1610612738/primary/L/logo.svg' },
    // Brooklyn Nets
    1610612751: { primary: '#000000', secondary: '#FFFFFF', logo: 'https://cdn.nba.com/logos/nba/1610612751/primary/L/logo.svg' },
    // Charlotte Hornets
    1610612766: { primary: '#1D1160', secondary: '#00788C', logo: 'https://cdn.nba.com/logos/nba/1610612766/primary/L/logo.svg' },
    // Chicago Bulls
    1610612741: { primary: '#CE1141', secondary: '#000000', logo: 'https://cdn.nba.com/logos/nba/1610612741/primary/L/logo.svg' },
    // Cleveland Cavaliers
    1610612739: { primary: '#860038', secondary: '#FDBB30', logo: 'https://cdn.nba.com/logos/nba/1610612739/primary/L/logo.svg' },
    // Dallas Mavericks
    1610612742: { primary: '#00538C', secondary: '#002B5E', logo: 'https://cdn.nba.com/logos/nba/1610612742/primary/L/logo.svg' },
    // Denver Nuggets
    1610612743: { primary: '#0E2240', secondary: '#FEC524', logo: 'https://cdn.nba.com/logos/nba/1610612743/primary/L/logo.svg' },
    // Detroit Pistons
    1610612765: { primary: '#C8102E', secondary: '#1D42BA', logo: 'https://cdn.nba.com/logos/nba/1610612765/primary/L/logo.svg' },
    // Golden State Warriors
    1610612744: { primary: '#1D428A', secondary: '#FFC72C', logo: 'https://cdn.nba.com/logos/nba/1610612744/primary/L/logo.svg' },
    // Houston Rockets
    1610612745: { primary: '#CE1141', secondary: '#000000', logo: 'https://cdn.nba.com/logos/nba/1610612745/primary/L/logo.svg' },
    // Indiana Pacers
    1610612754: { primary: '#002D62', secondary: '#FDBB30', logo: 'https://cdn.nba.com/logos/nba/1610612754/primary/L/logo.svg' },
    // LA Clippers
    1610612746: { primary: '#C8102E', secondary: '#1D428A', logo: 'https://cdn.nba.com/logos/nba/1610612746/primary/L/logo.svg' },
    // Los Angeles Lakers
    1610612747: { primary: '#552583', secondary: '#FDB927', logo: 'https://cdn.nba.com/logos/nba/1610612747/primary/L/logo.svg' },
    // Memphis Grizzlies
    1610612763: { primary: '#5D76A9', secondary: '#12173F', logo: 'https://cdn.nba.com/logos/nba/1610612763/primary/L/logo.svg' },
    // Miami Heat
    1610612748: { primary: '#98002E', secondary: '#F9A01B', logo: 'https://cdn.nba.com/logos/nba/1610612748/primary/L/logo.svg' },
    // Milwaukee Bucks
    1610612749: { primary: '#00471B', secondary: '#EEE1C6', logo: 'https://cdn.nba.com/logos/nba/1610612749/primary/L/logo.svg' },
    // Minnesota Timberwolves
    1610612750: { primary: '#0C2340', secondary: '#236192', logo: 'https://cdn.nba.com/logos/nba/1610612750/primary/L/logo.svg' },
    // New Orleans Pelicans
    1610612740: { primary: '#0C2340', secondary: '#C8102E', logo: 'https://cdn.nba.com/logos/nba/1610612740/primary/L/logo.svg' },
    // New York Knicks
    1610612752: { primary: '#006BB6', secondary: '#F58426', logo: 'https://cdn.nba.com/logos/nba/1610612752/primary/L/logo.svg' },
    // Oklahoma City Thunder
    1610612760: { primary: '#007AC1', secondary: '#EF3B24', logo: 'https://cdn.nba.com/logos/nba/1610612760/primary/L/logo.svg' },
    // Orlando Magic
    1610612753: { primary: '#0077C0', secondary: '#C4CED4', logo: 'https://cdn.nba.com/logos/nba/1610612753/primary/L/logo.svg' },
    // Philadelphia 76ers
    1610612755: { primary: '#006BB6', secondary: '#ED174C', logo: 'https://cdn.nba.com/logos/nba/1610612755/primary/L/logo.svg' },
    // Phoenix Suns
    1610612756: { primary: '#1D1160', secondary: '#E56020', logo: 'https://cdn.nba.com/logos/nba/1610612756/primary/L/logo.svg' },
    // Portland Trail Blazers
    1610612757: { primary: '#E03A3E', secondary: '#000000', logo: 'https://cdn.nba.com/logos/nba/1610612757/primary/L/logo.svg' },
    // Sacramento Kings
    1610612758: { primary: '#5A2D81', secondary: '#63727A', logo: 'https://cdn.nba.com/logos/nba/1610612758/primary/L/logo.svg' },
    // San Antonio Spurs
    1610612759: { primary: '#C4CED4', secondary: '#000000', logo: 'https://cdn.nba.com/logos/nba/1610612759/primary/L/logo.svg' },
    // Toronto Raptors
    1610612761: { primary: '#CE1141', secondary: '#000000', logo: 'https://cdn.nba.com/logos/nba/1610612761/primary/L/logo.svg' },
    // Utah Jazz
    1610612762: { primary: '#002B5C', secondary: '#00471B', logo: 'https://cdn.nba.com/logos/nba/1610612762/primary/L/logo.svg' },
    // Washington Wizards
    1610612764: { primary: '#002B5C', secondary: '#E31837', logo: 'https://cdn.nba.com/logos/nba/1610612764/primary/L/logo.svg' },
};

export const getTeamColors = (teamId: number): TeamColors => {
    return NBA_TEAM_COLORS[teamId] || { primary: '#1D428A', secondary: '#C4CED4', logo: '' };
};
