// Global application state
let currentResults = null;
let currentUnit = "ס״מ";
let isStepsOpen = true;
let deferredPrompt = null; // Holds the PWA install prompt event

// Input fields list
const INPUT_IDS = ['input-a', 'input-b', 'input-c', 'input-alpha', 'input-beta'];

// Initial application boot
window.addEventListener('DOMContentLoaded', () => {
  initPWAInstall();
  handleUnitChange();
  renderInitialMath();
  initNumpadNextHandler();
});

// Render all static LaTeX math in the document body on boot
function renderInitialMath() {
  setTimeout(() => {
    try {
      if (window.renderMathInElement) {
        window.renderMathInElement(document.body, {
          delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false}
          ],
          throwOnError: false
        });
      }
    } catch (e) {
      console.error("Initial math rendering error:", e);
    }
  }, 100);
}

// Setup unit selector listener
window.handleUnitChange = function() {
  const select = document.getElementById('unit-select');
  currentUnit = select.value;
  
  // Update unit label displays
  const unitLabels = document.querySelectorAll('.current-unit');
  unitLabels.forEach(el => el.innerHTML = currentUnit);
  
  if (currentResults) {
    drawTriangle(currentResults.a, currentResults.b, currentResults.c, currentResults.alpha, currentResults.beta, false);
  } else {
    drawTriangle(3, 4, 5, 36.87, 53.13, true);
  }
}

// Reset all inputs and views
window.resetAll = function() {
  INPUT_IDS.forEach(id => {
    const input = document.getElementById(id);
    input.value = '';
    input.disabled = false;
    input.classList.remove('border-emerald-500', 'text-emerald-400', 'bg-slate-900/50', 'border-indigo-500', 'border-red-500');
    
    const badgeId = 'badge-' + id.replace('input-', '');
    const badge = document.getElementById(badgeId);
    badge.classList.add('hidden');
    badge.innerHTML = '';

    const errorMsgDiv = document.getElementById('error-msg-' + id);
    if (errorMsgDiv) {
      errorMsgDiv.classList.add('hidden');
    }
  });
  
  const btn = document.getElementById('btn-calculate');
  btn.disabled = true;
  btn.classList.add('cursor-not-allowed', 'bg-slate-800', 'text-slate-500');
  btn.classList.remove('bg-gradient-to-r', 'from-indigo-600', 'to-violet-500', 'hover:from-indigo-500', 'hover:to-violet-400', 'text-white', 'shadow-indigo-500/30', 'cursor-pointer');
  
  document.getElementById('helper-msg').textContent = "הזן לפחות שני נתונים (עם צלע אחת לפחות) כדי לאפשר פתרון.";
  document.getElementById('helper-msg').classList.remove('text-red-400');
  
  clearResults();
  hideError();
}

// Clear display fields
function clearResults() {
  currentResults = null;
  document.getElementById('res-a').innerHTML = '-';
  document.getElementById('res-b').innerHTML = '-';
  document.getElementById('res-c').innerHTML = '-';
  document.getElementById('res-alpha').innerHTML = '-';
  document.getElementById('res-beta').innerHTML = '-';
  
  // Default visual mockup triangle (3-4-5) with dashed strokes
  drawTriangle(3, 4, 5, 36.87, 53.13, true);
  
  document.getElementById('steps-container').innerHTML = `
    <div class="text-xs text-slate-500 py-4 flex items-center gap-2">
      <i class="fa-solid fa-circle-info"></i>
      ממתין להזנת לפחות 2 נתונים חיוביים (עם צלע אחת לפחות) ולחיצה על "פתור משולש".
    </div>
  `;
}

// Apply presets for testing/demos
window.applyPreset = function(presetType) {
  window.resetAll();
  hideError();

  if (presetType === 'pythagorean') {
    document.getElementById('input-a').value = 3;
    document.getElementById('input-b').value = 4;
  }
  
  window.handleInputChange();
  window.triggerCalculate();
}

