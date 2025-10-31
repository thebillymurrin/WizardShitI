/* Leaderboard Management */

export function updateLeaderboard(players, myId) {
    const leaderboardContent = document.getElementById('leaderboardContent');
    if (!leaderboardContent) return;
    
    // Get all players and sort by kills (descending), then by deaths (ascending)
    const playerList = Object.entries(players).map(([id, p]) => ({
        id,
        name: p.name || `Player${id.substring(0, 4)}`,
        kills: p.kills || 0,
        deaths: p.deaths || 0,
        isMe: id === myId
    }));
    
    // Sort: highest kills first, then lowest deaths
    playerList.sort((a, b) => {
        if (b.kills !== a.kills) return b.kills - a.kills;
        return a.deaths - b.deaths;
    });
    
    // Clear and rebuild leaderboard
    leaderboardContent.innerHTML = '';
    
    if (playerList.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'leaderboard-entry';
        emptyMsg.textContent = 'No players';
        leaderboardContent.appendChild(emptyMsg);
        return;
    }
    
    playerList.forEach(player => {
        const entry = document.createElement('div');
        entry.className = 'leaderboard-entry';
        if (player.isMe) {
            entry.style.fontWeight = 'bold';
            entry.style.color = '#d4af37';
        }
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'leaderboard-name';
        nameSpan.textContent = player.name;
        
        const statsSpan = document.createElement('span');
        statsSpan.className = 'leaderboard-stats';
        
        const killsSpan = document.createElement('span');
        killsSpan.className = 'leaderboard-kills';
        killsSpan.textContent = `K: ${player.kills}`;
        
        const deathsSpan = document.createElement('span');
        deathsSpan.className = 'leaderboard-deaths';
        deathsSpan.textContent = `D: ${player.deaths}`;
        
        statsSpan.appendChild(killsSpan);
        statsSpan.appendChild(deathsSpan);
        
        entry.appendChild(nameSpan);
        entry.appendChild(statsSpan);
        
        leaderboardContent.appendChild(entry);
    });
}

