export default class Server {
  constructor(room) {
    this.room = room;
    // In-memory state for this match
    this.state = {
      status: 'waiting', // waiting, playing, finished
      blocks: [], // The array of scramble block objects
      currentSeqIndex: 0,
      players: {}, // Map of connection.id -> { id, name, score, connected }
      host: null,
      verseRef: null
    };
  }

  onConnect(conn, ctx) {
    // Player connected to the room
    const url = new URL(ctx.request.url);
    const name = url.searchParams.get("name") || "Player" + Math.floor(Math.random() * 100);
    
    // First person is host
    if (!this.state.host) {
      this.state.host = conn.id;
    }

    this.state.players[conn.id] = { 
      id: conn.id, 
      name, 
      score: 0, 
      health: 3,
      seqIndex: 0,
      isFinished: false,
      connected: true,
      color: Object.keys(this.state.players).length === 0 ? '#3b82f6' : '#ef4444' // Host is Blue, Guest is Red
    };

    console.log(`[PARTY] Room [${this.room.id}] - Player joined: ${name} (${conn.id}) - Host: ${this.state.host === conn.id}`);
    console.log(`[PARTY] Room [${this.room.id}] - Total players in room: ${Object.keys(this.state.players).length}`);
    this.broadcastState();
  }

  onClose(conn) {
    console.log(`[PARTY] Player left: ${conn.id}`);
    if (this.state.players[conn.id]) {
      this.state.players[conn.id].connected = false;
    }
    
    // If hose leaves, maybe reassign host or just end game. For now, just mark disconnected.
    this.broadcastState();
  }