// Real-time input validation and styling
window.handleInputChange = function() {
  hideError();
  
  // If we have calculated results and the user edits an active input,
  // automatically clear calculated results and unlock fields to drafting state.
  if (currentResults) {
    INPUT_IDS.forEach(id => {
      const input = document.getElementById(id);
      if (input.disabled) {
        input.value = '';
        input.disabled = false;
        input.classList.remove('border-emerald-500', 'text-emerald-400', 'bg-slate-900/50');
        
        const badgeId = 'badge-' + id.replace('input-', '');
        const badge = document.getElementById(badgeId);
        badge.classList.add('hidden');
        badge.innerHTML = '';
      }
    });
    
    currentResults = null;
    
    // Clear scorecard results back to placeholder
    document.getElementById('res-a').innerHTML = '-';
    document.getElementById('res-b').innerHTML = '-';
    document.getElementById('res-c').innerHTML = '-';
    document.getElementById('res-alpha').innerHTML = '-';
    document.getElementById('res-beta').innerHTML = '-';
    
    // Reset steps container
    document.getElementById('steps-container').innerHTML = `
      <div class="text-xs text-slate-500 py-4 flex items-center gap-2">
        <i class="fa-solid fa-circle-info"></i>
        ממתין להזנת לפחות 2 נתונים חיוביים (עם צלע אחת לפחות) ולחיצה על "פתור משולש".
      </div>
    `;
    
    // Draw default dashed triangle
    drawTriangle(3, 4, 5, 36.87, 53.13, true);
  }
  
  // Clear any existing input error markings
  INPUT_IDS.forEach(id => {
    const input = document.getElementById(id);
    input.classList.remove('border-red-500', 'border-indigo-500');
    const errorMsgDiv = document.getElementById('error-msg-' + id);
    if (errorMsgDiv) {
      errorMsgDiv.classList.add('hidden');
    }
  });

  const activeInputs = [];
  INPUT_IDS.forEach(id => {
    const input = document.getElementById(id);
    const val = parseFloat(input.value);
    if (!isNaN(val) && val > 0) {
      activeInputs.push({ id, val, key: id.replace('input-', '') });
    }
  });

  const valMap = {};
  activeInputs.forEach(item => {
    valMap[item.key] = item.val;
  });

  // Set default badges hiding
  INPUT_IDS.forEach(id => {
    const badgeId = 'badge-' + id.replace('input-', '');
    const badge = document.getElementById(badgeId);
    if (badge) {
      badge.classList.add('hidden');
      badge.innerHTML = '';
    }
  });

  const hasSide = activeInputs.some(item => ['a', 'b', 'c'].includes(item.key));
  const btn = document.getElementById('btn-calculate');
  const helper = document.getElementById('helper-msg');

  if (activeInputs.length === 2) {
    // Apply standard user entered indigo borders & badges
    activeInputs.forEach(item => {
      const input = document.getElementById(item.id);
      input.classList.add('border-indigo-500');
      const badgeId = 'badge-' + item.key;
      const badge = document.getElementById(badgeId);
      if (badge) {
        badge.classList.remove('hidden', 'bg-emerald-950/50', 'text-emerald-300');
        badge.classList.add('bg-indigo-950/50', 'text-indigo-300');
        badge.innerHTML = 'הוזן';
      }
    });

    if (!hasSide) {
      btn.disabled = true;
      btn.classList.add('cursor-not-allowed', 'bg-slate-800', 'text-slate-500');
      btn.classList.remove('bg-gradient-to-r', 'from-indigo-600', 'to-violet-500', 'hover:from-indigo-500', 'hover:to-violet-400', 'text-white', 'shadow-indigo-500/30', 'cursor-pointer');
      helper.textContent = "לא ניתן לפתור משולש מזוויות בלבד (חייבת להיות לפחות צלע אחת!).";
      helper.classList.add('text-red-400');
    } else {
      // Validate guardrails before enabling calculation
      let isValid = true;
      let errorMsg = "";
      
      const sideA = valMap['a'];
      const sideB = valMap['b'];
      const sideC = valMap['c'];
      const alphaVal = valMap['alpha'];
      const betaVal = valMap['beta'];
      
      if (alphaVal !== undefined && (alphaVal <= 0 || alphaVal >= 90)) {
        isValid = false;
        errorMsg = "הזווית אלפא (α) חייבת להיות גדולה מ-0 וקטנה מ-90 מעלות!";
      } else if (betaVal !== undefined && (betaVal <= 0 || betaVal >= 90)) {
        isValid = false;
        errorMsg = "הזווית בטא (β) חייבת להיות גדולה מ-0 וקטנה מ-90 מעלות!";
      } else if (sideA !== undefined && sideC !== undefined && sideA >= sideC) {
        isValid = false;
        errorMsg = "הניצב האנכי (a) חייב להיות קטן מהיתר (c)!";
      } else if (sideB !== undefined && sideC !== undefined && sideB >= sideC) {
        isValid = false;
        errorMsg = "הניצב האופקי (b) חייב להיות קטן מהיתר (c)!";
      }
      
      if (!isValid) {
        btn.disabled = true;
        btn.classList.add('cursor-not-allowed', 'bg-slate-800', 'text-slate-500');
        btn.classList.remove('bg-gradient-to-r', 'from-indigo-600', 'to-violet-500', 'hover:from-indigo-500', 'hover:to-violet-400', 'text-white', 'shadow-indigo-500/30', 'cursor-pointer');
        helper.textContent = errorMsg;
        helper.classList.add('text-red-400');
      } else {
        btn.disabled = false;
        btn.classList.remove('cursor-not-allowed', 'bg-slate-800', 'text-slate-500');
        btn.classList.add('bg-gradient-to-r', 'from-indigo-600', 'to-violet-500', 'hover:from-indigo-500', 'hover:to-violet-400', 'text-white', 'shadow-indigo-500/30', 'cursor-pointer');
        helper.textContent = "הנתונים מספיקים! לחץ על כפתור 'פתור משולש' לקבלת התוצאה המלאה.";
        helper.classList.remove('text-red-400');
      }
    }
  } else if (activeInputs.length > 2) {
    btn.disabled = true;
    btn.classList.add('cursor-not-allowed', 'bg-slate-800', 'text-slate-500');
    btn.classList.remove('bg-gradient-to-r', 'from-indigo-600', 'to-violet-500', 'hover:from-indigo-500', 'hover:to-violet-400', 'text-white', 'shadow-indigo-500/30', 'cursor-pointer');
    helper.textContent = "שגיאה: הזנת יותר מדי נתונים. יש להזין בדיוק שני נתונים.";
    helper.classList.add('text-red-400');
    showError("שגיאה: יש להזין בדיוק שני נתונים כדי לפתור את המשולש.");

    // Highlight active inputs in red and show inline warning message right below them
    activeInputs.forEach(item => {
      const input = document.getElementById(item.id);
      input.classList.add('border-red-500');
      const errorMsgDiv = document.getElementById('error-msg-' + item.id);
      if (errorMsgDiv) {
        errorMsgDiv.classList.remove('hidden');
      }
    });
  } else {
    // length < 2
    // Apply standard user entered indigo borders for any partially filled input
    activeInputs.forEach(item => {
      const input = document.getElementById(item.id);
      input.classList.add('border-indigo-500');
      const badgeId = 'badge-' + item.key;
      const badge = document.getElementById(badgeId);
      if (badge) {
        badge.classList.remove('hidden', 'bg-emerald-950/50', 'text-emerald-300');
        badge.classList.add('bg-indigo-950/50', 'text-indigo-300');
        badge.innerHTML = 'הוזן';
      }
    });

    btn.disabled = true;
    btn.classList.add('cursor-not-allowed', 'bg-slate-800', 'text-slate-500');
    btn.classList.remove('bg-gradient-to-r', 'from-indigo-600', 'to-violet-500', 'hover:from-indigo-500', 'hover:to-violet-400', 'text-white', 'shadow-indigo-500/30', 'cursor-pointer');
    helper.textContent = "הזן לפחות שני נתונים (עם צלע אחת לפחות) כדי לאפשר פתרון.";
    helper.classList.remove('text-red-400');
  }
}

