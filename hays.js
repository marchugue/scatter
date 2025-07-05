const ROWS = 4;
const COLS = 5;
const images = [
  { name: 'low1',     weight: 10, },
  { name: 'low2',     weight: 10, },
  { name: 'low3',     weight: 10, },
  { name: 'mid1',     weight: 7,  },
  { name: 'mid2',     weight: 7,  },
  { name: 'high1',    weight: 5,  },
  { name: 'high2',    weight: 5,  },
  { name: 'high3',    weight: 5,  },
  { name: 'scatter',  weight: 1, } // scatters have separate logic
];

const multipliers = {
  low1: [0.2, 0.5, 1.0],
  low2: [0.2, 0.5, 1.0],
  low3: [0.2, 0.5, 1.0],
  mid1: [0.25, 0.6, 1.2],
  mid2: [0.3, 0.8, 1.5],
  high1: [0.4, 1.0, 2.0],
  high2: [0.45, 1.25, 2.25],
  high3: [0.5, 1.5, 2.5]
};

let grid = [];
let currentBet = 10;
let points = 1000;
let totalWin = 0;
let multiplier = 1;
let isSpinning = false;
let scatterReady = false;
let isScatterMode = false;
let scatterSpinsLeft = 0;

const slotContainer = document.getElementById("slot");
const spinBtn = document.getElementById("spin-btn");

updateHUD();
updateSpinButton();

function weightedRandomSymbol(multiplierLevel = 1, allowScatter = false) {
  const adjusted = images
    .filter(img => allowScatter || img.name !== 'scatter') // exclude unless allowed
    .map(img => {
      let adjWeight = img.weight;
      if (multiplierLevel > 1 && adjWeight > 0) {
        adjWeight = Math.max(1, Math.floor(adjWeight / multiplierLevel));
      }
      return { ...img, weight: adjWeight };
    });

  const totalWeight = adjusted.reduce((sum, img) => sum + img.weight, 0);
  let rand = Math.random() * totalWeight;

  for (const img of adjusted) {
    if ((rand -= img.weight) < 0) return img.name;
  }
  return adjusted[0].name;
}

function generateGrid(multiplierLevel = 1) {
  const newGrid = [];
  let scatterCount = 0;

  for (let col = 0; col < COLS; col++) {
    newGrid[col] = [];
    for (let row = 0; row < ROWS; row++) {
      const placeScatter = shouldPlaceScatter(scatterCount);
      const symbol = placeScatter ? "scatter" : weightedRandomSymbol(multiplierLevel);
      if (symbol === "scatter") scatterCount++;
      newGrid[col][row] = symbol;
    }
  }
  return newGrid;
}

function renderGridWithAnimation(grid) {
  slotContainer.innerHTML = "";

  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const img = document.createElement("img");
      const name = grid[col][row];
      img.src = `img/${name}.${name === "scatter" ? "png" : "jpg"}`;
      img.className = "slot-image";
      img.style.animation = `dropFromTop 0.5s ease-out forwards`;
      img.style.animationDelay = `${(col * ROWS + row) * 0.05}s`;

      // Attach position data
      img.dataset.col = col;
      img.dataset.row = row;

      slotContainer.appendChild(img);
    }
  }
}


function applyHighlight(grid) {
  const matched = new Set();

  for (const symbol of images.map(i => i.name).filter(s => s !== "scatter")) {
    let chain = 0;
    const columns = [];

    for (let col = 0; col < COLS; col++) {
      if (grid[col].some(cell => cell === symbol)) {
        chain++;
        columns.push(col);
      } else {
        break;
      }
    }

    if (chain >= 3) {
      for (const col of columns) {
        for (let row = 0; row < ROWS; row++) {
          if (grid[col][row] === symbol) {
            matched.add(`${col}-${row}`);
          }
        }
      }
    }
  }

  const allImages = document.querySelectorAll(".slot-image");
  const anyMatch = matched.size > 0;

  allImages.forEach(img => {
    const col = img.dataset.col;
    const row = img.dataset.row;
    const key = `${col}-${row}`;

    img.classList.remove("highlighted", "dimmed");

    if (anyMatch) {
      if (matched.has(key)) {
        img.classList.add("highlighted");
      } else {
        img.classList.add("dimmed");
      }
    }
  });
}

function countScatter(grid) {
  return grid.flat().filter(x => x === "scatter").length;
}

function shouldPlaceScatter(count) {
  const rand = Math.random();

  if (count === 0) return rand < 0.2;    // 20% chance for first scatter
  if (count === 1) return rand < 0.5;    // 10% chance for second
  if (count === 2) return rand < 0.03;   // 3% chance for third
  if (count === 3) return rand < 0.01;   // 1% chance for fourth
  if (count >= 4) return rand < 0.005;   // 0.5% for fifth or more
  return false;
}

