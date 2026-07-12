// ============================================================
  //  STOCK MANAGEMENT – with deduction on sale & expiration aware
  // ============================================================

  // ---------- CORE HELPERS ----------
  function getProducts() { return JSON.parse(localStorage.getItem('products')) || []; }
  function saveProducts(products) { localStorage.setItem('products', JSON.stringify(products)); }
  const ADMIN_PASSWORD = '0104';
  const STOCK_PASSWORD = '1500';

  // ---------- TABLE / ROW (same as original, extended) ----------
  function updateRow(input) {
    const row = input.closest('tr');
    const qty = row.cells[2]?.querySelector('input')?.value || 0;
    const price = row.cells[3]?.querySelector('input')?.value || 0;
    const total = qty * price;
    const totalCell = row.querySelector('.rowTotal');
    if (totalCell) totalCell.innerText = total;
    calculateGrandTotal();
    checkLastRow(input);
  }
  function calculateGrandTotal() {
    let total = 0;
    document.querySelectorAll('.rowTotal').forEach(c => total += Number(c.innerText) || 0);
    document.getElementById('grandTotal').innerText = total;
    updatePayment();
  }
  function checkLastRow(input) {
    const row = input.closest('tr');
    const tbody = document.getElementById('tableBody');
    const hasValue = Array.from(row.querySelectorAll('input')).some(inp => inp.value.trim() !== '');
    if (row === tbody.lastElementChild && hasValue) addRow();
  }
  function addRow() {
    const tbody = document.getElementById('tableBody');
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
      <td class="index"></td>
      <td><input type="text" oninput="checkLastRow(this)"></td>
      <td><input type="number" value="" oninput="updateRow(this)"></td>
      <td><input type="number" value="" oninput="updateRow(this); checkLastRow(this)"></td>
      <td class="rowTotal">0</td>
      <td><button onclick="deleteRow(this)" style="padding:2px 8px;">X</button></td>
    `;
    tbody.appendChild(newRow);
    updateIndexes();
  }
  function updateIndexes() { document.querySelectorAll('.index').forEach((c,i) => c.innerText = i+1); }
  function deleteRow(btn) { const row = btn.closest('tr'); row.remove(); updateIndexes(); calculateGrandTotal(); }
  function clearTable() { document.getElementById('tableBody').innerHTML = ''; addRow(); calculateGrandTotal(); }
  function updatePayment() {
    const total = Number(document.getElementById('grandTotal').innerText) || 0;
    const discount = Number(document.getElementById('discount').value) || 0;
    const paid = Number(document.getElementById('paid').value) || 0;
    const finalTotal = total - discount;
    document.getElementById('totalDisplay')?.remove();
    document.getElementById('balance').value = paid - finalTotal;
  }

  // ---------- HOLD / HISTORY ----------
  function asideSale() {
    const rows = document.querySelectorAll('#tableBody tr');
    let items = [];
    rows.forEach(row => {
      const name = row.cells[1]?.querySelector('input')?.value;
      const qty = row.cells[2]?.querySelector('input')?.value;
      const price = row.cells[3]?.querySelector('input')?.value;
      if (name) items.push({ name, qty, price });
    });
    if (!items.length) return notify('No items to hold', 'Hold');
    let history = JSON.parse(localStorage.getItem('salesHistory')) || [];
    history.push({ id: Date.now(), date: new Date().toLocaleString(), items, customer: document.getElementById('customerName').value || 'Guest' });
    localStorage.setItem('salesHistory', JSON.stringify(history));
    clearTable();
    notify('Sale held. Restore from History.', 'Hold');
  }
  function openHistory() {
    const history = JSON.parse(localStorage.getItem('salesHistory')) || [];
    const list = document.getElementById('historyList');
    list.innerHTML = '';
    if (!history.length) { list.innerHTML = '<p>No sales yet</p>'; } 
    else {
      history.slice().reverse().forEach((sale, idx) => {
        const realIdx = history.length - 1 - idx;
        list.innerHTML += `
          <div style="border:1px solid #d0ddee;border-radius:16px;padding:10px;margin:6px 0;">
            <strong>${sale.date}</strong> · ${sale.customer || 'Guest'}<br>
            Items: ${sale.items?.length || 0}<br>
            <button onclick="restoreSale(${realIdx})">Restore</button>
          </div>`;
      });
    }
    document.getElementById('historyCard').style.display = 'flex';
  }
  function restoreSale(index) {
    let history = JSON.parse(localStorage.getItem('salesHistory')) || [];
    const sale = history[index];
    if (!sale) return;
    clearTable();
    sale.items.forEach(item => { insertIntoTable({ name: item.name, price: Number(item.price) }); });
    document.getElementById('customerName').value = sale.customer || '';
    closeHistory();
    notify('Sale restored', 'Restore');
  }
  function closeHistory() { document.getElementById('historyCard').style.display = 'none'; }

  // ---------- CATALOG / SEARCH ----------
  function handleSearch() {
    const q = document.getElementById('searchBox').value.toLowerCase().trim();
    const wrapper = document.getElementById('catalogWrapper');
    if (!q) { wrapper.style.display = 'none'; return; }
    wrapper.style.display = 'flex';
    const products = getProducts().filter(p => p.code.toString().includes(q) || p.name.toLowerCase().includes(q));
    const body = document.getElementById('catalogBody');
    body.innerHTML = '';
    products.forEach(p => {
      body.innerHTML += `<tr onclick='selectProduct(${JSON.stringify(p)})'><td>${p.code}</td><td>${p.name}</td><td>${p.price}</td><td>${p.type}</td><td>${p.stock}</td></tr>`;
    });
  }
  function selectProduct(product) { insertIntoTable(product); document.getElementById('searchBox').value = ''; document.getElementById('catalogWrapper').style.display = 'none'; }
  function insertIntoTable(product) {
    const tbody = document.getElementById('tableBody');
    let lastRow = tbody.lastElementChild;
    const nameInp = lastRow.cells[1]?.querySelector('input');
    const qtyInp = lastRow.cells[2]?.querySelector('input');
    const priceInp = lastRow.cells[3]?.querySelector('input');
    if (nameInp) nameInp.value = product.name || '';
    if (qtyInp) qtyInp.value = 1;
    if (priceInp) priceInp.value = product.price || 0;
    if (priceInp) updateRow(priceInp);
    if (lastRow === tbody.lastElementChild) addRow();
  }

  // ---------- PRODUCT ADMIN ----------
  function addProduct() {
    const code = document.getElementById('p_code').value.trim();
    const name = document.getElementById('p_name').value.trim();
    const stock = document.getElementById('p_stock').value.trim();
    const type = document.getElementById('p_type').value.trim();
    const price = Number(document.getElementById('p_price').value);
    if (!code || !name || !stock || !type || !price) return notify('Fill all fields', 'Warning');
    let products = getProducts();
    if (products.find(p => p.code === code)) return notify('Code already exists', 'Warning');
    products.push({ code, name, stock, type, price });
    saveProducts(products);
    document.getElementById('p_code').value = ''; document.getElementById('p_name').value = ''; document.getElementById('p_stock').value = ''; document.getElementById('p_type').value = ''; document.getElementById('p_price').value = '';
    loadCategories(); renderCatalog(getProducts()); renderAdminCatalog();
    notify('Product saved', 'Success');
  }
  function deleteProduct(code) {
    let products = getProducts().filter(p => p.code !== code);
    saveProducts(products);
    loadCategories(); renderCatalog(products); renderAdminCatalog();
  }
  function editProduct(code) {
    let products = getProducts();
    const p = products.find(x => x.code === code);
    if (!p) return;
    const newName = prompt('Edit name', p.name);
    const newPrice = prompt('Edit price', p.price);
    const newStock = prompt('Edit stock', p.stock);
    if (newName !== null) p.name = newName || p.name;
    if (newPrice !== null) p.price = Number(newPrice) || p.price;
    if (newStock !== null) p.stock = Number(newStock) || p.stock;
    saveProducts(products);
    loadCategories(); renderCatalog(products); renderAdminCatalog();
  }
  function renderCatalog(list) {
    const body = document.getElementById('catalogBody');
    if (!body) return;
    body.innerHTML = '';
    list.forEach(p => {
      body.innerHTML += `<tr onclick='selectProduct(${JSON.stringify(p)})'><td>${p.code}</td><td>${p.name}</td><td>${p.price}</td><td>${p.type}</td><td>${p.stock}</td></tr>`;
    });
  }
  function renderAdminCatalog() {
    const body = document.getElementById('catalogAdminBody');
    if (!body) return;
    const products = getProducts();
    body.innerHTML = '';
    products.forEach(p => {
      body.innerHTML += `<tr><td>${p.code}</td><td>${p.name}</td><td>${p.stock}</td><td>${p.price}</td><td><button onclick="editProduct('${p.code}')" class="btn btn-sm btn-ghost">✎</button> <button onclick="deleteProduct('${p.code}')" class="btn btn-sm btn-danger">✕</button></td></tr>`;
    });
  }

  // ---------- CATEGORIES ----------
  function loadCategories() {
    const products = getProducts();
    const container = document.getElementById('categoryGrid');
    container.innerHTML = '';
    const types = [...new Set(products.map(p => p.type))];
    types.forEach(cat => {
      const div = document.createElement('div');
      div.className = 'tile';
      div.innerText = cat;
      div.onclick = () => showCategory(cat);
      container.appendChild(div);
    });
  }
  function showCategory(type) {
    const products = getProducts().filter(p => p.type === type);
    const grid = document.getElementById('productGrid');
    grid.innerHTML = '';
    products.forEach(p => {
      const div = document.createElement('div');
      div.className = 'tile product-tile';
      div.innerHTML = `${p.name}<br><small>KES ${p.price}</small><br><span style="font-size:0.7rem;">stock:${p.stock}</span>
        <br><button onclick="event.stopPropagation();editProduct('${p.code}')" style="font-size:0.6rem;">Edit</button>
        <button onclick="event.stopPropagation();deleteProduct('${p.code}')" style="font-size:0.6rem;">Del</button>`;
      div.onclick = () => quickAdd(p);
      grid.appendChild(div);
    });
  }
  function quickAdd(product) { insertIntoTable({ name: product.name, price: product.price }); document.getElementById('searchBox').focus(); }

  // ---------- ADMIN LOGIN ----------
  // 
  
 let currentAdminTarget = ''; 
 function openAdminLog(targetPage) { 
  currentAdminTarget = targetPage; // Remember 'stock' or 'sales' ✅
  document.getElementById('adminLogin').style.display = 'flex'; 
}

function closeAdminLog() {
  document.getElementById('adminLogin').style.display = 'none';
  document.getElementById('adminPass').value = '';
  document.getElementById('loginError').innerText = '';
  currentAdminTarget = ''; // Reset target
}

function checkAdmin() {
  const passInput = document.getElementById('adminPass');
  const pass = passInput.value;
  
  if (pass === ADMIN_PASSWORD) {
    passInput.value = ''; // Clear password field
    document.getElementById('loginError').innerText = '';
    document.getElementById('adminLogin').style.display = 'none';

    // Route the user based on which button they clicked! 🚀
    if (currentAdminTarget === 'stock') {
      
      // Logic for 1st Button: Open Stock panel inline
      document.getElementById('adminPanel').style.display = 'flex';
      renderAdminCatalog();
      
    } else if (currentAdminTarget === 'sales') {
      
      // Logic for 2nd Button: Redirect to Sales HTML File
      sessionStorage.setItem('admin_authenticated', 'true');
      window.location.href = 'sales-report.html'; 
      
    }
    
    currentAdminTarget = ''; // Reset target after success
  } else { 
    document.getElementById('loginError').innerText = 'Wrong password!'; 
  }
}

  function startScan() { document.getElementById('p_code').focus(); notify('Scan barcode now', 'Scan'); }
           
             //----Sales Report----
        
        function openSales() {
  const passInput = document.getElementById('adminPass');
  const pass = passInput.value;
  
  if (pass === ADMIN_PASSWORD) {
    passInput.value = ''; 
    
    // 1. Create a secure session key in memory ✅
    sessionStorage.setItem('admin_authenticated', 'true');
    
    // 2. Redirect to your new HTML file ✅
    window.location.href = 'sales-report.html'; 
    
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('loginError').innerText = '';
  } else { 
    document.getElementById('loginError').innerText = 'Wrong password!'; 
  }
}
/*
  function openStock() { document.getElementById('stockLogin').style.display = 'flex'; renderStockCatalog(); }
  function checkStock() {
    const pass = document.getElementById('stockPass').value;
    if (pass === STOCK_PASSWORD) {
      document.getElementById('stockLogin').style.display = 'none';
      document.getElementById('stockPanel').style.display = 'flex';
      document.getElementById('loginError').innerText = '';
      renderStockCatalog();
    } else { document.getElementById('loginError').innerText = 'Wrong password!'; }
  }*/

  // ---------- SALE / RECEIPT + STOCK DEDUCTION ----------
  function getSaleData() {
    const customer = document.getElementById('customerName').value.trim() || 'Guest';
    const rows = document.querySelectorAll('#tableBody tr');
    let items = [], total = 0;
    rows.forEach(row => {
      const name = row.cells[1]?.querySelector('input')?.value;
      const qty = Number(row.cells[2]?.querySelector('input')?.value) || 0;
      const price = Number(row.cells[3]?.querySelector('input')?.value) || 0;
      if (name) { const rowTotal = qty * price; total += rowTotal; items.push({ name, qty, price, total: rowTotal }); }
    });
    if (!items.length) { notify('No items in sale', 'Warning'); return null; }
    const discount = Number(document.getElementById('discount').value) || 0;
    const paid = Number(document.getElementById('paid').value) || 0;
    const finalTotal = total - discount;
    return { orderNo: 'PDS_' + Date.now(), date: new Date().toLocaleDateString(), time: new Date().toLocaleTimeString(), customer, seller: 'Admin', items, total, discount, paid, balance: paid - finalTotal };
  }

  // 🆕 DEDUCT STOCK & CHECK EXPIRATION (simulated with stock threshold)
  function deductStock(items) {
    let products = getProducts();
    let errors = [];
    items.forEach(saleItem => {
      const product = products.find(p => p.name.toLowerCase() === saleItem.name.toLowerCase());
      if (!product) {
        errors.push(`Product "${saleItem.name}" not found in catalog`);
        return;
      }
      const qty = Number(saleItem.qty) || 0;
      if (product.stock < qty) {
        errors.push(`Not enough stock for "${product.name}" (stock: ${product.stock}, requested: ${qty})`);
      } else {
        product.stock = product.stock - qty;
        // expiration awareness: if stock < 3, suggest expiry check (demo)
        if (product.stock < 3) {
          notify(`⚠️ Low stock: ${product.name} (remaining ${product.stock})`, 'Stock alert');
        }
      }
    });
    if (errors.length) {
      notify(errors.join(' | '), 'Stock error');
      return false;
    }
    saveProducts(products);
    loadCategories(); renderCatalog(products); renderAdminCatalog();
    return true;
  }

  function buildReceiptHTML(sale) {
    let itemsHTML = sale.items.map(i => `<tr><td>${i.name}</td><td>${i.qty}</td><td>${i.price}</td><td>${i.total}</td></tr>`).join('');
    return `<div style="width:280px;font-family:monospace;padding:8px;">
      <h3 style="text-align:center;">DAX POS SYSTEM</h3>
      <p style="text-align:center;">JujaFarm · 0724766164</p><hr>
      <p><strong>${sale.customer}</strong>  ${sale.orderNo}</p>
      <p>${sale.date} ${sale.time}</p><hr>
      <table width="100%">
      <tr>
      <th>Item</th><th>Qty</th><th>Price</th><th>Total</th>
      </tr>
      ${itemsHTML}</table>
      <hr>
      <p>Total: ${sale.total}  Discount: ${sale.discount}</p><p>Paid: ${sale.paid}  Balance: ${sale.balance}</p><hr>
      <p style="text-align:center;">Thank You For Shopping with Us!</p></div>`;
  }

  function completeSale() {
    const sale = getSaleData();
    if (!sale) return;
    // deduct stock before completing
    const success = deductStock(sale.items);
    if (!success) return; // error notified inside deductStock

    let history = JSON.parse(localStorage.getItem('salesHistory')) || [];
    history.push(sale);
    localStorage.setItem('salesHistory', JSON.stringify(history));
    const win = window.open('', '_blank', 'width=320,height=600');
    win.document.write(`<html><head><title>Receipt</title><style>body{background:white;color:black;font-family:monospace;padding:8px;}</style></head><body onload="window.print()">${buildReceiptHTML(sale)}</body></html>`);
    win.document.close();
    clearTable(); document.getElementById('discount').value = ''; document.getElementById('paid').value = ''; updatePayment();
  }

  // ---------- NOTIFY ----------
  function notify(msg, title = 'Alert') { document.getElementById('notifyTitle').innerText = title; document.getElementById('notifyMessage').innerText = msg; document.getElementById('notifyBox').style.display = 'flex'; }
  function closeNotify() { document.getElementById('notifyBox').style.display = 'none'; }
  document.getElementById('notifyBox').addEventListener('click', function(e) { if (e.target === this) closeNotify(); });

  // ---------- INIT ----------
  window.onload = function() {
    if (!getProducts().length) {
      const demo = [
        { code: 'P001', name: 'Milk 500ml', stock: 500, type: 'Dairy', price: 60 },
         { code: 'P002', name: 'Milk 200ml', stock: 500, type: 'Dairy', price: 30 },
        { code: 'P003', name: 'Bread', stock: 15, type: 'Bakery', price: 80 },
        { code: 'P004', name: 'Eggs 6pcs', stock: 30, type: 'Dairy', price: 100 },
        { code: 'P005', name: 'Butter 500g', stock: 8, type: 'Dairy', price: 220 },
        { code: 'P006', name: 'Tomato', stock: 40, type: 'Vegetables', price: 60 }
      ];
      saveProducts(demo);
    }
    clearTable();
    loadCategories();
    renderCatalog(getProducts());
    renderAdminCatalog();
    updatePayment();
  };