// Trigger calculation
window.triggerCalculate = function() {
  // Hide mobile keyboard by blurring focus
  if (document.activeElement && typeof document.activeElement.blur === 'function') {
    document.activeElement.blur();
  }

  const active = [];
  INPUT_IDS.forEach(id => {
    const input = document.getElementById(id);
    const val = parseFloat(input.value);
    if (!isNaN(val) && val > 0) active.push({ id, val });
  });

  if (active.length === 2) {
    liveCalculate(active);
  }
}

// Solve right-angled triangle
function liveCalculate(activeInputsList) {
  let active = activeInputsList;
  if (!active) {
    active = [];
    INPUT_IDS.forEach(id => {
      const input = document.getElementById(id);
      const val = parseFloat(input.value);
      if (!isNaN(val) && val > 0) active.push({ id, val });
    });
  }

  let a, b, c, alpha, beta;
  const radToDeg = 180 / Math.PI;
  const degToRad = Math.PI / 180;
  let solveSteps = [];

  const valMap = {};
  active.forEach(item => {
    valMap[item.id.replace('input-', '')] = item.val;
  });

  if (valMap['alpha'] !== undefined && valMap['beta'] !== undefined && valMap['a'] === undefined && valMap['b'] === undefined && valMap['c'] === undefined) {
    showError("שגיאה: לא ניתן לפתור משולש באמצעות שתי זוויות בלבד (חובה להזין לפחות צלע אחת!).");
    clearResults();
    return;
  }

  try {
    if (valMap['a'] !== undefined && valMap['b'] !== undefined) {
      a = valMap['a'];
      b = valMap['b'];
      c = Math.sqrt(a*a + b*b);
      alpha = Math.atan(a / b) * radToDeg;
      beta = 90 - alpha;

      solveSteps = [
        {
          title: "חישוב היתר ($c$) באמצעות משפט פיתגורס",
          formula: `c = \\sqrt{a^2 + b^2} = \\sqrt{${a.toFixed(2)}^2 + ${b.toFixed(2)}^2} = \\sqrt{${(a*a).toFixed(2)} + ${(b*b).toFixed(2)}} = \\sqrt{${(c*c).toFixed(2)}} = ${c.toFixed(2)}`
        },
        {
          title: "חישוב הזווית $\\alpha$ באמצעות פונקציית הטנגנס",
          formula: `\\tan(\\alpha) = \\frac{a}{b} = \\frac{${a.toFixed(2)}}{${b.toFixed(2)}} \\approx ${(a/b).toFixed(4)} \\implies \\alpha = \\arctan(${(a/b).toFixed(4)}) = ${alpha.toFixed(2)}^\\circ`
        },
        {
          title: "חישוב הזווית המשלימה $\\beta$",
          formula: `\\beta = 90^\\circ - \\alpha = 90^\\circ - ${alpha.toFixed(2)}^\\circ = ${beta.toFixed(2)}^\\circ`
        }
      ];
    } 
    else if (valMap['a'] !== undefined && valMap['c'] !== undefined) {
      a = valMap['a'];
      c = valMap['c'];
      if (a >= c) {
        showError("שגיאה מתמטית: הניצב (a) חייב להיות קצר מהיתר (c)!");
        clearResults();
        return;
      }
      b = Math.sqrt(c*c - a*a);
      alpha = Math.asin(a / c) * radToDeg;
      beta = 90 - alpha;

      solveSteps = [
        {
          title: "חישוב הניצב האופקי ($b$) באמצעות משפט פיתגורס",
          formula: `b = \\sqrt{c^2 - a^2} = \\sqrt{${c.toFixed(2)}^2 - ${a.toFixed(2)}^2} = \\sqrt{${(c*c).toFixed(2)} - ${(a*a).toFixed(2)}} = \\sqrt{${(b*b).toFixed(2)}} = ${b.toFixed(2)}`
        },
        {
          title: "חישוב הזווית $\\alpha$ באמצעות פונקציית הסינוס",
          formula: `\\sin(\\alpha) = \\frac{a}{c} = \\frac{${a.toFixed(2)}}{${c.toFixed(2)}} \\approx ${(a/c).toFixed(4)} \\implies \\alpha = \\arcsin(${(a/c).toFixed(4)}) = ${alpha.toFixed(2)}^\\circ`
        },
        {
          title: "חישוב הזווית המשלימה $\\beta$",
          formula: `\\beta = 90^\\circ - \\alpha = 90^\\circ - ${alpha.toFixed(2)}^\\circ = ${beta.toFixed(2)}^\\circ`
        }
      ];
    } 
    else if (valMap['b'] !== undefined && valMap['c'] !== undefined) {
      b = valMap['b'];
      c = valMap['c'];
      if (b >= c) {
        showError("שגיאה מתמטית: הניצב (b) חייב להיות קצר מהיתר (c)!");
        clearResults();
        return;
      }
      a = Math.sqrt(c*c - b*b);
      beta = Math.asin(b / c) * radToDeg;
      alpha = 90 - beta;

      solveSteps = [
        {
          title: "חישוב הניצב האנכי ($a$) באמצעות משפט פיתגורס",
          formula: `a = \\sqrt{c^2 - b^2} = \\sqrt{${c.toFixed(2)}^2 - ${b.toFixed(2)}^2} = \\sqrt{${(c*c).toFixed(2)} - ${(b*b).toFixed(2)}} = \\sqrt{${(a*a).toFixed(2)}} = ${a.toFixed(2)}`
        },
        {
          title: "חישוב הזווית $\\beta$ באמצעות פונקציית הסינוס",
          formula: `\\sin(\\beta) = \\frac{b}{c} = \\frac{${b.toFixed(2)}}{${c.toFixed(2)}} \\approx ${(b/c).toFixed(4)} \\implies \\beta = \\arcsin(${(b/c).toFixed(4)}) = ${beta.toFixed(2)}^\\circ`
        },
        {
          title: "חישוב הזווית המשלימה $\\alpha$",
          formula: `\\alpha = 90^\\circ - \\beta = 90^\\circ - ${beta.toFixed(2)}^\\circ = ${alpha.toFixed(2)}^\\circ`
        }
      ];
    } 
    else if (valMap['a'] !== undefined && valMap['alpha'] !== undefined) {
      a = valMap['a'];
      alpha = valMap['alpha'];
      if (alpha >= 90 || alpha <= 0) {
        showError("הזווית החדה אלפא חייבת להיות בין 0 ל-90 מעלות!");
        clearResults();
        return;
      }
      beta = 90 - alpha;
      c = a / Math.sin(alpha * degToRad);
      b = a / Math.tan(alpha * degToRad);

      solveSteps = [
        {
          title: "חישוב הזווית המשלימה $\\beta$",
          formula: `\\beta = 90^\\circ - \\alpha = 90^\\circ - ${alpha.toFixed(2)}^\\circ = ${beta.toFixed(2)}^\\circ`
        },
        {
          title: "חישוב היתר ($c$) באמצעות פונקציית הסינוס",
          formula: `c = \\frac{a}{\\sin(\\alpha)} = \\frac{${a.toFixed(2)}}{\\sin(${alpha.toFixed(2)}^\\circ)} = \\frac{${a.toFixed(2)}}{${Math.sin(alpha * degToRad).toFixed(4)}} = ${c.toFixed(2)}`
        },
        {
          title: "חישוב הניצב האופקי ($b$) באמצעות פונקציית הטנגנס",
          formula: `b = \\frac{a}{\\tan(\\alpha)} = \\frac{${a.toFixed(2)}}{\\tan(${alpha.toFixed(2)}^\\circ)} = \\frac{${a.toFixed(2)}}{${Math.tan(alpha * degToRad).toFixed(4)}} = ${b.toFixed(2)}`
        }
      ];
    } 
    else if (valMap['a'] !== undefined && valMap['beta'] !== undefined) {
      a = valMap['a'];
      beta = valMap['beta'];
      if (beta >= 90 || beta <= 0) {
        showError("הזווית החדה בטא חייבת להיות בין 0 ל-90 מעלות!");
        clearResults();
        return;
      }
      alpha = 90 - beta;
      c = a / Math.cos(beta * degToRad);
      b = a * Math.tan(beta * degToRad);

      solveSteps = [
        {
          title: "חישוב הזווית המשלימה $\\alpha$",
          formula: `\\alpha = 90^\\circ - \\beta = 90^\\circ - ${beta.toFixed(2)}^\\circ = ${alpha.toFixed(2)}^\\circ`
        },
        {
          title: "חישוב היתר ($c$) באמצעות פונקציית הקוסינוס",
          formula: `c = \\frac{a}{\\cos(\\beta)} = \\frac{${a.toFixed(2)}}{\\cos(${beta.toFixed(2)}^\\circ)} = \\frac{${a.toFixed(2)}}{${Math.cos(beta * degToRad).toFixed(4)}} = ${c.toFixed(2)}`
        },
        {
          title: "חישוב הניצב האופקי ($b$) באמצעות פונקציית הטנגנס",
          formula: `b = a \\cdot \\tan(\\beta) = ${a.toFixed(2)} \\cdot \\tan(${beta.toFixed(2)}^\\circ) = ${a.toFixed(2)} \\cdot ${Math.tan(beta * degToRad).toFixed(4)} = ${b.toFixed(2)}`
        }
      ];
    } 
    else if (valMap['b'] !== undefined && valMap['alpha'] !== undefined) {
      b = valMap['b'];
      alpha = valMap['alpha'];
      if (alpha >= 90 || alpha <= 0) {
        showError("הזווית החדה אלפא חייבת להיות בין 0 ל-90 מעלות!");
        clearResults();
        return;
      }
      beta = 90 - alpha;
      c = b / Math.cos(alpha * degToRad);
      a = b * Math.tan(alpha * degToRad);

      solveSteps = [
        {
          title: "חישוב הזווית המשלימה $\\beta$",
          formula: `\\beta = 90^\\circ - \\alpha = 90^\\circ - ${alpha.toFixed(2)}^\\circ = ${beta.toFixed(2)}^\\circ`
        },
        {
          title: "חישוב היתר ($c$) באמצעות פונקציית הקוסינוס",
          formula: `c = \\frac{b}{\\cos(\\alpha)} = \\frac{${b.toFixed(2)}}{\\cos(${alpha.toFixed(2)}^\\circ)} = \\frac{${b.toFixed(2)}}{${Math.cos(alpha * degToRad).toFixed(4)}} = ${c.toFixed(2)}`
        },
        {
          title: "חישוב הניצב האנכי ($a$) באמצעות פונקציית הטנגנס",
          formula: `a = b \\cdot \\tan(\\alpha) = ${b.toFixed(2)} \\cdot \\tan(${alpha.toFixed(2)}^\\circ) = ${b.toFixed(2)} \\cdot ${Math.tan(alpha * degToRad).toFixed(4)} = ${a.toFixed(2)}`
        }
      ];
    } 
    else if (valMap['b'] !== undefined && valMap['beta'] !== undefined) {
      b = valMap['b'];
      beta = valMap['beta'];
      if (beta >= 90 || beta <= 0) {
        showError("הזווית החדה בטא חייבת להיות בין 0 ל-90 מעלות!");
        clearResults();
        return;
      }
      alpha = 90 - beta;
      c = b / Math.sin(beta * degToRad);
      a = b / Math.tan(beta * degToRad);

      solveSteps = [
        {
          title: "חישוב הזווית המשלימה $\\alpha$",
          formula: `\\alpha = 90^\\circ - \\beta = 90^\\circ - ${beta.toFixed(2)}^\\circ = ${alpha.toFixed(2)}^\\circ`
        },
        {
          title: "חישוב היתר ($c$) באמצעות פונקציית הסינוס",
          formula: `c = \\frac{b}{\\sin(\\beta)} = \\frac{${b.toFixed(2)}}{\\sin(${beta.toFixed(2)}^\\circ)} = \\frac{${b.toFixed(2)}}{${Math.sin(beta * degToRad).toFixed(4)}} = ${c.toFixed(2)}`
        },
        {
          title: "חישוב הניצב האנכי ($a$) באמצעות פונקציית הטנגנס",
          formula: `a = \\frac{b}{\\tan(\\beta)} = \\frac{${b.toFixed(2)}}{\\tan(${beta.toFixed(2)}^\\circ)} = \\frac{${b.toFixed(2)}}{${Math.tan(beta * degToRad).toFixed(4)} = ${a.toFixed(2)}`
        }
      ];
    } 
    else if (valMap['c'] !== undefined && valMap['alpha'] !== undefined) {
      c = valMap['c'];
      alpha = valMap['alpha'];
      if (alpha >= 90 || alpha <= 0) {
        showError("הזווית החדה אלפא חייבת להיות בין 0 ל-90 מעלות!");
        clearResults();
        return;
      }
      beta = 90 - alpha;
      a = c * Math.sin(alpha * degToRad);
      b = c * Math.cos(alpha * degToRad);

      solveSteps = [
        {
          title: "חישוב הזווית המשלימה $\\beta$",
          formula: `\\beta = 90^\\circ - \\alpha = 90^\\circ - ${alpha.toFixed(2)}^\\circ = ${beta.toFixed(2)}^\\circ`
        },
        {
          title: "חישוב הניצב האנכי ($a$) באמצעות פונקציית הסינוס",
          formula: `a = c \\cdot \\sin(\\alpha) = ${c.toFixed(2)} \\cdot \\sin(${alpha.toFixed(2)}^\\circ) = ${c.toFixed(2)} \\cdot ${Math.sin(alpha * degToRad).toFixed(4)} = ${a.toFixed(2)}`
        },
        {
          title: "חישוב הניצב האופקי ($b$) באמצעות פונקציית הקוסינוס",
          formula: `b = c \\cdot \\cos(\\alpha) = ${c.toFixed(2)} \\cdot \\cos(${alpha.toFixed(2)}^\\circ) = ${c.toFixed(2)} \\cdot ${Math.cos(alpha * degToRad).toFixed(4)} = ${b.toFixed(2)}`
        }
      ];
    } 
    else if (valMap['c'] !== undefined && valMap['beta'] !== undefined) {
      c = valMap['c'];
      beta = valMap['beta'];
      if (beta >= 90 || beta <= 0) {
        showError("הזווית החדה בטא חייבת להיות בין 0 ל-90 מעלות!");
        clearResults();
        return;
      }
      alpha = 90 - beta;
      a = c * Math.cos(beta * degToRad);
      b = c * Math.sin(beta * degToRad);

      solveSteps = [
        {
          title: "חישוב הזווית המשלימה $\\alpha$",
          formula: `\\alpha = 90^\\circ - \\beta = 90^\\circ - ${beta.toFixed(2)}^\\circ = ${alpha.toFixed(2)}^\\circ`
        },
        {
          title: "חישוב הניצב האנכי ($a$) באמצעות פונקציית הקוסינוס",
          formula: `a = c \\cdot \\cos(\\beta) = ${c.toFixed(2)} \\cdot \\cos(${beta.toFixed(2)}^\\circ) = ${c.toFixed(2)} \\cdot ${Math.cos(beta * degToRad).toFixed(4)} = ${a.toFixed(2)}`
        },
        {
          title: "חישוב הניצב האופקי ($b$) באמצעות פונקציית הסינוס",
          formula: `b = c \\cdot \\sin(\\beta) = ${c.toFixed(2)} \\cdot \\sin(${beta.toFixed(2)}^\\circ) = ${c.toFixed(2)} \\cdot ${Math.sin(beta * degToRad).toFixed(4)} = ${b.toFixed(2)}`
        }
      ];
    }

    currentResults = { a, b, c, alpha, beta };

    // Update non-user inputs as computed fields
    INPUT_IDS.forEach(id => {
      const key = id.replace('input-', '');
      const input = document.getElementById(id);
      const badgeId = 'badge-' + key;
      const badge = document.getElementById(badgeId);

      const isUserEntered = active.some(item => item.id === id);

      if (!isUserEntered) {
        const calcValue = currentResults[key];
        input.value = calcValue.toFixed(2);
        input.disabled = true;
        input.classList.add('border-emerald-500', 'text-emerald-400', 'bg-slate-900/50');
        
        badge.classList.remove('hidden', 'bg-indigo-950/50', 'text-indigo-300');
        badge.classList.add('bg-emerald-950/50', 'text-emerald-300');
        badge.innerHTML = 'מחושב';
      }
    });

    // Populate calculations display card
    document.getElementById('res-a').innerHTML = a.toFixed(2);
    document.getElementById('res-b').innerHTML = b.toFixed(2);
    document.getElementById('res-c').innerHTML = c.toFixed(2);
    document.getElementById('res-alpha').innerHTML = alpha.toFixed(1) + '°';
    document.getElementById('res-beta').innerHTML = beta.toFixed(1) + '°';

    // Draw the proportional SVG
    drawTriangle(a, b, c, alpha, beta, false);

    // Format steps with KaTeX
    renderMathSteps(solveSteps);

    // Scroll down to the graphic presentation/diagram card
    const diagramCard = document.getElementById('diagram-card');
    if (diagramCard) {
      setTimeout(() => {
        diagramCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }

  } catch (err) {
    showError("אירעה שגיאה בביצוע החישוב: " + err.message);
    clearResults();
  }
}

// Proportional triangle SVG renderer
function drawTriangle(a, b, c, alpha, beta, isDefault = false) {
  const svgWidth = 500;
  const svgHeight = 400;
  const margin = 70;

  const maxWidth = svgWidth - margin * 2;
  const maxHeight = svgHeight - margin * 2;

  const ratio = a / b;
  let drawWidth, drawHeight;

  if (ratio > (maxHeight / maxWidth)) {
    drawHeight = maxHeight;
    drawWidth = drawHeight / ratio;
  } else {
    drawWidth = maxWidth;
    drawHeight = drawWidth * ratio;
  }

  if (drawWidth < 50) { drawWidth = 50; drawHeight = 50 * ratio; }
  if (drawHeight < 50) { drawHeight = 50; drawWidth = 50 / ratio; }

  const xStart = margin + (maxWidth - drawWidth) / 2;
  const yStart = margin + (maxHeight - drawHeight) / 2;

  const xC = xStart;
  const yC = yStart + drawHeight;
  const xA = xStart;
  const yA = yStart;
  const xB = xStart + drawWidth;
  const yB = yStart + drawHeight;

  const poly = document.getElementById('triangle-poly');
  poly.setAttribute('points', `${xA},${yA} ${xC},${yC} ${xB},${yB}`);
  
  if (isDefault) {
    poly.setAttribute('stroke-dasharray', '5 5');
    poly.setAttribute('stroke', '#475569');
  } else {
    poly.removeAttribute('stroke-dasharray');
    poly.setAttribute('stroke', '#6366f1');
  }

  document.getElementById('node-a').setAttribute('cx', xA);
  document.getElementById('node-a').setAttribute('cy', yA);
  document.getElementById('node-b').setAttribute('cx', xB);
  document.getElementById('node-b').setAttribute('cy', yB);
  document.getElementById('node-c').setAttribute('cx', xC);
  document.getElementById('node-c').setAttribute('cy', yC);

  const rSize = Math.min(18, Math.min(drawWidth, drawHeight) * 0.2);
  const rightAngleMarker = document.getElementById('right-angle-marker');
  rightAngleMarker.setAttribute('d', `M ${xC} ${yC - rSize} L ${xC + rSize} ${yC - rSize} L ${xC + rSize} ${yC}`);

  const rArcAlpha = Math.min(30, drawWidth * 0.3);
  const angleRad = (alpha * Math.PI) / 180;
  const xAlphaEnd = xB - rArcAlpha * Math.cos(angleRad);
  const yAlphaEnd = yB - rArcAlpha * Math.sin(angleRad);
  const arcAlpha = document.getElementById('arc-alpha');
  arcAlpha.setAttribute('d', `M ${xB - rArcAlpha} ${yB} A ${rArcAlpha} ${rArcAlpha} 0 0 1 ${xAlphaEnd} ${yAlphaEnd}`);

  const rArcBeta = Math.min(30, drawHeight * 0.3);
  const betaRad = (beta * Math.PI) / 180;
  const xBetaEnd = xA + rArcBeta * Math.sin(betaRad);
  const yBetaEnd = yA + rArcBeta * Math.cos(betaRad);
  const arcBeta = document.getElementById('arc-beta');
  arcBeta.setAttribute('d', `M ${xA} ${yA + rArcBeta} A ${rArcBeta} ${rArcBeta} 0 0 0 ${xBetaEnd} ${yBetaEnd}`);

  const lblA = document.getElementById('lbl-side-a');
  lblA.setAttribute('x', xC - 15);
  lblA.setAttribute('y', yA + drawHeight / 2);
  lblA.textContent = isDefault ? 'a' : `${a.toFixed(1)} ${currentUnit}`;

  const lblB = document.getElementById('lbl-side-b');
  lblB.setAttribute('x', xC + drawWidth / 2);
  lblB.setAttribute('y', yC + 18);
  lblB.textContent = isDefault ? 'b' : `${b.toFixed(1)} ${currentUnit}`;

  const lblC = document.getElementById('lbl-side-c');
  const midX = (xA + xB) / 2;
  const midY = (yA + yB) / 2;
  const dx = xB - xA;
  const dy = yB - yA;
  const len = Math.sqrt(dx*dx + dy*dy);
  const nx = -dy / len;
  const ny = dx / len;
  const offset = 22;
  lblC.setAttribute('x', midX + nx * offset);
  lblC.setAttribute('y', midY + ny * offset);
  lblC.textContent = isDefault ? 'c' : `${c.toFixed(1)} ${currentUnit}`;

  const lblAlpha = document.getElementById('lbl-ang-alpha');
  lblAlpha.setAttribute('x', xB - rArcAlpha - 8);
  lblAlpha.setAttribute('y', yB - 10);
  lblAlpha.textContent = isDefault ? 'α' : `${alpha.toFixed(1)}°`;

  const lblBeta = document.getElementById('lbl-ang-beta');
  lblBeta.setAttribute('x', xA + 12);
  lblBeta.setAttribute('y', yA + rArcBeta + 15);
  lblBeta.textContent = isDefault ? 'β' : `${beta.toFixed(1)}°`;
}

// Render equations in steps using KaTeX
function renderMathSteps(steps) {
  const container = document.getElementById('steps-container');
  
  if (steps.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-500">שגיאה בהפקת שלבי החישוב המפורטים.</p>`;
    return;
  }

  let html = '<div class="space-y-4">';
  steps.forEach((step, idx) => {
    html += `
      <div class="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
        <h4 class="text-xs font-semibold text-indigo-400 flex items-center gap-2">
          <span class="w-5 h-5 rounded-full bg-indigo-950 text-indigo-300 flex items-center justify-center text-[10px] border border-indigo-800">${idx + 1}</span>
          ${step.title}
        </h4>
        <div class="overflow-x-auto py-1 text-slate-200 text-sm font-mono rtl-equations">
          $$${step.formula}$$
        </div>
      </div>
    `;
  });
  html += '</div>';

  container.innerHTML = html;

  setTimeout(() => {
    try {
      if (window.renderMathInElement) {
        window.renderMathInElement(container, {
          delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false}
          ],
          throwOnError: false
        });
      }
    } catch (e) {
      console.error("Math rendering error:", e);
    }
  }, 0);
}