function evaluateWin(grid, bet) {
  let total = 0;

  for (const symbol of images.map(i => i.name)) {
    if (symbol === "scatter") continue;

    let chain = 0;
    for (let col = 0; col < COLS; col++) {
      if (grid[col].some(cell => cell === symbol)) {
        chain++;
      } else break;
    }

    if (chain >= 3) {
      const matchMultiplier = multipliers[symbol][chain - 3]; // 0=3, 1=4, 2=5
      total += matchMultiplier * bet;
    }
  }

  return total;
}

function highlightMultiplier(mult) {
  document.querySelectorAll(".multiplier-box").forEach((box, i) => {
    box.classList.toggle("active", i === mult - 1);
  });
}

function updateHUD() {
  document.getElementById('points-box').textContent = `Points: ${points}`;
  const betBox = document.getElementById('bet-box');
  betBox.textContent = `Bet: ${currentBet} ▼`;

  // Lock/unlock bet box
  if (isSpinning) {
    betBox.classList.add("disabled");
    document.querySelector(".bet-options").classList.add("hidden");
  } else {
    betBox.classList.remove("disabled");
  }

  document.getElementById('win-box').textContent = `Total Win: ${totalWin}`;
}

function updateSpinButton() {
  if (scatterReady) {
    spinBtn.textContent = "Start Bonus";
  } else if (isScatterMode) {
    spinBtn.textContent = `Free Spin (${scatterSpinsLeft})`;
  } else {
    spinBtn.textContent = "SPIN";
  }
}

function stopChain(immediate = false) {
  multiplier = 1;
  highlightMultiplier(0);
  isSpinning = false;

  if (!immediate && totalWin > 0) {
    setTimeout(() => {
      totalWin = 0;
      updateHUD();
    }, 2000);
  } else {
    totalWin = 0;
    updateHUD();
  }

  updateSpinButton();
}

function doSubSpin() {
  const grid = generateGrid(multiplier);

  // Delay BEFORE drop animation starts (e.g., 500ms)
  const preDropDelay = 500;

  setTimeout(() => {
    renderGridWithAnimation(grid);

    // Wait for the drop animation to finish before applying highlights and evaluating win
    const animationDuration = COLS * ROWS * 50 + 500; // animation stagger + buffer

    setTimeout(() => {
      applyHighlight(grid);

      const scatters = countScatter(grid);
      let pts = 0;

      if (!isScatterMode && scatters >= 3) {
        scatterReady = true;
        updateSpinButton();
        return stopChain(true);
      }

      if (scatters >= 3) {
        pts += (scatters === 3) ? 30 : (scatters === 4) ? 60 : 100;
      }

      const baseWin = evaluateWin(grid, currentBet);
      pts += baseWin;

      if (pts > 0) {
        const win = pts * multiplier;
        totalWin += win;
        points += win;
        updateHUD();
        highlightMultiplier(multiplier);

        if (multiplier < 5) {
          multiplier++;
          doSubSpin(); // next spin in the chain
        } else {
          stopChain();
        }
      } else {
        stopChain();
      }
    }, animationDuration);

  }, preDropDelay);
}

function updateScatterGlow() {
  const slotContainer = document.getElementById("slot");
  if (isScatterMode) {
    slotContainer.classList.add("scatter-glow");
  } else {
    slotContainer.classList.remove("scatter-glow");
  }
}

function spin() {
  if (isSpinning) return;
  if (!isScatterMode && points < currentBet) return;

  if (scatterReady) {
    isScatterMode = true;
    scatterReady = false;
    scatterSpinsLeft = 10;
    updateSpinButton();
    updateScatterGlow(); // <-- add this
    return;
  }

  isSpinning = true;
  updateSpinButton();

  if (isScatterMode) {
    scatterSpinsLeft--;
    if (scatterSpinsLeft <= 0) {
      isScatterMode = false;
    }
  } else {
    points -= currentBet;
    updateHUD();
  }

  updateScatterGlow(); // <-- also add this here
  doSubSpin();
}


// Toggle bet dropdown
document.getElementById("bet-box").addEventListener("click", () => {
  const options = document.querySelector(".bet-options");
  options.classList.toggle("hidden");
});

// Handle bet selection
document.querySelectorAll(".bet-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    currentBet = parseInt(btn.dataset.bet);
    updateHUD();
    document.getElementById("bet-box").textContent = `Bet: ${currentBet} ▼`;
    document.querySelector(".bet-options").classList.add("hidden");
  });
});
