
  // ============================================================
  //  SALES REPORT – integrates with existing POS (deductStock, etc)
  //  Uses localStorage key 'salesHistory' with enriched entries.
  //  Generates daily summary, profit/loss estimation.
  // ============================================================

  // ---------- CORE HELPERS ----------
  function getProducts() { return JSON.parse(localStorage.getItem('products')) || []; }
  function getSalesHistory() { return JSON.parse(localStorage.getItem('salesHistory')) || []; }
  function saveSalesHistory(history) { localStorage.setItem('salesHistory', JSON.stringify(history)); }

  // ---------- NOTIFICATION (reuse) ----------
  function notify(msg, title = 'Alert') {
    document.getElementById('notifyTitle').innerText = title;
    document.getElementById('notifyMessage').innerText = msg;
    document.getElementById('notifyBox').style.display = 'flex';
  }
  function closeNotify() { document.getElementById('notifyBox').style.display = 'none'; }
  document.getElementById('notifyBox').addEventListener('click', function(e) { if (e.target === this) closeNotify(); });

  // ---------- DATE HELPERS ----------
  function todayStr() { return new Date().toISOString().slice(0,10); }
  function formatTime(d) { return d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }); }

  // ---------- ESTIMATE PROFIT/LOSS (mock cost = 60% of price) ----------
  function estimateProfitLoss(sale) {
    // cost estimation: assume cost is 60% of selling price (for demo)
    const costFactor = 0.60;
    let totalCost = 0, totalRevenue = 0;
    sale.items.forEach(item => {
      const price = Number(item.price) || 0;
      const qty = Number(item.qty) || 0;
      totalRevenue += price * qty;
      totalCost += (price * costFactor) * qty;
    });
    // apply discount proportionally to revenue
    const discount = Number(sale.discount) || 0;
    const revenueAfterDisc = totalRevenue - discount;
    const profit = revenueAfterDisc - totalCost;
    const loss = profit < 0 ? Math.abs(profit) : 0;
    return { profit: Math.max(0, profit), loss, grossRevenue: totalRevenue, revenueAfterDisc };
  }

  // ---------- BUILD DAILY REPORT ----------
  function getDailyReport(dateStr = todayStr()) {
    const history = getSalesHistory();
    const daySales = history.filter(s => s.date === dateStr || s._date === dateStr);
    // enrich with _date if missing
    daySales.forEach(s => { if (!s._date) s._date = s.date || todayStr(); });

    let totalWithDisc = 0, totalNoDisc = 0, totalDiscount = 0;
    let totalProfit = 0, totalLoss = 0, netSales = 0;
    let itemCount = 0;
    const enriched = daySales.map(sale => {
      const disc = Number(sale.discount) || 0;
      const gross = Number(sale.total) || 0;
      const net = gross - disc;
      const est = estimateProfitLoss(sale);
      totalWithDisc += net;
      totalNoDisc += gross;
      totalDiscount += disc;
      totalProfit += est.profit;
      totalLoss += est.loss;
      netSales += net;
      sale.items.forEach(it => { itemCount += Number(it.qty) || 0; });
      return { ...sale, _net: net, _profit: est.profit, _loss: est.loss };
    });

    return {
      date: dateStr,
      transactions: enriched,
      stats: {
        totalWithDisc,
        totalNoDisc,
        totalDiscount,
        totalProfit,
        totalLoss,
        netSales,
        txCount: enriched.length,
        itemsSold: itemCount
      }
    };
  }

  // ---------- RENDER TODAY'S REPORT ----------
  function renderTodayReport() {
    const report = getDailyReport(todayStr());
    const stats = report.stats;

    document.getElementById('reportDate').innerText = `📆 ${todayStr()}`;
    document.getElementById('statTotalWithDisc').innerText = stats.totalWithDisc.toFixed(2);
    document.getElementById('statTotalNoDisc').innerText = stats.totalNoDisc.toFixed(2);
    document.getElementById('statTotalDisc').innerText = stats.totalDiscount.toFixed(2);
    document.getElementById('statProfit').innerText = stats.totalProfit.toFixed(2);
    document.getElementById('statLoss').innerText = stats.totalLoss.toFixed(2);
    document.getElementById('statNetSales').innerText = stats.netSales.toFixed(2);
    document.getElementById('statTxCount').innerText = stats.txCount;
    document.getElementById('statItemsSold').innerText = stats.itemsSold;

    const tbody = document.getElementById('todaySalesBody');
    const emptyMsg = document.getElementById('emptyTodayMsg');
    tbody.innerHTML = '';
    if (report.transactions.length === 0) {
      emptyMsg.style.display = 'block';
      return;
    }
    emptyMsg.style.display = 'none';
    report.transactions.forEach((sale, idx) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${idx+1}</td>
        <td>${sale.time || '--'}</td>
        <td>${sale.customer || 'Guest'}</td>
        <td>${sale.items?.length || 0}</td>
        <td>${Number(sale.total).toFixed(2)}</td>
        <td>${Number(sale.discount || 0).toFixed(2)}</td>
        <td>${Number(sale.paid || 0).toFixed(2)}</td>
        <td>${Number(sale.balance || 0).toFixed(2)}</td>
      `;
      tbody.appendChild(row);
    });
  }

  // ---------- GENERATE DAILY REPORT (manual refresh) ----------
  function generateDailyReport() {
    renderTodayReport();
    notify('Daily report updated', '📊 Report');
  }

  // ---------- CLEAR TODAY (only today's entries) ----------
  function clearTodayReport() {
    if (!confirm('Clear all sales recorded today?')) return;
    let history = getSalesHistory();
    const today = todayStr();
    history = history.filter(s => (s.date !== today && s._date !== today));
    saveSalesHistory(history);
    renderTodayReport();
    notify('Today\'s sales cleared', 'Cleared');
  }

  // ---------- FULL HISTORY REPORT (overlay) ----------
  function openHistoryReport() {
    document.getElementById('historyReportOverlay').style.display = 'flex';
    generateFullReport();
  }
  function closeHistoryReport() { document.getElementById('historyReportOverlay').style.display = 'none'; }

  function generateFullReport() {
    const history = getSalesHistory();
    const list = document.getElementById('fullHistoryList');
    const statsDiv = document.getElementById('fullReportStats');

    if (!history.length) {
      list.innerHTML = '<p style="color:#6d8aa8;">No sales in history.</p>';
      statsDiv.innerHTML = '<span>No data</span>';
      return;
    }

    // aggregate all
    let totalWithDisc = 0, totalNoDisc = 0, totalDiscount = 0;
    let totalProfit = 0, totalLoss = 0, netSales = 0;
    let totalTx = history.length, totalItems = 0;

    history.forEach(sale => {
      const disc = Number(sale.discount) || 0;
      const gross = Number(sale.total) || 0;
      const net = gross - disc;
      const est = estimateProfitLoss(sale);
      totalWithDisc += net;
      totalNoDisc += gross;
      totalDiscount += disc;
      totalProfit += est.profit;
      totalLoss += est.loss;
      netSales += net;
      sale.items.forEach(it => { totalItems += Number(it.qty) || 0; });
    });

    statsDiv.innerHTML = `
      <div><strong>🧾 Tx:</strong> ${totalTx}</div>
      <div><strong>💰 Net:</strong> ${netSales.toFixed(2)}</div>
      <div><strong>📉 Disc:</strong> ${totalDiscount.toFixed(2)}</div>
      <div><strong>📈 Profit:</strong> ${totalProfit.toFixed(2)}</div>
      <div><strong>📉 Loss:</strong> ${totalLoss.toFixed(2)}</div>
      <div><strong>📦 Items:</strong> ${totalItems}</div>
    `;

    list.innerHTML = '';
    history.slice().reverse().forEach((sale, idx) => {
      const realIdx = history.length - 1 - idx;
      const est = estimateProfitLoss(sale);
      const div = document.createElement('div');
      div.className = 'history-item';
      div.innerHTML = `
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;">
          <span><strong>#${realIdx+1}</strong> ${sale.date || '--'} ${sale.time || ''}</span>
          <span>👤 ${sale.customer || 'Guest'}</span>
          <span>Items: ${sale.items?.length || 0}</span>
          <span>Total: ${Number(sale.total).toFixed(2)}</span>
          <span>Disc: ${Number(sale.discount || 0).toFixed(2)}</span>
          <span>Net: ${(Number(sale.total)-Number(sale.discount||0)).toFixed(2)}</span>
          <span style="color:${est.profit>=0?'#1f8b4c':'#c73e4f'}">${est.profit>=0?'+':'-'}${est.profit.toFixed(2)}</span>
        </div>
        <div style="font-size:0.8rem;color:#3f5f7a;margin-top:4px;">
          ${sale.items?.map(i => `${i.name} (${i.qty})`).join(' · ') || ''}
        </div>
      `;
      list.appendChild(div);
    });
  }

  // ---------- CLEAR ALL HISTORY ----------
  function clearAllHistory() {
    if (!confirm('Delete ALL sales history?')) return;
    saveSalesHistory([]);
    renderTodayReport();
    generateFullReport();
    notify('All history cleared', 'Cleared');
  }

  // ---------- INTEGRATION: call this after each sale (from POS) ----------
  // This function should be called inside completeSale() after saving.
  // We'll override the original completeSale to include report refresh.
  // But we keep the original logic – we just hook into it.

  // ---------- PATCH: extend completeSale to refresh report ----------
  // We'll store reference to original if needed, but we can just override.
  // (This runs after the main script, so we can safely replace the function)

  // Backup original if exists (but we are in same scope)
  const originalCompleteSale = window.completeSale;

  // Override completeSale to also refresh daily report
  window.completeSale = function() {
    // call original logic (which is defined earlier in the page)
    if (typeof originalCompleteSale === 'function') {
      originalCompleteSale();
    } else {
      // fallback: just deduct and save (simplified)
      const sale = getSaleData();
      if (!sale) return;
      const success = deductStock(sale.items);
      if (!success) return;
      let history = getSalesHistory();
      history.push(sale);
      saveSalesHistory(history);
      // print receipt etc (simplified)
      const win = window.open('', '_blank', 'width=320,height=600');
      win.document.write(`<html><head><title>Receipt</title><style>body{background:white;color:black;font-family:monospace;padding:8px;}</style></head><body onload="window.print()">${buildReceiptHTML(sale)}</body></html>`);
      win.document.close();
      clearTable(); 
      document.getElementById('discount').value = ''; 
      document.getElementById('paid').value = ''; 
      updatePayment();
    }
    // refresh daily report after sale
    renderTodayReport();
    notify('Sale recorded · report updated', '✅ Sale');
  };

  // also patch asideSale / restoreSale to refresh? only completeSale affects stock.
  // but we also want report to reflect any changes.

  // ---------- INIT ----------
  window.onload = function() {
    // ensure products exist (from original)
    if (!getProducts().length) {
      const demo = [
        { code: 'P001', name: 'Milk 500ml', stock: 500, type: 'Dairy', price: 60 },
        { code: 'P002', name: 'Milk 200ml', stock: 500, type: 'Dairy', price: 30 },
        { code: 'P003', name: 'Bread', stock: 15, type: 'Bakery', price: 80 },
        { code: 'P004', name: 'Eggs 6pcs', stock: 30, type: 'Dairy', price: 100 },
        { code: 'P005', name: 'Butter 500g', stock: 8, type: 'Dairy', price: 220 },
        { code: 'P006', name: 'Tomato', stock: 40, type: 'Vegetables', price: 60 }
      ];
      localStorage.setItem('products', JSON.stringify(demo));
    }
    // ensure salesHistory exists
    if (!localStorage.getItem('salesHistory')) {
      localStorage.setItem('salesHistory', JSON.stringify([]));
    }
    // render today
    renderTodayReport();

    // also attach event to discount/paid fields to update report? not needed
    // but ensure any external change doesn't break.
  };

  // expose functions for console debugging
  window.generateDailyReport = generateDailyReport;
  window.generateFullReport = generateFullReport;
  window.clearTodayReport = clearTodayReport;
  window.clearAllHistory = clearAllHistory;
  window.openHistoryReport = openHistoryReport;
  window.closeHistoryReport = closeHistoryReport;