// Toggle explanations panel
window.toggleSteps = function() {
  const container = document.getElementById('steps-container');
  const icon = document.getElementById('steps-toggle-icon');
  isStepsOpen = !isStepsOpen;
  
  if (isStepsOpen) {
    container.classList.remove('hidden');
    icon.classList.remove('rotate-180');
  } else {
    container.classList.add('hidden');
    icon.classList.add('rotate-180');
  }
}

// Copy results to clipboard
window.copyResults = function() {
  if (!currentResults) {
    showToast("אין תוצאות להעתקה! פתור תחילה את המשולש.");
    return;
  }
  
  const text = `מחשבון משולש ישר זווית - תוצאות:\n` +
               `ניצב אנכי (a): ${currentResults.a.toFixed(2)} ${currentUnit}\n` +
               `ניצב אופקי (b): ${currentResults.b.toFixed(2)} ${currentUnit}\n` +
               `יתר (c): ${currentResults.c.toFixed(2)} ${currentUnit}\n` +
               `זווית אלפא (α): ${currentResults.alpha.toFixed(2)}°\n` +
               `זווית בטא (β): ${currentResults.beta.toFixed(2)}°\n` +
               `זווית ישרה (γ): 90.0°`;

  // Fallback function for copying text in sandboxed iframes
  function copyFallback(str) {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = str;
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      textArea.style.width = "2em";
      textArea.style.height = "2em";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";
      
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        showToast("התוצאות הועתקו ללוח!");
      } else {
        showToast("העתקה נכשלה. נסה שוב.");
      }
    } catch (err) {
      console.error('Fallback copy failed: ', err);
      showToast("העתקה נכשלה. נסה שוב.");
    }
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast("התוצאות הועתקו ללוח!");
    }).catch(err => {
      console.warn('Navigator clipboard failed, trying fallback: ', err);
      copyFallback(text);
    });
  } else {
    copyFallback(text);
  }
}

