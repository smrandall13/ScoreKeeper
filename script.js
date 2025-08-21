     let matches = JSON.parse(localStorage.getItem("matches") || "[]");
     let editingIndex = null;
     
     function openForm(index = null) {

          editingIndex = index;
          document.getElementById("overlay").style.display = "flex";
          document.getElementById("formTitle").textContent = index === null ? "Add Match" : "Edit Match";

          console.log("OPEN",index, matches)

          // Reset form
          document.querySelectorAll(".form input, .form textarea, .form select").forEach((el) => (el.value = ""));

          if (index !== null) {
               // fill existing data
               const m = matches[index];
               document.getElementById("game").value = m.game;

               const players = document.querySelectorAll(".player");
               players.forEach((inp, i) => (inp.value = m.players[i] || ""));
               
               const points = document.querySelectorAll(".point");
               points.forEach((inp, i) => (inp.value = m.points[i] || ""));
               
               updateWinnerOptions();
               document.getElementById("winner").value = m.winner;

               document.getElementById("pointsWon").value = m.pointsWon;
               document.getElementById("date").value = m.date;
               document.getElementById("notes").value = m.notes;
               
               
          }
     }

     function closeForm() {
          document.getElementById("overlay").style.display = "none";
     }

     function updateWinnerOptions() {
          const players = [...document.querySelectorAll(".player")].map((p) => p.value.trim()).filter((p) => p);

          const winnerSelect = document.getElementById("winner");
          winnerSelect.innerHTML = "";
          players.forEach((p) => {
               const opt = document.createElement("option");
               opt.value = p;
               opt.textContent = p;
               winnerSelect.appendChild(opt);
          });
     }

     function calculatePointsWon(players, winner, points) {
          if (!points.length || points.every((p) => isNaN(p))) return 0;
          const winnerIndex = players.indexOf(winner);
          const winnerPoints = points[winnerIndex] || 0;

          // Remove winner’s points, find next best
          const others = points.filter((_, i) => i !== winnerIndex);
          const bestOther = Math.max(...others);

          return winnerPoints - bestOther;
     }

     function saveMatch() {
          const players = [...document.querySelectorAll(".player")].map((p) => p.value.trim()).filter((p) => p);

          if (players.length < 2) {
               alert("At least two players required.");
               return;
          }

          const winner = document.getElementById("winner").value;
          const losers = players.filter((p) => p !== winner);
          const points = [...document.querySelectorAll(".point")].map((p) => p.value.trim()).filter((p) => p);

          const match = {
               game: document.getElementById("game").value,
               players,
               winner,
               losers,
               points,
               pointsWon: calculatePointsWon(players, winner, points),
               date: document.getElementById("date").value,
               notes: document.getElementById("notes").value
          };

          if (editingIndex !== null) {
               matches[editingIndex] = match;
          } else {
               matches.push(match);
          }

          updateLists();
          localStorage.setItem("matches", JSON.stringify(matches));
          closeForm();
          render();
     }

     function deleteMatch() {
          if (editingIndex !== null) {
               matches.splice(editingIndex, 1);
               updateLists();
               localStorage.setItem("matches", JSON.stringify(matches));
               render();
          }
          closeForm();
     }

     function updateLists() {
          
          // Game List
          const games = [...new Set(matches.map((m) => m.game).filter((g) => g))];
          const glist = document.getElementById("gamesList");
          glist.innerHTML = "";
          games.forEach((g) => {
               const opt = document.createElement("option");
               opt.value = g;
               glist.appendChild(opt);
          });

          // Player List
          const players = [...new Set(matches.flatMap((m) => m.players))];
          const plist = document.getElementById("playerList");
          plist.innerHTML = "";
          players.forEach((p) => {
               const opt = document.createElement("option");
               opt.value = p;
               plist.appendChild(opt);
          });
     }

     function renderMatchHistory() {
          const container = document.getElementById("matchTable");
          container.innerHTML = "";

          // Group by game
          let gameGroups = {};
          matches.forEach((m) => {
               if (!gameGroups[m.game]) gameGroups[m.game] = [];
               gameGroups[m.game].push(m);
          });

          for (let game in gameGroups) {
               let btn = document.createElement("button");
               btn.className = "content-header";
               btn.textContent = game;
               container.appendChild(btn);

               let content = document.createElement("div");
               content.className = "content";

               let html = `<table width="100%" border="1" cellspacing="0" cellpadding="5">
          <tr><th>Game</th><th>Date</th><th>Players</th><th>Winner</th><th>Edit</th></tr>`;

               let gameMatches = gameGroups[game];
               // sort by date desc
               gameMatches.sort((a, b) => {
                    return new Date(b.date) - new Date(a.date);
               });

               gameMatches.forEach((m, i) => {
                    let index = matches.indexOf(m);
                    html += `<tr><td>${m.game}</td><td>${m.date}</td><td>${m.players.join(", ")}</td><td>${m.winner}</td><td><button class='button' onclick="openForm(${index})">Edit</button></td></tr>`;
               });

               html += `</table>`;
               content.innerHTML = html;
               container.appendChild(content);
          }

          setupCollapsibles();
     }

     function renderMatchups() {
          let container = document.getElementById("matchups");
          container.innerHTML = "";

          // Group matches by game
          let gameGroups = {};
          matches.forEach((m) => {
               if (!gameGroups[m.game]) gameGroups[m.game] = [];
               gameGroups[m.game].push(m);
          });

          for (let game in gameGroups) {
               let btn = document.createElement("button");
               btn.className = "content-header";
               btn.textContent = game;
               container.appendChild(btn);

               let content = document.createElement("div");
               content.className = "content";

               let group = gameGroups[game];
               let allPlayers = new Set();
               group.forEach((m) => m.players.forEach((p) => allPlayers.add(p)));
               allPlayers = Array.from(allPlayers);

               // Matrix init
               let matrix = {};
               allPlayers.forEach((p1) => {
                    matrix[p1] = {};
                    allPlayers.forEach((p2) => (matrix[p1][p2] = 0));
               });

               // Fill matrix
               group.forEach((m) => {
                    m.losers.forEach((loser) => {
                         matrix[m.winner][loser]++;
                    });
               });

               // Totals
               let totals = {};
               allPlayers.forEach((p) => {
                    totals[p] = group.filter((m) => m.winner === p).length;
               });

               // Build table
               let html = `<table border="1" cellspacing="0" cellpadding="5">
          <tr><th>Player</th>`;
               allPlayers.forEach((p) => (html += `<th>${p}</th>`));
               html += `<th>Total Wins</th></tr>`;

               allPlayers.forEach((p1) => {
                    html += `<tr><td><strong>${p1}</strong></td>`;
                    allPlayers.forEach((p2) => {
                         if (p1 === p2) {
                              html += `<td style="background:#eee">-</td>`;
                         } else {
                              html += `<td>${matrix[p1][p2]}</td>`;
                         }
                    });
                    html += `<td><strong>${totals[p1]}</strong></td></tr>`;
               });

               html += `</table>`;
               content.innerHTML = html;
               container.appendChild(content);
          }

          setupCollapsibles();
     }

     function setupCollapsibles() {
          document.querySelectorAll(".content-header").forEach((btn) => {
               btn.onclick = function () {
                    this.classList.toggle("active");
                    let content = this.nextElementSibling;
                    content.style.display = content.style.display === "block" ? "none" : "block";
               };
          });
     }

     function render() {
          // document.getElementById("totalMatches").textContent = "Total Matches: " + matches.length;

          // let scores = {};
          // matches.forEach((m) => (scores[m.winner] = (scores[m.winner] || 0) + 1));
          // let top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
          // document.getElementById("topPlayer").textContent = "Top Player: " + (top ? `${top[0]} (${top[1]} wins)` : "-");

          updateLists();
          drawChart();
          renderMatchHistory(); // 👈 new
          renderMatchups(); // 👈 new
     }

     function drawChart() {
          const ctx = document.getElementById("gameChart").getContext("2d");
          ctx.clearRect(0, 0, 600, 300);

          // Aggregate wins by game and player
          let stats = {};
          matches.forEach((m) => {
               if (!stats[m.game]) stats[m.game] = {};
               stats[m.game][m.winner] = (stats[m.game][m.winner] || 0) + 1;
          });

          const games = Object.keys(stats);
          let colors = ["#ff6384", "#36a2eb", "#ffce56", "#4bc0c0", "#9966ff", "#ff9f40"];

          let x = 50;
          let barWidth = 30;

          games.forEach((game, gi) => {
               ctx.fillStyle = "#000";
               ctx.fillText(game, x, 20);

               let players = Object.keys(stats[game]);
               players.forEach((p, pi) => {
                    let wins = stats[game][p];
                    let barHeight = wins * 20;
                    ctx.fillStyle = colors[(pi + gi) % colors.length];
                    ctx.fillRect(x, 280 - barHeight, barWidth, barHeight);
                    ctx.fillStyle = "#000";
                    ctx.fillText(p + " (" + wins + ")", x, 295);
                    x += barWidth + 10;
               });

               x += 40; // spacing between games
          });
     }

     document.getElementById("playerInputs").addEventListener("input", updateWinnerOptions);

     render();
