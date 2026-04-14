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

  // --- HTTP Authentication API & Webhook Endpoints ---
  async onRequest(request) {
    // We only process auth requests on a dedicated "auth" room to keep the DB cohesive
    if (this.room.id === "global-auth-db" || request.url.includes("/global-auth-db/")) {
      // Handle preflight CORS logic for the browser frontend
      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
          }
        });
      }

      const corsHeaders = { "Access-Control-Allow-Origin": "*" };
      const url = new URL(request.url);

      if (request.method === "POST") {
        
        // 1. Skool Webhook Endpoint (From Zapier / Skool Platform)
        // Expected payload from Skool: { email: "user@example.com", name: "David" }
        if (url.pathname.endsWith('/skool-webhook')) {
           try {
              const payload = await request.json();
              const email = payload.email || (payload.member && payload.member.email);
              const name = payload.name || payload.first_name || (payload.member && payload.member.name) || "Premium Member";
              
              if (!email) return new Response(JSON.stringify({ error: 'Missing email' }), { status: 400, headers: corsHeaders });
              
              let user = await this.room.storage.get(`user:${email.toLowerCase()}`);
              
              // If user exists, upgrade them. If not, create a "ghost" account that will be claimed when they register.
              if (user) {
                 user.isPremium = true;
                 user.skoolName = name;
                 await this.room.storage.put(`user:${email.toLowerCase()}`, user);
              } else {
                 await this.room.storage.put(`user:${email.toLowerCase()}`, { email: email.toLowerCase(), skoolName: name, isPremium: true, password: null });
              }
              
              return new Response(JSON.stringify({ success: true, message: 'Webhook processed' }), { status: 200, headers: corsHeaders });
           } catch(e) {
              return new Response(JSON.stringify({ error: 'Webhook processing failed' }), { status: 500, headers: corsHeaders });
           }
        }
        
        // 2. User Registration Endpoint
        if (url.pathname.endsWith('/register')) {
           try {
              const { email, password, nickname } = await request.json();
              if (!email || !password) return new Response(JSON.stringify({ error: 'Email and password required' }), { status: 400, headers: corsHeaders });
              
              let user = await this.room.storage.get(`user:${email.toLowerCase()}`);
              
              // Handle conflict or claim ghost account
              if (user && user.password) {
                 return new Response(JSON.stringify({ error: 'Email already registered' }), { status: 409, headers: corsHeaders });
              }
              
              // If a webhook already created a ghost record, we preserve `isPremium`
              const isPremium = user ? user.isPremium : false;
              const finalName = (user && user.skoolName) ? user.skoolName : (nickname || "Player");

              const newUserObj = { email: email.toLowerCase(), password: password, name: finalName, isPremium };
              await this.room.storage.put(`user:${email.toLowerCase()}`, newUserObj);
              
              // We return the raw object (Excluding pass in real production, but fine for MVP)
              return new Response(JSON.stringify({ success: true, user: { email: newUserObj.email, name: newUserObj.name, isPremium: newUserObj.isPremium } }), { status: 200, headers: corsHeaders });
           } catch(e) {
              return new Response(JSON.stringify({ error: 'Registration failed' }), { status: 500, headers: corsHeaders });
           }
        }

        // 3. User Login Endpoint
        if (url.pathname.endsWith('/login')) {
           try {
              const { email, password } = await request.json();
              if (!email || !password) return new Response(JSON.stringify({ error: 'Email and password required' }), { status: 400, headers: corsHeaders });
              
              let user = await this.room.storage.get(`user:${email.toLowerCase()}`);
              
              if (!user || user.password !== password) {
                 return new Response(JSON.stringify({ error: 'Invalid email or password' }), { status: 401, headers: corsHeaders });
              }
              
              return new Response(JSON.stringify({ success: true, user: { email: user.email, name: user.name, isPremium: user.isPremium } }), { status: 200, headers: corsHeaders });
           } catch(e) {
              return new Response(JSON.stringify({ error: 'Login failed' }), { status: 500, headers: corsHeaders });
           }
        }

        // 3.5. Update Profile
        if (url.pathname.endsWith('/update-profile')) {
           try {
              const { email, password, newPassword, newName } = await request.json();
              if (!email || !password) return new Response(JSON.stringify({ error: 'Email and current password required' }), { status: 400, headers: corsHeaders });
              
              let user = await this.room.storage.get(`user:${email.toLowerCase()}`);
              if (!user || user.password !== password) {
                 return new Response(JSON.stringify({ error: '密碼錯誤 (Invalid password)' }), { status: 401, headers: corsHeaders });
              }
              
              if (newPassword) user.password = newPassword;
              if (newName) user.name = newName;
              
              await this.room.storage.put(`user:${email.toLowerCase()}`, user);
              return new Response(JSON.stringify({ success: true, user }), { status: 200, headers: corsHeaders });
           } catch(e) {
              return new Response(JSON.stringify({ error: 'Update failed' }), { status: 500, headers: corsHeaders });
           }
        }

        // 3.8. Forgot Password
        if (url.pathname.endsWith('/forgot-password')) {
           try {
              const { email } = await request.json();
              if (!email) return new Response(JSON.stringify({ error: 'Email required' }), { status: 400, headers: corsHeaders });
              
              let user = await this.room.storage.get(`user:${email.toLowerCase()}`);
              if (!user) return new Response(JSON.stringify({ error: '找不到此信箱 (Email not found)' }), { status: 404, headers: corsHeaders });
              
              const resendApiKey = this.room.env.RESEND_API_KEY;
              if (!resendApiKey) return new Response(JSON.stringify({ error: '伺服器未設定 Resend API Key，寄信失敗' }), { status: 500, headers: corsHeaders });
              
              const resendRes = await fetch("https://api.resend.com/emails", {
                 method: "POST",
                 headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${resendApiKey}`
                 },
                 body: JSON.stringify({
                    from: "VerseScramble <onboarding@resend.dev>",
                    to: [email],
                    subject: "VerseScramble: 您的密碼 (Your Password)",
                    html: `<p>哈囉 ${user.name || '玩家'}，</p><p>您在 VerseScramble 的密碼為：<strong>${user.password}</strong></p><p>登入後，請點擊右上角名稱以更換新密碼。</p>`
                 })
              });
              
              if (!resendRes.ok) {
                 const errText = await resendRes.text();
                 console.error("Resend API Error:", errText);
                 return new Response(JSON.stringify({ error: '寄信失敗，可能是尚未通過 Resend 網域驗證或超過額度' }), { status: 500, headers: corsHeaders });
              }

              return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
           } catch(e) {
              return new Response(JSON.stringify({ error: 'System error processing request' }), { status: 500, headers: corsHeaders });
           }
        }
      }

      // 3.9 View Counts Endpoint
      if (url.pathname.endsWith('/custom-sets/view')) {
         try {
            if (request.method === "POST") {
               const { id } = await request.json();
               if (!id) return new Response(JSON.stringify({ error: 'ID required' }), { status: 400, headers: corsHeaders });
               let c = await this.room.storage.get(`views:${id}`) || 0;
               await this.room.storage.put(`views:${id}`, c + 1);
               return new Response(JSON.stringify({ success: true, views: c + 1 }), { status: 200, headers: corsHeaders });
            }
            if (request.method === "GET") {
               const list = await this.room.storage.list({ prefix: "views:" });
               const views = Object.fromEntries(list.entries());
               return new Response(JSON.stringify(views), { status: 200, headers: corsHeaders });
            }
         } catch(e) {
            return new Response(JSON.stringify({ error: 'System error' }), { status: 500, headers: corsHeaders });
         }
      }

      // 4. Published Custom Verse Sets Endpoint
      if (url.pathname.endsWith('/custom-sets')) {
         try {
            if (request.method === "GET") {
               const list = await this.room.storage.list({ prefix: "verseset:" });
               const sets = Array.from(list.values());
               return new Response(JSON.stringify(sets), { status: 200, headers: corsHeaders });
            } else if (request.method === "POST") {
               const payload = await request.json();
               await this.room.storage.put(`verseset:${payload.id}`, payload);
               return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
            } else if (request.method === "DELETE") {
               const { id } = await request.json();
               await this.room.storage.delete(`verseset:${id}`);
               return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
            }
         } catch(e) {
            return new Response(JSON.stringify({ error: 'DB error' }), { status: 500, headers: corsHeaders });
         }
      }

      return new Response("Not Found API Route", { status: 404, headers: corsHeaders });
    }

    // Default route for other random requests to gameplay rooms (if any)
    return new Response("VerseRain Gameplay Room HTTP endpoint OK", { status: 200 });
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
             p.versesCompleted = 0;
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

      // Player finished one verse — record score and let them keep going on their own
      if (data.type === 'PLAYER_FINISHED_VERSE' && this.state.status === 'playing' && this.state.playMode === 'square_solo') {
          if (this.state.players[sender.id]) {
              const { verseRef, score, verseIndex } = data;
              console.log(`[PARTY] Player ${this.state.players[sender.id].name} finished verse ${verseIndex} (${verseRef}) score=${score}`);
              this.state.players[sender.id].versesCompleted = (this.state.players[sender.id].versesCompleted || 0) + 1;

              if (!this.state.campaignResults) this.state.campaignResults = [];
              const existing = this.state.campaignResults.find(r => r.verseIndex === verseIndex);
              if (existing) {
                  existing.scores[sender.id] = score;
              } else {
                  this.state.campaignResults.push({ verseRef, verseIndex, scores: { [sender.id]: score } });
                  this.state.campaignResults.sort((a, b) => a.verseIndex - b.verseIndex);
              }
              this.broadcastState();
          }
      }

      // Player finished ALL verses — when everyone is done, end the game
      if (data.type === 'PLAYER_FINISHED_ALL' && this.state.status === 'playing' && this.state.playMode === 'square_solo') {
          if (this.state.players[sender.id]) {
              console.log(`[PARTY] Player ${this.state.players[sender.id].name} finished ALL verses`);
              this.state.players[sender.id].isFinished = true;

              const connectedPlayers = Object.values(this.state.players).filter(p => p.connected);
              const allFinished = connectedPlayers.length > 0 && connectedPlayers.every(p => p.isFinished);
              if (allFinished) {
                  console.log(`[PARTY] All players finished all verses! Game over.`);
                  this.state.status = 'finished';
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
          p.versesCompleted = 0;
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