// Error handling helpers
function showError(message) {
  const errorBox = document.getElementById('error-box');
  const errorText = document.getElementById('error-text');
  errorText.innerHTML = message;
  errorBox.classList.remove('hidden');
}

function hideError() {
  const errorBox = document.getElementById('error-box');
  errorBox.classList.add('hidden');
}

// Custom Toast notification popup
function showToast(message) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-message');
  toastMsg.textContent = message;
  toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
  
  setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
  }, 3000);
}

// ==========================================
// PWA Installation & Environment Management
// ==========================================

function initPWAInstall() {
  const installBtn = document.getElementById('btn-pwa-install');
  const iosBtn = document.getElementById('btn-ios-pwa-install');
  const iosOverlay = document.getElementById('ios-install-overlay');

  // Register service worker for offline support
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker Registered successfully', reg.scope))
      .catch(err => console.error('Service Worker registration failed', err));
  }

  // Check if app is already running in standalone app mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  if (isStandalone) {
    // Already installed and opened as an app, hide all install prompts
    if (installBtn) installBtn.classList.add('hidden');
    if (iosBtn) iosBtn.classList.add('hidden');
    return;
  }

  // Detect iOS Safari specifically
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  if (isIOS) {
    // For iOS, the programmatic beforeinstallprompt is not supported, so we show the iOS helper button
    if (installBtn) installBtn.classList.add('hidden');
    if (iosBtn) {
      iosBtn.classList.remove('hidden');
      iosBtn.addEventListener('click', () => {
        if (iosOverlay) iosOverlay.classList.remove('hidden');
      });
    }
    
    // Close overlay triggers
    const closeOverlay = () => {
      if (iosOverlay) iosOverlay.classList.add('hidden');
    };
    
    const overlayCloseBtn = document.getElementById('btn-close-overlay');
    if (overlayCloseBtn) overlayCloseBtn.addEventListener('click', closeOverlay);
    if (iosOverlay) iosOverlay.addEventListener('click', (e) => {
      if (e.target === iosOverlay) closeOverlay();
    });
    
    return; // Stop here for iOS
  }

  // Standard PWA Installation prompt listener (Android/Chrome/Windows/macOS Chrome)
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent default browser install dialog
    e.preventDefault();
    deferredPrompt = e;
    
    // Show the custom "הוסף למסך הבית" button
    if (installBtn) {
      installBtn.classList.remove('hidden');
      
      installBtn.onclick = () => {
        // Hide the install button
        installBtn.classList.add('hidden');
        
        // Show browser prompt
        deferredPrompt.prompt();
        
        // Check user response
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the PWA install prompt');
          } else {
            console.log('User dismissed the PWA install prompt');
            // Re-show button if they rejected
            installBtn.classList.remove('hidden');
          }
          deferredPrompt = null;
        });
      };
    }
  });

  // Listener for successful installation
  window.addEventListener('appinstalled', (evt) => {
    console.log('Triangles Calc app was successfully installed!');
    if (installBtn) installBtn.classList.add('hidden');
    if (iosBtn) iosBtn.classList.add('hidden');
    showToast("האפליקציה הותקנה בהצלחה!");
  });
}

// Scroll to the top of the page smoothly
window.scrollToTop = function() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Monitor scroll to show/hide the "Back to Top" sticky button
window.addEventListener('scroll', () => {
  const btn = document.getElementById('btn-back-to-top');
  if (!btn) return;
  
  // Show button if scrolled past 300px (i.e. past the input area)
  if (window.scrollY > 300) {
    btn.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
  } else {
    btn.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
  }
});

// Focus the submit button directly if 2 valid inputs are filled and Next/Enter is clicked on keyboard
function initNumpadNextHandler() {
  INPUT_IDS.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
          const val = parseFloat(input.value);
          if (!isNaN(val) && val > 0) {
            // Count active inputs
            const activeCount = INPUT_IDS.reduce((count, inputId) => {
              const inp = document.getElementById(inputId);
              const v = parseFloat(inp.value);
              return count + (!isNaN(v) && v > 0 ? 1 : 0);
            }, 0);

            // If we have exactly 2 valid values
            if (activeCount === 2) {
              const btn = document.getElementById('btn-calculate');
              if (btn && !btn.disabled) {
                e.preventDefault();
                btn.focus();
              }
            }
          }
        }
      });
    }
  });
}