  onMessage(message, sender) {
    try {
      const data = JSON.parse(message);

      if (data.type === 'INIT_GAME') {
        // Host selects the board phase
        if (sender.id === this.state.host) {
          console.log(`[PARTY] Game initialized by host, moving to ready check.`);
          this.state.status = 'ready_check';
          this.state.blocks = data.blocks;
          this.state.currentSeqIndex = 0;
          this.state.verseRef = data.verseRef;
          this.state.verseText = data.verseText;
          this.state.playMode = data.playMode;
          this.state.distractionLevel = data.distractionLevel;
          this.state.phrases = data.phrases;
          this.state.campaignQueue = data.campaignQueue || [];
          this.state.campaignResults = [];
          
          // Reset scores, health, and readiness
          Object.values(this.state.players).forEach(p => { 
             p.score = 0; 
             p.health = 3;
             p.isReady = false; 
             p.isFinished = false;
             p.seqIndex = 0;
          });
          
          this.broadcastState();
        }
      }

      if (data.type === 'NEXT_CAMPAIGN_ROUND' && sender.id === this.state.host) {
          console.log(`[PARTY] Starting next campaign round: ${data.verseRef}`);
          this.state.status = 'playing';
          this.state.blocks = data.blocks;
          this.state.currentSeqIndex = 0;
          this.state.verseRef = data.verseRef;
          this.state.verseText = data.verseText;
          this.state.phrases = data.phrases;
          
          // Reset player scores and health ONLY for this new round!
          Object.values(this.state.players).forEach(p => {
             p.score = 0;
             p.health = 3;
             p.isFinished = false;
             p.seqIndex = 0;
          });
          
          this.broadcastState();
      }

      if (data.type === 'PLAYER_READY' && this.state.status === 'ready_check') {
         if (this.state.players[sender.id]) {
            this.state.players[sender.id].isReady = true;
            console.log(`[PARTY] Player ${this.state.players[sender.id].name} is ready!`);
            
            // Check if ALL currently connected players are ready
            const connectedPlayers = Object.values(this.state.players).filter(p => p.connected);
            const allReady = connectedPlayers.length > 0 && connectedPlayers.every(p => p.isReady);
            
            if (allReady) {
               console.log(`[PARTY] All players ready! Starting game.`);
               this.state.status = 'playing';
               // Reset active sequence to 0
               this.state.currentSeqIndex = 0;
            }
            this.broadcastState();
         }
      }

      if (data.type === 'CLICK_BLOCK' && this.state.status === 'playing') {
        if (this.state.playMode === 'square_solo') return; // Handled locally in square_solo

        const { blockId } = data;
        const block = this.state.blocks.find(b => b.id === blockId);
        
        // Removed health <= 0 early return so players can always finish the verse

        if (block && !block.claimedBy) {
          if (block.seqIndex === this.state.currentSeqIndex || block.text === this.state.phrases[this.state.currentSeqIndex]) {
            // Correct click! The referee approves it.
            block.claimedBy = sender.id;
            block.claimedByName = this.state.players[sender.id].name;
            this.state.players[sender.id].score += 100;
            this.state.currentSeqIndex++;
            console.log(`[PARTY] Block claimed: ${block.text} by ${block.claimedByName}`);

            // Fast broadcast the specific claim event to trigger CSS flash animations
            this.room.broadcast(JSON.stringify({
              type: 'BLOCK_CLAIMED',
              blockId: block.id,
              blockText: block.text,
              claimedBy: sender.id,
              claimedByName: this.state.players[sender.id].name,
              nextSeq: this.state.currentSeqIndex
            }));
            
            // Check absolute game completion
            if (this.state.currentSeqIndex >= this.state.phrases.length) {
               console.log(`[PARTY] Game Over! All phrases completed.`);
               
               if (!this.state.campaignResults) this.state.campaignResults = [];
               this.state.campaignResults.push({
                   verseRef: this.state.verseRef,
                   scores: Object.fromEntries(Object.values(this.state.players).map(p => [p.id, p.score]))
               });
               
               if (this.state.campaignQueue && this.state.campaignQueue.length > 1) {
                   this.state.campaignQueue.shift();
                   this.state.status = 'intermission';
               } else {
                   this.state.status = 'finished';
               }
               this.broadcastState();
            } else {
               // Dynamic Server-Side Block Replenishment for VerseSquare
               if (this.state.playMode.startsWith('square')) {
                  const maxGridSize = this.state.distractionLevel <= 1 ? 4 : 9;
                  const fakesCount = this.state.distractionLevel > 0 ? this.state.distractionLevel : 0;
                  const nextSpawnIndex = this.state.currentSeqIndex + (maxGridSize - fakesCount);
                  
                  if (nextSpawnIndex < this.state.phrases.length) {
                      // Delayed refill to allow CSS animation to play on clients
                      setTimeout(() => {
                          if (this.state.status !== 'playing') return;
                          
                          const blockIndex = this.state.blocks.findIndex(b => b.id === block.id);
                          if (blockIndex !== -1) {
                              this.state.blocks[blockIndex] = {
                                  id: Math.random().toString(36).substr(2, 9),
                                  text: this.state.phrases[nextSpawnIndex],
                                  seqIndex: nextSpawnIndex,
                                  isSquare: true,
                                  error: false,
                                  correct: false,
                                  hidden: false
                              };
                              this.broadcastState();
                          }
                      }, 400); 
                  } else {
                      // No more phrases remaining. Wait 400ms for CSS to finish, then hide the block instead of leaving a stuck clone.
                      setTimeout(() => {
                          if (this.state.status !== 'playing') return;
                          const blockIndex = this.state.blocks.findIndex(b => b.id === block.id);
                          if (blockIndex !== -1) {
                              this.state.blocks[blockIndex].hidden = true;
                              this.broadcastState();
                          }
                      }, 400);
                  }
               } else {
                  this.broadcastState(); // For future modes
               }
            }
          } else if (block.seqIndex !== -1) { // Ignore clicks on blank spaces or wrong words
             // Incorrect click penalty
             this.state.players[sender.id].score = Math.max(0, this.state.players[sender.id].score - 50);
             this.state.players[sender.id].health = Math.max(0, (this.state.players[sender.id].health || 3) - 1);
             
             sender.send(JSON.stringify({
                type: 'MISTAKE',
                playerId: sender.id,
                blockId: block.id,
                health: this.state.players[sender.id].health,
                score: this.state.players[sender.id].score
             }));

             if (this.state.players[sender.id].health <= 0) {
                 console.log(`[PARTY] Player ${sender.id} health empty but match continues.`);
                 // Do not terminate the match! Players can finish it but their score won't go to leaderboard locally
             }
             
             // Broadcast the score/health change
             this.broadcastState();
          }
        }
      }

      if (data.type === 'PLAYER_PROGRESS' && this.state.status === 'playing' && this.state.playMode === 'square_solo') {
          if (this.state.players[sender.id]) {
             this.state.players[sender.id].score = data.score;
             this.state.players[sender.id].health = data.health;
             this.state.players[sender.id].seqIndex = data.seqIndex;
             this.broadcastState();
          }
      }

      if (data.type === 'PLAYER_FINISHED_ROUND' && this.state.status === 'playing' && this.state.playMode === 'square_solo') {
          if (this.state.players[sender.id]) {
              console.log(`[PARTY] Player ${sender.id} finished round locally`);
              this.state.players[sender.id].isFinished = true;
              
              // Check if ALL alive connected players are finished
              const activePlayers = Object.values(this.state.players).filter(p => p.connected);
              const allFinished = activePlayers.length > 0 && activePlayers.every(p => p.isFinished);
              
              if (allFinished) {
                  console.log(`[PARTY] All players finished Solo Round! Round over!`);
                  if (!this.state.campaignResults) this.state.campaignResults = [];
                  this.state.campaignResults.push({
                      verseRef: this.state.verseRef,
                      scores: Object.fromEntries(Object.values(this.state.players).map(p => [p.id, p.score]))
                  });
                  
                  if (this.state.campaignQueue && this.state.campaignQueue.length > 1) {
                      this.state.campaignQueue.shift();
                      this.state.status = 'intermission';
                  } else {
                      this.state.status = 'finished';
                  }
              }
              this.broadcastState();
          }
      }

      if (data.type === 'RESTART_GAME' && sender.id === this.state.host) {
        this.state.status = 'waiting';
        this.state.verseRef = null;
        this.state.verseText = null;
        this.state.blocks = [];
        this.state.currentSeqIndex = 0;
        this.state.phrases = [];
        this.state.campaignQueue = [];
        this.state.campaignResults = [];
        // Reset player states
        Object.values(this.state.players).forEach(p => {
          p.isReady = false;
          p.score = 0;
          p.health = 3;
          p.isFinished = false;
          p.seqIndex = 0;
        });
        this.broadcastState();
      }

    } catch (e) {
      console.error("[PARTY] Message error", e);
    }
  }

  broadcastState() {
    this.room.broadcast(JSON.stringify({
      type: 'STATE_UPDATE',
      state: this.state
    }));
  }
}
